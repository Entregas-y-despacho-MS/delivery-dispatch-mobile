const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const axios = require('axios');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/auth/login-error.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, moduleUnderTest, moduleUnderTest.exports);
const { getLoginFailure } = moduleUnderTest.exports;

function httpError(status, code, headers = {}) {
  const config = { headers: new axios.AxiosHeaders() };
  return new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    config,
    data: { error: code },
    headers: new axios.AxiosHeaders(headers),
    status,
    statusText: 'Error',
  });
}

test('401 invalid credentials shows a useful message', () => {
  assert.deepEqual(getLoginFailure(httpError(401, 'INVALID_CREDENTIALS')), {
    kind: 'alert', title: 'No se pudo iniciar sesión', message: 'Revisa tu usuario y contraseña.',
  });
});

test('403 access denied is distinct from invalid credentials', () => {
  assert.deepEqual(getLoginFailure(httpError(403, 'FORBIDDEN')), {
    kind: 'alert', title: 'Acceso denegado',
    message: 'No tienes permiso para iniciar sesión. Contacta al administrador.',
  });
});

test('423 lockout shows remaining time from Retry-After', () => {
  assert.deepEqual(getLoginFailure(httpError(423, 'ACCOUNT_LOCKED', { 'Retry-After': '90' })), {
    kind: 'alert', title: 'Cuenta bloqueada',
    message: 'Tu cuenta está bloqueada. Inténtalo de nuevo en 2 minutos.',
  });
});

test('current backend 401 ACCOUNT_LOCKED still shows the lockout message', () => {
  assert.deepEqual(getLoginFailure(httpError(401, 'ACCOUNT_LOCKED')), {
    kind: 'alert', title: 'Cuenta bloqueada',
    message: 'Tu cuenta está bloqueada temporalmente. Inténtalo de nuevo más tarde.',
  });
});

test('TOTP errors are routed to the verification field', () => {
  assert.deepEqual(getLoginFailure(httpError(401, 'TOTP_REQUIRED')), { kind: 'totp-required' });
  assert.deepEqual(getLoginFailure(httpError(401, 'INVALID_TOTP_CODE')), { kind: 'invalid-totp' });
});
