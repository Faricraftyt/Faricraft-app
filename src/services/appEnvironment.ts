// Native wrappers share the website, so use their runtime signals rather than
// the operating system (ordinary mobile/desktop browsers must keep this page).
export function isAppEnvironment(win: Window = window): boolean {
  const runtime = win as Window & {
    chrome?: { webview?: unknown };
    pywebview?: unknown;
    Android?: { getBase64FromBlobData?: unknown };
    ReactNativeWebView?: unknown;
    __FARICRAFT_APP__?: boolean;
  };
  const ua = win.navigator.userAgent;
  return Boolean(
    runtime.__FARICRAFT_APP__ || runtime.chrome?.webview || runtime.pywebview ||
    runtime.ReactNativeWebView || typeof runtime.Android?.getBase64FromBlobData === 'function' || (win.navigator as Navigator & { standalone?: boolean }).standalone ||
    win.matchMedia?.('(display-mode: standalone)').matches ||
    /Faricraft[ /_-]*App|WebIntoApp|;\s*wv\)/i.test(ua) ||
    // The shipped Linux package uses an unbranded WebKitGTK WebView.
    (/Linux/.test(ua) && /AppleWebKit/.test(ua) &&
      !/Chrome\/|Chromium\/|Firefox\/|Version\/|Epiphany\/|OPR\/|Edg\//.test(ua))
  );
}
