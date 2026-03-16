import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { LoadingScreen } from '@/src/components/LoadingScreen';
import { ToastProvider } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth.store';
import { UserRole } from '@/src/types';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <RootLayoutNav />
        </ToastProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const hasHydrated = useRef(false);

  // Hydrate session from SecureStore on mount — runs exactly once
  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      hydrate();
    }
  }, [hydrate]);

  // After hydration: if there's a session, navigate to the role screen.
  // Redirect-to-login is handled by each protected layout, not here,
  // so that auth screens (login, register) are never accidentally redirected.
  useEffect(() => {
    if (isLoading) return;
    if (!session?.user) return;

    const role = session.user.role;
    if (role === UserRole.CLIENT) {
      router.replace('/(client)');
    } else if (role === UserRole.DRIVER) {
      router.replace('/(driver)');
    } else if (role === UserRole.ADMIN) {
      router.replace('/(admin)');
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen message="Iniciando sesión..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}
