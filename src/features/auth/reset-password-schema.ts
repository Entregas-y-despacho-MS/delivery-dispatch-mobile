import * as yup from 'yup';
import { isPasswordComplex } from './change-password-schema';

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required('Ingresa tu correo electrónico.')
    .email('Ingresa un correo electrónico válido.'),
});

export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>;

export const resetPasswordSchema = yup.object({
  token: yup
    .string()
    .trim()
    .required('Ingresa el código que recibiste por correo.')
    .min(6, 'El código ingresado es demasiado corto.'),
  newPassword: yup
    .string()
    .required('Ingresa tu nueva contraseña.')
    .test(
      'complexity',
      'La contraseña debe cumplir con todos los requisitos de seguridad.',
      (value) => isPasswordComplex(value ?? ''),
    ),
  confirmPassword: yup
    .string()
    .required('Confirma tu nueva contraseña.')
    .oneOf([yup.ref('newPassword')], 'Las contraseñas no coinciden.'),
});

export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>;
