const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
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
    './config': { MAX_ACCURACY_METERS: 50 },
  });
  loadTs('src/features/tracking/location-task.ts', {
    'expo-task-manager': { defineTask: (_name, callback) => { executor = callback; } },
    './config': { LOCATION_TASK_NAME: 'test-location' },
    './location-point': pointModule,
    './latest-location.repository': { saveLatestLocation: async (point) => saved.push(point) },
  });

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
});

test('database migration adds tracking storage to an existing version 1 database', async () => {
  const { runMigrations, SCHEMA_VERSION } = loadTs('src/lib/database/schema.ts', {});
  const statements = [];
  await runMigrations({
    getFirstAsync: async () => ({ user_version: 1 }),
    execAsync: async (statement) => { statements.push(statement); },
  });

  assert.equal(SCHEMA_VERSION, 2);
  assert.equal(statements.length, 2);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS tracking_latest_location/);
  assert.equal(statements[1], 'PRAGMA user_version = 2;');
});
