const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const HOME = 'https://faricraftyt.github.io/Faricraft-app/';
const base = new URL(HOME);
const offlinePath = path.join(__dirname, 'offline.html');
let win;
function internal(value) {
  try { const u = new URL(value); return u.origin === base.origin && u.pathname.startsWith(base.pathname); }
  catch { return false; }
}
function external(value) {
  try { if (['https:', 'http:', 'mailto:'].includes(new URL(value).protocol)) shell.openExternal(value).catch(() => {}); }
  catch {}
}
function openHome() { if (win && !win.isDestroyed()) win.loadURL(HOME).catch(() => {}); }
function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 800, minWidth: 420, minHeight: 560,
    title: 'Faricraft APP', backgroundColor: '#111512', icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => {
    if (!internal(url)) { event.preventDefault(); external(url); }
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!internal(url)) { event.preventDefault(); external(url); }
  });
  win.webContents.on('did-fail-load', (_event, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && internal(url)) win.loadFile(offlinePath).catch(() => {});
  });
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
  win.webContents.session.on('will-download', (_event, item) => {
    item.once('done', (_event, state) => {
      if (state === 'interrupted') dialog.showMessageBox(win, { type: 'error', title: 'Descarga interrumpida', message: 'No se pudo completar la descarga. Volvé a intentarlo.' });
    });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Aplicación', submenu: [
      { label: 'Inicio / Reintentar conexión', accelerator: 'CmdOrCtrl+Home', click: openHome },
      { label: 'Abrir en el navegador', click: () => external(HOME) },
      { type: 'separator' }, { role: 'quit', label: 'Salir' }
    ] },
    { label: 'Editar', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
    { label: 'Ver', submenu: [
      { label: 'Actualizar', accelerator: 'CmdOrCtrl+R', click: openHome },
      { role: 'resetZoom', label: 'Tamaño original' }, { role: 'zoomIn', label: 'Acercar' },
      { role: 'zoomOut', label: 'Alejar' }, { role: 'togglefullscreen', label: 'Pantalla completa' }
    ] }
  ]));
  openHome();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
