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
  const [q, Q] = useState(""),
    [cat, C] = useState(""),
    [sort, S] = useState("new");
  const { id } = useParams();
  const published = d.resources
    .filter((r) => r.published)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (page === "bio") return <BioView d={d} />;
  if (page === "videos")
    return (
      <>
        <span className="eyebrow">EL CANAL</span>
        <h1>Una aventura más.</h1>
        <p className="lead">Todos los videos del canal, en un solo lugar.</p>
        <VideosView d={d} />
        {d.settings.channelUrl && (
          <a
            className="button"
            href={d.settings.channelUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ir al canal ↗
          </a>
        )}
      </>
    );
  if (page === "detail") {
    const r = published.find((x) => x.id === id);
    return r ? (
      <>
        <Link to="/recursos">← Todas las descargas</Link>
        <div className="detail">
          <Picture src={r.image} alt={r.title} />
          <section>
            <span className="eyebrow">
              {d.categories.find((c) => c.id === r.category)?.name}
            </span>
            <h1>{r.title}</h1>
            <p className="prose">{r.description}</p>
            <div className="tags">
              {r.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <p>
              {r.format} · {r.size} · {r.date}
            </p>
            <a
              className="button primary"
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} />
              Descargar archivo
            </a>
            <p className="muted">Se abrirá el enlace público del archivo.</p>
          </section>
        </div>
      </>
    ) : (
      <Empty title="Descarga no disponible">
        Volvé a la biblioteca para explorar las descargas publicadas.
      </Empty>
    );
  }
  if (page === "recursos") {
    const list = published
      .filter(
        (r) =>
          (!cat || r.category === cat) &&
          (r.title + " " + r.tags.join(" "))
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
        <span className="eyebrow">HECHO PARA COMPARTIR</span>
        <h1>
          Tu próxima creación
          <br />
          empieza acá.
        </h1>
        <p className="lead">
          Wallpapers, renders y herramientas para llevarte a tu mundo.
        </p>
        <div className="toolbar">
          <label className="search">
            <Search size={20} />
            <input
              aria-label="Buscar descargas"
              placeholder="Buscar una descarga…"
              value={q}
              onChange={(e) => Q(e.target.value)}
            />
          </label>
          <select
            aria-label="Ordenar descargas"
            value={sort}
            onChange={(e) => S(e.target.value)}
          >
            <option value="new">Más recientes</option>
            <option value="old">Más antiguos</option>
            <option value="custom">Orden del creador</option>
          </select>
        </div>
        {
          <>
            <div className="chips">
              <button aria-pressed={!cat} onClick={() => C("")}>
                Todo
              </button>
              {d.categories.map((c) => (
                <button
                  aria-pressed={cat === c.id}
                  key={c.id}
                  onClick={() => C(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>Biblioteca</h2>
              <small>{list.length} descargas</small>
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
                    ? "No encontramos coincidencias"
                    : "Las buenas ideas están en camino"
                }
              >
                {published.length
                  ? "Probá otra búsqueda o categoría."
                  : "Cuando publique mis primeras descargas, vas a encontrarlos acá."}
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
            <span className="dot" /> EL ESPACIO DE FARICRAFT
          </span>
          <h1>
            Ideas que salen
            <br />
            del <em>bloque.</em>
          </h1>
          <p>{d.settings.description}</p>
          <div className="actions">
            <Link className="button primary" to="/recursos">
              Explorar descargas <ArrowRight size={18} />
            </Link>
            <Link className="button" to="/videos">
              Ver videos <Film size={18} />
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
    alt="Logo de Faricraft"
  />
) : (
  <span>F.</span>
)}
            <small>CREAR. JUGAR. COMPARTIR.</small>
          </div>
          <span className="art-caption">FARICRAFT APP</span>
        </div>
      </section>
      <div className="quick-grid">
        {[
          ["/videos", "Videos", "Una partida, una nueva historia.", Film],
          [
            "/recursos",
            "Descargas",
            "Un toque de Faricraft.",
            Box,
          ],
          ["/bio", "Sobre mí", "Conocé quién está detrás.", UserRound],
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
        <h2>Lo último del canal</h2>
        <Link to="/videos">Todos los videos ↗</Link>
      </div>
      <VideosView d={d} limit={1} />
      <div className="section-heading">
        <h2>Recién creados</h2>
        <Link to="/recursos">Ver biblioteca ↗</Link>
      </div>
      {published.length ? (
        <div className="grid">
          {published.slice(0, 3).map((r) => (
            <ResourceCard r={r} d={d} key={r.id} />
          ))}
        </div>
      ) : (
        <Empty title="Espacio reservado para lo que viene">
          Las descargas aparecerán aquí cuando estén publicadas.
        </Empty>
      )}
      {d.settings.channelUrl && (
        <a
          className="button"
          href={d.settings.channelUrl}
          target="_blank"
          rel="noreferrer"
        >
          Visitar mi canal de YouTube ↗
        </a>
      )}
    </>
  );
}
