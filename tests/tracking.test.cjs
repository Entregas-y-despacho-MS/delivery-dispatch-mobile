const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

function loadTs(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

test('background permissions require precise foreground location first', async () => {
  let backgroundRequests = 0;
  const permissions = loadTs('src/features/tracking/permissions.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-task-manager': { isAvailableAsync: async () => true },
    'expo-location': {
      hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => ({ granted: false }),
      requestForegroundPermissionsAsync: async () => ({
        granted: true, android: { accuracy: 'coarse' },
      }),
      getBackgroundPermissionsAsync: async () => ({ granted: false }),
      requestBackgroundPermissionsAsync: async () => { backgroundRequests++; return { granted: true }; },
    },
  });

  assert.deepEqual(await permissions.requestTrackingPermissions(), {
    status: 'precise-location-required',
  });
  assert.equal(backgroundRequests, 0);
});

test('denied background permission is returned without starting tracking', async () => {
  const permissions = loadTs('src/features/tracking/permissions.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-task-manager': { isAvailableAsync: async () => true },
    'expo-location': {
      hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => ({
        granted: true, ios: { accuracy: 'full' },
      }),
      getBackgroundPermissionsAsync: async () => ({ granted: false }),
      requestBackgroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
    },
  });
  assert.deepEqual(await permissions.requestTrackingPermissions(), {
    status: 'background-denied', canAskAgain: false,
  });
});

test('unsupported background execution does not request location permissions', async () => {
  const permissions = loadTs('src/features/tracking/permissions.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-task-manager': { isAvailableAsync: async () => false },
    'expo-location': {
      hasServicesEnabledAsync: async () => { throw new Error('Unexpected permission flow'); },
    },
  });
  assert.deepEqual(await permissions.requestTrackingPermissions(), {
    status: 'background-unavailable',
  });
});

test('tracking starts once and stops when the last active dispatch finishes', async () => {
  let running = false;
  const starts = [];
  let stops = 0;
  const service = loadTs('src/features/tracking/tracking-service.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-task-manager': { isAvailableAsync: async () => true },
    'expo-location': {
      Accuracy: { High: 4 },
      hasStartedLocationUpdatesAsync: async () => running,
      startLocationUpdatesAsync: async (name, options) => {
        starts.push({ name, options });
        running = true;
      },
      stopLocationUpdatesAsync: async () => { stops++; running = false; },
    },
    './config': {
      LOCATION_TASK_NAME: 'test-location', MIN_DISTANCE_METERS: 20,
      ANDROID_MIN_INTERVAL_MS: 10000,
    },
    './permissions': { requestTrackingPermissions: async () => ({ status: 'granted' }) },
    './latest-location.repository': { clearLatestLocation: async () => {} },
    './location-buffer.repository': { clearTrackingTelemetry: async () => {} },
  });

  const first = await Promise.all([
    service.reconcileTracking(2), service.reconcileTracking(1),
  ]);
  assert.deepEqual(first, [{ status: 'tracking' }, { status: 'tracking' }]);
  assert.equal(starts.length, 1);
  assert.equal(starts[0].options.distanceInterval, 20);
  assert.equal(starts[0].options.accuracy, 4);
  assert.match(starts[0].options.foregroundService.notificationTitle, /Seguimiento/);

  assert.deepEqual(await service.reconcileTracking(0), { status: 'stopped' });
  await service.reconcileTracking(0);
  assert.equal(stops, 1);
  assert.equal(running, false);
});

test('location listener rejects imprecise readings and keeps the newest valid point', async () => {
  let executor;
  const saved = [];
  const pointModule = loadTs('src/features/tracking/location-point.ts', {
    './config': { MAX_ACCURACY_METERS: 30 },
  });
  loadTs('src/features/tracking/location-task.ts', {
    'expo-task-manager': { defineTask: (_name, callback) => { executor = callback; } },
    './config': { LOCATION_TASK_NAME: 'test-location' },
    './location-point': pointModule,
    './latest-location.repository': { saveLatestLocation: async (point) => saved.push(point) },
    './location-buffer.repository': {
      bufferTrackingPoints: async (points) => { buffered.push(points); return points.length; },
      getTrackingDispatchId: async () => null,
    },
    './tracking-upload-service': { trackingUploadService: { flush: async () => { throw new Error('Diagnostic points must not upload'); } } },
  });

  const buffered = [];

  const location = (timestamp, accuracy, latitude = -16.5) => ({
    timestamp,
    coords: { latitude, longitude: -68.1, accuracy, speed: 3 },
  });
  await executor({ data: { locations: [
    location(1000, 80), location(3000, 10), location(2000, 5), location(4000, 10, 100),
  ] }, error: null });

  assert.equal(saved.length, 1);
  assert.equal(saved[0].capturedAt, 3000);
  assert.equal(saved[0].accuracyMeters, 10);
  assert.deepEqual(buffered[0].map((point) => point.capturedAt), [3000, 2000]);
});

test('background task uploads new points only when associated with a real dispatch', async () => {
  let executor;
  let dispatchId = null;
  let uploads = 0;
  loadTs('src/features/tracking/location-task.ts', {
    'expo-task-manager': { defineTask: (_name, callback) => { executor = callback; } },
    './config': { LOCATION_TASK_NAME: 'test-location' },
    './location-point': { toTrackingPoint: (location) => trackingPoint(location.timestamp) },
    './latest-location.repository': { saveLatestLocation: async () => {} },
    './location-buffer.repository': {
      bufferTrackingPoints: async () => 1,
      getTrackingDispatchId: async () => dispatchId,
    },
    './tracking-upload-service': { trackingUploadService: { flush: async () => { uploads++; } } },
  });
  await executor({ data: { locations: [{ timestamp: 1000 }] }, error: null });
  assert.equal(uploads, 0);
  dispatchId = 42;
  await executor({ data: { locations: [{ timestamp: 2000 }] }, error: null });
  assert.equal(uploads, 1);
});

test('database migration adds tracking storage to an existing version 1 database', async () => {
  const { runMigrations, SCHEMA_VERSION } = loadTs('src/lib/database/schema.ts', {});
  const statements = [];
  await runMigrations({
    getFirstAsync: async () => ({ user_version: 1 }),
    execAsync: async (statement) => { statements.push(statement); },
  });

  assert.equal(SCHEMA_VERSION, 4);
  assert.equal(statements.length, 6);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS tracking_latest_location/);
  assert.equal(statements[1], 'PRAGMA user_version = 2;');
  assert.match(statements[2], /CREATE TABLE IF NOT EXISTS tracking_location_buffer/);
  assert.equal(statements[3], 'PRAGMA user_version = 3;');
  assert.match(statements[4], /CREATE TABLE IF NOT EXISTS tracking_diagnostics/);
  assert.equal(statements[5], 'PRAGMA user_version = 4;');
});

test('database migration upgrades an existing GPS database without recreating its latest point', async () => {
  const { runMigrations } = loadTs('src/lib/database/schema.ts', {});
  const statements = [];
  await runMigrations({
    getFirstAsync: async () => ({ user_version: 2 }),
    execAsync: async (statement) => { statements.push(statement); },
  });

  assert.equal(statements.length, 4);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS tracking_location_buffer/);
  assert.equal(statements[1], 'PRAGMA user_version = 3;');
  assert.match(statements[2], /CREATE TABLE IF NOT EXISTS tracking_diagnostics/);
  assert.equal(statements[3], 'PRAGMA user_version = 4;');
});

test('version 3 upgrades diagnostics without touching buffered coordinates', async () => {
  const { runMigrations } = loadTs('src/lib/database/schema.ts', {});
  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE tracking_location_buffer (id INTEGER PRIMARY KEY, payload TEXT);
    INSERT INTO tracking_location_buffer (id, payload) VALUES (1, 'saved');
    PRAGMA user_version = 3;`);
  await runMigrations(sqliteAsyncAdapter(database));
  assert.equal(database.prepare('PRAGMA user_version;').get().user_version, 4);
  assert.equal(database.prepare('SELECT payload FROM tracking_location_buffer WHERE id = 1;').get().payload, 'saved');
  assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE name = 'tracking_diagnostics';").get());
  database.close();
});

test('dispatch integration starts with a real ID, restores it on denial, and stops on null', async () => {
  let currentId = null;
  const counts = [];
  let denied = false;
  const integration = loadTs('src/features/tracking/dispatch-tracking.ts', {
    './location-buffer.repository': {
      getTrackingDispatchId: async () => currentId,
      setTrackingDispatchId: async (id) => { currentId = id; },
    },
    './tracking-service': { reconcileTracking: async (count) => {
      counts.push(count);
      return { status: denied ? 'background-denied' : count ? 'tracking' : 'stopped' };
    } },
  });
  assert.deepEqual(await integration.syncDispatchTracking(42), { status: 'tracking' });
  assert.equal(currentId, 42);
  denied = true;
  assert.deepEqual(await integration.syncDispatchTracking(43), { status: 'background-denied' });
  assert.equal(currentId, 42);
  denied = false;
  assert.deepEqual(await integration.syncDispatchTracking(null), { status: 'stopped' });
  assert.equal(currentId, null);
  assert.deepEqual(counts, [1, 1, 0]);
  await assert.rejects(integration.syncDispatchTracking(0), /dispatchId/);
});

const trackingConfig = {
  FAST_SAMPLE_INTERVAL_MS: 10000,
  SLOW_SAMPLE_INTERVAL_MS: 30000,
  STOPPED_SAMPLE_INTERVAL_MS: 60000,
  STOPPED_CONFIRMATION_MS: 180000,
  FAST_SPEED_METERS_PER_SECOND: 10 / 3.6,
  STOPPED_SPEED_METERS_PER_SECOND: 3 / 3.6,
  MAX_BUFFERED_LOCATIONS: 100,
};

function trackingPoint(capturedAt, speedMetersPerSecond = 4) {
  return {
    latitude: -16.5,
    longitude: -68.15,
    accuracyMeters: 5,
    speedMetersPerSecond,
    capturedAt,
  };
}

test('adaptive sampling changes from 10s to 30s and 60s, then resumes at 10s', () => {
  const sampler = loadTs('src/features/tracking/adaptive-sampling.ts', {
    './config': trackingConfig,
  });
  let state = sampler.INITIAL_SAMPLING_STATE;
  const decide = (time, speed) => {
    const decision = sampler.sampleTrackingPoint(trackingPoint(time, speed), state);
    state = decision.state;
    return decision;
  };

  assert.equal(decide(1000, 10 / 3.6).emit, true);
  assert.equal(decide(9000, 4).emit, false);
  assert.equal(decide(11000, 4).emit, true);
  assert.equal(decide(21000, 5 / 3.6).emit, false);
  assert.equal(decide(41000, 5 / 3.6).emit, true);
  assert.equal(decide(50000, 0).mode, 'slow');
  const stopped = decide(230000, 0);
  assert.equal(stopped.mode, 'stopped');
  assert.equal(stopped.emit, true);
  assert.equal(decide(230000, 0).emit, false);
  assert.equal(decide(231000, 4).mode, 'fast');
  assert.equal(state.stationarySince, null);
  assert.equal(decide(240000, null).mode, 'slow');
});

test('GPS filter accepts 30m precision and rejects less accurate readings', () => {
  const pointModule = loadTs('src/features/tracking/location-point.ts', {
    './config': { MAX_ACCURACY_METERS: 30 },
  });
  const location = (accuracy) => ({
    timestamp: 1000,
    coords: { latitude: -16.5, longitude: -68.15, accuracy, speed: 3 },
  });
  assert.equal(pointModule.toTrackingPoint(location(30)).accuracyMeters, 30);
  assert.equal(pointModule.toTrackingPoint(location(30.1)), null);
});

test('a simulated continuous stop emits fewer points than a moving route', () => {
  const sampler = loadTs('src/features/tracking/adaptive-sampling.ts', {
    './config': trackingConfig,
  });
  const simulate = (speed) => {
    let state = sampler.INITIAL_SAMPLING_STATE;
    let emitted = 0;
    for (let time = 1000; time <= 601000; time += 1000) {
      const decision = sampler.sampleTrackingPoint(trackingPoint(time, speed), state);
      state = decision.state;
      if (decision.emit) emitted++;
    }
    return emitted;
  };

  assert.equal(simulate(4), 61);
  assert.ok(simulate(0) < 20);
});

function sqliteAsyncAdapter(database) {
  const normalize = (params) => Array.isArray(params) ? params : [];
  const adapter = {
    getFirstAsync: async (sql, params) => database.prepare(sql).get(...normalize(params)) ?? null,
    getAllAsync: async (sql, params) => database.prepare(sql).all(...normalize(params)),
    runAsync: async (sql, params) => database.prepare(sql).run(...normalize(params)),
    execAsync: async (sql) => database.exec(sql),
  };
  adapter.withExclusiveTransactionAsync = async (task) => {
    database.exec('BEGIN IMMEDIATE;');
    try {
      await task(adapter);
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  };
  return adapter;
}

test('SQLite buffer keeps 100 newest points, persists sampling state and separates diagnostic points', async () => {
  const database = new DatabaseSync(':memory:');
  const db = sqliteAsyncAdapter(database);
  const schema = loadTs('src/lib/database/schema.ts', {});
  await schema.runMigrations(db);
  const sampler = loadTs('src/features/tracking/adaptive-sampling.ts', {
    './config': trackingConfig,
  });
  const repository = loadTs('src/features/tracking/location-buffer.repository.ts', {
    '@/lib/database': {
      initDatabase: async () => db,
      getDatabase: () => db,
      encryptPayload: async (value) => JSON.stringify(value),
      decryptPayload: async (value) => JSON.parse(value),
    },
    './adaptive-sampling': sampler,
    './config': trackingConfig,
  });

  const points = Array.from({ length: 110 }, (_, index) => trackingPoint((index + 1) * 10000));
  assert.equal(await repository.bufferTrackingPoints(points.reverse()), 110);
  assert.equal(await repository.getBufferedLocationCount(), 100);
  const initialDiagnostics = await repository.getTrackingDiagnostics();
  assert.equal(initialDiagnostics.lastPointCapturedAt, 1100000);
  assert.ok(initialDiagnostics.lastBufferedAt > 0);
  assert.equal(initialDiagnostics.lastUploadAttemptAt, null);
  assert.equal(await repository.getTrackingDispatchId(), null);
  assert.deepEqual(await repository.getTrackingBufferStats(), {
    total: 100, pending: 0, failed: 0, diagnostic: 100,
  });
  const bounds = database.prepare('SELECT MIN(captured_at) AS oldest, MAX(captured_at) AS newest FROM tracking_location_buffer').get();
  assert.equal(bounds.oldest, 110000);
  assert.equal(bounds.newest, 1100000);
  assert.deepEqual(await repository.getPendingBufferedLocations(), []);
  assert.equal(await repository.bufferTrackingPoints([trackingPoint(1105000)]), 0);

  await repository.setTrackingDispatchId(42);
  assert.equal(await repository.getTrackingDispatchId(), 42);
  assert.equal(await repository.getBufferedLocationCount(), 0);
  assert.equal(await repository.bufferTrackingPoints([trackingPoint(1200000)]), 1);
  const pending = await repository.getPendingBufferedLocations();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].dispatchId, 42);
  assert.equal(pending[0].point.capturedAt, 1200000);
  assert.deepEqual(await repository.getTrackingBufferStats(), {
    total: 1, pending: 1, failed: 0, diagnostic: 0,
  });
  await repository.recordTrackingUploadAttempt(1);
  await repository.recordTrackingUploadResult('sent', 1, 0);
  const sentDiagnostics = await repository.getTrackingDiagnostics();
  assert.ok(sentDiagnostics.lastUploadAttemptAt > 0);
  assert.equal(sentDiagnostics.lastUploadStatus, 'sent');
  assert.equal(sentDiagnostics.lastAcknowledgedCount, 1);
  await repository.setTrackingDispatchId(42);
  assert.equal(await repository.bufferTrackingPoints([trackingPoint(1205000)]), 0);

  await repository.setTrackingDispatchId(null);
  assert.equal(await repository.getTrackingDispatchId(), null);
  assert.equal((await repository.getPendingBufferedLocations())[0].dispatchId, 42);

  await repository.markBufferedLocationFailed(pending[0].id, 'Dispatch not found.');
  assert.deepEqual(await repository.getPendingBufferedLocations(), []);
  assert.equal(await repository.getBufferedLocationCount(), 1);
  assert.deepEqual(await repository.getTrackingBufferStats(), {
    total: 1, pending: 0, failed: 1, diagnostic: 0,
  });
  await repository.acknowledgeBufferedLocations([pending[0].id]);
  assert.equal(await repository.getBufferedLocationCount(), 0);
  await repository.bufferTrackingPoints([trackingPoint(1220000)]);
  await repository.clearTrackingTelemetry();
  assert.equal(await repository.getBufferedLocationCount(), 0);
  assert.equal((await repository.getTrackingDiagnostics()).lastBufferedAt, null);
  database.close();
});

test('tracking upload maps partial 201 results by position and keeps failed points', async () => {
  const acknowledged = [];
  const failed = [];
  const calls = [];
  const diagnosticEvents = [];
  const pending = [
    { id: 1, dispatchId: 42, point: trackingPoint(1000) },
    { id: 2, dispatchId: 42, point: trackingPoint(2000) },
    { id: 3, dispatchId: 99, point: trackingPoint(3000) },
  ];
  const upload = loadTs('src/features/tracking/location-upload.ts', {
    '@/lib/http/api-client': {
      apiClient: { post: async (url, body) => {
        calls.push({ url, body });
        return { data: { results: [
          { dispatchId: 42, outcome: 'applied' },
          { dispatchId: 42, outcome: 'stale' },
          { dispatchId: 99, outcome: 'failed', error: 'Dispatch not found.' },
        ] } };
      } },
    },
    './location-buffer.repository': {
      getPendingBufferedLocations: async () => pending,
      acknowledgeBufferedLocations: async (ids) => { acknowledged.push(...ids); },
      markBufferedLocationFailed: async (id, error) => { failed.push({ id, error }); },
      recordTrackingUploadAttempt: async (count) => { diagnosticEvents.push(['attempt', count]); },
      recordTrackingUploadResult: async (...values) => { diagnosticEvents.push(values); },
    },
  });

  assert.deepEqual(await upload.syncBufferedLocations(), { sent: 3, acknowledged: 2, failed: 1 });
  assert.equal(calls[0].url, '/tracking/locations');
  assert.deepEqual(calls[0].body.locations[0], {
    dispatchId: 42, latitude: -16.5, longitude: -68.15,
    recordedAt: '1970-01-01T00:00:01.000Z',
  });
  assert.deepEqual(acknowledged, [1, 2]);
  assert.deepEqual(failed, [{ id: 3, error: 'Dispatch not found.' }]);
  assert.deepEqual(diagnosticEvents, [['attempt', 3], ['partial', 2, 1]]);
});

test('tracking upload does not delete points if the server response is malformed', async () => {
  const acknowledged = [];
  const statuses = [];
  const upload = loadTs('src/features/tracking/location-upload.ts', {
    '@/lib/http/api-client': {
      apiClient: { post: async () => ({ data: { results: [] } }) },
    },
    './location-buffer.repository': {
      getPendingBufferedLocations: async () => [{
        id: 7, dispatchId: 42, point: trackingPoint(1000),
      }],
      acknowledgeBufferedLocations: async (ids) => { acknowledged.push(...ids); },
      markBufferedLocationFailed: async () => { throw new Error('Unexpected failure mark'); },
      recordTrackingUploadAttempt: async () => {},
      recordTrackingUploadResult: async (status) => { statuses.push(status); },
    },
  });

  await assert.rejects(upload.syncBufferedLocations(), /Respuesta de tracking inválida/);
  assert.deepEqual(acknowledged, []);
  assert.deepEqual(statuses, ['error']);
});

test('buffered points survive a network error and can be replayed after recovery', async () => {
  let online = false;
  const statuses = [];
  let pending = [{ id: 9, dispatchId: 42, point: trackingPoint(1000) }];
  const upload = loadTs('src/features/tracking/location-upload.ts', {
    '@/lib/http/api-client': {
      apiClient: { post: async () => {
        if (!online) throw new Error('Network unavailable');
        return { data: { results: [{ dispatchId: 42, outcome: 'applied' }] } };
      } },
    },
    './location-buffer.repository': {
      getPendingBufferedLocations: async () => pending,
      acknowledgeBufferedLocations: async (ids) => {
        pending = pending.filter((row) => !ids.includes(row.id));
      },
      markBufferedLocationFailed: async () => { throw new Error('Unexpected failure mark'); },
      recordTrackingUploadAttempt: async () => {},
      recordTrackingUploadResult: async (status) => { statuses.push(status); },
    },
  });

  await assert.rejects(upload.syncBufferedLocations(), /Network unavailable/);
  assert.equal(pending.length, 1);
  online = true;
  assert.deepEqual(await upload.syncBufferedLocations(), { sent: 1, acknowledged: 1, failed: 0 });
  assert.equal(pending.length, 0);
  assert.deepEqual(statuses, ['error', 'sent']);
});

test('upload service waits for authentication and connectivity, then replays on reconnect', async () => {
  let session = 'unauthenticated';
  let online = false;
  let networkChanged;
  let uploadCount = 0;
  const service = loadTs('src/features/tracking/tracking-upload-service.ts', {
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '@/features/auth/session': { getSessionStatus: () => session },
    '@/lib/sync/network': {
      isOnline: async () => online,
      subscribeToNetworkChanges: (listener) => { networkChanged = listener; return () => {}; },
    },
    './location-upload': { syncBufferedLocations: async () => {
      uploadCount++;
      return { sent: 1, acknowledged: 1, failed: 0 };
    } },
  }).trackingUploadService;

  service.start();
  assert.equal(await service.flush(), null);
  session = 'authenticated';
  assert.equal(await service.flush(), null);
  online = true;
  networkChanged(true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(uploadCount, 1);
  service.stop();
});
