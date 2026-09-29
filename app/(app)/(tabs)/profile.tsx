import { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { User, LogOut, CheckCircle2, AlertTriangle, Wifi, WifiOff } from 'lucide-react-native';
import { AppText, Card, Divider, PrimaryButton, Screen } from '@/components/ui';
import { useSyncStatus } from '@/lib/sync';
import { useLogout } from '@/features/auth/use-logout';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const sync = useSyncStatus();
  const { phase, pendingInfo, error, requestLogout, confirmLogout, cancelLogout } = useLogout();

  useEffect(() => {
    if (phase === 'confirming') {
      Alert.alert(
        'Cerrar Turno',
        '¿Estás seguro de que deseas cerrar tu turno?\n\nSe detendrá el servicio de rastreo GPS en segundo plano y se cerrará tu sesión activa.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: cancelLogout },
          { text: 'Cerrar Turno', style: 'destructive', onPress: confirmLogout },
        ],
        { cancelable: true, onDismiss: cancelLogout }
      );
    } else if (phase === 'warning' && pendingInfo) {
      Alert.alert(
        'Eventos pendientes de sincronización',
        `Tienes ${pendingInfo.total} evento(s) local(es) pendiente(s) de transmisión al servidor.\n\n¿Deseas forzar la salida ahora o esperar a que se sincronicen?`,
        [
          { text: 'Esperar y sincronizar', style: 'cancel', onPress: cancelLogout },
          { text: 'Forzar salida', style: 'destructive', onPress: confirmLogout },
        ],
        { cancelable: true, onDismiss: cancelLogout }
      );
    } else if (phase === 'error' && error) {
      Alert.alert('Error al cerrar turno', error, [
        { text: 'Aceptar', onPress: cancelLogout },
      ]);
    }
  }, [phase, pendingInfo, error, confirmLogout, cancelLogout]);

  return (
    <Screen contentClassName="grow p-4 justify-between">
      <View className="gap-4">
        <AppText variant="title">Perfil</AppText>

        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brandSoft">
              <User size={24} color={colors.brand} />
            </View>
            <View className="flex-1">
              <AppText variant="heading">Repartidor en ruta</AppText>
              <AppText variant="caption">Turno operativo de entregas</AppText>
            </View>
          </View>
        </Card>

        <Card className="gap-3">
          <AppText variant="label">ESTADO DE SINCRONIZACIÓN</AppText>
          <Divider />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {sync.isOnline ? (
                <Wifi size={18} color={colors.green} />
              ) : (
                <WifiOff size={18} color={colors.red} />
              )}
              <AppText variant="body">
                {sync.isOnline ? 'Conectado a la red' : 'Sin conexión a internet'}
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {sync.pendingCount === 0 && sync.failedCount === 0 ? (
                <CheckCircle2 size={18} color={colors.green} />
              ) : (
                <AlertTriangle size={18} color={colors.orange} />
              )}
              <AppText variant="body">
                {sync.pendingCount === 0 && sync.failedCount === 0
                  ? 'Todos los eventos sincronizados'
                  : `${sync.pendingCount + sync.failedCount} evento(s) pendiente(s)`}
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      <View className="mt-8 gap-3">
        <PrimaryButton
          label="Cerrar Turno / Salir"
          variant="danger"
          onPress={requestLogout}
          loading={phase === 'checking' || phase === 'logging-out'}
          trailingIcon={<LogOut size={20} color="#FFFFFF" />}
        />
      </View>
    </Screen>
  );
}
