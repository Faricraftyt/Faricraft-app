import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, LogOut, Save, Trash2, Eye } from "lucide-react";
import {
  Data,
  Key,
  Resource,
  keys,
  validate,
  validateDraft,
  uid,
} from "../services/schema";
import {
  exportZip,
  exportOne,
  download,
  json,
  fileStore,
} from "../services/storage";
import { BioView, Picture } from "../components/UI";
import { GitHubSession, PendingImage } from "../services/github";
function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      {type === "textarea" ? (
        <textarea
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Links({
  value,
  onChange,
}: {
  value: { label: string; url: string }[];
  onChange: (v: { label: string; url: string }[]) => void;
}) {
  return (
    <div className="stack">
      {value.map((l, i) => (
        <div className="form-row" key={i}>
          <Field
            label="Nombre del enlace"
            value={l.label}
            onChange={(v) =>
              onChange(value.map((x, j) => (i === j ? { ...x, label: v } : x)))
            }
          />
          <Field
            label="URL HTTPS"
            value={l.url}
            onChange={(v) =>
              onChange(value.map((x, j) => (i === j ? { ...x, url: v } : x)))
            }
          />
          <button
            aria-label="Eliminar enlace"
            onClick={() => onChange(value.filter((_, j) => i !== j))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...value, { label: "Nuevo enlace", url: "" }])}
      >
        + Agregar enlace
      </button>
    </div>
  );
}
export default function Admin({
  published,
  session,
  disconnect,
}: {
  published: Data;
  session: GitHubSession;
  disconnect: () => void;
}) {
  const scope =
    session.target.owner +
    "/" +
    session.target.repo +
    ":" +
    session.target.branch;
  const draftKey = "faricraft-draft-v2:" + scope;
  const backupKey = "faricraft-backup:" + scope;
  const [remote, Remote] = useState(published);
  const [commitUrl, CommitUrl] = useState("");
  const [progress, Progress] = useState("");
  const nav = useNavigate();
  const [initialDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved)
        return {
          data: structuredClone(published),
          base: published,
          stale: false,
        };
      const parsed = JSON.parse(saved);
      const data = validateDraft(parsed.data ?? parsed);
      const base = parsed.base ? validateDraft(parsed.base) : published;
      const stale = ["resources", "categories", "bio", "settings"].some(
        (k) =>
          json(base[k as Key]) !== json(published[k as Key]) &&
          json(data[k as Key]) !== json(published[k as Key]),
      );
      return { data, base, stale };
    } catch {
      const raw = localStorage.getItem(draftKey);
      if (raw) localStorage.setItem("faricraft-damaged-draft:" + scope, raw);
      return {
        data: structuredClone(published),
        base: published,
        stale: false,
      };
    }
  });
  const [d, D] = useState<Data>(initialDraft.data);
  const [stale, Stale] = useState(initialDraft.stale);
  const [tab, T] = useState("Dashboard"),
    [msg, M] = useState(""),
    [editing, E] = useState<Resource | null>(null),
    [preview, P] = useState(false),
    [busy, B] = useState(false);
  const [files, F] = useState<Record<string, string>>({});
  const [undo, U] = useState<Data | null>(null);
  const dirty = json(d) !== json(remote);
  const set = <K extends Key>(key: K, value: Data[K]) => {
    U(d);
    D({ ...d, [key]: value });
  };
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        json({ data: d, base: stale ? initialDraft.base : remote }),
      );
    } catch {
      M(
        "No se pudo guardar el borrador: almacenamiento lleno o no disponible. Exportá una copia.",
      );
    }
  }, [d, remote, stale]);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty || editing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty, editing]);
  useEffect(() => {
    const guard = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        editing &&
        target.closest("a[href]") &&
        !confirm("¿Salir sin guardar los campos del recurso?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [editing]);
  useEffect(() => {
    Promise.all(
      d.resources.map(async (r) => {
        const f = await fileStore("get", r.id);
        return [r.id, f?.name || ""];
      }),
    )
      .then((entries) => F(Object.fromEntries(entries)))
      .catch(() =>
        M("No se pudo abrir el almacenamiento de archivos locales."),
      );
  }, [d.resources]);
  const safe = async (fn: () => void | Promise<void>) => {
    B(true);
    try {
      await fn();
    } catch (e) {
      M(e instanceof Error ? e.message : "No se pudo completar la acción");
    } finally {
      B(false);
    }
  };
  const exit = () => {
    if (editing && !confirm("¿Cerrar sin guardar los campos del recurso?"))
      return;
    disconnect();
    nav("/recursos");
  };
  const addResource = () =>
    E({
      id: uid(),
      title: "",
      description: "",
      category: d.categories[0]?.id || "",
      image: "",
      date: new Date().toISOString().slice(0, 10),
      tags: [],
      format: "",
      size: "",
      url: "",
      published: false,
      order: d.resources.length,
    });
  const saveResource = () =>
    safe(() => {
      if (!editing) return;
      const next = {
        ...d,
        resources: [...d.resources.filter((r) => r.id !== editing.id), editing],
      };
      validate(next);
      set("resources", next.resources);
      E(null);
      M("Recurso guardado en el borrador local.");
    });
  const exportAll = () =>
    safe(async () => {
      await exportZip(d);
      M("ZIP exportado. Todavía falta publicar los archivos en GitHub.");
    });
  const stageImage = async (file: File, onReady: (path: string) => void) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !ext ||
      !["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext) ||
      file.size > 10 * 1024 * 1024
    )
      throw Error(
        "Elegí una imagen PNG, JPG, WEBP, GIF o AVIF de hasta 10 MB.",
      );
    const path = "images/" + uid() + "." + ext;
    await fileStore("put", "image:" + path, file);
    onReady(path);
    M("Imagen preparada. Se subirá al pulsar Publicar cambios.");
  };
  const publishNow = () =>
    safe(async () => {
      if (stale)
        throw Error(
          "Hay cambios en GitHub desde que creaste este borrador. Conservá una copia y usá Recargar desde GitHub antes de combinar los cambios.",
        );
      if (editing) throw Error("Guardá el recurso antes de publicar.");
      validate(d);
      const referenced = [
        ...d.resources.map((r) => r.image),
        d.bio.avatar,
        d.settings.logo,
      ];
      const images: PendingImage[] = [];
      for (const path of new Set(referenced)) {
        if (!path.startsWith("images/")) continue;
        const file = await fileStore("get", "image:" + path);
        if (file) images.push({ path, file });
      }
      const result = await session.publish(d, images, Progress);
      Remote(result.data);
      D(result.data);
      CommitUrl(result.commitUrl);
      for (const { path } of images)
        await fileStore("delete", "image:" + path).catch(() => {});
      Progress("");
      M(
        "Cambios guardados en GitHub. Actions está encargado de actualizar Pages; revisá su resultado antes de dar la publicación por terminada.",
      );
    });
  const reloadRemote = () =>
    safe(async () => {
      if (editing) throw Error("Guardá o cancelá el formulario primero.");
      if (
        dirty &&
        !confirm(
          "¿Cargar los datos actuales de GitHub? Se guardará una copia del borrador anterior.",
        )
      )
        return;
      const next = await session.readSnapshot();
      localStorage.setItem(backupKey, json(d));
      session.snapshot = next;
      Stale(false);
      Remote(next.data);
      D(next.data);
      M("Contenido actualizado desde GitHub.");
    });
  const importFile = (file: File) =>
    safe(async () => {
      if (file.size > 5_000_000)
        throw Error(
          "El JSON supera 5 MB. Los archivos grandes deben ir a Releases.",
        );
      const incoming = JSON.parse(await file.text());
      const key = file.name.replace(".json", "") as Key;
      const next = keys.includes(key) ? { ...d, [key]: incoming } : incoming;
      validate(next);
      if (
        !confirm(
          "¿Reemplazar el borrador con el contenido importado? Se guardará una copia anterior.",
        )
      )
        return;
      localStorage.setItem(backupKey, json(d));
      U(d);
      D(next);
      M("Importación validada. Copia anterior guardada.");
    });
  return (
    <fieldset className="admin-workspace" disabled={busy}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ESPACIO DE EDICIÓN</span>
          <h1>Tu taller creativo.</h1>
        </div>
        <button onClick={exit}>
          <LogOut size={16} />
          Cerrar editor
        </button>
      </div>
      <div className="notice">
        Conectado como {session.login} · {session.target.owner}/
        {session.target.repo} · Rama {session.target.branch}. El token solo
        permanece en memoria durante esta sesión.
      </div>
      <div className="adminbar">
        <div className="chips">
          {["Dashboard", "Descargas", "BIO", "Configuración", "Publicación"].map(
            (t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => {
                  if (
                    editing &&
                    !confirm("¿Salir del formulario sin guardar sus campos?")
                  )
                    return;
                  E(null);
                  T(t);
                  P(false);
                }}
              >
                {t}
              </button>
            ),
          )}
        </div>
        <div className="actions">
          <button
            disabled={busy || !!editing || !dirty}
            className="primary"
            onClick={publishNow}
          >
            <Save size={17} />
            Publicar cambios
          </button>
          <button disabled={busy} onClick={exportAll}>
            <Download size={17} />
            Copia ZIP
          </button>
        </div>
      </div>
      <p className="muted">
        {dirty
          ? "● Cambios sin publicar"
          : "✓ Borrador igual al contenido de GitHub"}{" "}
        · Borrador en este navegador
      </p>
      {stale && (
        <div className="notice" role="alert">
          Este borrador es anterior a cambios publicados desde otro equipo.
          Guardá una copia y usá Recargar desde GitHub en Publicación antes de
          combinarlo.
        </div>
      )}
      {progress && <p role="status">{progress}</p>}
      {commitUrl && (
        <div className="notice">
          <a href={commitUrl} target="_blank" rel="noreferrer">
            Ver cambio guardado ↗
          </a>{" "}
          ·{" "}
          <a href={session.actionsUrl} target="_blank" rel="noreferrer">
            Comprobar despliegue en Actions ↗
          </a>
        </div>
      )}
      {msg && (
        <div role="status" className="notice message">
          {msg}
          <button aria-label="Cerrar mensaje" onClick={() => M("")}>
            ×
          </button>
        </div>
      )}
      {tab === "Dashboard" && (
        <>
          <div className="stats">
            {[
              ["Descargas configurados", d.resources.length],
              [
                "Publicados en el borrador",
                d.resources.filter((r) => r.published).length,
              ],
              ["Categorías", d.categories.length],
            ].map(([name, count]) => (
              <div className="panel" key={name}>
                <strong>{count}</strong>
                <p>{name}</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2>Seguí creando</h2>
            <p>
              Prepará tus archivos, revisá los enlaces y publicá cuando esté
              todo listo.
            </p>
            <div className="actions">
              <button
                onClick={() => {
                  T("Descargas");
                  addResource();
                }}
              >
                <Plus size={16} />
                Nuevo recurso
              </button>
              <button onClick={() => T("BIO")}>Editar BIO</button>
              <button onClick={() => T("Publicación")}>Cómo publicar</button>
            </div>
          </div>
          <h2>Descargas recientes</h2>
          {[...d.resources]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((r) => (
              <div className="listrow" key={r.id}>
                <span>{r.title}</span>
                <button
                  onClick={() => {
                    T("Descargas");
                    E({ ...r });
                  }}
                >
                  Editar
                </button>
              </div>
            ))}
          {!d.resources.length && <p>Todavía no configuraste recursos.</p>}
        </>
      )}
      {tab === "Descargas" && (
        <>
          {editing ? (
            <section className="panel">
              <div className="section-heading">
                <h2>
                  {d.resources.some((r) => r.id === editing.id)
                    ? "Editar recurso"
                    : "Nuevo recurso"}
                </h2>
                <button onClick={() => P(!preview)}>
                  <Eye size={16} />
                  {preview ? "Formulario" : "Vista previa"}
                </button>
              </div>
              {preview ? (
                <div className="detail">
                  <Picture src={editing.image} alt={editing.title} />
                  <div>
                    <h2>{editing.title || "Sin título"}</h2>
                    <p>{editing.description}</p>
                    <p>
                      {editing.format} · {editing.size}
                    </p>
                    <p>{editing.url || "Enlace público pendiente"}</p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveResource();
                  }}
                >
                  <div className="form-grid">
                    <Field
                      label="Título"
                      required
                      value={editing.title}
                      onChange={(v) => E({ ...editing, title: v })}
                    />
                    <label>
                      Categoría
                      <select
                        value={editing.category}
                        onChange={(e) =>
                          E({ ...editing, category: e.target.value })
                        }
                      >
                        {d.categories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Fecha"
                      type="date"
                      value={editing.date}
                      onChange={(v) => E({ ...editing, date: v })}
                    />
                    <Field
                      label="Portada: URL HTTPS o ruta relativa"
                      value={editing.image}
                      onChange={(v) => E({ ...editing, image: v })}
                    />
                    <Field
                      label="Formato"
                      value={editing.format}
                      onChange={(v) => E({ ...editing, format: v })}
                    />
                    <Field
                      label="Tamaño"
                      value={editing.size}
                      onChange={(v) => E({ ...editing, size: v })}
                    />
                    <Field
                      label="Etiquetas separadas por comas"
                      value={editing.tags.join(",")}
                      onChange={(v) => E({ ...editing, tags: v.split(",") })}
                    />
                    <Field
                      label="Enlace público de descarga (HTTPS)"
                      value={editing.url}
                      onChange={(v) => E({ ...editing, url: v })}
                    />
                    <Field
                      label="Orden (menor primero)"
                      type="number"
                      value={String(editing.order)}
                      onChange={(v) => E({ ...editing, order: Number(v) })}
                    />
                  </div>
                  <label>
                    Seleccionar portada desde este equipo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          safe(() =>
                            stageImage(f, (path) =>
                              E({ ...editing, image: path }),
                            ),
                          );
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Field
                    label="Descripción"
                    type="textarea"
                    value={editing.description}
                    onChange={(v) => E({ ...editing, description: v })}
                  />
                  <label>
                    Archivo local para preparar la publicación
                    <input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          safe(async () => {
                            await fileStore("put", editing.id, f);
                            F({ ...files, [editing.id]: f.name });
                            E({
                              ...editing,
                              size: (f.size / 1024 / 1024).toFixed(2) + " MB",
                              format:
                                f.name.split(".").pop()?.toUpperCase() || "",
                            });
                            M(
                              "Archivo guardado localmente, pendiente de subir a Releases.",
                            );
                          });
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {files[editing.id] && (
                    <p>
                      Archivo local pendiente: {files[editing.id]}{" "}
                      <button
                        type="button"
                        onClick={() =>
                          safe(async () => {
                            await fileStore("delete", editing.id);
                            F({ ...files, [editing.id]: "" });
                          })
                        }
                      >
                        Quitar archivo local
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() =>
                          safe(async () => {
                            const file = (await fileStore(
                              "get",
                              editing.id,
                            )) as File | undefined;
                            if (!file) throw Error("No hay archivo local.");
                            M("Subiendo a GitHub Releases…");
                            const url = await session.uploadRelease(
                              file,
                              editing.title,
                            );
                            E({ ...editing, url });
                            M(
                              "Archivo subido a Releases. Guardá el recurso y pulsá Publicar cambios para publicar su ficha.",
                            );
                          })
                        }
                      >
                        Subir archivo a GitHub Releases
                      </button>
                    </p>
                  )}
                  <p className="muted">
                    {editing.published
                      ? "Se publicará al guardar los cambios en GitHub"
                      : editing.url
                        ? "Enlace público configurado; sin publicar"
                        : "Pendiente de enlace público"}
                  </p>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={editing.published}
                      onChange={(e) =>
                        E({ ...editing, published: e.target.checked })
                      }
                    />
                    Visible después de publicar los cambios
                  </label>
                  <div className="actions">
                    <button type="submit" className="primary">
                      <Save size={16} />
                      Guardar recurso
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm("¿Descartar los campos de este formulario?")
                        )
                          E(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <>
              <div className="section-heading">
                <h2>Descargas</h2>
                <button onClick={addResource} disabled={!d.categories.length}>
                  <Plus size={16} />
                  Crear recurso
                </button>
              </div>
              {d.resources.map((r) => (
                <div className="listrow" key={r.id}>
                  <div>
                    <strong>{r.title}</strong>
                    <small>
                      {r.published
                        ? "Visible en la próxima publicación"
                        : r.url
                          ? "Enlace configurado"
                          : "Borrador"}
                      {files[r.id] ? " · Archivo local pendiente" : ""}
                    </small>
                  </div>
                  <div className="actions">
                    <button onClick={() => E(structuredClone(r))}>
                      Editar
                    </button>
                    <button
                      aria-label={"Eliminar " + r.title}
                      onClick={() => {
                        if (confirm("¿Eliminar este recurso del borrador?"))
                          set(
                            "resources",
                            d.resources.filter((x) => x.id !== r.id),
                          );
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
          <section className="panel">
            <h2>Categorías</h2>
            {d.categories.map((c) => (
              <div className="form-row" key={c.id}>
                <Field
                  label="Nombre de categoría"
                  value={c.name}
                  onChange={(v) =>
                    set(
                      "categories",
                      d.categories.map((x) =>
                        x.id === c.id ? { ...x, name: v } : x,
                      ),
                    )
                  }
                />
                <button
                  aria-label={"Eliminar categoría " + c.name}
                  onClick={() => {
                    if (d.resources.some((r) => r.category === c.id)) {
                      M("Primero reasigná los recursos de esta categoría.");
                      return;
                    }
                    if (confirm("¿Eliminar categoría?"))
                      set(
                        "categories",
                        d.categories.filter((x) => x.id !== c.id),
                      );
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                set("categories", [
                  ...d.categories,
                  { id: uid(), name: "Nueva categoría" },
                ])
              }
            >
              + Agregar categoría
            </button>
          </section>
        </>
      )}
      {tab === "BIO" && (
        <>
          <button onClick={() => P(!preview)}>
            <Eye size={16} />
            {preview ? "Volver al editor" : "Previsualizar BIO"}
          </button>
          {preview ? (
            <BioView d={d} />
          ) : (
            <section className="panel stack">
              <Field
                label="Nombre"
                value={d.bio.name}
                onChange={(v) => set("bio", { ...d.bio, name: v })}
              />
              <Field
                label="Imagen de perfil: URL o ruta relativa"
                value={d.bio.avatar}
                onChange={(v) => set("bio", { ...d.bio, avatar: v })}
              />
              <label>
                Seleccionar foto de perfil
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      safe(() =>
                        stageImage(f, (path) =>
                          set("bio", { ...d.bio, avatar: path }),
                        ),
                      );
                    e.target.value = "";
                  }}
                />
              </label>
              <Field
                label="Descripción personal"
                type="textarea"
                value={d.bio.description}
                onChange={(v) => set("bio", { ...d.bio, description: v })}
              />
              <Field
                label="Sobre el canal"
                type="textarea"
                value={d.bio.channelDescription}
                onChange={(v) =>
                  set("bio", { ...d.bio, channelDescription: v })
                }
              />
              <h3>Redes y enlaces</h3>
              <Links
                value={d.bio.links}
                onChange={(v) => set("bio", { ...d.bio, links: v })}
              />
              <h3>Proyectos destacados</h3>
              {d.bio.projects.map((p, i) => (
                <div className="panel stack" key={i}>
                  {(["title", "description", "url"] as const).map((k) => (
                    <Field
                      key={k}
                      label={
                        {
                          title: "Título",
                          description: "Descripción",
                          url: "URL HTTPS",
                        }[k]
                      }
                      value={p[k]}
                      onChange={(v) =>
                        set("bio", {
                          ...d.bio,
                          projects: d.bio.projects.map((x, j) =>
                            j === i ? { ...x, [k]: v } : x,
                          ),
                        })
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      set("bio", {
                        ...d.bio,
                        projects: d.bio.projects.filter((_, j) => i !== j),
                      })
                    }
                  >
                    Eliminar proyecto
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  set("bio", {
                    ...d.bio,
                    projects: [
                      ...d.bio.projects,
                      { title: "Nuevo proyecto", description: "", url: "" },
                    ],
                  })
                }
              >
                + Agregar proyecto
              </button>
            </section>
          )}
        </>
      )}
      {tab === "Configuración" && (
        <section className="panel stack">
          {(
            [
              "name",
              "description",
              "logo",
              "accent",
              "channelId",
              "channelUrl",
              "repositoryUrl",
            ] as const
          ).map((k) => (
            <Field
              key={k}
              label={
                {
                  name: "Nombre de la aplicación",
                  description: "Descripción de bienvenida",
                  logo: "Logo: URL HTTPS o ruta relativa",
                  accent: "Color principal",
                  channelId: "Channel ID de YouTube (UC…)",
                  channelUrl: "URL oficial del canal",
                  repositoryUrl: "URL del repositorio",
                }[k]
              }
              type={k === "accent" ? "color" : "text"}
              value={d.settings[k]}
              onChange={(v) => set("settings", { ...d.settings, [k]: v })}
            />
          ))}
          <label>
            Seleccionar logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  safe(() =>
                    stageImage(f, (path) =>
                      set("settings", { ...d.settings, logo: path }),
                    ),
                  );
                e.target.value = "";
              }}
            />
          </label>
          <label>
            Tema predeterminado
            <select
              value={d.settings.theme}
              onChange={(e) =>
                set("settings", {
                  ...d.settings,
                  theme: e.target.value as "dark" | "light",
                })
              }
            >
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </select>
          </label>
          <h3>Enlaces oficiales del pie de página</h3>
          <Links
            value={d.settings.links}
            onChange={(v) => set("settings", { ...d.settings, links: v })}
          />
          <p>
            Estos ajustes se aplicarán a la app pública después de pulsar
            Publicar cambios y completarse el despliegue.
          </p>
          <div className="panel" style={{ borderColor: d.settings.accent }}>
            <h3 style={{ color: d.settings.accent }}>{d.settings.name}</h3>
            <p>{d.settings.description}</p>
            {d.settings.logo && (
              <Picture src={d.settings.logo} alt="Vista previa del logo" />
            )}
          </div>
        </section>
      )}
      {tab === "Publicación" && (
        <>
          <section className="panel">
            <h2>De tu taller a la comunidad</h2>
            <ol className="steps">
              <li>Prepará los recursos, imágenes y la BIO.</li>
              <li>
                Si seleccionaste un descargable, pulsá Subir archivo a GitHub
                Releases desde su formulario. La subida del archivo lo hace
                público; la ficha aparecerá al publicar cambios.
              </li>
              <li>Guardá el recurso y pulsá Publicar cambios.</li>
              <li>
                Abrí Actions para comprobar la compilación y el despliegue.
                Puede tardar unos minutos.
              </li>
            </ol>
            <div className="actions">
              <button onClick={reloadRemote}>Recargar desde GitHub</button>
              <a
                className="button"
                href={session.actionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir Actions ↗
              </a>
            </div>
            <p>
              Si GitHub detecta un conflicto, conservá una copia del borrador y
              recargá antes de combinar los cambios. Las copias ZIP y JSON
              quedan disponibles como respaldo.
            </p>
          </section>
          <section className="panel">
            <h2>Archivos de contenido</h2>
            {keys.map((k) => (
              <div className="listrow" key={k}>
                <code>public/data/{k}.json</code>
                <button
                  disabled={busy}
                  onClick={() =>
                    safe(() => {
                      validate(d);
                      exportOne(k, d);
                    })
                  }
                >
                  Exportar
                </button>
              </div>
            ))}
            <label>
              Importar JSON individual o copia completa
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="muted">
              Para un JSON individual, conservá su nombre original. Las copias
              completas contienen los cinco documentos.
            </p>
          </section>
          <section className="panel">
            <h2>Copias y recuperación</h2>
            <div className="actions">
              <button
                onClick={() =>
                  safe(() => {
                    validate(d);
                    localStorage.setItem(backupKey, json(d));
                    download(
                      new Blob([json(d)], { type: "application/json" }),
                      "faricraft-backup.json",
                    );
                    M("Copia guardada y descargada.");
                  })
                }
              >
                Crear copia de seguridad
              </button>
              <button
                onClick={() =>
                  safe(() => {
                    const b = localStorage.getItem(backupKey);
                    if (!b) throw Error("No hay una copia guardada");
                    const next = validate(JSON.parse(b));
                    if (confirm("¿Restaurar la última copia local?")) {
                      U(d);
                      D(next);
                    }
                  })
                }
              >
                Restaurar copia
              </button>
              <button
                disabled={!undo}
                onClick={() => {
                  if (undo) {
                    D(undo);
                    U(null);
                  }
                }}
              >
                Deshacer último cambio
              </button>
              <button
                onClick={() =>
                  safe(() => {
                    if (
                      confirm(
                        "¿Descartar el borrador y recuperar los JSON publicados? Guardaremos una copia de seguridad.",
                      )
                    ) {
                      localStorage.setItem(backupKey, json(d));
                      U(d);
                      Stale(false);
                      D(structuredClone(remote));
                      E(null);
                      M(
                        "Se restauraron los datos publicados. Los archivos locales se conservaron.",
                      );
                    }
                  })
                }
              >
                Descartar borrador
              </button>
              <button
                onClick={() =>
                  safe(async () => {
                    if (
                      confirm(
                        "¿Borrar todos los archivos locales preparados? Esta acción no se puede deshacer.",
                      )
                    ) {
                      await fileStore("clear");
                      F({});
                      M("Archivos locales eliminados.");
                    }
                  })
                }
              >
                Limpiar archivos locales
              </button>
            </div>
          </section>
        </>
      )}
    </fieldset>
  );
}
