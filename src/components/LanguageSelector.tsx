import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { asset } from "../services/schema";
import { Language, setLanguage, t, useLanguage } from "../services/i18n";
const languages: { code: Language; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "ar" },
  { code: "en", label: "English", flag: "us" },
  { code: "pt", label: "Português", flag: "br" },
];
export function LanguageSelector() {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = languages.find(item => item.code === language)!;
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <div className="language-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="button language-trigger" type="button"
      aria-expanded={open} aria-controls="language-options"
      aria-label={t("Idioma") + ": " + current.label}
      onClick={() => setOpen(!open)}>
      <img src={asset("flags/" + current.flag + ".svg")} alt="" />
      <span>{current.label}</span><ChevronDown size={16} />
    </button>
    {open && <div className="language-options" id="language-options" role="group" aria-label={t("Idioma")}>
      {languages.map(item => <button type="button" key={item.code} lang={item.code}
        aria-pressed={language === item.code} onClick={() => {
          setLanguage(item.code); setOpen(false); trigger.current?.focus();
        }}>
        <img src={asset("flags/" + item.flag + ".svg")} alt="" />
        <span>{item.label}</span>{language === item.code && <Check size={16} />}
      </button>)}
    </div>}
  </div>;
}
