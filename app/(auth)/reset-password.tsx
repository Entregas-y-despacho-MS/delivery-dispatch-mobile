import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';
import { AppText, Card, PrimaryButton, Screen, TextField } from '@/components/ui';
import { checkPasswordRequirements } from '@/features/auth/change-password-schema';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/reset-password-schema';
import {
  getResetPasswordFailure,
  resetPasswordWithToken,
} from '@/features/auth/forgot-password-service';
import { colors } from '@/theme/tokens';

function BrandMark() {
  return (
    <Svg width={36} height={36} viewBox="0 0 42 42" accessibilityElementsHidden>
      <Path d="M21 2 38 11 21 20 4 11Z" fill={colors.turquoise} />
      <Path d="M4 14 19 22V40L4 31Z" fill={colors.brand} />
      <Path d="M38 14 23 22V40L38 31Z" fill={colors.navyLight} />
    </Svg>
  );
}

interface RequirementItemProps {
  label: string;
  fulfilled: boolean;
}

function RequirementItem({ label, fulfilled }: RequirementItemProps) {
  return (
    <View className="flex-row items-center gap-2">
      {fulfilled ? (
        <CheckCircle2 size={15} color={colors.green} />
      ) : (
        <Circle size={15} color={colors.muted} />
      )}
      <AppText
        className="text-[13px] leading-[18px]"
        style={{ color: fulfilled ? colors.green : colors.slate }}
      >
        {label}
      </AppText>
    </View>
  );
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      token: params.token ?? '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const watchedNewPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const requirements = checkPasswordRequirements(watchedNewPassword);

  const submit = handleSubmit(async ({ token, newPassword }) => {
    try {
      await resetPasswordWithToken(token, newPassword);

      Alert.alert(
        'Contraseña restablecida',
        'Tu contraseña ha sido actualizada con éxito. Ahora puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      );
    } catch (error) {
      const failure = getResetPasswordFailure(error);

      if (failure.kind === 'invalid-token') {
        Alert.alert(failure.title, failure.message, [
          { text: 'Revisar código', style: 'cancel' },
          {
            text: 'Solicitar nuevo código',
            onPress: () => router.replace('/(auth)/forgot-password'),
          },
        ]);
        return;
      }

      Alert.alert(failure.title, failure.message);
    }
  });

  return (
    <Screen scroll={false} className="bg-white" contentClassName="flex-1 p-0">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="bg-white"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[480px] self-center px-6 pt-5 pb-8">
            {/* Top Navigation */}
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityLabel="Volver"
                accessibilityRole="button"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
                className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-white pressed:opacity-70"
              >
                <ArrowLeft size={20} color={colors.ink} />
              </Pressable>

              <View className="flex-row items-center gap-2">
                <BrandMark />
                <View className="flex-row items-baseline">
                  <AppText
                    variant="heading"
                    className="text-[20px] leading-[24px]"
                    style={{ color: colors.brand }}
                  >
                    Flash
                  </AppText>
                  <AppText
                    variant="heading"
                    className="text-[20px] leading-[24px]"
                    style={{ color: colors.turquoise }}
                  >
                    {' '}Pack
                  </AppText>
                </View>
              </View>
            </View>

            {/* Header Titles */}
            <View className="mt-8">
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-brandSoft">
                <ShieldCheck size={22} color={colors.brand} />
              </View>
              <AppText
                variant="title"
                className="text-[30px] leading-[36px]"
                style={{ color: colors.brand }}
              >
                Restablecer contraseña
              </AppText>
              <AppText className="mt-2 text-[15px] leading-[22px] text-slate">
                Ingresa el código recibido en tu correo electrónico y define una nueva contraseña segura para tu cuenta.
              </AppText>
              {params.email ? (
                <AppText className="mt-1 text-[13px] font-medium text-brand">
                  Código enviado a: {params.email}
                </AppText>
              ) : null}
            </View>

            {/* Form */}
            <View className="mt-7 gap-5">
              <Controller
                control={control}
                name="token"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Código de recuperación"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="Pega aquí el código recibido por correo"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leadingIcon={<KeyRound size={19} color={colors.slate} />}
                  />
                )}
              />

              <Controller
                control={control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Nueva contraseña"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="Mínimo 8 caracteres"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    leadingIcon={<LockKeyhole size={19} color={colors.slate} />}
                    trailingAction={
                      <Pressable
                        accessibilityLabel={
                          showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                        }
                        accessibilityRole="button"
                        onPress={() => setShowNewPassword((v) => !v)}
                        className="h-11 w-11 items-center justify-center rounded-xl"
                      >
                        {showNewPassword ? (
                          <EyeOff size={19} color={colors.slate} />
                        ) : (
                          <Eye size={19} color={colors.slate} />
                        )}
                      </Pressable>
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Confirmar nueva contraseña"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="Repite tu nueva contraseña"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    leadingIcon={<LockKeyhole size={19} color={colors.slate} />}
                    trailingAction={
                      <Pressable
                        accessibilityLabel={
                          showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                        }
                        accessibilityRole="button"
                        onPress={() => setShowConfirmPassword((v) => !v)}
                        className="h-11 w-11 items-center justify-center rounded-xl"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={19} color={colors.slate} />
                        ) : (
                          <Eye size={19} color={colors.slate} />
                        )}
                      </Pressable>
                    }
                  />
                )}
              />
            </View>

            {/* Requisitos de seguridad (RF-A25) */}
            <Card className="mt-5 border-border bg-[#F8FBFD] p-4">
              <AppText variant="label" className="mb-2 text-ink">
                REQUISITOS DE SEGURIDAD
              </AppText>
              <View className="gap-2">
                <RequirementItem
                  label="Mínimo 8 caracteres"
                  fulfilled={requirements.minLength}
                />
                <RequirementItem
                  label="Al menos una letra mayúscula (A-Z)"
                  fulfilled={requirements.hasUppercase}
                />
                <RequirementItem
                  label="Al menos una letra minúscula (a-z)"
                  fulfilled={requirements.hasLowercase}
                />
                <RequirementItem
                  label="Al menos un número (0-9)"
                  fulfilled={requirements.hasNumber}
                />
                <RequirementItem
                  label="Al menos un carácter especial (@, $, !, %, etc.)"
                  fulfilled={requirements.hasSpecialChar}
                />
              </View>
            </Card>

            {/* Actions */}
            <View className="mt-6 gap-3">
              <PrimaryButton
                label="Restablecer contraseña"
                onPress={submit}
                loading={isSubmitting}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/(auth)/forgot-password')}
                className="min-h-11 items-center justify-center"
              >
                <AppText className="text-[14px] font-semibold" style={{ color: colors.brand }}>
                  ¿No recibiste el código? Solicitar uno nuevo
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/(auth)/login')}
                className="min-h-11 items-center justify-center"
              >
                <AppText className="text-[14px] font-semibold text-slate">
                  Volver al inicio de sesión
                </AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
