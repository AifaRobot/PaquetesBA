import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders } from '@/src/api/orders';
import { StatusBadge } from '@/src/components/StatusBadge';
import { ShipmentStatus, type Order } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const FILTERS: { label: string; value: ShipmentStatus | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendientes', value: ShipmentStatus.PENDING },
  { label: 'Confirmados', value: ShipmentStatus.CONFIRMED },
  { label: 'En tránsito', value: ShipmentStatus.IN_TRANSIT },
  { label: 'En reparto', value: ShipmentStatus.OUT_FOR_DELIVERY },
  { label: 'Entregados', value: ShipmentStatus.DELIVERED },
  { label: 'Fallidos', value: ShipmentStatus.FAILED },
  { label: 'Cancelados', value: ShipmentStatus.CANCELLED },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | undefined>(undefined);

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => getOrders({ status: statusFilter, limit: 100 }),
  });

  const orders: Order[] = data?.items ?? [];

  function handlePress(order: Order) {
    router.push({ pathname: '/(admin)/order-detail', params: { id: order.id } } as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filters */}
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

      {/* Count */}
      {!isLoading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {data?.total ?? orders.length} pedido{(data?.total ?? orders.length) !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/(admin)/order-create' as never)}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar pedidos</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No hay pedidos</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handlePress(item)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.trackingCode}>{item.trackingCode}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.client ? `${item.client.firstName} ${item.client.lastName}` : 'Cliente desconocido'}
                </Text>
                <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.rowRight}>
                <StatusBadge status={item.status} size="sm" />
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CCC" />
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  filterBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#FFF' },
  countBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  createBtnText: { fontSize: 13, color: '#FFF', fontWeight: '700' },
  loader: { flex: 1 },
  list: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowLeft: { flex: 1 },
  trackingCode: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 2 },
  rowMeta: { fontSize: 13, color: SECONDARY, fontWeight: '500', marginBottom: 2 },
  rowDate: { fontSize: 11, color: '#AAA' },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 13, fontWeight: '700', color: SECONDARY },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 15, color: '#AAA' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
});
