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
import { router } from 'expo-router';
import { yupResolver } from '@hookform/resolvers/yup';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';
import { AppText, Card, PrimaryButton, Screen, TextField } from '@/components/ui';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/reset-password-schema';
import {
  getForgotPasswordFailure,
  requestPasswordReset,
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

export default function ForgotPasswordScreen() {
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmailAddress, setSentEmailAddress] = useState('');

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(async ({ email }) => {
    try {
      await requestPasswordReset(email);
      setEmailSent(true);
      setSentEmailAddress(email.trim().toLowerCase());

      Alert.alert(
        'Instrucciones enviadas',
        'Si el correo coincide con una cuenta activa, recibirás un código de restablecimiento en tu bandeja de entrada (válido por 30 minutos).',
        [
          {
            text: 'Ingresar código recibido',
            onPress: () => {
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: email.trim().toLowerCase() },
              });
            },
          },
        ],
      );
    } catch (error) {
      const failure = getForgotPasswordFailure(error);
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
                accessibilityLabel="Volver al inicio de sesión"
                accessibilityRole="button"
                onPress={() => router.replace('/(auth)/login')}
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
                <Mail size={22} color={colors.brand} />
              </View>
              <AppText
                variant="title"
                className="text-[30px] leading-[36px]"
                style={{ color: colors.brand }}
              >
                Recuperar contraseña
              </AppText>
              <AppText className="mt-2 text-[15px] leading-[22px] text-slate">
                Ingresa el correo electrónico asociado a tu cuenta de repartidor. Te enviaremos un código de seguridad para restablecer tu acceso.
              </AppText>
            </View>

            {/* Success notification banner if already requested */}
            {emailSent ? (
              <Card className="mt-6 border-[#BBF7D0] bg-[#F0FDF4] p-4">
                <View className="flex-row items-start gap-3">
                  <CheckCircle2 size={20} color={colors.green} className="mt-0.5" />
                  <View className="flex-1">
                    <AppText className="font-semibold text-[#166534]">
                      Correo enviado
                    </AppText>
                    <AppText className="mt-1 text-[13px] leading-[18px] text-[#15803D]">
                      Revisa la bandeja de entrada o spam de{' '}
                      <AppText className="font-semibold text-[#15803D]">
                        {sentEmailAddress}
                      </AppText>
                      . El código de recuperación tiene una validez de 30 minutos.
                    </AppText>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* Form */}
            <View className="mt-6 gap-5">
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Correo electrónico"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="ejemplo@empresa.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    leadingIcon={<Mail size={19} color={colors.slate} />}
                  />
                )}
              />
            </View>

            {/* Actions */}
            <View className="mt-6 gap-3">
              <PrimaryButton
                label={emailSent ? 'Reenviar instrucciones' : 'Enviar instrucciones'}
                onPress={submit}
                loading={isSubmitting}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    pathname: '/(auth)/reset-password',
                    params: sentEmailAddress ? { email: sentEmailAddress } : undefined,
                  });
                }}
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 pressed:opacity-70"
              >
                <KeyRound size={17} color={colors.brand} />
                <AppText className="text-[14px] font-semibold" style={{ color: colors.brand }}>
                  ¿Ya tienes un código? Ingresar código
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
