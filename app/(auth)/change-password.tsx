import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
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
} from 'lucide-react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';
import { AppText, Card, PrimaryButton, Screen, TextField } from '@/components/ui';
import {
  changePasswordSchema,
  checkPasswordRequirements,
  type ChangePasswordFormValues,
} from '@/features/auth/change-password-schema';
import {
  executeChangePassword,
  getChangePasswordFailure,
} from '@/features/auth/change-password-service';
import {
  clearPendingPasswordChange,
  getPendingPasswordChange,
  signIn,
} from '@/features/auth/auth-service';
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

export default function ChangePasswordScreen() {
  const params = useLocalSearchParams<{ currentPassword?: string }>();
  const pendingState = getPendingPasswordChange();
  const currentPassword = params.currentPassword ?? pendingState?.currentPassword ?? '';

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(changePasswordSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const watchedNewPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const requirements = checkPasswordRequirements(watchedNewPassword);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancelar cambio de contraseña',
      'Si sales ahora, deberás iniciar sesión nuevamente con tu contraseña temporal. ¿Deseas salir?',
      [
        { text: 'Continuar editando', style: 'cancel' },
        {
          text: 'Salir al inicio',
          style: 'destructive',
          onPress: () => {
            clearPendingPasswordChange();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      handleCancel();
      return true;
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandlerSubscription.remove();
  }, [handleCancel]);

  const submit = handleSubmit(async ({ newPassword }) => {
    const pending = getPendingPasswordChange();
    const token = pending?.accessToken;
    const username = pending?.username;
    const effectiveCurrentPassword = currentPassword || pending?.currentPassword;

    if (!token || !effectiveCurrentPassword || !username) {
      Alert.alert(
        'Sesión requerida',
        'No se encontró una sesión activa para cambiar la contraseña. Inicia sesión nuevamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              clearPendingPasswordChange();
              router.replace('/(auth)/login');
            },
          },
        ],
      );
      return;
    }

    try {
      await executeChangePassword(token, effectiveCurrentPassword, newPassword);
      clearPendingPasswordChange();
    } catch (error) {
      const failure = getChangePasswordFailure(error);
      if (failure.kind === 'session-expired') {
        clearPendingPasswordChange();
        Alert.alert(failure.title, failure.message, [
          { text: 'Iniciar sesión', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }
      Alert.alert(failure.title, failure.message);
      return;
    }

    try {
      // Re-autenticación automática con la nueva contraseña
      await signIn(username, newPassword);
      router.replace('/(app)/(tabs)');
    } catch {
      // Si la re-autenticación inmediata falla por red/timeout, la clave ya fue cambiada exitosamente en el servidor
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido actualizada exitosamente. Por favor, inicia sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      );
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
                accessibilityLabel="Volver al inicio de sesión"
                accessibilityRole="button"
                onPress={handleCancel}
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
                <KeyRound size={22} color={colors.brand} />
              </View>
              <AppText
                variant="title"
                className="text-[30px] leading-[36px]"
                style={{ color: colors.brand }}
              >
                Cambio de contraseña
              </AppText>
              <AppText className="mt-2 text-[15px] leading-[22px] text-slate">
                Por seguridad de la empresa, debes cambiar tu contraseña provisional antes de continuar con tus despachos.
              </AppText>
            </View>

            {/* Form Fields */}
            <View className="mt-8 gap-5">
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

            {/* Requisitos de seguridad en tiempo real (RF-A25) */}
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

            {/* Botón de acción */}
            <View className="mt-6 gap-3">
              <PrimaryButton
                label="Actualizar contraseña"
                onPress={submit}
                loading={isSubmitting}
              />
              <Pressable
                accessibilityRole="button"
                onPress={handleCancel}
                className="min-h-11 items-center justify-center"
              >
                <AppText className="text-[14px] font-semibold text-slate">
                  Cancelar y salir
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
