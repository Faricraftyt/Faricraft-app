import { PersonalActions } from "./Personal";
import { resourceForLanguage } from "../services/resourceEditions";
import { videoTitle } from "../services/videoTitles";
import { t, useLanguage, localeFor } from "../services/i18n";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, FolderOpen, Play, Search } from "lucide-react";
import { isNew } from "../services/newness";
import { isLivestream, matches } from "../services/search";
import { Data, Resource, asset, safeHref } from "../services/schema";
import { useEffect, useMemo, useState } from "react";
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={36} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Picture({ src, alt }: { src: string; alt: string }) {
  const [bad, setBad] = useState(false);
  return src && !bad ? (
    <img
      loading="lazy"
      src={asset(src)}
      alt={alt}
      onError={() => setBad(true)}
    />
  ) : (
    <div className="placeholder">
      <FolderOpen size={38} />
    </div>
  );
}
export function ResourceCard({ r: original, d }: { r: Resource; d: Data }) {
  const language = useLanguage();
  const r = resourceForLanguage(original, language);
  return (
    <article className="card resource-card"><Link className="resource-card-link" to={"/recursos/" + r.id}>
      <Picture src={r.image} alt={r.title} />
      <div className="cardbody">
        <small>
          {t(d.categories.find((c) => c.id === r.category)?.name || "")} ·{" "}
          {r.format || t("Recurso")} <NewBadge date={r.date} />
        </small>
        <h3>
          {r.title} <ArrowUpRight size={18} />
        </h3>
        {r.description && <p>{r.description.slice(0, 110)}</p>}
      </div>
    </Link><PersonalActions item={{id:r.id,title:r.title,url:"#/recursos/"+r.id,kind:"resource"}} /></article>
  );
}
export function BioView({ d }: { d: Data }) {
  useLanguage();
  return (
    <>
      <div className="bio-head">
        {d.bio.avatar ? (
          <Picture src={d.bio.avatar} alt={d.bio.name} />
        ) : (
          <div className="monogram">F.</div>
        )}
        <div>
          <span className="eyebrow">{t("DETRÁS DE LAS CREACIONES")}</span>
          <h1>{d.bio.name}</h1>
          <p>{t(d.bio.channelDescription)}</p>
        </div>
      </div>
      <section className="panel prose">
        <h2>{t("Un poco sobre mí")}</h2>
        <p>{t(d.bio.description)}</p>
        <div className="actions">
          {d.bio.links.map((l, i) => (
            <a
              className="button"
              href={safeHref(l.url)}
              target="_blank"
              rel="noreferrer"
              key={i}
            >
              {l.label}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </div>
      </section>
      {!!d.bio.projects.length && (
        <>
          <h2>{t("Proyectos destacados")}</h2>
          <div className="grid">
            {d.bio.projects.map((p, i) => (
              <article className="panel" key={i}>
                <h3>{t(p.title)}</h3>
                <p>{t(p.description)}</p>
                {p.url && (
                  <a href={safeHref(p.url)} target="_blank" rel="noreferrer">{t("Ver proyecto ↗")}</a>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export function NewBadge({ date }: { date: string }) {
  useLanguage();
  return isNew(date) ? <span className="new-badge">{t("NUEVO")}</span> : null;
}
type VideoFilter = "all" | "videos" | "live";
const PAGE = 12;
export function VideosView({ d, limit, browse }: { d: Data; limit?: number; browse?: boolean }) {
  const language = useLanguage();
  const [params] = useSearchParams();
  const focusId = params.get("v") || "";
  const [playing, setPlaying] = useState(focusId);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    if (!focusId) return;
    setPlaying(focusId);
    const index = sorted.findIndex((v) => v.id === focusId);
    if (index >= shown) setShown(index + 1);
    setTimeout(() => document.getElementById("video-" + focusId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);
  const sorted = useMemo(() => [...d.videos.items].sort((a, b) => b.date.localeCompare(a.date)), [d.videos.items]);
  const counts = useMemo(() => {
    const live = sorted.filter((v) => isLivestream(v.title)).length;
    return { all: sorted.length, live, videos: sorted.length - live };
  }, [sorted]);
  const filtered = browse
    ? sorted.filter((v) => {
        const live = isLivestream(v.title);
        if (filter === "live" && !live) return false;
        if (filter === "videos" && live) return false;
        return matches(q, videoTitle(v, language), v.title, v.description);
      })
    : sorted;
  const visible = filtered.slice(0, limit ?? (browse ? shown : undefined));
  return (
    <>
      {d.videos.error && (
        <p role="status" className="notice">{t("La última actualización falló. Se conserva el contenido disponible.")}</p>
      )}
      {browse && !!sorted.length && (
        <>
          <div className="toolbar">
            <label className="search">
              <Search size={20} />
              <input
                aria-label={t("Buscar videos")}
                placeholder={t("Buscar un video…")}
                value={q}
                onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
              />
            </label>
          </div>
          <div className="chips">
            {([["all", t("Todo")], ["videos", t("Videos")], ["live", t("Directos")]] as [VideoFilter, string][]).map(([id, name]) => (
              <button key={id} aria-pressed={filter === id} onClick={() => { setFilter(id); setShown(PAGE); }}>
                {name} <span className="chip-count">{counts[id]}</span>
              </button>
            ))}
          </div>
          <div className="section-heading">
            <h2>{t("Videos")}</h2>
            <small>{filtered.length} {t("videos")}</small>
          </div>
        </>
      )}
      {!sorted.length ? (
        <Empty title={t("Los próximos videos, acá")}>
          {d.settings.channelId
            ? t("Todavía no hay videos disponibles.")
            : t("El canal todavía no está configurado.")}
        </Empty>
      ) : !filtered.length ? (
        <Empty title={t("No encontramos coincidencias")}>{t("Probá otra búsqueda o categoría.")}</Empty>
      ) : (
        <div className="grid">
          {visible.map((v) => {
            const title = videoTitle(v, language);
            return (
              <article className={"card" + (v.id === focusId ? " focused" : "")} key={v.id} id={"video-" + v.id}>
                {playing === v.id ? (
                  <iframe
                    title={title}
                    src={"https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1"}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    className="video-cover"
                    onClick={() => setPlaying(v.id)}
                    aria-label={t("Reproducir ") + title}
                  >
                    <Picture src={v.thumbnail} alt="" />
                    <span>
                      <Play fill="currentColor" />
                    </span>
                    {isLivestream(v.title) && <em className="live-badge">{t("DIRECTO")}</em>}
                  </button>
                )}
                <div className="cardbody">
                  {v.date && <small>{new Date(v.date).toLocaleDateString(localeFor(language))} <NewBadge date={v.date} /></small>}
                  <h3>{title}</h3><PersonalActions item={{id:v.id,title,url:"https://www.youtube.com/watch?v="+v.id,kind:"video"}} />
                  <p>{v.description.slice(0, 160)}</p>
                  <a
                    href={"https://www.youtube.com/watch?v=" + v.id}
                    target="_blank"
                    rel="noreferrer"
                  >{t("Abrir en YouTube ↗")}</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {browse && visible.length < filtered.length && (
        <div className="load-more">
          <button className="button" onClick={() => setShown((n) => n + PAGE)}>
            {t("Cargar más")} ({filtered.length - visible.length})
          </button>
        </div>
      )}
    </>
  );
}
