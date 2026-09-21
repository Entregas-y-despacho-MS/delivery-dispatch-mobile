import { AppText, EmptyView, Screen } from '@/components/ui';

export default function ProfileShellScreen() {
  return <Screen><AppText variant="title">Perfil</AppText><AppText>Ruta preparada para conectar un módulo.</AppText><EmptyView title="Módulo pendiente" description="Aquí se conectará la información de usuario y preferencias." /></Screen>;
}
