import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CornerDownLeft, Film, Search, X } from "lucide-react";
import { Data } from "../services/schema";
import { t, useLanguage } from "../services/i18n";
import { matches } from "../services/search";
import { resourceForLanguage } from "../services/resourceEditions";
import { videoTitle } from "../services/videoTitles";

type Hit = { key: string; title: string; detail: string; kind: "video" | "resource"; go: () => void };

/** Global search (Ctrl/⌘+K or "/") over every video and download. */
export function SearchPalette({ d }: { d: Data }) {
  const language = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const show = () => { setQ(""); setActive(0); setOpen(true); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || "");
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  const hits = useMemo<Hit[]>(() => {
    if (!q.trim()) return [];
    const close = () => setOpen(false);
    const resources: Hit[] = d.resources
      .map((r) => resourceForLanguage(r, language))
      .filter((r) => r.published && matches(q, r.title, r.description, r.tags.join(" "), r.format))
      .map((r) => ({
        key: "r" + r.id,
        title: r.title,
        detail: t(d.categories.find((c) => c.id === r.category)?.name || "") + " · " + r.format,
        kind: "resource",
        go: () => { close(); navigate("/recursos/" + r.id); },
      }));
    const videos: Hit[] = d.videos.items
      .filter((v) => matches(q, videoTitle(v, language), v.title, v.description))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((v) => ({
        key: "v" + v.id,
        title: videoTitle(v, language),
        detail: t("Video") + " · " + v.date.slice(0, 10),
        kind: "video",
        go: () => { close(); navigate("/videos?v=" + v.id); },
      }));
    return [...resources, ...videos].slice(0, 30);
  }, [q, d, language, navigate]);

  useEffect(() => setActive(0), [q]);

  return (
    <>
      <button className="search-trigger" onClick={show} aria-label={t("Buscar en todo Faricraft")}>
        <Search size={18} />
        <span>{t("Buscar")}</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <div className="palette-backdrop" onMouseDown={() => setOpen(false)}>
          <div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label={t("Buscar en todo Faricraft")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <label className="palette-input">
              <Search size={20} />
              <input
                ref={input}
                autoFocus
                value={q}
                placeholder={t("Buscar videos y descargas…")}
                aria-label={t("Buscar en todo Faricraft")}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  else if (e.key === "Enter") hits[active]?.go();
                }}
              />
              <button className="palette-close" onClick={() => setOpen(false)} aria-label={t("Cerrar")}><X size={18} /></button>
            </label>
            <ul className="palette-results" role="listbox">
              {q.trim() && !hits.length && <li className="palette-empty">{t("No encontramos coincidencias")}</li>}
              {!q.trim() && <li className="palette-empty">{t("Escribí para buscar entre todos los videos y descargas.")}</li>}
              {hits.map((h, i) => (
                <li key={h.key} role="option" aria-selected={i === active}>
                  <button onMouseEnter={() => setActive(i)} onClick={h.go}>
                    {h.kind === "video" ? <Film size={18} /> : <Box size={18} />}
                    <span>
                      <strong>{h.title}</strong>
                      <small>{h.detail}</small>
                    </span>
                    {i === active && <CornerDownLeft size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
