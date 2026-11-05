import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GitHubSession, parseRepository } from "./github";
import { Data, keys } from "./schema";
const data = () =>
  Object.fromEntries(
    keys.map((k) => [
      k,
      JSON.parse(
        fs.readFileSync(
          new URL("../../public/data/" + k + ".json", import.meta.url),
          "utf8",
        ),
      ),
    ]),
  ) as Data;
function fixture() {
  const original = data();
  const log: {
    path: string;
    method: string;
    body: any;
    auth: string | null;
  }[] = [];
  let changedRemote = false;
  let rejectPatch = false;
  let failAuth = false;
  let evilUpload = false;
  const mock: typeof fetch = async (input, options) => {
    const u = new URL(String(input));
    const path = u.pathname;
    const method = options?.method || "GET";
    const body =
      typeof options?.body === "string"
        ? JSON.parse(options.body)
        : options?.body;
    log.push({
      path,
      method,
      body,
      auth: new Headers(options?.headers).get("Authorization"),
    });
    const result = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (path === "/user")
      return failAuth ? result({}, 401) : result({ login: "owner" });
    if (path === "/repos/owner/app")
      return result({
        default_branch: "main",
        private: false,
        permissions: { push: true },
      });
    if (path.endsWith("/contents/.github/workflows/pages.yml"))
      return result({});
    if (method === "GET" && path.includes("/git/ref/heads/"))
      return result({ object: { sha: changedRemote ? "other-head" : "head" } });
    if (method === "GET" && path.includes("/git/commits/"))
      return result({ tree: { sha: "tree" } });
    if (method === "GET" && path.includes("/git/trees/"))
      return result({
        tree: keys.map((k) => ({
          path: "public/data/" + k + ".json",
          type: "blob",
          sha: (changedRemote && k === "bio" ? "changed-" : "") + k,
        })),
      });
    if (method === "GET" && path.includes("/git/blobs/")) {
      const key = path.split("/").pop()!.replace("changed-", "") as keyof Data;
      return result({
        encoding: "base64",
        content: Buffer.from(JSON.stringify(original[key])).toString("base64"),
      });
    }
    if (method === "POST" && path.endsWith("/git/trees"))
      return result({ sha: "new-tree" });
    if (method === "POST" && path.endsWith("/git/commits"))
      return result({ sha: "new-commit" });
    if (method === "PATCH" && path.includes("/git/refs/heads/"))
      return result({}, rejectPatch ? 422 : 200);
    if (method === "POST" && path.endsWith("/git/blobs"))
      return result({ sha: "image-blob" });
    if (method === "POST" && path.endsWith("/releases"))
      return result({
        id: 123,
        upload_url:
          (evilUpload ? "https://example.com" : "https://uploads.github.com") +
          "/repos/owner/app/releases/123/assets{?name,label}",
      });
    if (method === "POST" && u.hostname === "uploads.github.com")
      return result({
        browser_download_url:
          "https://github.com/owner/app/releases/download/test/asset.zip",
      });
    if (method === "PATCH" && path.endsWith("/releases/123")) return result({});
    throw Error("Unexpected mock request " + method + " " + path);
  };
  return {
    original,
    log,
    session: new GitHubSession(
      "TEST_TOKEN_ONLY",
      { owner: "owner", repo: "app", branch: "main" },
      mock,
    ),
    setConflict: () => (changedRemote = true),
    setReject: () => (rejectPatch = true),
    setFail: () => (failAuth = true),
    setEvil: () => (evilUpload = true),
  };
}
test("repo parser rejects alternate hosts and injected paths", () => {
  assert.deepEqual(parseRepository("https://github.com/owner/app.git"), {
    owner: "owner",
    repo: "app",
  });
  for (const url of [
    "https://evil.com/owner/app",
    "owner/app/extra",
    "owner/..",
  ])
    assert.throws(() => parseRepository(url));
});
test("invalid token fails connection and writes nothing", async () => {
  const f = fixture();
  f.setFail();
  await assert.rejects(f.session.connect(), /Token inválido/);
  assert.ok(f.log.every((r) => r.method === "GET"));
});
test("atomic publication updates changed documents only and never force-pushes", async () => {
  const f = fixture();
  await f.session.connect();
  const d = structuredClone(f.original);
  d.bio.description = "Contenido nuevo";
  const result = await f.session.publish(d);
  assert.equal(result.sha, "new-commit");
  const tree = f.log.find(
    (r) => r.method === "POST" && r.path.endsWith("/git/trees"),
  )!;
  assert.deepEqual(
    tree.body.tree.map((v: any) => v.path),
    ["public/data/bio.json"],
  );
  const patch = f.log.find((r) => r.method === "PATCH")!;
  assert.equal(patch.body.force, false);
  assert.ok(!JSON.stringify(tree.body).includes("TEST_TOKEN_ONLY"));
});
test("concurrent changes abort before writing any tree or commit", async () => {
  const f = fixture();
  await f.session.connect();
  f.setConflict();
  const d = structuredClone(f.original);
  d.bio.description = "Local";
  await assert.rejects(f.session.publish(d), /Otro cambio/);
  assert.ok(f.log.every((r) => r.method === "GET"));
});
test("branch race fails without force or automatic retry", async () => {
  const f = fixture();
  await f.session.connect();
  f.setReject();
  const d = structuredClone(f.original);
  d.bio.description = "Local";
  await assert.rejects(f.session.publish(d), /GitHub no aceptó/);
  assert.equal(f.log.filter((r) => r.method === "PATCH").length, 1);
});
test("no changes means no writes; disconnected sessions cannot call API", async () => {
  const f = fixture();
  await f.session.connect();
  await assert.rejects(f.session.publish(f.original), /No hay cambios/);
  f.session.disconnect();
  await assert.rejects(f.session.readSnapshot(), /sesión está cerrada/);
  assert.ok(f.log.every((r) => r.method === "GET"));
});
test("release upload only uses allowlisted GitHub upload host", async () => {
  const f = fixture();
  await f.session.connect();
  f.setEvil();
  await assert.rejects(
    f.session.uploadRelease(new File(["test"], "test.zip"), "Test"),
    /URL de subida no válida/,
  );
  assert.ok(f.log.every((r) => !r.path.includes("example.com")));
});
test("release upload produces URL after binary upload and release publication", async () => {
  const f = fixture();
  await f.session.connect();
  const url = await f.session.uploadRelease(
    new File(["test"], "test.zip"),
    "Test",
  );
  assert.match(url, /^https:\/\/github.com/);
  assert.ok(f.log.some((r) => r.body?.draft === false));
  assert.ok(f.log.some((r) => r.body instanceof File));
});

test("pending cover is committed with its resource document", async () => {
  const f = fixture();
  await f.session.connect();
  const d = structuredClone(f.original);
  d.bio.avatar = "images/test.png";
  await f.session.publish(d, [
    {
      path: "images/test.png",
      file: new File(["binary"], "cover.png", { type: "image/png" }),
    },
  ]);
  const tree = f.log.find(
    (r) => r.method === "POST" && r.path.endsWith("/git/trees"),
  )!;
  assert.deepEqual(
    tree.body.tree.map((v: any) => v.path),
    ["public/data/bio.json", "public/images/test.png"],
  );
});
test("invalid publication is rejected before contacting GitHub", async () => {
  const f = fixture();
  await f.session.connect();
  const before = f.log.length;
  const d = structuredClone(f.original);
  d.settings.channelUrl = "javascript:alert(1)";
  await assert.rejects(f.session.publish(d));
  assert.equal(f.log.length, before);
});
