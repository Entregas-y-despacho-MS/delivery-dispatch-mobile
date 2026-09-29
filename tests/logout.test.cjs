const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const axios = require('axios');
const ts = require('typescript');

function ok(config, data = null) {
  return { config, data, headers: {}, status: 204, statusText: 'No Content' };
}

function createLogoutHarness(adapter, storedTokens = null, repoOverrides = {}) {
  const storage = new Map();
  const secureStoreCalls = { get: [], set: [], delete: [] };
  const trackingCalls = { stopped: false };
  const syncCalls = { stopped: false };

  if (storedTokens) {
    storage.set('flash-pack.auth.tokens.v1', JSON.stringify(storedTokens));
  }
  axios.defaults.adapter = adapter;
  const modules = {};

  function load(name) {
    if (modules[name]) return modules[name].exports;
    const file = {
      session: 'src/features/auth/session.ts',
      secure: 'src/lib/storage/secure-storage.ts',
      auth: 'src/features/auth/auth-service.ts',
      logout: 'src/features/auth/logout-service.ts',
    }[name];
    const module = { exports: {} };
    modules[name] = module;
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;

    const loadDependency = (spec) => {
      if (spec === 'axios' || spec === 'react') return require(spec);
      if (spec === '@/config/env') return { env: { apiUrl: 'http://test/api' } };
      if (spec === '@/lib/query/query-client') return { queryClient: { clear() {} } };
      if (spec === '@/lib/storage/secure-storage') return load('secure');
      if (spec === 'expo-secure-store') return {
        getItemAsync: async (key) => {
          secureStoreCalls.get.push(key);
          return storage.get(key) ?? null;
        },
        setItemAsync: async (key, value) => {
          secureStoreCalls.set.push({ key, value });
          storage.set(key, value);
        },
        deleteItemAsync: async (key) => {
          secureStoreCalls.delete.push(key);
          storage.delete(key);
        },
      };
      if (spec === './session' || spec === '@/features/auth/session') return load('session');
      if (spec === './auth-service' || spec === '@/features/auth/auth-service') return load('auth');
      if (spec === '@/lib/database') return {
        localEventRepository: {
          getPendingEvents: repoOverrides.getPendingEvents || (async () => []),
          getFailedEvents: repoOverrides.getFailedEvents || (async () => []),
        },
      };
      if (spec === '@/lib/sync') return {
        syncService: {
          stopSyncService: () => { syncCalls.stopped = true; },
        },
      };
      if (spec === '@/features/tracking') return {
        stopTrackingAndClearLocation: async () => { trackingCalls.stopped = true; },
      };
      throw new Error(`Unexpected dependency: ${spec}`);
    };

    new Function('require', 'module', 'exports', compiled)(loadDependency, module, module.exports);
    return module.exports;
  }

  return {
    auth: load('auth'),
    session: load('session'),
    logout: load('logout'),
    storage,
    secureStoreCalls,
    trackingCalls,
    syncCalls,
  };
}

test('signOut llama POST /auth/logout con cabecera Bearer y timeout de 3s, luego purga SecureStore', async () => {
  let logoutConfig = null;
  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/logout') {
      logoutConfig = config;
      return ok(config);
    }
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'TOKEN_123', refreshToken: 'REFRESH_123' });

  await harness.session.restoreSessionTokens();
  assert.equal(harness.session.getSessionTokens()?.accessToken, 'TOKEN_123');

  await harness.auth.signOut();

  assert.ok(logoutConfig, 'Se debió realizar la petición a /auth/logout');
  assert.equal(logoutConfig.headers.Authorization, 'Bearer TOKEN_123');
  assert.equal(logoutConfig.timeout, 3000, 'Debe tener un timeout preventivo de 3 segundos');
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.session.getSessionTokens(), null);
  assert.ok(harness.secureStoreCalls.delete.includes('flash-pack.auth.tokens.v1'), 'Debe purgar tokens en SecureStore');
});

test('signOut con falla de red en /auth/logout realiza la purga local limpiamente', async () => {
  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/logout') {
      throw new axios.AxiosError('Network Error / Timeout', 'ECONNABORTED', config);
    }
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'TOKEN_XYZ', refreshToken: 'REFRESH_XYZ' });

  await harness.session.restoreSessionTokens();

  // No debe lanzar excepción hacia arriba
  await harness.auth.signOut();

  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.session.getSessionTokens(), null);
  assert.ok(harness.secureStoreCalls.delete.includes('flash-pack.auth.tokens.v1'));
});

test('signOut sin token activo no intenta llamar al backend', async () => {
  let backendCalled = false;
  const harness = createLogoutHarness(async (config) => {
    backendCalled = true;
    return ok(config);
  }, null);

  await harness.auth.signOut();

  assert.equal(backendCalled, false);
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
});

test('getPendingSyncInfo retorna la cantidad exacta de eventos pendientes y fallidos', async () => {
  const mockPending = [{ id: '1' }, { id: '2' }];
  const mockFailed = [{ id: '3' }];

  const harness = createLogoutHarness(async () => {}, null, {
    getPendingEvents: async () => mockPending,
    getFailedEvents: async () => mockFailed,
  });

  const info = await harness.logout.getPendingSyncInfo();
  assert.equal(info.pendingCount, 2);
  assert.equal(info.failedCount, 1);
  assert.equal(info.total, 3);
});

test('executeLogout orquesta la detención de tracking, sync y la purga de sesión', async () => {
  let logoutCalled = false;
  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/logout') {
      logoutCalled = true;
      return ok(config);
    }
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'ACTIVE_TOKEN', refreshToken: 'REFRESH_TOKEN' });

  await harness.session.restoreSessionTokens();
  await harness.logout.executeLogout();

  assert.equal(logoutCalled, true);
  assert.equal(harness.trackingCalls.stopped, true, 'Debe detener el tracking GPS');
  assert.equal(harness.syncCalls.stopped, true, 'Debe detener el servicio de sincronización');
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.session.getSessionTokens(), null);
});
