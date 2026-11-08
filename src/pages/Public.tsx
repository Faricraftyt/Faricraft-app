import { PersonalActions, recordAction } from "../components/Personal";
import { isBook, resourceForLanguage } from "../services/resourceEditions";
import { t, useLanguage } from "../services/i18n";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Search,
  Download,
  Box,
  Film,
  UserRound,
} from "lucide-react";
import { Data, asset } from "../services/schema";
import {
  Empty,
  ResourceCard,
  Picture,
  VideosView,
  BioView,
} from "../components/UI";
export default function Public({ d, page }: { d: Data; page: string }) {
  const language = useLanguage();
  const [q, Q] = useState(""),
    [cat, C] = useState(""),
    [sort, S] = useState("new");
  const { id } = useParams();
  const published = d.resources
    .map(resource => resourceForLanguage(resource, language))
    .filter((r) => r.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (page === "bio") return <BioView d={d} />;
  if (page === "videos")
    return (
      <>
        <span className="eyebrow">{t("EL CANAL")}</span>
        <h1>{t("Una aventura más.")}</h1>
        <p className="lead">{t("Todos los videos del canal, en un solo lugar.")}</p>
        <VideosView d={d} />
        {d.settings.channelUrl && (
          <a
            className="button"
            href={d.settings.channelUrl}
            target="_blank"
            rel="noreferrer"
          >{t("Ir al canal ↗")}</a>
        )}
      </>
    );
  if (page === "detail") {
    const r = published.find((x) => x.id === id);
    return r ? (
      <>
        <Link to="/recursos">{t("← Todas las descargas")}</Link>
        <div className="detail">
          <Picture src={r.image} alt={r.title} />
          <section>
            <span className="eyebrow">
              {t(d.categories.find((c) => c.id === r.category)?.name || "")}
            </span>
            <h1>{r.title}</h1>
            {r.description && <p className="prose">{r.description}</p>}
            <div className="tags">
              {r.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <p>
              {r.format} · {r.size} · {r.date}
            </p>
            <PersonalActions item={{id:r.id,title:r.title,url:"#/recursos/"+r.id,kind:"resource"}} /><div className="actions"><a
              className="button primary"
              onClick={() => recordAction({id:r.id,title:r.title,url:"#/recursos/"+r.id,kind:"resource"}, "download")}
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} />{t(isBook(r.category, d.categories) && r.format.toUpperCase() === "PDF" ? "Descargar PDF" : "Descargar archivo")}</a>
            {r.viewUrl && <a className="button" onClick={() => recordAction({id:r.id,title:r.title,url:"#/recursos/"+r.id,kind:"resource"}, "read")} href={r.viewUrl} target="_blank" rel="noreferrer">{t("Leer online")} ↗</a>}
            </div>
            <p className="muted">{t("Se abrirá el enlace público del archivo.")}</p>
          </section>
        </div>
      </>
    ) : (
      <Empty title={t("Descarga no disponible")}>{t("Volvé a la biblioteca para explorar las descargas publicadas.")}</Empty>
    );
  }
  if (page === "recursos") {
    const list = published
      .filter(
        (r) =>
          (!cat || r.category === cat) &&
          (r.title + " " + r.description + " " + r.tags.join(" "))
            .toLowerCase()
            .includes(q.toLowerCase()),
      )
      .sort((a, b) =>
        sort === "old"
          ? a.date.localeCompare(b.date)
          : sort === "custom"
            ? a.order - b.order
            : b.date.localeCompare(a.date),
      );
    return (
      <>
        <span className="eyebrow">{t("HECHO PARA COMPARTIR")}</span>
        <h1>{t("Descarga todos los recursos")}</h1>
        <p className="lead">{t("Todos los archivos y proyectos que te enseño en mi canal.. o no")}</p>
        <div className="toolbar">
          <label className="search">
            <Search size={20} />
            <input
              aria-label={t("Buscar descargas")}
              placeholder={t("Buscar una descarga…")}
              value={q}
              onChange={(e) => Q(e.target.value)}
            />
          </label>
          <select
            aria-label={t("Ordenar descargas")}
            value={sort}
            onChange={(e) => S(e.target.value)}
          >
            <option value="new">{t("Más recientes")}</option>
            <option value="old">{t("Más antiguos")}</option>
            <option value="custom">{t("Orden del creador")}</option>
          </select>
        </div>
        {
          <>
            <div className="chips">
              <button aria-pressed={!cat} onClick={() => C("")}>{t("Todo")}</button>
              {d.categories.map((c) => (
                <button
                  aria-pressed={cat === c.id}
                  key={c.id}
                  onClick={() => C(c.id)}
                >
                  {t(c.name)}
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>{t("Biblioteca")}</h2>
              <small>{list.length} {t("descargas")}</small>
            </div>
            {list.length ? (
              <div className="grid">
                {list.map((r) => (
                  <ResourceCard r={r} d={d} key={r.id} />
                ))}
              </div>
            ) : (
              <Empty
                title={
                  published.length
                    ? t("No encontramos coincidencias")
                    : t("Las buenas ideas están en camino")
                }
              >
                {published.length
                  ? t("Probá otra búsqueda o categoría.")
                  : t("Cuando publique mis primeras descargas, vas a encontrarlos acá.")}
              </Empty>
            )}
          </>
        }{" "}
      </>
    );
  }
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="dot" />{t("EL ESPACIO DE FARICRAFT")}</span>
          <h1>{t("Ideas que salen")}<br />{t("del")} {" "}<em>{t("bloque.")}</em>
          </h1>
          <p>{t(d.settings.description)}</p>
          <div className="actions">
            <Link className="button primary" to="/recursos">{t("Explorar descargas")}<ArrowRight size={18} />
            </Link>
            <Link className="button" to="/videos">{t("Ver videos")}<Film size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-lines" />
          <div className="art-frame">
            {d.settings.logo ? (
  <img
    className="hero-logo"
    src={asset(d.settings.logo)}
    alt={t("Logo de Faricraft")}
  />
) : (
  <span>F.</span>
)}
            <small>{t("CREAR. JUGAR. COMPARTIR.")}</small>
          </div>
          <span className="art-caption">FARICRAFT APP</span>
        </div>
      </section>
      <div className="quick-grid">
        {[
          ["/videos", t("Videos"), t("Una partida, una nueva historia."), Film],
          [
            "/recursos",
            t("Descargas"),
            t("Un toque de Faricraft."),
            Box,
          ],
          ["/bio", t("Sobre mí"), t("Conocé quién está detrás."), UserRound],
        ].map(([url, title, desc, Icon]: any) => (
          <Link className="quick" to={url} key={url}>
            <Icon />
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
      <div className="section-heading">
        <h2>{t("Lo último del canal")}</h2>
        <Link to="/videos">{t("Todos los videos ↗")}</Link>
      </div>
      <VideosView d={d} limit={1} />
      <div className="section-heading">
        <h2>{t("Recién creados")}</h2>
        <Link to="/recursos">{t("Ver biblioteca ↗")}</Link>
      </div>
      {published.length ? (
        <div className="grid">
          {published.slice(0, 3).map((r) => (
            <ResourceCard r={r} d={d} key={r.id} />
          ))}
        </div>
      ) : (
        <Empty title={t("Espacio reservado para lo que viene")}>{t("Las descargas aparecerán aquí cuando estén publicadas.")}</Empty>
      )}
      {d.settings.channelUrl && (
        <a
          className="button"
          href={d.settings.channelUrl}
          target="_blank"
          rel="noreferrer"
        >{t("Visitar mi canal de YouTube ↗")}</a>
      )}
    </>
  );
}
