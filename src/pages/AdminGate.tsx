import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Data } from "../services/schema";
import { GitHubSession, parseRepository } from "../services/github";
import Admin from "./Admin";
export default function AdminGate({ published }: { published: Data }) {
  const [session, S] = useState<GitHubSession | null>(null),
    [repo, R] = useState(published.settings.repositoryUrl),
    [branch] = useState("main"),
    [token, T] = useState(""),
    [busy, Q] = useState(false),
    [error, E] = useState("");
  useEffect(() => () => session?.disconnect(), [session]);
  const disconnect = () => {
    session?.disconnect();
    S(null);
    T("");
  };
  if (session)
    return (
      <Admin
        key={
          session.target.owner +
          "/" +
          session.target.repo +
          "/" +
          session.target.branch
        }
        published={session.snapshot.data}
        session={session}
        disconnect={disconnect}
      />
    );
  return (
    <section className="panel connect-panel">
      <span className="eyebrow">ADMINISTRACIÓN</span>
      <h1>Conectá tu repositorio.</h1>
      <p>
        GitHub comprueba quién puede guardar cambios. El token se usa solo
        durante esta sesión y se borra al salir o recargar.
      </p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          Q(true);
          E("");
          let candidate: GitHubSession | undefined;
          try {
            candidate = new GitHubSession(token, {
              ...parseRepository(repo),
              branch,
            });
            await candidate.connect();
            T("");
            S(candidate);
          } catch (err) {
            candidate?.disconnect();
            T("");
            E(err instanceof Error ? err.message : "No se pudo conectar.");
          } finally {
            Q(false);
          }
        }}
      >
        <label>
          Repositorio de GitHub
          <input
            required
            placeholder="usuario/repositorio"
            value={repo}
            onChange={(e) => R(e.target.value)}
            disabled={busy}
          />
        </label>
        <p className="muted">Rama de publicación: main.</p>
        <label>
          Token de acceso limitado
          <input
            type="password"
            required
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => T(e.target.value)}
            disabled={busy}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Comprobando acceso…" : "Conectar con GitHub"}
        </button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <details>
        <summary>Primera conexión: cómo crear el token</summary>
        <ol>
          <li>
            En GitHub, abrí Settings → Developer settings → Personal access
            tokens → Fine-grained tokens.
          </li>
          <li>
            Creá uno con vencimiento y elegí solo el repositorio de Faricraft
            APP.
          </li>
          <li>
            En Repository permissions, otorgá{" "}
            <strong>Contents: Read and write</strong>. Metadata: Read se incluye
            automáticamente. No hace falta permiso para editar workflows.
          </li>
          <li>
            Copialo y pegalo únicamente en este formulario. No lo subas al
            repositorio ni lo compartas por chat.
          </li>
        </ol>
        <p>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            Crear token en GitHub ↗
          </a>
        </p>
      </details>
      <p className="muted">
        La primera vez tenés que subir el proyecto completo y activar GitHub
        Actions en Pages. La guía incluida explica esos pasos. Los visitantes no
        necesitan una cuenta.
      </p>
      <Link to="/">← Volver a la app</Link>
    </section>
  );
}
