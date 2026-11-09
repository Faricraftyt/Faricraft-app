import assert from 'node:assert/strict';
import test from 'node:test';
import { isAppEnvironment } from './appEnvironment';
const environment = (ua: string, extra = {}) => ({ navigator: { userAgent: ua }, matchMedia: () => ({ matches: false }), ...extra }) as unknown as Window;
test('normal browsers retain installer downloads on all platforms', () => {
  for (const ua of [
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/130.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
  ]) assert.equal(isAppEnvironment(environment(ua)), false, ua);
});
test('installed wrappers hide installer downloads', () => {
  assert.equal(isAppEnvironment(environment('Chrome/130.0', { chrome: { webview: {} } })), true);
  assert.equal(isAppEnvironment(environment('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')), true);
  assert.equal(isAppEnvironment(environment('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 Safari/605.1.15')), true);
  assert.equal(isAppEnvironment(environment('Chrome/130.0', { Android: { getBase64FromBlobData() {} } })), true);
  assert.equal(isAppEnvironment(environment('Chrome/130.0', { __FARICRAFT_APP__: true })), true);
  assert.equal(isAppEnvironment(environment('Chrome/130.0', { matchMedia: () => ({ matches: true }) })), true);
});
