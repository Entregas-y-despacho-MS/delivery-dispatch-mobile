import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { yupResolver } from '@hookform/resolvers/yup';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import Svg, { Path } from 'react-native-svg';
import { AppText, PrimaryButton, Screen, TextField } from '@/components/ui';
import { loginSchema, type LoginFormValues } from '@/features/auth/login-schema';
import { colors } from '@/theme/tokens';

function BrandMark() {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42" accessibilityElementsHidden>
      <Path d="M21 2 38 11 21 20 4 11Z" fill={colors.turquoise} />
      <Path d="M4 14 19 22V40L4 31Z" fill={colors.brand} />
      <Path d="M38 14 23 22V40L38 31Z" fill={colors.navyLight} />
    </Svg>
  );
}

function RouteArtwork() {
  return (
    <View className="mt-2 h-[220px] bg-brand-soft" accessibilityElementsHidden>
      <Image
        source={require('../../assets/images/login-footer-city.png')}
        className="h-full w-full"
        resizeMode="cover"
      />
    </View>
  );
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { identifier: '', password: '' },
  });

  const submit = handleSubmit(async () => {
    // Preview the loading state until the authentication service is connected.
    await new Promise<void>((resolve) => setTimeout(resolve, 650));
    router.replace('/(app)/(tabs)');
  });

  return (
    <Screen scroll={false} className="bg-white" contentClassName="flex-1 p-0">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="bg-white"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[480px] self-center px-6 pt-5">
            <View className="flex-row items-center gap-3">
              <BrandMark />
              <View>
                <View className="flex-row items-baseline">
                  <AppText variant="heading" className="text-[24px] leading-[28px]" style={{ color: colors.brand }}>Flash</AppText>
                  <AppText variant="heading" className="text-[24px] leading-[28px]" style={{ color: colors.turquoise }}> Pack</AppText>
                </View>
                <AppText variant="caption" className="italic text-slate">Tu mundo en movimiento</AppText>
              </View>
            </View>

            <View className="mt-12">
              <AppText variant="title" className="text-[36px] leading-[42px]" style={{ color: colors.brand }}>
                Todo en ruta.
              </AppText>
              <AppText className="mt-3 max-w-[340px] text-[16px] leading-[24px] text-slate">
                Gestiona tus entregas con claridad, desde cualquier lugar.
              </AppText>
            </View>

            <View className="mt-10 gap-5">
              <Controller
                control={control}
                name="identifier"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Usuario o correo"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="Tu usuario o correo"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    leadingIcon={<Mail size={19} color={colors.slate} />}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Contraseña"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldState.error?.message}
                    placeholder="Ingresa tu contraseña"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    leadingIcon={<LockKeyhole size={19} color={colors.slate} />}
                    trailingAction={
                      <Pressable
                        accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        accessibilityRole="button"
                        onPress={() => setShowPassword((visible) => !visible)}
                        className="h-11 w-11 items-center justify-center rounded-xl"
                      >
                        {showPassword ? <EyeOff size={19} color={colors.slate} /> : <Eye size={19} color={colors.slate} />}
                      </Pressable>
                    }
                  />
                )}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('Recuperar acceso', 'La recuperación de contraseña aún no está disponible.')}
              className="mt-2 min-h-11 self-end justify-center"
            >
              <AppText className="font-semibold underline" style={{ color: colors.brand }}>¿Olvidaste tu contraseña?</AppText>
            </Pressable>

            <View className="mt-5">
              <PrimaryButton
                label="Iniciar sesión"
                onPress={submit}
                loading={isSubmitting}
                trailingIcon={<View className="absolute right-4"><ArrowRight size={20} color={colors.ink} /></View>}
              />
            </View>
          </View>
          <RouteArtwork />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between' },
});
