import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
import { OrderCard } from '@/src/components/OrderCard';
import { ShipmentStatus, type Order } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const FILTERS: { label: string; value: ShipmentStatus | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Entregados', value: ShipmentStatus.DELIVERED },
  { label: 'Fallidos', value: ShipmentStatus.FAILED },
  { label: 'Cancelados', value: ShipmentStatus.CANCELLED },
];

function formatPrice(value: number | null) {
  if (value === null) return '$0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DriverHistoryScreen() {
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | undefined>(undefined);

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['driver-history', statusFilter],
    queryFn: () => getOrders({ status: statusFilter, limit: 50 }),
  });

  const orders: Order[] = data?.items ?? [];

  // Compute summary stats from loaded orders
  const delivered = orders.filter((o) => o.status === ShipmentStatus.DELIVERED);
  const totalEarnings = delivered.reduce((sum, o) => sum + (o.price ?? 0), 0);
  const avgRating =
    delivered.filter((o) => o.rating !== null).length > 0
      ? delivered.reduce((sum, o) => sum + (o.rating ?? 0), 0) /
        delivered.filter((o) => o.rating !== null).length
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Summary banner */}
      {!statusFilter && orders.length > 0 && (
        <View style={styles.summaryBanner}>
          <StatChip
            icon="checkmark-circle"
            iconColor="#10B981"
            label="Entregados"
            value={String(delivered.length)}
          />
          <View style={styles.divider} />
          <StatChip
            icon="cash"
            iconColor="#10B981"
            label="Ganado"
            value={formatPrice(totalEarnings)}
          />
          <View style={styles.divider} />
          <StatChip
            icon="star"
            iconColor="#F59E0B"
            label="Rating"
            value={avgRating !== null ? avgRating.toFixed(1) : '—'}
          />
        </View>
      )}

      {/* Filter chips */}
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
          <Text style={styles.errorText}>Error al cargar el historial</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={52} color="#CCC" />
          <Text style={styles.emptyTitle}>Sin entregas</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter
              ? 'No tenés entregas con este estado'
              : 'Todavía no realizaste ninguna entrega'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.orderWrapper}>
              <OrderCard order={item} />
              {item.rating !== null && (
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= item.rating! ? 'star' : 'star-outline'}
                      size={14}
                      color="#F59E0B"
                    />
                  ))}
                  {item.ratingComment ? (
                    <Text style={styles.ratingComment} numberOfLines={1}>
                      "{item.ratingComment}"
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statChip: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: SECONDARY },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#EEE', marginVertical: 4 },
  filterBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
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
  orderWrapper: { marginBottom: 4 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ratingComment: { flex: 1, fontSize: 12, color: '#888', fontStyle: 'italic', marginLeft: 4 },
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
