# Faricraft APP · versión 2

Sitio estático de React, TypeScript y Vite con publicación directa mediante la API de GitHub. GitHub Pages sirve la web; el navegador envía los cambios autorizados a GitHub y GitHub Actions compila y despliega. No requiere proveedor externo de CMS, autenticación ni backend propio. Los videos usan YouTube.

## Qué cambió

- Se eliminó completamente el código secreto anterior y la autorización basada en sessionStorage.
- El enlace Administrar del pie de página abre `#/editor`. Conocer esa dirección no concede permisos de escritura.
- Para abrir el editor se conecta el repositorio con un token de GitHub limitado a ese repositorio. El token solo vive en memoria: no se guarda en localStorage, sessionStorage, IndexedDB, URLs, archivos exportados ni datos públicos. Se borra al desconectar, salir de la página o recargar.
- GitHub valida el token y los permisos de cada operación. La conexión comprueba identidad y lectura del proyecto; el permiso efectivo de escritura lo comprueba GitHub al guardar. El código del cliente puede ser público.
- Un usuario puede modificar la web en su propio navegador, pero no puede guardar en tu repositorio sin un token válido autorizado para él.
- Publicar cambios guarda los documentos modificados en un commit y dispara el despliegue automático. Las copias JSON y ZIP siguen disponibles como respaldo.

## Puesta en marcha: una sola vez

**Esta versión necesita el proyecto completo en GitHub, no solo el contenido de dist.** Si ya publicaste únicamente dist, reemplazá ese despliegue por esta estructura.

1. Descomprimí el ZIP y entrá en `faricraft-app`.
2. Creá un repositorio público de GitHub con rama `main`.
3. Subí el CONTENIDO de `faricraft-app` a la raíz. `package.json`, `src`, `public` y `.github` deben quedar en la raíz. No hace falta subir `dist` ni `node_modules`. En Windows, verificá que también se haya subido la carpeta `.github`.
4. En Settings → Pages, elegí **GitHub Actions** como Source.
5. En Actions, habilitá los workflows si GitHub lo solicita. Ejecutá **Publicar en Pages** manualmente la primera vez si el push inicial ocurrió antes de habilitar Pages.
6. Abrí la dirección que devuelve el despliegue. Desde ese momento, guardar en `main` recompila y publica automáticamente.

Esta configuración usa `main`. Si preferís otra rama, un desarrollador debe cambiarla en el workflow y en AdminGate.tsx. No hace falta tener Node instalado en tu PC para este método: compila GitHub Actions.

## Crear el token (en tu cuenta de GitHub)

1. Abrí Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Elegí un nombre y fecha de vencimiento.
3. En Repository access, marcá **Only select repositories** y seleccioná únicamente el de Faricraft APP.
4. En Repository permissions, asigná **Contents: Read and write**. Metadata: Read se incluye automáticamente. No otorgues permisos adicionales para workflows o administración.
5. Generá el token y copialo. Pegalo únicamente en el formulario Administrar de tu propia web.

https://github.com/settings/personal-access-tokens/new

Tratá el token como una contraseña. No lo pegues en chats, JSON, el código o el repositorio. Cuando venza, creá otro y usalo en la próxima conexión. Podés revocarlo desde GitHub. En organizaciones puede requerir aprobación del propietario.

## Tu flujo de publicación habitual

1. Abrí la web → **Administrar**.
2. Indicá `usuario/repositorio`, pegá el token y pulsá **Conectar con GitHub**. La conexión lee el contenido actual de `main`, aunque Pages todavía esté mostrando una versión anterior.
3. Editá recursos, categorías, BIO y configuración. Los metadatos del borrador se guardan localmente, separados por repositorio y rama; no son públicos hasta guardar en GitHub.
4. Para una portada, foto de perfil o logo, seleccioná una imagen local o indicá URL/ruta. Las imágenes seleccionadas se preparan localmente y se suben junto al contenido al publicar. Formatos: PNG, JPG, WEBP, GIF y AVIF, hasta 10 MB cada una. La vista previa de una imagen local puede mostrarse como marcador hasta que la imagen esté desplegada; el formulario indica su ruta preparada.
5. Para un descargable, seleccioná el archivo y pulsá **Subir archivo a GitHub Releases**. El panel crea un release en borrador, sube el archivo y después publica ese release. **Este paso hace público el archivo de descarga**, aunque todavía no aparezca la ficha en la app. El enlace se completa automáticamente en el formulario.
6. Guardá el recurso y pulsá **Publicar cambios**. El botón se activa cuando hay cambios respecto del contenido de GitHub. No se puede publicar con un formulario de recurso sin guardar.
7. El panel muestra el enlace al commit y a Actions. El commit guardado no significa que el despliegue haya terminado: revisá el resultado de Actions y esperá unos minutos antes de recargar la app pública.

El formulario permite descargables de hasta 100 MB para controlar memoria y tiempo de subida del navegador. Para archivos más grandes usá la página de GitHub Releases y pegá su URL pública. Se aplican los límites y políticas de GitHub; no es almacenamiento ilimitado.

Si una subida falla, se conserva el archivo local y puede quedar un release en borrador en GitHub. Revisá Releases antes de repetir. No se sobrescriben ni eliminan assets anteriores automáticamente. Eliminar una ficha de la app no elimina su Release.

## Conflictos, errores y copias

- La publicación usa un árbol Git y un commit para los documentos modificados. La referencia de la rama se actualiza sin force push.
- Antes de publicar se comparan los archivos modificados con la versión cargada al conectar. Si alguien cambió uno de ellos, se detiene la publicación en lugar de sobrescribirlo. Los cambios en otros documentos se preservan.
- `videos.json` es administrado por el actualizador del feed y nunca se sobrescribe desde el botón Publicar cambios.
- Si la rama avanza justo antes de guardar, GitHub puede rechazar el cambio; el panel informa del error y conserva el borrador. Si la red falla después de una solicitud, reconectá o recargá desde GitHub para comprobar si se guardó antes de reintentar.
- En Publicación → **Recargar desde GitHub** se recuperan los datos actuales y se guarda una copia anterior antes de reemplazar cambios locales.
- **Copia ZIP**, exportación JSON, importación validada, copia completa, restauración y deshacer siguen disponibles. No exportan el token.
- La copia ZIP es opcional, no forma parte del flujo habitual. Los binarios locales no se guardan en JSON ni base64; se guardan en IndexedDB. El transporte a GitHub puede usar base64 para crear blobs, sin incluirlo en el contenido JSON publicado.
- Cambiar de navegador, borrar sus datos o salir sin guardar un formulario puede perder datos locales. Guardá los recursos y usá una copia cuando necesites transportar un borrador.
- Los borradores de la versión 1 permanecen en su clave antigua y no se aplican automáticamente a un repositorio conectado. Podés importar una copia JSON de esa versión desde Publicación.

## Videos reales

Configurá el Channel ID (UC + 22 caracteres) en Configuración. Un handle como @Faricraft no lo reemplaza. Podés obtenerlo desde YouTube Studio o https://www.youtube.com/account_advanced.

El workflow **Actualizar videos** consulta el feed oficial cada seis horas o al ejecutarlo manualmente. Conserva los últimos datos si falla y registra el problema. Un evento `workflow_run` del workflow de Pages despliega después de una ejecución exitosa del actualizador, porque los commits realizados con GITHUB_TOKEN no disparan otros workflows de push por sí mismos.

Los horarios pueden retrasarse o desactivarse por inactividad/políticas de GitHub. No se probó el feed real de Faricraft porque falta su Channel ID. El reproductor se carga al pulsar reproducir; algunos videos impiden la inserción y pueden abrirse directamente en YouTube.

## Desarrollo local

Node.js 22 o posterior:

- `npm ci`
- `npm run dev`
- `npm test`
- `python scripts/test_feed.py`
- `npm run build`
- `npm run preview`

La carpeta `dist` incluye una compilación estática lista para inspeccionar con un servidor HTTP. No abrir index.html con doble clic. La base relativa `./` y HashRouter permiten dominios y subdirectorios. Las fuentes de la interfaz usan alternativas del sistema y no consultan proveedores de fuentes externos.

## Android

La interfaz tiene viewport adaptable, controles táctiles y área segura inferior. No se generó APK. Para Capacitor: inicializar appId propio y webDir `dist`, agregar Android, compilar y sincronizar. Hay que integrar @capacitor/app para Atrás nativo, @capacitor/filesystem y @capacitor/share para guardar/exportar, y @capacitor/browser o descargas nativas para enlaces externos. Probar selector de archivos, IndexedDB, reproductor, CORS y exportación en un dispositivo real. El token deberá seguir en memoria y no en archivos nativos persistentes.

## Referencias oficiales

- CORS de la API: https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests
- Árboles/commits: https://docs.github.com/en/rest/git/trees
- Actualización de referencias: https://docs.github.com/en/rest/git/refs
- Releases: https://docs.github.com/en/rest/releases/assets
- Tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

Consultá VERIFICACION.md para distinguir pruebas realizadas de la integración pendiente en tu cuenta.
