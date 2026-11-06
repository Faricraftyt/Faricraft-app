import { resourceForLanguage } from "../services/resourceEditions";
import { videoTitle } from "../services/videoTitles";
import { t, useLanguage, localeFor } from "../services/i18n";
import { Link } from "react-router-dom";
import { ArrowUpRight, FolderOpen, Play } from "lucide-react";
import { Data, Resource, asset, safeHref } from "../services/schema";
import { useState } from "react";
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
    <Link className="card" to={"/recursos/" + r.id}>
      <Picture src={r.image} alt={r.title} />
      <div className="cardbody">
        <small>
          {t(d.categories.find((c) => c.id === r.category)?.name || "")} ·{" "}
          {r.format || t("Recurso")}
        </small>
        <h3>
          {r.title} <ArrowUpRight size={18} />
        </h3>
        {r.description && <p>{r.description.slice(0, 110)}</p>}
      </div>
    </Link>
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
export function VideosView({ d, limit }: { d: Data; limit?: number }) {
  const language = useLanguage();
  const [playing, setPlaying] = useState("");
  return (
    <>
      {d.videos.error && (
        <p role="status" className="notice">{t("La última actualización falló. Se conserva el contenido disponible.")}</p>
      )}
      {!d.videos.items.length ? (
        <Empty title={t("Los próximos videos, acá")}>
          {d.settings.channelId
            ? t("Todavía no hay videos disponibles.")
            : t("El canal todavía no está configurado.")}
        </Empty>
      ) : (
        <div className="grid">
          {[...d.videos.items]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, limit)
            .map((v) => {
              const title = videoTitle(v, language);
              return (
              <article className="card" key={v.id}>
                {playing === v.id ? (
                  <iframe
                    title={title}
                    src={"https://www.youtube-nocookie.com/embed/" + v.id}
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
                  </button>
                )}
                <div className="cardbody">
                  {v.date && <small>{new Date(v.date).toLocaleDateString(localeFor(language))}</small>}
                  <h3>{title}</h3>
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
    </>
  );
}
