import { useLocalSearchParams } from 'expo-router';
import { AppText, EmptyView, Screen } from '@/components/ui';

export default function FormShellScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Screen><AppText variant="title">Formulario</AppText><AppText variant="caption">Ruta dinámica configurada: {id}</AppText><EmptyView title="Pantalla base" description="Este route está preparado para recibir su módulo, sin lógica de negocio incluida." /></Screen>;
}
