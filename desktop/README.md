# Faricraft APP para Windows

Aplicación Electron que muestra https://faricraftyt.github.io/Faricraft-app/ en una ventana independiente. Necesita internet. Los cambios de la web aparecen al volver a abrir o actualizar la aplicación. No actualiza automáticamente el runtime de Electron: las nuevas versiones del ejecutable requieren otro instalador.

## Generar el instalador

Con Node.js instalado, desde esta carpeta:

```
npm ci
npm run build:win
```

Resultado: `release/Faricraft-APP-Setup-1.0.0.exe` (Windows x64). El asistente ofrece ubicación, accesos directos y desinstalación desde Configuración de Windows. El instalador no está firmado digitalmente.

El contenido web corre sin acceso a Node.js, con aislamiento de contexto y sandbox. Enlaces externos se abren en el navegador del sistema; solo se permiten esquemas HTTP, HTTPS y mailto. Los permisos de dispositivos se deniegan.
