import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getOrders } from '@/src/api/orders';
import { getOrdersByStatus, getSummary } from '@/src/api/reports';
import { ErrorMessage } from '@/src/components/ErrorMessage';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { StatusBadge } from '@/src/components/StatusBadge';
import { ShipmentStatus } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const STATUS_COLOR_MAP: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: '#F39C12',
  [ShipmentStatus.CONFIRMED]: '#2980B9',
  [ShipmentStatus.PICKED_UP]: '#8E44AD',
  [ShipmentStatus.IN_TRANSIT]: '#E67E22',
  [ShipmentStatus.OUT_FOR_DELIVERY]: '#D35400',
  [ShipmentStatus.DELIVERED]: '#27AE60',
  [ShipmentStatus.FAILED]: '#E74C3C',
  [ShipmentStatus.CANCELLED]: '#95A5A6',
};

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

function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const router = useRouter();

  const {
    data: summary,
    isLoading: loadingSummary,
    error: errorSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: getSummary,
    refetchInterval: 60_000,
  });

  const {
    data: statusReport,
    isLoading: loadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['reports', 'orders-by-status'],
    queryFn: getOrdersByStatus,
    refetchInterval: 60_000,
  });

  const {
    data: recentOrdersData,
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => getOrders({ page: 1, limit: 5 }),
    refetchInterval: 60_000,
  });

  const isLoading = loadingSummary && loadingStatus && loadingOrders;

  const handleRefresh = () => {
    refetchSummary();
    refetchStatus();
    refetchOrders();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetchSummary();
      refetchStatus();
      refetchOrders();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetchSummary, refetchStatus, refetchOrders]);

  if (isLoading) {
    return <LoadingScreen message="Cargando dashboard..." />;
  }

  if (errorSummary) {
    return (
      <View style={styles.centered}>
        <ErrorMessage error={errorSummary} onRetry={refetchSummary} variant="fullscreen" />
      </View>
    );
  }

  const recentOrders = recentOrdersData?.items ?? [];
  const totalStatus = statusReport?.reduce((sum, s) => sum + s.count, 0) ?? 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={PRIMARY} />
      }
    >
      {/* Section: Summary Cards */}
      <Text style={styles.sectionTitle}>Resumen de hoy</Text>
      <View style={styles.grid2x2}>
        <SummaryCard
          label="Pedidos hoy"
          value={String(summary?.ordersToday ?? 0)}
          icon="cube-outline"
          color="#2980B9"
          bg="#EBF5FB"
        />
        <SummaryCard
          label="Repartidores activos"
          value={`${summary?.activeDrivers ?? 0} / ${summary?.totalDrivers ?? 0}`}
          icon="bicycle-outline"
          color="#27AE60"
          bg="#EAFAF1"
        />
        <SummaryCard
          label="Pedidos pendientes"
          value={String(
            statusReport?.find((s) => s.status === ShipmentStatus.PENDING)?.count ?? 0,
          )}
          icon="time-outline"
          color="#F39C12"
          bg="#FEF9E7"
        />
        <SummaryCard
          label="Ingresos del día"
          value={formatPrice(summary?.revenueToday ?? 0)}
          icon="cash-outline"
          color="#27AE60"
          bg="#EAFAF1"
          small
        />
      </View>

      {/* Section: Orders by Status chart */}
      <Text style={styles.sectionTitle}>Pedidos por estado</Text>
      <View style={styles.card}>
        {statusReport && statusReport.length > 0 ? (
          statusReport
            .filter((s) => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((item) => {
              const pct = Math.max(4, (item.count / totalStatus) * 100);
              const color = STATUS_COLOR_MAP[item.status] ?? '#95A5A6';
              const label = STATUS_LABELS[item.status] ?? item.status;
              return (
                <View key={item.status} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{item.count}</Text>
                </View>
              );
            })
        ) : (
          <Text style={styles.emptyText}>Sin datos</Text>
        )}
      </View>

      {/* Section: Recent Orders */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pedidos recientes</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/orders')}>
          <Text style={styles.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>No hay pedidos recientes</Text>
        ) : (
          recentOrders.map((order, idx) => (
            <TouchableOpacity
              key={order.id}
              style={[
                styles.orderRow,
                idx < recentOrders.length - 1 && styles.orderRowBorder,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/order-detail',
                  params: { id: order.id },
                })
              }
            >
              <View style={styles.orderRowLeft}>
                <Text style={styles.trackingCode}>{order.trackingCode}</Text>
                <Text style={styles.orderMeta}>
                  {order.client
                    ? `${order.client.firstName} ${order.client.lastName}`
                    : 'Cliente'}{' '}
                  · {formatDate(order.createdAt)}
                </Text>
              </View>
              <StatusBadge status={order.status} size="sm" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Section: Quick Actions */}
      <Text style={styles.sectionTitle}>Acciones rápidas</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: PRIMARY }]}
          onPress={() => router.push('/(admin)/order-create')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Crear pedido manual</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: SECONDARY }]}
          onPress={() => router.push('/(admin)/fleet-map')}
        >
          <Ionicons name="map-outline" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Ver flota en tiempo real</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  small?: boolean;
}

function SummaryCard({ label, value, icon, color, bg, small }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: '#FFFFFF' }]}>
      <View style={[styles.summaryIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text
        style={[styles.summaryValue, small && styles.summaryValueSmall]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.summaryLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 10,
    marginTop: 8,
  },
  seeAll: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginBottom: 10,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: SECONDARY,
    marginBottom: 2,
  },
  summaryValueSmall: {
    fontSize: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabel: {
    width: 100,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barCount: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: SECONDARY,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  orderRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  orderRowLeft: {
    flex: 1,
  },
  trackingCode: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 2,
  },
  orderMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  quickActions: {
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    paddingVertical: 8,
  },
});
