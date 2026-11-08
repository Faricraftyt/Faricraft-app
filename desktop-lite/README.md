# Faricraft APP 1.1.0 — Windows x64

Cliente WinForms/.NET Framework 4.8 con Microsoft Edge WebView2 Evergreen. Carga la web de Faricraft APP y requiere internet. Usa el runtime compartido del equipo, sin empaquetar Chromium ni Node.js. Windows 11 incluye .NET Framework 4.8 o posterior y normalmente WebView2.

El instalador NSIS registra la desinstalación, permite elegir la carpeta, crea entradas del menú Inicio y ofrece acceso directo al escritorio. Si no encuentra WebView2, ejecuta el bootstrapper oficial de Microsoft, que necesita internet para descargar el runtime. Este componente y su perfil pueden ocupar espacio adicional; no se incluyen en el tamaño propio de la aplicación.

La versión 1.0.0 con Electron debe desinstalarse primero desde Configuración de Windows para recuperar su espacio. La nueva versión usa una carpeta independiente. El perfil de navegación se guarda en LocalAppData/Faricraft APP/WebView2 y se conserva al desinstalar; WebView2 compartido tampoco se elimina. No se migran cookies o preferencias de Electron. Actualizar la web no requiere otro instalador; modificar el ejecutable sí.

## Compilar en Windows

Requisitos: SDK de .NET 8 o posterior y NSIS 3 instalado en su ruta predeterminada. Ejecutar `build.ps1`. El script descarga los paquetes oficiales de NuGet, valida la firma del bootstrapper de Microsoft y genera `release/Faricraft-APP-Setup-1.1.0-Ligero.exe`.

El proyecto se puede compilar desde Linux con el mismo SDK. Para el instalador se usa makensis nativo de Linux; el script NSIS genera su desinstalador sin ejecutar binarios de Windows.

## Validación

Compilación Release sin errores ni advertencias. Instalador y desinstalador generados con NSIS. Comprobación de binarios PE, arquitectura x64 y dependencias incluidas. No se ha ejecutado la interfaz ni probado la instalación/desinstalación en Windows.

El instalador y la aplicación no están firmados digitalmente. La reducción de tamaño no elimina restricciones de Smart App Control ni avisos de editor desconocido.
