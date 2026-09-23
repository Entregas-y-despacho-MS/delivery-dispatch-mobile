import '../global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/query-client';
import { initDatabase } from '@/lib/database';
import { syncService } from '@/lib/sync';
import { LoadingView } from '@/components/ui/StateView';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initDatabase()
      .then(async () => {
        if (isMounted) {
          setIsDbReady(true);
          // Iniciar el servicio de sincronización en segundo plano
          await syncService.startSyncService();
        }
      })
      .catch((error) => {
        console.error('Error inicializando la base de datos local SQLite:', error);
        // Permitir continuar en caso de fallo para no romper el montaje de la UI
        if (isMounted) {
          setIsDbReady(true);
        }
      });

    return () => {
      isMounted = false;
      syncService.stopSyncService();
    };
  }, []);

  if (!isDbReady) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <LoadingView />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}

