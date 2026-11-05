import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  NavLink,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Home, Film, Box, UserRound, Sun, Moon } from "lucide-react";
import { Data, asset } from "./services/schema";
import { loadPublic } from "./services/storage";
import "./styles.css";
const Public = lazy(() => import("./pages/Public"));
const Admin = lazy(() => import("./pages/AdminGate"));
class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>No se pudo abrir esta sección.</h1>
        <p>Tus borradores siguen guardados en este navegador.</p>
        <button onClick={() => location.reload()}>Reintentar</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Loading() {
  return (
    <div className="loading" role="status" aria-label="Cargando">
      <div />
      <div />
      <div />
      <span>Cargando el espacio…</span>
    </div>
  );
}
function App() {
  const [d, D] = useState<Data | null>(null),
    [err, E] = useState(""),
    [theme, T] = useState(localStorage.getItem("faricraft-theme") || "");
  const loc = useLocation();
  useEffect(() => {
    loadPublic()
      .then((r) => D(r.data))
      .catch((e) => E(e.message));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("main")?.focus();
  }, [loc.pathname]);
  useEffect(() => {
    if (d) {
      document.documentElement.dataset.theme = theme || d.settings.theme;
      document.documentElement.style.setProperty("--accent", d.settings.accent);
      document.title = d.settings.name;
    }
  }, [d, theme]);
  if (err)
    return (
      <main>
        <h1>No pudimos cargar el contenido.</h1>
        <p role="alert">{err}</p>
        <p>Revisá los archivos JSON publicados y volvé a intentar.</p>
        <button onClick={() => location.reload()}>Reintentar</button>
      </main>
    );
  if (!d) return <Loading />;
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header>
        <NavLink className="brand" to="/">
          {d.settings.logo ? (
            <img src={asset(d.settings.logo)} alt="" />
          ) : (
            <span className="brand-icon">f.</span>
          )}
          <strong>
            {d.settings.name.replace(/ APP$/, "")}
            <small>APP</small>
          </strong>
        </NavLink>
        <nav aria-label="Navegación principal">
          {[
            ["/", "Inicio", Home],
            ["/videos", "Videos", Film],
            ["/recursos", "Recursos", Box],
            ["/bio", "BIO", UserRound],
          ].map(([path, name, Icon]: any) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={18} />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="theme"
          aria-label="Cambiar tema"
          onClick={() => {
            const v = (theme || d.settings.theme) === "dark" ? "light" : "dark";
            T(v);
            localStorage.setItem("faricraft-theme", v);
          }}
        >
          {(theme || d.settings.theme) === "dark" ? (
            <Sun size={20} />
          ) : (
            <Moon size={20} />
          )}
        </button>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Public d={d} page="home" />} />
            <Route path="/videos" element={<Public d={d} page="videos" />} />
            <Route
              path="/recursos"
              element={<Public d={d} page="recursos" />}
            />
            <Route
              path="/recursos/:id"
              element={<Public d={d} page="detail" />}
            />
            <Route path="/bio" element={<Public d={d} page="bio" />} />
            <Route path="/editor" element={<Admin published={d} />} />
            <Route
              path="*"
              element={
                <div>
                  <h1>Esta página no existe.</h1>
                  <NavLink to="/">Volver al inicio</NavLink>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <div>
          <strong>{d.settings.name}</strong>
          <p>Crear. Jugar. Compartir.</p>
        </div>
        <div>
          {d.settings.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
        <span>
          Hecho para la comunidad. · <NavLink to="/editor">Administrar</NavLink>
        </span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <HashRouter>
        <App />
      </HashRouter>
    </Boundary>
  </React.StrictMode>,
);
