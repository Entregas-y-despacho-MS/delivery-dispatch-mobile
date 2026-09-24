const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const axios = require('axios');
const ts = require('typescript');

function ok(config, data) {
  return { config, data, headers: {}, status: 200, statusText: 'OK' };
}

function unauthorized(config) {
  return Promise.reject(new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    config, data: { error: 'INVALID_TOKEN' }, headers: {}, status: 401, statusText: 'Unauthorized',
  }));
}

function createHarness(adapter, storedTokens = null) {
  const storage = new Map();
  if (storedTokens) storage.set('flash-pack.auth.tokens.v1', JSON.stringify(storedTokens));
  axios.defaults.adapter = adapter;
  const modules = {};

  function load(name) {
    if (modules[name]) return modules[name].exports;
    const file = {
      api: 'src/lib/http/api-client.ts',
      auth: 'src/features/auth/auth-service.ts',
      session: 'src/features/auth/session.ts',
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
      if (spec === '@/lib/storage/secure-storage') return {
        getSecureJson: async (key) => JSON.parse(storage.get(key) ?? 'null'),
        setSecureJson: async (key, value) => { storage.set(key, JSON.stringify(value)); },
        removeSecureItem: async (key) => { storage.delete(key); },
      };
      if (spec === './session' || spec === '@/features/auth/session') return load('session');
      if (spec === '@/features/auth/auth-service') return load('auth');
      throw new Error(`Unexpected dependency: ${spec}`);
    };
    new Function('require', 'module', 'exports', compiled)(loadDependency, module, module.exports);
    return module.exports;
  }

  return { api: load('api').apiClient, auth: load('auth'), session: load('session'), storage };
}

test('login stores the token pair and private requests carry Bearer', async () => {
  const harness = createHarness(async (config) => {
    if (config.url === '/auth/login') return ok(config, {
      accessToken: 'A1', refreshToken: 'R1', mustChangePassword: false,
    });
    if (config.url === '/private') return ok(config, {
      authorization: config.headers.get('Authorization'),
    });
    throw new Error(`Unexpected URL: ${config.url}`);
  });

  await harness.auth.signIn('driver', 'secret');
  assert.equal(harness.session.getSessionStatus(), 'authenticated');
  assert.deepEqual(JSON.parse([...harness.storage.values()][0]), {
    accessToken: 'A1', refreshToken: 'R1',
  });
  assert.equal((await harness.api.get('/private')).data.authorization, 'Bearer A1');
});

test('concurrent 401 responses rotate the refresh token once and retry', async () => {
  let refreshCount = 0;
  const harness = createHarness(async (config) => {
    if (config.url === '/auth/login') return ok(config, {
      accessToken: 'A1', refreshToken: 'R1', mustChangePassword: false,
    });
    if (config.url === '/auth/refresh') {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return ok(config, { accessToken: 'A2', refreshToken: 'R2', mustChangePassword: false });
    }
    if (config.url === '/private') {
      const authorization = config.headers.get('Authorization');
      return authorization === 'Bearer A1' ? unauthorized(config) : ok(config, { authorization });
    }
    throw new Error(`Unexpected URL: ${config.url}`);
  });

  await harness.auth.signIn('driver', 'secret');
  const results = await Promise.all([harness.api.get('/private'), harness.api.get('/private')]);
  assert.deepEqual(results.map((result) => result.data.authorization), ['Bearer A2', 'Bearer A2']);
  assert.equal(refreshCount, 1);
  assert.equal(JSON.parse([...harness.storage.values()][0]).refreshToken, 'R2');
});

test('a rejected refresh removes both tokens and ends the session', async () => {
  const harness = createHarness(async (config) => {
    if (config.url === '/auth/login') return ok(config, {
      accessToken: 'A1', refreshToken: 'R1', mustChangePassword: false,
    });
    if (config.url === '/auth/refresh' || config.url === '/private') return unauthorized(config);
    throw new Error(`Unexpected URL: ${config.url}`);
  });

  await harness.auth.signIn('driver', 'secret');
  await assert.rejects(harness.api.get('/private'));
  assert.equal(harness.session.getSessionStatus(), 'unauthenticated');
  assert.equal(harness.storage.size, 0);
});

test('startup validates and rotates the saved token pair', async () => {
  const harness = createHarness(async (config) => {
    if (config.url === '/auth/refresh') return ok(config, {
      accessToken: 'A2', refreshToken: 'R2', mustChangePassword: false,
    });
    throw new Error(`Unexpected URL: ${config.url}`);
  }, { accessToken: 'A1', refreshToken: 'R1' });

  await harness.auth.initializeSession();
  assert.equal(harness.session.getSessionStatus(), 'authenticated');
  assert.equal(JSON.parse([...harness.storage.values()][0]).refreshToken, 'R2');
});

test('network loss on startup keeps the stored offline session', async () => {
  const harness = createHarness(async (config) => {
    throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config);
  }, { accessToken: 'A1', refreshToken: 'R1' });

  await harness.auth.initializeSession();
  assert.equal(harness.session.getSessionStatus(), 'authenticated');
  assert.equal(JSON.parse([...harness.storage.values()][0]).refreshToken, 'R1');
});

test('an old 401 cannot replay a request under a new login', async () => {
  let loginCount = 0;
  let releaseRefresh;
  let signalRefresh;
  const refreshStarted = new Promise((resolve) => { signalRefresh = resolve; });
  const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
  const harness = createHarness(async (config) => {
    if (config.url === '/auth/login') {
      loginCount += 1;
      const suffix = loginCount === 1 ? '1' : '9';
      return ok(config, {
        accessToken: `A${suffix}`, refreshToken: `R${suffix}`, mustChangePassword: false,
      });
    }
    if (config.url === '/auth/refresh') {
      signalRefresh();
      await refreshGate;
      return ok(config, { accessToken: 'A2', refreshToken: 'R2', mustChangePassword: false });
    }
    if (config.url === '/private') return unauthorized(config);
    throw new Error(`Unexpected URL: ${config.url}`);
  });

  await harness.auth.signIn('first', 'secret');
  const oldRequest = harness.api.get('/private');
  await refreshStarted;
  await harness.auth.signIn('second', 'secret');
  releaseRefresh();
  await assert.rejects(oldRequest);
  assert.equal(harness.session.getSessionStatus(), 'authenticated');
  assert.deepEqual(JSON.parse([...harness.storage.values()][0]), {
    accessToken: 'A9', refreshToken: 'R9',
  });
});
