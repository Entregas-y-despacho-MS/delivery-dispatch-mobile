import { StyleSheet, View } from 'react-native';
import { LayoutDashboard, Settings2 } from 'lucide-react-native';
import { AppText, Card, EmptyView, IconButton, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export default function HomeShellScreen() {
  return <Screen><View style={styles.header}><View><AppText variant="caption">Aplicación móvil</AppText><AppText variant="title" style={styles.title}>Inicio</AppText></View><IconButton accessibilityLabel="Configuración"><Settings2 size={21} color={colors.navy} /></IconButton></View><Card style={styles.hero}><View style={styles.heroIcon}><LayoutDashboard size={22} color={colors.surface} /></View><AppText variant="heading" style={styles.heroTitle}>Shell listo</AppText><AppText style={styles.heroText}>Esta pantalla es una base visual. Aquí se conectarán los módulos de la aplicación.</AppText></Card><EmptyView title="Sin módulo conectado" description="Agrega la lógica de negocio en features sin modificar el núcleo compartido." /></Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }, title: { marginTop: spacing.xs }, hero: { backgroundColor: colors.navy, borderColor: colors.navy, marginBottom: spacing.xl }, heroIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.navyLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }, heroTitle: { color: colors.surface }, heroText: { color: colors.brandSoft, marginTop: spacing.sm } });
