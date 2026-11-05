import { Data, Key, keys, validate } from "./schema";
export const draftKey = "faricraft-draft-v1";
export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 30000);
}
export const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
export async function loadPublic(): Promise<{ data: Data; warning: string }> {
  const out: Record<string, unknown> = {};
  const warnings: string[] = [];
  await Promise.all(
    keys.map(async (k) => {
      try {
        const r = await fetch(
          import.meta.env.BASE_URL + "data/" + k + ".json",
          { cache: "no-cache" },
        );
        if (!r.ok) throw Error("HTTP " + r.status);
        out[k] = await r.json();
      } catch {
        warnings.push(k);
      }
    }),
  );
  if (warnings.length)
    throw Error("No se pudieron cargar: " + warnings.join(", "));
  return { data: validate(out), warning: "" };
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("faricraft-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function fileStore(
  action: "put" | "get" | "delete" | "clear",
  id = "",
  file?: File,
): Promise<any> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(
      "files",
      action === "get" ? "readonly" : "readwrite",
    );
    const s = t.objectStore("files");
    const r =
      action === "put"
        ? s.put(file, id)
        : action === "get"
          ? s.get(id)
          : action === "clear"
            ? s.clear()
            : s.delete(id);
    t.oncomplete = () => {
      d.close();
      resolve(r.result);
    };
    t.onerror = () => {
      d.close();
      reject(t.error);
    };
  });
}
export async function exportZip(d: Data) {
  validate(d);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const k of keys) zip.file("public/data/" + k + ".json", json(d[k]));
  const imagePaths = new Set([
    ...d.resources.map((r) => r.image),
    d.bio.avatar,
    d.settings.logo,
  ]);
  for (const path of imagePaths) {
    if (!path.startsWith("images/")) continue;
    const f = (await fileStore("get", "image:" + path)) as File | undefined;
    if (f) zip.file("public/" + path, await f.arrayBuffer());
  }
  const manifest = [];
  for (const r of d.resources) {
    const f = (await fileStore("get", r.id)) as File | undefined;
    if (f) {
      zip.file("pending-files/" + r.id + "/" + f.name, await f.arrayBuffer());
      manifest.push(
        `${r.title}: pending-files/${r.id}/${f.name} → subir a Releases; URL configurada: ${r.url || "pendiente"}`,
      );
    }
  }
  zip.file(
    "PUBLICAR.txt",
    "Reemplazá public/data/*.json en tu repositorio. Los archivos en pending-files NO están publicados. Subilos a Releases y completá sus URLs antes de publicar los recursos.\n\n" +
      manifest.join("\n"),
  );
  download(
    await zip.generateAsync({ type: "blob" }),
    "Faricraft-contenido.zip",
  );
}
export function exportOne(k: Key, d: Data) {
  download(new Blob([json(d[k])], { type: "application/json" }), k + ".json");
}
