using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
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
        bool initializing, ready;
        bool fullScreen;
        FormWindowState previousState;
        Rectangle previousBounds;
        public MainWindow() {
            Text = "Faricraft APP"; Size = new Size(1200,800); MinimumSize = new Size(440,560);
            StartPosition = FormStartPosition.CenterScreen;
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            var menu = new MenuStrip();
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
            var retry = new Button { Text = "Reintentar conexión", Dock = DockStyle.Bottom, Height = 48 };
            retry.Click += (s,e) => OpenHome(); notice.Controls.Add(message); notice.Controls.Add(retry);
            Controls.Add(browser); Controls.Add(notice); Controls.Add(menu);
            notice.BringToFront(); menu.BringToFront();
            Shown += async (s,e) => await InitializeBrowser();
            FormClosed += (s,e) => browser.Dispose();
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
                core.Settings.IsWebMessageEnabled = false;
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
}
