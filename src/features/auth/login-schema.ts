import * as yup from 'yup';

const emailSchema = yup.string().email().matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);

export const loginSchema = yup.object({
  identifier: yup
    .string()
    .trim()
    .required('Ingresa tu usuario o correo.')
    .test('email-format', 'Ingresa un correo válido.', (value) => !value || !value.includes('@') || emailSchema.isValidSync(value)),
  password: yup
    .string()
    .required('Ingresa tu contraseña.')
    .test('not-blank', 'Ingresa tu contraseña.', (value) => Boolean(value?.trim())),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;
