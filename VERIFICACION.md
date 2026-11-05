# Verificación · versión 2

5 de noviembre de 2026.

## Realizado

- Compilación TypeScript estricta y producción Vite.
- 16 pruebas TypeScript con API simulada: esquema de contenido, importación/round-trip, borradores incompletos, validación antes de escribir, conexión rechazada, repositorios inválidos, publicación en un commit, incorporación de imágenes, conflictos, carrera en la referencia de rama, bloqueo de force push, cierre de sesión, destino permitido para subida de Releases y secuencia de publicación del Release.
- Dos pruebas Python del feed: Atom válido y conservación del último resultado ante respuesta corrupta.
- Navegador: entrada Administrar abre el formulario de repositorio y token; el editor no aparece sin conectar. El código secreto anterior se comporta como una búsqueda normal y no abre acceso alguno.
- Revisión de fuente/compilado: sin el código secreto, sin autorización de sessionStorage y sin tokens reales. Los tokens de los tests son ficticios.
- GitHubSession mantiene la credencial únicamente en memoria y la envía solo a api.github.com / uploads.github.com. No se incluyen secretos en el ZIP.
- Borradores separados por repositorio/rama; registro de la base original para detectar borradores anteriores a cambios remotos. Actualización no forzada y sin reintentos automáticos de escritura.
- Workflow Pages con push a main, ejecución manual y despliegue después del actualizador de videos.

## Pendiente en tu cuenta

No se recibió token ni repositorio de producción, y no se hicieron escrituras reales en GitHub. Falta probar conexión con permisos efectivos, creación de Releases y subida binaria desde el navegador, políticas de rama y ejecución/despliegue de Actions. Los tests de esas operaciones usaron respuestas simuladas; no equivalen a un despliegue verificado.

Faltan Channel ID, recursos y enlaces oficiales del usuario. No se probaron videos reales, descargas existentes, APK ni dispositivo Android. El README detalla la configuración inicial y los ajustes nativos futuros.

La interfaz pública original fue revisada en navegador en la primera versión. En esta modificación se comprobó la nueva puerta de acceso; los formularios autenticados no se probaron contra una cuenta real.
