import '../global.css';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as NativeSplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query/query-client';
import { initDatabase } from '@/lib/database';
import { syncService } from '@/lib/sync';
import { LoadingView } from '@/components/ui/StateView';
import { FlashPackLaunch } from '@/components/FlashPackLaunch';
import { initializeSession } from '@/features/auth/auth-service';
import { useSessionStatus } from '@/features/auth/session';
import { teardownBackgroundServices } from '@/features/auth/service-teardown';
import { trackingUploadService } from '@/features/tracking/tracking-upload-service';
import '@/features/tracking/location-task';

void NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [launchComplete, setLaunchComplete] = useState(false);
  const sessionStatus = useSessionStatus();
  const appReady = isReady && sessionStatus !== 'loading';
  const finishLaunch = useCallback(() => setLaunchComplete(true), []);

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
    if (!isReady || !isDbReady || sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'authenticated') {
      trackingUploadService.start();
      void syncService.startSyncService().catch((error) => {
        console.error('Error iniciando la sincronización:', error);
      });
      return () => {
        void teardownBackgroundServices();
      };
    }

    if (sessionStatus === 'unauthenticated') {
      void teardownBackgroundServices();
    }
  }, [isReady, isDbReady, sessionStatus]);

  return (
    <View className="flex-1 bg-canvas">
      {appReady ? (
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      ) : (
        <View className="flex-1 items-center justify-center bg-canvas">
          <LoadingView />
        </View>
      )}
      {!launchComplete && <FlashPackLaunch appReady={appReady} onComplete={finishLaunch} />}
    </View>
  );
}
