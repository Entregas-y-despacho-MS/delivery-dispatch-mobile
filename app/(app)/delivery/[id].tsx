import { useLocalSearchParams } from 'expo-router';
import { AppText, EmptyView, Screen } from '@/components/ui';

export default function DetailShellScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Screen><AppText variant="title">Detalle</AppText><AppText variant="caption">Ruta dinámica configurada: {id}</AppText><EmptyView title="Pantalla base" description="Este route está preparado para recibir su módulo, sin lógica de negocio incluida." /></Screen>;
}
