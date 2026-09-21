import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { AppText, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('repartidor@despachos.com');
  const [password, setPassword] = useState('');

  return <Screen scroll={false}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
    <View style={styles.brand}><View style={styles.logo}><Truck size={30} color="#fff" /></View><AppText variant="title" style={styles.title}>Despachos</AppText><AppText style={styles.subtitle}>La ruta clara para cada entrega.</AppText></View>
    <View style={styles.form}><AppText variant="heading">Acceso</AppText><AppText style={styles.help}>Pantalla base lista para conectar autenticación.</AppText>
      <TextField label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tu@correo.com" keyboardType="email-address" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry />
      <AppText variant="caption" style={styles.note}>La validación y la integración con backend se agregarán en la capa de funcionalidad.</AppText><PrimaryButton label="Continuar al shell" onPress={() => router.replace('/(app)/(tabs)')} />
    </View>
  </KeyboardAvoidingView></Screen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: spacing.xxl },
  brand: { alignItems: 'center', paddingTop: spacing.xxl },
  logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { color: colors.navy }, subtitle: { marginTop: spacing.sm },
  form: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  help: { marginTop: spacing.sm }, note: { marginTop: -spacing.sm },
});
