import * as yup from 'yup';

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

/**
 * Evalúa los 5 criterios de complejidad de contraseña requeridos por RF-A25:
 * 1. Mínimo 8 caracteres
 * 2. Al menos 1 letra mayúscula
 * 3. Al menos 1 letra minúscula
 * 4. Al menos 1 número
 * 5. Al menos 1 carácter especial
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  const value = password ?? '';
  return {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecialChar: /[^A-Za-z0-9]/.test(value),
  };
}

export function isPasswordComplex(password: string): boolean {
  const reqs = checkPasswordRequirements(password);
  return (
    reqs.minLength &&
    reqs.hasUppercase &&
    reqs.hasLowercase &&
    reqs.hasNumber &&
    reqs.hasSpecialChar
  );
}

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().optional(),
  newPassword: yup
    .string()
    .required('Ingresa tu nueva contraseña.')
    .test(
      'complexity',
      'La contraseña debe cumplir con todos los requisitos de seguridad.',
      (value) => isPasswordComplex(value ?? ''),
    )
    .test(
      'not-same-as-current',
      'La nueva contraseña no puede ser igual a la contraseña actual.',
      function (value) {
        const { currentPassword } = this.parent;
        if (!currentPassword || !value) return true;
        return value !== currentPassword;
      },
    ),
  confirmPassword: yup
    .string()
    .required('Confirma tu nueva contraseña.')
    .oneOf([yup.ref('newPassword')], 'Las contraseñas no coinciden.'),
});

export type ChangePasswordFormValues = yup.InferType<typeof changePasswordSchema>;
