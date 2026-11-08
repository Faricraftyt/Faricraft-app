using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Faricraft {
    static class Program {
        [STAThread] static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainWindow());
        }
    }
    sealed class MainWindow : Form {
        const string Home = "https://faricraftyt.github.io/Faricraft-app/";
        readonly WebView2 browser = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(17,21,18) };
        readonly Panel notice = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(17,21,18) };
        readonly Label message = new Label { AutoSize = false, Dock = DockStyle.Fill, ForeColor = Color.White, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Segoe UI", 12), Text = "Abriendo Faricraft APP…" };
        readonly MenuStrip menu = new MenuStrip();
        readonly ThemeRenderer renderer = new ThemeRenderer();
        bool initializing, ready;
        bool fullScreen;
        FormWindowState previousState;
        Rectangle previousBounds;
        public MainWindow() {
            Text = "Faricraft APP"; Size = new Size(1200,800); MinimumSize = new Size(440,560);
            StartPosition = FormStartPosition.CenterScreen;
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            menu.Renderer = renderer; menu.Font = new Font("Segoe UI", 10); menu.Padding = new Padding(10, 7, 10, 7);
            ApplyTheme(true, "#8193ee");
            var appMenu = new ToolStripMenuItem("Aplicación");
            appMenu.DropDownItems.Add(new ToolStripMenuItem("Inicio / Reintentar", null, (s,e) => OpenHome()) { ShortcutKeys = Keys.Control | Keys.R });
            appMenu.DropDownItems.Add("Abrir en el navegador", null, (s,e) => OpenExternal(Home));
            appMenu.DropDownItems.Add("Salir", null, (s,e) => Close());
            var viewMenu = new ToolStripMenuItem("Ver");
            viewMenu.DropDownItems.Add("Acercar", null, (s,e) => { if(ready) browser.ZoomFactor = Math.Min(3, browser.ZoomFactor + 0.1); });
            viewMenu.DropDownItems.Add("Alejar", null, (s,e) => { if(ready) browser.ZoomFactor = Math.Max(0.5, browser.ZoomFactor - 0.1); });
            viewMenu.DropDownItems.Add("Tamaño original", null, (s,e) => { if(ready) browser.ZoomFactor = 1; });
            viewMenu.DropDownItems.Add(new ToolStripMenuItem("Pantalla completa", null, (s,e) => ToggleFullScreen()) { ShortcutKeys = Keys.F11 });
            menu.Items.Add(appMenu); menu.Items.Add(viewMenu); MainMenuStrip = menu;
            foreach(ToolStripItem item in menu.Items) { item.Margin = new Padding(0,0,8,0); item.Padding = new Padding(12,5,12,5); }
            var retry = new Button { Text = "Reintentar conexión", Dock = DockStyle.Bottom, Height = 48 };
            retry.Click += (s,e) => OpenHome(); notice.Controls.Add(message); notice.Controls.Add(retry);
            Controls.Add(browser); Controls.Add(notice); Controls.Add(menu);
            notice.BringToFront(); menu.BringToFront();
            Shown += async (s,e) => { ApplyTheme(renderer.Dark, ColorTranslator.ToHtml(renderer.Accent)); await InitializeBrowser(); };
            FormClosed += (s,e) => browser.Dispose();
        }
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);
        void ApplyTheme(bool dark, string accent) {
            renderer.Dark = dark; renderer.Accent = ColorTranslator.FromHtml(accent);
            var background = dark ? Color.FromArgb(17,21,18) : Color.FromArgb(247,248,250);
            var foreground = dark ? Color.FromArgb(238,240,245) : Color.FromArgb(25,29,40);
            BackColor = menu.BackColor = notice.BackColor = background;
            ForeColor = menu.ForeColor = message.ForeColor = foreground;
            browser.DefaultBackgroundColor = background;
            foreach(ToolStripMenuItem item in menu.Items) { item.ForeColor = foreground; item.DropDown.BackColor = background; item.DropDown.ForeColor = foreground; }
            menu.Invalidate(true);
            if(IsHandleCreated) { try { int value = dark ? 1 : 0; DwmSetWindowAttribute(Handle,20,ref value,4); } catch { } }
        }
        static bool IsInternal(string value) {
            Uri url;
            return Uri.TryCreate(value, UriKind.Absolute, out url) && url.Scheme == "https" &&
                url.Host.Equals("faricraftyt.github.io", StringComparison.OrdinalIgnoreCase) && url.IsDefaultPort &&
                url.AbsolutePath.StartsWith("/Faricraft-app/", StringComparison.Ordinal);
        }
        void OpenExternal(string value) {
            Uri url;
            if (!Uri.TryCreate(value, UriKind.Absolute, out url) || !(url.Scheme == "https" || url.Scheme == "http" || url.Scheme == "mailto")) return;
            try { Process.Start(new ProcessStartInfo(url.AbsoluteUri) { UseShellExecute = true }); }
            catch { MessageBox.Show(this,"No se pudo abrir el enlace en el navegador.",Text); }
        }
        async System.Threading.Tasks.Task InitializeBrowser() {
            if (initializing || ready) return;
            initializing = true;
            try {
                CoreWebView2Environment.GetAvailableBrowserVersionString();
                string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Faricraft APP", "WebView2");
                var environment = await CoreWebView2Environment.CreateAsync(null, profile);
                if(IsDisposed) return;
                await browser.EnsureCoreWebView2Async(environment);
                if(IsDisposed) return;
                var core = browser.CoreWebView2;
                core.Settings.AreHostObjectsAllowed = false;
                core.Settings.IsWebMessageEnabled = true;
                core.WebMessageReceived += (s,e) => {
                    if (!IsInternal(e.Source)) return;
                    try { var parts = e.TryGetWebMessageAsString().Split('|');
                        if(parts.Length == 3 && parts[0] == "faricraft-theme" && (parts[1] == "dark" || parts[1] == "light") && System.Text.RegularExpressions.Regex.IsMatch(parts[2], "^#[0-9a-fA-F]{6}$")) ApplyTheme(parts[1] == "dark", parts[2]);
                    } catch { }
                };
                await core.AddScriptToExecuteOnDocumentCreatedAsync(@"
(() => {
 if (window !== window.top) return;
 const send = () => {
  const root = document.documentElement;
  const theme = root.dataset.theme;
  const accent = getComputedStyle(root).getPropertyValue('--accent').trim();
  if ((theme === 'dark' || theme === 'light') && /^#[0-9a-f]{6}$/i.test(accent)) window.chrome.webview.postMessage('faricraft-theme|' + theme + '|' + accent);
 };
 const watch = () => { new MutationObserver(send).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme','style']}); send(); };
 if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch, {once:true});
})();");
                core.Settings.AreDevToolsEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.PermissionRequested += (s,e) => e.State = CoreWebView2PermissionState.Deny;
                core.NavigationStarting += (s,e) => { if (!IsInternal(e.Uri)) { e.Cancel = true; OpenExternal(e.Uri); } };
                core.NewWindowRequested += (s,e) => { e.Handled = true; OpenExternal(e.Uri); };
                core.NavigationCompleted += (s,e) => {
                    if (!e.IsSuccess && e.WebErrorStatus != CoreWebView2WebErrorStatus.OperationCanceled) {
                        ShowNotice("No se pudo conectar.\n\nRevisá tu conexión a internet y presioná Reintentar.");
                    } else if (e.IsSuccess) { notice.Visible = false; browser.Visible = true; }
                };
                core.ProcessFailed += (s,e) => ShowNotice("El contenido dejó de responder. Cerrá y volvé a abrir la aplicación.");
                core.DocumentTitleChanged += (s,e) => Text = "Faricraft APP";
                ready = true; OpenHome();
            } catch (WebView2RuntimeNotFoundException) {
                ShowNotice("Falta Microsoft Edge WebView2 Runtime.\n\nVolvé a ejecutar el instalador para instalar el componente necesario.");
            } catch (Exception) {
                if(!IsDisposed) ShowNotice("No se pudo iniciar la aplicación.\n\nProbá de nuevo o cerrá y volvé a abrir Faricraft APP.");
            } finally { initializing = false; }
        }
        void ShowNotice(string text) { message.Text=text; notice.Visible=true; notice.BringToFront(); MainMenuStrip.BringToFront(); }
        async void OpenHome() {
            if (!ready) { await InitializeBrowser(); return; }
            ShowNotice("Conectando…");
            browser.CoreWebView2.Navigate(Home);
        }
        void ToggleFullScreen() {
            if(!fullScreen) { previousState=WindowState; previousBounds=Bounds; WindowState=FormWindowState.Normal; FormBorderStyle=FormBorderStyle.None; Bounds=Screen.FromControl(this).Bounds; }
            else { FormBorderStyle=FormBorderStyle.Sizable; Bounds=previousBounds; WindowState=previousState; }
            fullScreen=!fullScreen;
        }
    }
    sealed class ThemeRenderer : ToolStripProfessionalRenderer {
        public bool Dark = true;
        public Color Accent = Color.FromArgb(129,147,238);
        Color Background => Dark ? Color.FromArgb(17,21,18) : Color.FromArgb(247,248,250);
        public ThemeRenderer() { RoundedEdges = false; }
        protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e) { e.Graphics.Clear(Background); }
        protected override void OnRenderImageMargin(ToolStripRenderEventArgs e) { }
        protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e) {
            if(!e.Item.Selected && !e.Item.Pressed && e.Item.Owner is ToolStripDropDown) return;
            var r = new Rectangle(2,2,e.Item.Width-4,e.Item.Height-4);
            if(r.Width < 12 || r.Height < 12) return;
            using(var path = new GraphicsPath()) {
                const int d=12;
                path.AddArc(r.X,r.Y,d,d,180,90); path.AddArc(r.Right-d,r.Y,d,d,270,90);
                path.AddArc(r.Right-d,r.Bottom-d,d,d,0,90); path.AddArc(r.X,r.Bottom-d,d,d,90,90); path.CloseFigure();
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                var color = e.Item.Selected || e.Item.Pressed ? Accent : Color.FromArgb((Background.R*4+Accent.R)/5,(Background.G*4+Accent.G)/5,(Background.B*4+Accent.B)/5);
                using(var brush=new SolidBrush(color)) e.Graphics.FillPath(brush,path);
            }
        }
        protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e) {
            e.TextColor = e.Item.Selected || e.Item.Pressed ? (Accent.GetBrightness() > .55f ? Color.FromArgb(15,20,35) : Color.White) : (Dark ? Color.FromArgb(238,240,245) : Color.FromArgb(25,29,40));
            base.OnRenderItemText(e);
        }
        protected override void OnRenderArrow(ToolStripArrowRenderEventArgs e) { e.ArrowColor=Dark ? Color.White : Color.FromArgb(25,29,40); base.OnRenderArrow(e); }
        protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e) { using(var pen=new Pen(Color.FromArgb(70,Accent))) e.Graphics.DrawRectangle(pen,0,0,e.ToolStrip.Width-1,e.ToolStrip.Height-1); }
    }

}
