import '../global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/query-client';
import { initDatabase } from '@/lib/database';
import { syncService } from '@/lib/sync';
import { LoadingView } from '@/components/ui/StateView';
import { initializeSession } from '@/features/auth/auth-service';
import { useSessionStatus } from '@/features/auth/session';
import { stopTrackingAndClearLocation } from '@/features/tracking';
import { trackingUploadService } from '@/features/tracking/tracking-upload-service';
import '@/features/tracking/location-task';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const sessionStatus = useSessionStatus();

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([initDatabase(), initializeSession()]).then(([database, session]) => {
      if (database.status === 'rejected') {
        const error = database.reason;
        console.error('Error inicializando la base de datos local SQLite:', error);
      }
      if (session.status === 'rejected') {
        console.error('Error restaurando la sesión:', session.reason);
      }
      if (!isMounted) return;
      setIsDbReady(database.status === 'fulfilled');
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isReady && isDbReady && sessionStatus === 'authenticated') {
      trackingUploadService.start();
      void syncService.startSyncService().catch((error) => {
        console.error('Error iniciando la sincronización:', error);
      });
      return () => {
        trackingUploadService.stop();
        syncService.stopSyncService();
      };
    }
    trackingUploadService.stop();
    syncService.stopSyncService();
  }, [isReady, isDbReady, sessionStatus]);

  useEffect(() => {
    if (isReady && sessionStatus === 'unauthenticated') {
      void stopTrackingAndClearLocation().catch((error) => {
        console.error('Error deteniendo el seguimiento GPS:', error);
      });
    }
  }, [isReady, sessionStatus]);

  if (!isReady || sessionStatus === 'loading') {
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
