import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDeliveries, getDriverStats, getOrdersByStatus, getSummary } from '@/src/api/reports';
import { ShipmentStatus } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: 'Pendiente',
  [ShipmentStatus.CONFIRMED]: 'Confirmado',
  [ShipmentStatus.PICKED_UP]: 'Recogido',
  [ShipmentStatus.IN_TRANSIT]: 'En tránsito',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'En reparto',
  [ShipmentStatus.DELIVERED]: 'Entregado',
  [ShipmentStatus.FAILED]: 'Fallido',
  [ShipmentStatus.CANCELLED]: 'Cancelado',
};

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: '#F59E0B',
  [ShipmentStatus.CONFIRMED]: '#3B82F6',
  [ShipmentStatus.PICKED_UP]: '#8B5CF6',
  [ShipmentStatus.IN_TRANSIT]: '#D97706',
  [ShipmentStatus.OUT_FOR_DELIVERY]: PRIMARY,
  [ShipmentStatus.DELIVERED]: '#10B981',
  [ShipmentStatus.FAILED]: '#EF4444',
  [ShipmentStatus.CANCELLED]: '#9CA3AF',
};

function formatPrice(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function isoDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

function SummaryCard({ icon, label, value, color, bg }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.summaryCard, { flex: 1 }]}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function AdminReportsScreen() {
  const { from, to } = isoDateRange(7);

  const { data: summary, isLoading: l1, refetch: r1 } = useQuery({ queryKey: ['reports', 'summary'], queryFn: getSummary, refetchInterval: 120_000 });
  const { data: byStatus, isLoading: l2, refetch: r2 } = useQuery({ queryKey: ['reports', 'by-status'], queryFn: getOrdersByStatus });
  const { data: deliveries, isLoading: l3, refetch: r3 } = useQuery({ queryKey: ['reports', 'deliveries', from, to], queryFn: () => getDeliveries(from, to) });
  const { data: driverStats, isLoading: l4, refetch: r4 } = useQuery({ queryKey: ['reports', 'drivers'], queryFn: getDriverStats });

  const isLoading = l1 || l2 || l3 || l4;

  function handleRefresh() { r1(); r2(); r3(); r4(); }

  const totalByStatus = byStatus?.reduce((sum, s) => sum + s.count, 0) ?? 1;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
      >
        {/* Summary */}
        <Text style={styles.sectionTitle}>Resumen general</Text>
        {l1 ? <ActivityIndicator color={PRIMARY} /> : summary ? (
          <>
            <View style={styles.grid2}>
              <SummaryCard icon="cube" label="Total pedidos" value={String(summary.totalOrders)} color="#3B82F6" bg="#EFF6FF" />
              <SummaryCard icon="cube-outline" label="Pedidos hoy" value={String(summary.ordersToday)} color={PRIMARY} bg="#FFF3EE" />
            </View>
            <View style={styles.grid2}>
              <SummaryCard icon="bicycle" label="Repartidores activos" value={`${summary.activeDrivers}/${summary.totalDrivers}`} color="#10B981" bg="#ECFDF5" />
              <SummaryCard icon="people" label="Clientes" value={String(summary.totalClients)} color="#8B5CF6" bg="#F5F3FF" />
            </View>
            <View style={styles.grid2}>
              <SummaryCard icon="cash" label="Ingresos totales" value={formatPrice(summary.revenue)} color="#10B981" bg="#ECFDF5" />
              <SummaryCard icon="today" label="Ingresos hoy" value={formatPrice(summary.revenueToday)} color="#F59E0B" bg="#FFFBEB" />
            </View>
          </>
        ) : null}

        {/* Orders by status */}
        <Text style={styles.sectionTitle}>Pedidos por estado</Text>
        <View style={styles.card}>
          {l2 ? <ActivityIndicator color={PRIMARY} /> : byStatus && byStatus.length > 0 ? (
            byStatus.filter((s) => s.count > 0).sort((a, b) => b.count - a.count).map((item) => {
              const pct = Math.max(4, (item.count / totalByStatus) * 100);
              const color = STATUS_COLORS[item.status] ?? '#9CA3AF';
              return (
                <View key={item.status} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              );
            })
          ) : <Text style={styles.emptyText}>Sin datos</Text>}
        </View>

        {/* Daily deliveries (last 7 days) */}
        <Text style={styles.sectionTitle}>Entregas — últimos 7 días</Text>
        <View style={styles.card}>
          {l3 ? <ActivityIndicator color={PRIMARY} /> : deliveries && deliveries.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHead, { flex: 2 }]}>Fecha</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Total</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Entregados</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Fallidos</Text>
              </View>
              {deliveries.map((d) => (
                <View key={d.date} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</Text>
                  <Text style={styles.tableCell}>{d.total}</Text>
                  <Text style={[styles.tableCell, { color: '#10B981', fontWeight: '700' }]}>{d.delivered}</Text>
                  <Text style={[styles.tableCell, { color: '#EF4444', fontWeight: '700' }]}>{d.failed}</Text>
                </View>
              ))}
            </>
          ) : <Text style={styles.emptyText}>Sin datos para el período</Text>}
        </View>

        {/* Driver performance */}
        <Text style={styles.sectionTitle}>Rendimiento por repartidor</Text>
        <View style={styles.card}>
          {l4 ? <ActivityIndicator color={PRIMARY} /> : driverStats && driverStats.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHead, { flex: 2 }]}>Repartidor</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Entregas</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Éxito</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>Rating</Text>
              </View>
              {driverStats.sort((a, b) => b.deliveries - a.deliveries).map((d) => (
                <View key={d.driverId} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{d.driverName}</Text>
                  <Text style={styles.tableCell}>{d.deliveries}</Text>
                  <Text style={[styles.tableCell, { color: d.successRate >= 0.9 ? '#10B981' : d.successRate >= 0.7 ? '#F59E0B' : '#EF4444', fontWeight: '700' }]}>
                    {(d.successRate * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.tableCell}>{d.averageRating != null ? d.averageRating.toFixed(1) : '—'}</Text>
                </View>
              ))}
            </>
          ) : <Text style={styles.emptyText}>Sin datos de repartidores</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: SECONDARY, marginBottom: 10, marginTop: 8 },
  grid2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, elevation: 1, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  summaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: SECONDARY, marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 90, fontSize: 12, color: '#374151', fontWeight: '500' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barCount: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '700', color: SECONDARY },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#F0F0F0', marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F5F5F5' },
  tableCell: { flex: 1, fontSize: 13, color: SECONDARY, textAlign: 'center' },
  tableHead: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, paddingVertical: 8 },
});
