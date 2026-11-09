import { useEffect, useState } from "react";
import { isAppEnvironment } from "../services/appEnvironment";
import { Download, Monitor, Smartphone } from "lucide-react";
import { t } from "../services/i18n";
import { asset } from "../services/schema";

const installers = [
  { name: "Windows", version: "1.2.1", file: "Faricraft-APP-Setup-1.2.1.exe", size: "2.03 MB", description: "Instalador ligero para Windows.", icon: Monitor },
  { name: "Linux", version: "1.0.0", file: "Faricraft-APP-Linux-1.0.0.deb", size: "17.4 KB", description: "Paquete .deb para Debian, Ubuntu y Linux Mint.", icon: Monitor },
  { name: "Android", version: "APK", file: "Faricraft-APP-Android.apk", size: "761 KB", description: "Instalá la app en tu celular Android.", icon: Smartphone },
];

export function AppDownloads() {
  const [insideApp, setInsideApp] = useState(() => isAppEnvironment());
  useEffect(() => {
    const detect = () => setInsideApp(isAppEnvironment());
    const timer = window.setInterval(detect, 500);
    window.addEventListener("pywebviewready", detect);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pywebviewready", detect);
    };
  }, []);
  if (insideApp) return null;
  return <section className="app-downloads" aria-labelledby="app-downloads-title">
    <span className="eyebrow">FARICRAFT APP</span>
    <h2 id="app-downloads-title">{t("Descargar Faricraft APP")}</h2>
    <p className="lead">{t("Llevá la app a tu PC o celular. Elegí tu sistema y descargá el instalador.")}</p>
    <div className="app-download-grid">
      {installers.map(({ name, version, file, size, description, icon: Icon }) => <article className="app-download-card" key={name}>
        <Icon size={28} aria-hidden="true" />
        <h3>{name}</h3>
        <p>{t(description)}</p>
        <small>{version} · {size}</small>
        <a className="button primary" href={asset("downloads/app/" + file)} download={file}>
          <Download size={18} aria-hidden="true" />{t("Descargar para")} {name}
        </a>
      </article>)}
    </div>
    <p className="muted">{t("Las apps necesitan conexión a internet para cargar el contenido actualizado.")}</p>
  </section>;
}
