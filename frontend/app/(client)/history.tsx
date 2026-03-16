import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders } from '@/src/api/orders';
import { OrderCard } from '@/src/components/OrderCard';
import type { Order } from '@/src/types';
import { ShipmentStatus } from '@/src/types';

const PRIMARY = '#FF6B35';
const BG = '#F5F5F5';

const FILTERS: { label: string; value: ShipmentStatus | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendientes', value: ShipmentStatus.PENDING },
  { label: 'En camino', value: ShipmentStatus.IN_TRANSIT },
  { label: 'Entregados', value: ShipmentStatus.DELIVERED },
  { label: 'Cancelados', value: ShipmentStatus.CANCELLED },
];

export default function HistoryScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', 'client', statusFilter],
    queryFn: () => getOrders({ status: statusFilter, limit: 50 }),
  });

  const orders = data?.items ?? [];

  function handlePress(order: Order) {
    router.push(`/(client)/order/${order.id}` as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Status filter chips */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const active = item.value === statusFilter;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatusFilter(item.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar los envíos</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={52} color="#CCC" />
          <Text style={styles.emptyTitle}>Sin envíos</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter
              ? 'No tenés envíos con este estado'
              : 'Todavía no realizaste ningún envío'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={handlePress} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  filterBar: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#FFF' },
  loader: { flex: 1 },
  list: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#999' },
  emptySubtitle: { fontSize: 14, color: '#BBB', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIMARY,
    borderRadius: 10,
  },
  retryText: { color: '#FFF', fontWeight: '700' },
});
