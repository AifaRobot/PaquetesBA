import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders } from '@/src/api/orders';
import { ErrorMessage } from '@/src/components/ErrorMessage';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { OrderCard } from '@/src/components/OrderCard';
import { useAuthStore } from '@/src/store/auth.store';
import type { Order } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const firstName = session?.user.firstName ?? 'Cliente';

  const [trackCode, setTrackCode] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orders', { limit: 3 }],
    queryFn: () => getOrders({ limit: 3 }),
  });

  const recentOrders: Order[] = data?.items ?? [];

  function handleTrack() {
    const code = trackCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/(client)/track/${code}` as never);
    setTrackCode('');
  }

  function handleOrderPress(order: Order) {
    router.push(`/(client)/order/${order.id}` as never);
  }

  if (isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        >
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingSmall}>Bienvenido de vuelta</Text>
              <Text style={styles.greetingName}>Hola, {firstName}!</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* CTA Card */}
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => router.push('/(client)/new-order' as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar paquete"
          >
            <View style={styles.ctaContent}>
              <View style={styles.ctaTextBlock}>
                <Text style={styles.ctaTitle}>Enviar paquete</Text>
                <Text style={styles.ctaSubtitle}>
                  Crea un pedido en minutos
                </Text>
              </View>
              <View style={styles.ctaIconWrapper}>
                <Ionicons name="cube-outline" size={48} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
            <View style={styles.ctaArrow}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              <Text style={styles.ctaArrowText}>Comenzar</Text>
            </View>
          </TouchableOpacity>

          {/* Quick Track */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rastrear paquete</Text>
            <View style={styles.trackRow}>
              <TextInput
                style={styles.trackInput}
                placeholder="PBA-2026-A3F9C1"
                placeholderTextColor="#AAAAAA"
                value={trackCode}
                onChangeText={setTrackCode}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleTrack}
                accessibilityLabel="Código de rastreo"
              />
              <TouchableOpacity
                style={[
                  styles.trackButton,
                  !trackCode.trim() && styles.trackButtonDisabled,
                ]}
                onPress={handleTrack}
                disabled={!trackCode.trim()}
                accessibilityRole="button"
                accessibilityLabel="Buscar"
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos recientes</Text>
              {recentOrders.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/(client)/history' as never)}
                  accessibilityRole="button"
                >
                  <Text style={styles.seeAll}>Ver todos</Text>
                </TouchableOpacity>
              )}
            </View>

            {isError && (
              <ErrorMessage error={error} onRetry={refetch} />
            )}

            {!isError && recentOrders.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={40} color="#CCCCCC" />
                <Text style={styles.emptyText}>No tienes pedidos aún</Text>
                <Text style={styles.emptySubtext}>
                  Crea tu primer envío tocando el botón de arriba
                </Text>
              </View>
            )}

            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={handleOrderPress}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greetingSmall: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: SECONDARY,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaCard: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  ctaIconWrapper: {
    marginLeft: 12,
  },
  ctaArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  ctaArrowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trackInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: SECONDARY,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  trackButton: {
    width: 48,
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#BBBBBB',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
