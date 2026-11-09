import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppDownloads } from '../components/AppDownloads';

test('every embedded installer component renders nothing in Windows and Android apps', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const runtime of [
      { chrome: { webview: { postMessage() {} } }, navigator: { userAgent: 'Chrome/130.0' } },
      { Android: { getBase64FromBlobData() {} }, navigator: { userAgent: 'Chrome/130.0' } },
      { navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0' } },
    ]) {
      Object.defineProperty(globalThis, 'window', { value: runtime, configurable: true });
      assert.equal(renderToStaticMarkup(createElement(AppDownloads)), '');
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
