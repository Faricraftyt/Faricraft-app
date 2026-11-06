import { Data, Key, validate } from "./schema";

export type RepoTarget = { owner: string; repo: string; branch: string };
const editable = ["resources", "categories", "bio", "settings"] as const;
export type Snapshot = {
  data: Data;
  head: string;
  tree: string;
  blobs: Record<string, string>;
};
export type PendingImage = { path: string; file: File };
type Fetcher = typeof fetch;
const part = encodeURIComponent;
const branchPath = (v: string) => v.split("/").map(part).join("/");
export function parseRepository(value: string): {
  owner: string;
  repo: string;
} {
  const raw = value
    .trim()
    .replace(/\/$/, "")
    .replace(/\.git$/, "");
  const match =
    /^(?:https:\/\/github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)$/.exec(
      raw,
    );
  if (!match || [".", ".."].includes(match[2]))
    throw Error("Ingresá usuario/repositorio o su URL de github.com.");
  return { owner: match[1], repo: match[2] };
}
export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
function decode(content: string) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(content.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
async function base64(file: Blob) {
  let out = "";
  const bytes = new Uint8Array(await file.arrayBuffer());
  for (let i = 0; i < bytes.length; i += 16384)
    out += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(out);
}
// This object lives only in React memory. Never serialize it or its token.
export class GitHubSession {
  private token: string;
  target: RepoTarget;
  login = "";
  snapshot!: Snapshot;
  constructor(
    token: string,
    target: RepoTarget,
    private request: Fetcher = fetch,
  ) {
    this.token = token.trim();
    this.target = target;
  }
  disconnect() {
    this.token = "";
  }
  private async api(
    path: string,
    method = "GET",
    body?: unknown,
    upload?: { file: File },
  ) {
    if (!this.token)
      throw new GitHubError("La sesión está cerrada. Volvé a conectar.", 401);
    const endpoint = new URL(path, "https://api.github.com");
    if (
      !["https://api.github.com", "https://uploads.github.com"].includes(
        endpoint.origin,
      ) ||
      endpoint.username ||
      endpoint.password
    )
      throw Error("Destino de GitHub no permitido.");
    let res: Response;
    try {
      res = await this.request(endpoint.href, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + this.token,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(upload
            ? { "Content-Type": upload.file.type || "application/octet-stream" }
            : {}),
        },
        body: upload
          ? upload.file
          : body === undefined
            ? undefined
            : JSON.stringify(body),
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      throw new GitHubError(
        "El navegador no pudo contactar con " + endpoint.hostname + ". Revisá la conexión o si una extensión está bloqueando la solicitud.",
        0,
      );
    }
    if (!res.ok) {
      const messages: Record<number, string> = {
        401: "Token inválido o vencido. Desconectá y conectá uno vigente.",
        403: "GitHub rechazó la operación: revisá Contents: Read and write, límites y políticas del repositorio.",
        404: "No se encontró el repositorio, la rama o el archivo. Revisá la configuración y el acceso del token.",
        409: "El repositorio cambió o la rama está protegida. Recargá los datos desde GitHub antes de publicar.",
        422: "GitHub no aceptó el cambio. Revisá la protección de la rama, los permisos y si el repositorio cambió.",
      };
      throw new GitHubError(
        messages[res.status] ||
          "GitHub no pudo completar la operación (HTTP " + res.status + ").",
        res.status,
      );
    }
    return res.status === 204 ? null : await res.json();
  }
  private get root() {
    return "/repos/" + part(this.target.owner) + "/" + part(this.target.repo);
  }
  async connect() {
    const user = await this.api("/user");
    const repo = await this.api(this.root);
    if (repo.private)
      throw Error(
        "Esta app necesita un repositorio público para los archivos descargables.",
      );
    if (repo.archived || repo.disabled)
      throw Error("El repositorio está archivado o deshabilitado.");
    if (!repo.permissions?.push)
      throw Error(
        "Tu usuario no tiene permiso de escritura en este repositorio.",
      );
    this.target.branch = this.target.branch.trim() || repo.default_branch;
    if (
      !this.target.branch ||
      /[\s~^:?*\[\\]/.test(this.target.branch) ||
      this.target.branch.includes("..")
    )
      throw Error("Nombre de rama inválido.");
    this.login = user.login;
    this.snapshot = await this.readSnapshot();
    // Source layout is required, so all changes can be rebuilt by Actions.
    await this.api(
      this.root +
        "/contents/.github/workflows/pages.yml?ref=" +
        part(this.target.branch),
    );
    return this.snapshot;
  }
  async readSnapshot(atCommit?: string): Promise<Snapshot> {
    const head =
      atCommit ||
      (
        await this.api(
          this.root + "/git/ref/heads/" + branchPath(this.target.branch),
        )
      ).object.sha;
    const commit = await this.api(this.root + "/git/commits/" + head);
    const tree = await this.api(
      this.root + "/git/trees/" + commit.tree.sha + "?recursive=1",
    );
    if (tree.truncated)
      throw Error(
        "El repositorio es demasiado grande para comprobar todos los cambios.",
      );
    const blobs = Object.fromEntries(
      tree.tree
        .filter((v: any) => v.type === "blob")
        .map((v: any) => [v.path, v.sha]),
    );
    const data: Record<string, unknown> = {};
    await Promise.all(
      [...editable, "videos" as Key].map(async (k) => {
        const path = "public/data/" + k + ".json";
        if (!blobs[path])
          throw Error(
            "Falta " +
              path +
              ". Subí primero el proyecto completo, no solo dist.",
          );
        const blob = await this.api(this.root + "/git/blobs/" + blobs[path]);
        if (blob.encoding !== "base64")
          throw Error("Codificación de GitHub inesperada");
        data[k] = JSON.parse(decode(blob.content));
      }),
    );
    return { data: validate(data), head, tree: commit.tree.sha, blobs };
  }
  async publish(
    input: Data,
    images: PendingImage[] = [],
    progress: (v: string) => void = () => {},
  ): Promise<{ commitUrl: string; sha: string; data: Data }> {
    const d = validate(input);
    const baseline = this.snapshot;
    if (!baseline) throw Error("Conectá el repositorio antes de publicar.");
    progress("Comprobando cambios en GitHub…");
    const latest = await this.readSnapshot();
    const changed = editable.filter(
      (k) => JSON.stringify(d[k]) !== JSON.stringify(baseline.data[k]),
    );
    for (const k of changed) {
      const path = "public/data/" + k + ".json";
      if (latest.blobs[path] !== baseline.blobs[path])
        throw new GitHubError(
          "Otro cambio modificó " +
            k +
            ".json. Guardá una copia y recargá desde GitHub para combinar los cambios.",
          409,
        );
    }
    if (!changed.length && !images.length)
      throw Error("No hay cambios nuevos para publicar.");
    const merged = validate({
      ...latest.data,
      ...Object.fromEntries(changed.map((k) => [k, d[k]])),
    });
    const paths = new Set<string>();
    for (const { path, file } of images) {
      if (
        !/^images\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif|avif)$/.test(path) ||
        file.size > 10 * 1024 * 1024
      )
        throw Error("Imagen pendiente inválida o superior a 10 MB.");
      if (paths.has(path) || latest.blobs["public/" + path])
        throw Error(
          "La imagen ya existe. Seleccioná el archivo de nuevo para generar otra ruta.",
        );
      paths.add(path);
    }
    const entries: any[] = changed.map((k) => ({
      path: "public/data/" + k + ".json",
      mode: "100644",
      type: "blob",
      content: JSON.stringify(d[k], null, 2) + "\n",
    }));
    for (const { path, file } of images) {
      progress("Subiendo imagen " + file.name + "…");
      const blob = await this.api(this.root + "/git/blobs", "POST", {
        content: await base64(file),
        encoding: "base64",
      });
      entries.push({
        path: "public/" + path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
    progress("Guardando contenido…");
    const tree = await this.api(this.root + "/git/trees", "POST", {
      base_tree: latest.tree,
      tree: entries,
    });
    const commit = await this.api(this.root + "/git/commits", "POST", {
      message: "Publicar contenido desde Faricraft APP",
      tree: tree.sha,
      parents: [latest.head],
    });
    // No force: a concurrent branch advance must never be overwritten.
    await this.api(
      this.root + "/git/refs/heads/" + branchPath(this.target.branch),
      "PATCH",
      { sha: commit.sha, force: false },
    );
    const blobs = { ...latest.blobs };
    for (const k of changed)
      blobs["public/data/" + k + ".json"] = "pending-" + commit.sha;
    this.snapshot = { data: merged, head: commit.sha, tree: tree.sha, blobs };
    // Snapshot SHAs are refreshed on the next publish, once the branch update is known.
    this.snapshot = await this.readSnapshot(commit.sha).catch(
      () => this.snapshot,
    );
    return {
      commitUrl:
        "https://github.com/" +
        this.target.owner +
        "/" +
        this.target.repo +
        "/commit/" +
        commit.sha,
      sha: commit.sha,
      data: merged,
    };
  }
  async uploadRelease(file: File, title: string): Promise<string> {
    if (file.size > 100 * 1024 * 1024)
      throw Error(
        "El panel admite archivos de hasta 100 MB. Para archivos mayores usá la página de Releases.",
      );
    const tag =
      "faricraft-" +
      Date.now() +
      "-" +
      crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    const release = await this.api(this.root + "/releases", "POST", {
      tag_name: tag,
      target_commitish: this.target.branch,
      name: title || file.name,
      draft: true,
    });
    try {
      const upload = new URL(release.upload_url.split("{")[0]);
      if (
        upload.origin !== "https://uploads.github.com" ||
        !upload.pathname.startsWith(this.root + "/releases/")
      )
        throw Error("URL de subida no válida.");
      upload.searchParams.set(
        "name",
        file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo",
      );
      let asset;
      try {
        asset = await this.api(upload.href, "POST", undefined, { file });
      } catch (error) {
        // Releases binary uploads may be blocked by browser cross-origin rules.
        // JSON requests to the main API use the same route as normal publication.
        if (!(error instanceof GitHubError) || error.status !== 0) throw error;
        return await this.uploadRepositoryFile(file, title);
      }
      await this.api(this.root + "/releases/" + release.id, "PATCH", {
        draft: false,
      });
      if (!/^https:\/\/github\.com\//.test(asset.browser_download_url))
        throw Error("No se recibió un enlace válido.");
      return asset.browser_download_url;
    } catch (e) {
      throw Error(
        (e instanceof Error ? e.message : "Error de subida") +
          " Se conserva el archivo local. Revisá Releases en GitHub: puede haber quedado un borrador sin publicar.",
      );
    }
  }
  private async uploadRepositoryFile(file: File, title: string): Promise<string> {
    if (file.size > 25 * 1024 * 1024)
      throw Error("La subida alternativa admite hasta 25 MB. Subí este archivo desde GitHub Releases y pegá su enlace de descarga.");
    const head = (await this.api(this.root + "/git/ref/heads/" + branchPath(this.target.branch))).object.sha;
    const parent = await this.api(this.root + "/git/commits/" + head);
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
    const path = "public/downloads/" + crypto.randomUUID() + "/" + filename;
    const blob = await this.api(this.root + "/git/blobs", "POST", {
      content: await base64(file), encoding: "base64",
    });
    const tree = await this.api(this.root + "/git/trees", "POST", {
      base_tree: parent.tree.sha,
      tree: [{ path, mode: "100644", type: "blob", sha: blob.sha }],
    });
    const commit = await this.api(this.root + "/git/commits", "POST", {
      message: "Subir archivo: " + (title || filename), tree: tree.sha, parents: [head],
    });
    await this.api(this.root + "/git/refs/heads/" + branchPath(this.target.branch), "PATCH", {
      sha: commit.sha, force: false,
    });
    // Keep the metadata baseline: concurrent edits must still be detected on publish.
    return "https://raw.githubusercontent.com/" + part(this.target.owner) + "/" + part(this.target.repo) + "/" + part(commit.sha) + "/" + path;
  }
  get actionsUrl() {
    return (
      "https://github.com/" +
      this.target.owner +
      "/" +
      this.target.repo +
      "/actions"
    );
  }
}
