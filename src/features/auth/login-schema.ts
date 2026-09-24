import * as yup from 'yup';

export const loginSchema = yup.object({
  identifier: yup
    .string()
    .trim()
    .required('Ingresa tu usuario.'),
  password: yup
    .string()
    .required('Ingresa tu contraseña.')
    .test('not-blank', 'Ingresa tu contraseña.', (value) => Boolean(value?.trim())),
  totpCode: yup.string().optional().test(
    'totp-format',
    'El código debe tener 6 dígitos.',
    (value) => !value || /^\d{6}$/.test(value),
  ),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;
