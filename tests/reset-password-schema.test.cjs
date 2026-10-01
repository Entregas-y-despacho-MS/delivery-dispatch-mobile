const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadModule(relativePath) {
  const file = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const loadDependency = (spec) => {
    if (spec === 'yup') return require('yup');
    if (spec === './change-password-schema') return loadModule('src/features/auth/change-password-schema.ts');
    throw new Error(`Unexpected dependency: ${spec}`);
  };
  new Function('require', 'module', 'exports', compiled)(loadDependency, module, module.exports);
  return module.exports;
}

test('forgotPasswordSchema validates email correctly', async () => {
  const { forgotPasswordSchema } = loadModule('src/features/auth/reset-password-schema.ts');

  await assert.rejects(
    forgotPasswordSchema.validate({ email: 'not-an-email' }),
    (error) => {
      assert.match(error.message, /correo electrónico válido/);
      return true;
    },
  );

  const valid = await forgotPasswordSchema.validate({ email: 'driver@empresa.com' });
  assert.equal(valid.email, 'driver@empresa.com');
});

test('resetPasswordSchema rejects empty token or mismatched passwords', async () => {
  const { resetPasswordSchema } = loadModule('src/features/auth/reset-password-schema.ts');

  // Token vacío
  await assert.rejects(
    resetPasswordSchema.validate({
      token: '',
      newPassword: 'ValidPass1@',
      confirmPassword: 'ValidPass1@',
    }),
    (error) => {
      assert.match(error.message, /código/);
      return true;
    },
  );

  // Contraseñas que no coinciden
  await assert.rejects(
    resetPasswordSchema.validate({
      token: 'token123456',
      newPassword: 'ValidPass1@',
      confirmPassword: 'DifferentPass2#',
    }),
    (error) => {
      assert.match(error.message, /Las contraseñas no coinciden/);
      return true;
    },
  );

  // Todo válido
  const valid = await resetPasswordSchema.validate({
    token: 'token1234567890',
    newPassword: 'ValidPass1@',
    confirmPassword: 'ValidPass1@',
  });
  assert.equal(valid.token, 'token1234567890');
  assert.equal(valid.newPassword, 'ValidPass1@');
});
