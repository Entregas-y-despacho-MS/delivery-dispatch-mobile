const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadSchemaModule() {
  const file = path.join(__dirname, '..', 'src/features/auth/change-password-schema.ts');
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
    throw new Error(`Unexpected dependency: ${spec}`);
  };
  new Function('require', 'module', 'exports', compiled)(loadDependency, module, module.exports);
  return module.exports;
}

test('checkPasswordRequirements accurately identifies each RF-A25 criteria', () => {
  const { checkPasswordRequirements, isPasswordComplex } = loadSchemaModule();

  const weak = checkPasswordRequirements('abc');
  assert.equal(weak.minLength, false);
  assert.equal(weak.hasUppercase, false);
  assert.equal(weak.hasLowercase, true);
  assert.equal(weak.hasNumber, false);
  assert.equal(weak.hasSpecialChar, false);
  assert.equal(isPasswordComplex('abc'), false);

  const strong = checkPasswordRequirements('StrongP@ss1');
  assert.equal(strong.minLength, true);
  assert.equal(strong.hasUppercase, true);
  assert.equal(strong.hasLowercase, true);
  assert.equal(strong.hasNumber, true);
  assert.equal(strong.hasSpecialChar, true);
  assert.equal(isPasswordComplex('StrongP@ss1'), true);
});

test('changePasswordSchema rejects password matching current password', async () => {
  const { changePasswordSchema } = loadSchemaModule();

  await assert.rejects(
    changePasswordSchema.validate({
      currentPassword: 'SamePassword1!',
      newPassword: 'SamePassword1!',
      confirmPassword: 'SamePassword1!',
    }),
    (error) => {
      assert.match(error.message, /no puede ser igual a la contraseña actual/);
      return true;
    },
  );
});

test('changePasswordSchema rejects confirmation mismatch', async () => {
  const { changePasswordSchema } = loadSchemaModule();

  await assert.rejects(
    changePasswordSchema.validate({
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'DifferentPassword2@',
    }),
    (error) => {
      assert.match(error.message, /Las contraseñas no coinciden/);
      return true;
    },
  );
});

test('changePasswordSchema accepts fully valid new password and confirmation', async () => {
  const { changePasswordSchema } = loadSchemaModule();

  const valid = await changePasswordSchema.validate({
    currentPassword: 'OldPassword1!',
    newPassword: 'NewStrongPassword1@',
    confirmPassword: 'NewStrongPassword1@',
  });

  assert.equal(valid.newPassword, 'NewStrongPassword1@');
  assert.equal(valid.confirmPassword, 'NewStrongPassword1@');
});
