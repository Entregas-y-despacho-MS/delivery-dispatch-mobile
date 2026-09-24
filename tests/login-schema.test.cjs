const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/auth/login-schema.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, moduleUnderTest, moduleUnderTest.exports);
const { loginSchema } = moduleUnderTest.exports;

test('username and password are required, including whitespace-only values', async () => {
  await assert.rejects(
    loginSchema.validate({ identifier: '  ', password: '  ' }, { abortEarly: false }),
    (error) => {
      assert.deepEqual(error.inner.map((item) => item.path).sort(), ['identifier', 'password']);
      return true;
    },
  );
});

test('valid credentials trim the username without changing the password', async () => {
  const values = await loginSchema.validate({ identifier: '  driver  ', password: 'secret with spaces' });
  assert.equal(values.identifier, 'driver');
  assert.equal(values.password, 'secret with spaces');
});

test('TOTP is optional but must contain exactly six digits when provided', async () => {
  const credentials = { identifier: 'driver', password: 'secret' };
  await loginSchema.validate(credentials);
  await loginSchema.validate({ ...credentials, totpCode: '123456' });
  for (const totpCode of ['12345', '1234567', 'abcdef']) {
    await assert.rejects(
      loginSchema.validate({ ...credentials, totpCode }),
      (error) => error.path === 'totpCode' && error.message === 'El código debe tener 6 dígitos.',
    );
  }
});
