import { useEffect, useState, type MutableRefObject } from "react";
import type { z } from "zod";
import { Resource, resourceEdition } from "../services/schema";
type Edition = z.infer<typeof resourceEdition>;
const languages = [{ code: "en", label: "Inglés" }, { code: "pt", label: "Portugués" }] as const;
export function ResourceEditionsEditor({ resource, book, onChange, onUpload, onBusy, onPending, saveRef }: {
  saveRef: MutableRefObject<(() => Promise<Resource>) | null>;
  resource: Resource;
  book: boolean;
  onChange: (resource: Resource) => void;
  onUpload: (file: File, title: string) => Promise<string>;
  onBusy: (busy: boolean) => void;
  onPending: (pending: boolean) => void;
}) {
  const [language, setLanguage] = useState<"en" | "pt">("en");
  const [files, setFiles] = useState<Partial<Record<"en" | "pt", File>>>({});
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { onPending(Object.values(files).some(Boolean)); }, [files, onPending]);
  useEffect(() => () => onPending(false), [onPending]);
  saveRef.current = async () => {
    let next = resource;
    for (const { code } of languages) {
      const file = files[code];
      if (!file) continue;
      setMessage("Subiendo edición de " + code + " a GitHub…");
      const url = await onUpload(file, (next.editions?.[code]?.title || next.title) + " - " + code);
      next = { ...next, editions: { ...next.editions, [code]: {
        ...next.editions?.[code], url,
        format: file.name.split(".").pop()?.toUpperCase() || "",
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      } } };
      onChange(next);
      setFiles(current => ({ ...current, [code]: undefined }));
    }
    return next;
  };
  useEffect(() => () => { saveRef.current = null; }, [saveRef]);
  const edition = resource.editions?.[language] || {};
  const update = (value: Partial<Edition>) => onChange({ ...resource,
    editions: { ...resource.editions, [language]: { ...edition, ...value } },
  });
  const field = (key: keyof Edition, label: string, multiline = false) => <label key={key}>
    {label}
    {multiline ? <textarea value={edition[key] ?? ""} onChange={event => update({ [key]: event.target.value })} />
      : <input value={edition[key] ?? ""} onChange={event => update({ [key]: event.target.value })} />}
  </label>;
  return <fieldset className="edition-editor" disabled={uploading}>
    <legend>Ediciones por idioma (opcionales)</legend>
    <p>La edición principal es la de español. Si no agregás una edición para un idioma, se muestra la principal. Podés traducir el texto y usar el mismo archivo, o subir un archivo diferente.</p>
    <label>Idioma de la edición
      <select value={language} onChange={event => { setLanguage(event.target.value as "en" | "pt"); setMessage(""); }}>
        {languages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>
    <div className="form-grid">
      {field("title", "Título traducido (opcional)")}
      {field("url", book ? "Enlace de descarga del PDF de esta edición (HTTPS)" : "Enlace de descarga de esta edición (HTTPS)")}
      {field("format", "Formato de esta edición (opcional)")}
      {field("size", "Tamaño de esta edición (opcional)")}
      {book && field("viewUrl", "Ver online: enlace de esta edición (HTTPS, por ejemplo FlipHTML5)")}
    </div>
    {field("description", "Descripción de esta edición (opcional)", true)}
    <label>Subir archivo de esta edición
      <input type="file" accept={book ? ".pdf" : undefined} onChange={event => {
        const file = event.target.files?.[0];
        if (file) setFiles({ ...files, [language]: file });
        event.target.value = "";
      }} />
    </label>
    {files[language] && <p>Archivo seleccionado: {files[language]!.name} — pendiente de subir.
      <button type="button" onClick={async () => {
        const file = files[language]!;
        setUploading(true); onBusy(true); setMessage("Subiendo a GitHub…");
        try {
          const url = await onUpload(file, (edition.title || resource.title) + " - " + language);
          update({ url, format: file.name.split(".").pop()?.toUpperCase() || "", size: (file.size / 1024 / 1024).toFixed(2) + " MB" });
          setFiles({ ...files, [language]: undefined });
          setMessage("Archivo subido. Guardá el recurso y pulsá Publicar cambios para publicar esta edición.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo subir el archivo."); }
        finally { setUploading(false); onBusy(false); }
      }}>Subir edición a GitHub</button>
      <button type="button" onClick={() => setFiles({ ...files, [language]: undefined })}>Quitar archivo seleccionado</button>
    </p>}
    <p role="status">{message}</p>
    {resource.editions?.[language] && <button type="button" onClick={() => {
      if (!confirm("¿Quitar esta edición del borrador? El archivo publicado no se borra.")) return;
      const editions = { ...resource.editions }; delete editions[language];
      onChange({ ...resource, editions }); setFiles({ ...files, [language]: undefined });
    }}>Quitar edición de {languages.find(item => item.code === language)?.label.toLowerCase()}</button>}
  </fieldset>;
}
