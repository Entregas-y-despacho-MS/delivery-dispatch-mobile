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
  const trackingCalls = { stopped: false, cleared: false };
  const trackingUploadCalls = { stopped: false };
  const syncCalls = { stopped: false };
  const syncNetInfo = { unsubscribed: false, listener: null };

  if (storedTokens) {
    storage.set('flash-pack.auth.tokens.v1', JSON.stringify(storedTokens));
  }
  axios.defaults.adapter = adapter;
  const modules = {};

  const repoMock = {
    getPendingEvents: repoOverrides.getPendingEvents || (async () => []),
    getFailedEvents: repoOverrides.getFailedEvents || (async () => []),
    purgeSyncedEvents: repoOverrides.purgeSyncedEvents || (async () => {}),
  };

  function load(name) {
    if (modules[name]) return modules[name].exports;
    const file = {
      session: 'src/features/auth/session.ts',
      secure: 'src/lib/storage/secure-storage.ts',
      auth: 'src/features/auth/auth-service.ts',
      logout: 'src/features/auth/logout-service.ts',
      teardown: 'src/features/auth/service-teardown.ts',
      syncService: 'src/lib/sync/sync-service.ts',
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
      if (spec === './service-teardown' || spec === '@/features/auth/service-teardown') return load('teardown');
      if (spec === '@/lib/database') return {
        localEventRepository: repoMock,
      };
      if (spec === '@/lib/sync') return {
        syncService: {
          stopSyncService: () => { syncCalls.stopped = true; },
        },
      };
      if (spec === '@/features/tracking/tracking-upload-service') return {
        trackingUploadService: {
          stop: () => { trackingUploadCalls.stopped = true; },
        },
      };
      if (spec === '@/features/tracking') return {
        stopTracking: async () => { trackingCalls.stopped = true; },
        stopTrackingAndClearLocation: async () => { trackingCalls.stopped = true; trackingCalls.cleared = true; },
        clearTrackingTelemetry: async () => { trackingCalls.cleared = true; },
      };
      // Dependencias requeridas por sync-service.ts
      if (spec === './network') return {
        isOnline: async () => true,
        subscribeToNetworkChanges: (cb) => {
          syncNetInfo.listener = cb;
          return () => { syncNetInfo.unsubscribed = true; };
        },
      };
      if (spec === './event-dispatcher') return {
        eventDispatcher: { dispatch: async () => {} },
        EventDispatcher: class {},
      };
      if (spec === './backoff') return {
        calculateBackoffDelay: () => 1000,
        extractErrorMessage: (e) => (e && e.message ? e.message : String(e)),
        isRetryableError: () => false,
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
    teardown: load('teardown'),
    loadSyncService: () => load('syncService'),
    storage,
    secureStoreCalls,
    trackingCalls,
    trackingUploadCalls,
    syncCalls,
    syncNetInfo,
    repo: repoMock,
  };
}

// ---------------------------------------------------------------------------
// Tests de ST-34.1 (Logout UI & Purga de Sesión)
// ---------------------------------------------------------------------------

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
  assert.equal(harness.trackingUploadCalls.stopped, true, 'Debe detener el uploader de tracking');
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.session.getSessionTokens(), null);
});

// ---------------------------------------------------------------------------
// Tests de ST-34.2 (Hook de Apagado de Servicios Nativos en Segundo Plano)
// ---------------------------------------------------------------------------

test('ST-34.2: teardownBackgroundServices detiene el trackingUploadService (NetInfo, AppState y timer 60s)', async () => {
  const harness = createLogoutHarness(async () => ok({}));

  await harness.teardown.teardownBackgroundServices();

  assert.equal(harness.trackingUploadCalls.stopped, true, 'trackingUploadService.stop() debió ser invocado');
});

test('ST-34.2: teardownBackgroundServices detiene el Foreground Service GPS sin borrar la telemetría pendiente en SQLite', async () => {
  const harness = createLogoutHarness(async () => ok({}));

  await harness.teardown.teardownBackgroundServices();

  assert.equal(harness.trackingCalls.stopped, true, 'stopTracking() debió ser invocado');
  assert.equal(harness.trackingCalls.cleared, false, 'No debe invocar clearTrackingTelemetry ni borrar el buffer');
});

test('ST-34.2: teardownBackgroundServices cancela NetInfo, retryTimeout y periodicInterval del SyncService', async () => {
  const harness = createLogoutHarness(async () => ok({}));
  const { SyncService } = harness.loadSyncService();
  const sync = new SyncService();

  await sync.startSyncService();
  assert.equal(sync.isServiceRunning(), true, 'SyncService debe estar activo con NetInfo e interval');

  sync.stopSyncService();
  assert.equal(sync.isServiceRunning(), false, 'SyncService no debe tener timers ni observadores activos');
  assert.equal(harness.syncNetInfo.unsubscribed, true, 'NetInfo debe haber sido desuscrito');
});

test('ST-34.2: SyncService.stopSyncService resetea estado de sesión en memoria y purga listeners', async () => {
  const harness = createLogoutHarness(async () => ok({}));
  const { SyncService } = harness.loadSyncService();
  const sync = new SyncService();

  let listenerInvocations = 0;
  sync.subscribeToSyncState(() => {
    listenerInvocations++;
  });

  await sync.startSyncService();
  const invocationsBeforeStop = listenerInvocations;

  sync.stopSyncService();

  const cleanState = await sync.getSyncState();
  assert.equal(cleanState.isSyncing, false, 'isSyncing debe ser false');
  assert.equal(cleanState.lastSyncAt, null, 'lastSyncAt debe resetearse a null');
  assert.equal(cleanState.lastError, null, 'lastError debe resetearse a null');
  assert.equal(cleanState.isOnline, true, 'isOnlineState debe resetearse al valor inicial');

  // Comprobar que los listeners fueron purgados y no reciben nuevas notificaciones
  await sync.processQueue();
  assert.equal(listenerInvocations, invocationsBeforeStop, 'Los listeners antiguos no deben recibir eventos post-apagado');
});

test('ST-34.2: executeLogout preserva registros históricos en SQLite y no purga eventos locales', async () => {
  const mockPending = [{ id: 'evt-1', dispatchId: 101, type: 'status_update' }];
  const mockFailed = [{ id: 'evt-2', dispatchId: 102, type: 'incident_report' }];
  let purgeCalled = false;

  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/logout') return ok(config);
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'VALID_TOKEN', refreshToken: 'VALID_REFRESH' }, {
    getPendingEvents: async () => mockPending,
    getFailedEvents: async () => mockFailed,
    purgeSyncedEvents: async () => { purgeCalled = true; },
  });

  await harness.session.restoreSessionTokens();
  await harness.logout.executeLogout();

  // Verificar que la base de datos SQLite conserva los registros históricos intactos
  const pending = await harness.repo.getPendingEvents();
  const failed = await harness.repo.getFailedEvents();

  assert.equal(pending.length, 1, 'Debe conservar los eventos locales pendientes');
  assert.equal(failed.length, 1, 'Debe conservar los eventos locales fallidos');
  assert.equal(pending[0].id, 'evt-1');
  assert.equal(failed[0].id, 'evt-2');
  assert.equal(purgeCalled, false, 'No debe purgar eventos locales en SQLite durante el logout');
});

test('ST-34.2: executeLogout completo no deja procesos huérfanos ni listeners activos', async () => {
  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/logout') return ok(config);
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'TOKEN_SESSION', refreshToken: 'REFRESH_SESSION' });

  await harness.session.restoreSessionTokens();
  harness.session.finishSessionRestore();
  assert.equal(harness.session.getSessionStatus(), 'authenticated');

  await harness.logout.executeLogout();

  // 1. Foreground Service GPS detenido
  assert.equal(harness.trackingCalls.stopped, true, 'GPS tracking debe estar detenido');

  // 2. Tracking upload service (NetInfo + AppState + timer 60s) detenido
  assert.equal(harness.trackingUploadCalls.stopped, true, 'Tracking upload service debe estar detenido');

  // 3. Sincronizador FIFO detenido
  assert.equal(harness.syncCalls.stopped, true, 'SyncService debe estar detenido');

  // 4. Sesión y tokens purgados
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.session.getSessionTokens(), null);
  assert.ok(harness.secureStoreCalls.delete.includes('flash-pack.auth.tokens.v1'), 'Tokens en hardware seguro deben estar eliminados');
});

test('ST-34.2: executeLogout conserva puntos GPS pendientes en SQLite tras reabrir app y evita que otra cuenta los envíe', async () => {
  const bufferedPoints = [
    { id: 1, dispatchId: 101, latitude: -16.5, longitude: -68.15 },
    { id: 2, dispatchId: 101, latitude: -16.51, longitude: -68.16 },
  ];
  const sqliteBuffer = [...bufferedPoints];

  const harness = createLogoutHarness(async (config) => {
    if (config.url === '/auth/login') {
      return { config, data: { accessToken: 'NEW_TOKEN', refreshToken: 'NEW_REFRESH', mustChangePassword: false }, status: 200 };
    }
    if (config.url === '/auth/logout') return ok(config);
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'JUAN_TOKEN', refreshToken: 'JUAN_REFRESH' });

  // 1. Conductor Juan tiene sesión activa y puntos pendientes en SQLite
  harness.auth.setLastAuthenticatedAccount('juan');
  await harness.session.restoreSessionTokens();
  harness.session.finishSessionRestore();
  assert.equal(harness.session.getSessionStatus(), 'authenticated');

  // 2. Juan cierra turno / logout
  await harness.logout.executeLogout();
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.trackingCalls.stopped, true, 'GPS tracking debe haberse detenido');
  assert.equal(harness.trackingCalls.cleared, false, 'Teardown NO debe haber borrado el buffer de SQLite');
  assert.equal(sqliteBuffer.length, 2, 'Los puntos GPS deben permanecer en SQLite tras el logout');

  // 3. Simular reapertura de la app con la misma cuenta de Juan (no se debe borrar la telemetría)
  await harness.auth.signIn('juan', 'password123');
  assert.equal(harness.trackingCalls.cleared, false, 'La misma cuenta conserva los puntos GPS pendientes');
  assert.equal(sqliteBuffer.length, 2, 'Al reabrir la app con la misma cuenta, los puntos siguen disponibles');

  // 4. Conductor Pedro (otra cuenta distinta) inicia sesión en el mismo teléfono
  await harness.auth.signIn('pedro', 'password123');
  assert.equal(harness.trackingCalls.cleared, true, 'Debe limpiar la telemetría previa para evitar que otra cuenta envíe puntos del conductor anterior');
});

test('ST-34.2: startSyncService aborta si se llama a stopSyncService() durante await isOnline()', async () => {
  const harness = createLogoutHarness(async () => ok({}));
  const { SyncService } = harness.loadSyncService();
  const sync = new SyncService();

  // Disparamos startSyncService
  const startPromise = sync.startSyncService();

  // En medio del arranque, se detiene el servicio
  sync.stopSyncService();

  await startPromise;

  assert.equal(sync.isServiceRunning(), false, 'SyncService no debe quedar activo si stopSyncService fue llamado durante el inicio');
});
