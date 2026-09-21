import { AppText, EmptyView, Screen } from '@/components/ui';

export default function HistoryShellScreen() {
  return <Screen><AppText variant="title">Historial</AppText><AppText>Ruta preparada para conectar un módulo.</AppText><EmptyView title="Módulo pendiente" description="Aquí se mostrará contenido cuando se agregue la funcionalidad correspondiente." /></Screen>;
}
