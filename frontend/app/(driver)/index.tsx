import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { acceptOrder, getOrders } from '@/src/api/orders';
import { goOffline, goOnline } from '@/src/api/drivers';
import { confirmAlert, infoAlert } from '@/src/lib/alerts';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { OrderCard } from '@/src/components/OrderCard';
import { useAuthStore } from '@/src/store/auth.store';
import { ShipmentStatus, type Order } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

type ViewMode = 'list' | 'map';

export default function AvailableOrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  const [isOnline, setIsOnline] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch available (PENDING / CONFIRMED) orders for this driver
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['driver-available-orders'],
    queryFn: () =>
      getOrders({ status: ShipmentStatus.PENDING, limit: 50, page: 1 }),
    enabled: isOnline,
    staleTime: 0,
  });

  const orders: Order[] = data?.items ?? [];

  // Go-online mutation
  const onlineMutation = useMutation({
    mutationFn: goOnline,
    onSuccess: () => {
      setIsOnline(true);
      refetch();
    },
    onError: () => {
      infoAlert('Error', 'No se pudo activar el estado en línea.');
    },
  });

  // Go-offline mutation
  const offlineMutation = useMutation({
    mutationFn: goOffline,
    onSuccess: () => {
      setIsOnline(false);
      queryClient.removeQueries({ queryKey: ['driver-available-orders'] });
    },
    onError: () => {
      infoAlert('Error', 'No se pudo desactivar el estado.');
    },
  });

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-active-order'] });
      router.replace('/(driver)/active-delivery' as never);
    },
    onError: () => {
      infoAlert('Error', 'No se pudo aceptar el pedido. Intenta de nuevo.');
    },
  });

  // Auto-refresh every 30 seconds when online
  useEffect(() => {
    if (isOnline) {
      autoRefreshRef.current = setInterval(() => {
        refetch();
      }, 30_000);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [isOnline, refetch]);

  const handleToggleOnline = useCallback(
    (value: boolean) => {
      if (value) {
        onlineMutation.mutate();
      } else {
        offlineMutation.mutate();
      }
    },
    [onlineMutation, offlineMutation],
  );

  const handleAccept = useCallback(
    (order: Order) => {
      confirmAlert(
        'Aceptar pedido',
        `¿Confirmas que quieres aceptar el pedido ${order.trackingCode}?`,
        () => acceptMutation.mutate(order.id),
        'Aceptar',
      );
    },
    [acceptMutation],
  );

  const isToggling =
    onlineMutation.isPending || offlineMutation.isPending;

  // ─── Header ───────────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? '#27AE60' : '#9CA3AF' },
            ]}
          />
          <Text style={styles.statusLabel}>
            {isOnline ? 'En línea' : 'Fuera de línea'}
          </Text>
        </View>
        <View style={styles.switchRow}>
          {isToggling && (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 8 }} />
          )}
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={isOnline ? '#27AE60' : '#9CA3AF'}
            disabled={isToggling}
          />
        </View>
      </View>

      {isOnline && (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'list' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? '#FFFFFF' : SECONDARY}
            />
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === 'list' && styles.toggleBtnTextActive,
              ]}
            >
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'map' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map"
              size={16}
              color={viewMode === 'map' ? '#FFFFFF' : SECONDARY}
            />
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === 'map' && styles.toggleBtnTextActive,
              ]}
            >
              Mapa
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ─── Offline empty state ──────────────────────────────────────────────────

  if (!isOnline) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <Ionicons name="power-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Estás fuera de línea</Text>
          <Text style={styles.emptySubtitle}>
            Activa tu estado para ver pedidos disponibles
          </Text>
        </View>
      </View>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingScreen message="Cargando pedidos..." />;
  }

  // ─── Map view ─────────────────────────────────────────────────────────────

  if (viewMode === 'map') {
    const firstOrder = orders[0];
    const initialRegion = firstOrder
      ? {
          latitude: firstOrder.pickupAddress.lat,
          longitude: firstOrder.pickupAddress.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: -34.6037,
          longitude: -58.3816,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };

    return (
      <View style={styles.container}>
        {renderHeader()}
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {orders.map((order) => (
            <React.Fragment key={order.id}>
              <Marker
                coordinate={{
                  latitude: order.pickupAddress.lat,
                  longitude: order.pickupAddress.lng,
                }}
                title={`Origen: ${order.trackingCode}`}
                description={`${order.pickupAddress.street} ${order.pickupAddress.streetNumber}`}
                pinColor="#27AE60"
              />
              <Marker
                coordinate={{
                  latitude: order.deliveryAddress.lat,
                  longitude: order.deliveryAddress.lng,
                }}
                title={`Destino: ${order.trackingCode}`}
                description={`${order.deliveryAddress.street} ${order.deliveryAddress.streetNumber}`}
                pinColor={PRIMARY}
              />
            </React.Fragment>
          ))}
        </MapView>
      </View>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {orders.length > 0 && (
              <Text style={styles.sectionTitle}>
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} disponible
                {orders.length !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.orderWrapper}>
            <OrderCard order={item} />
            <View style={styles.orderInfo}>
              {item.distanceKm !== null && (
                <View style={styles.infoChip}>
                  <Ionicons name="location-outline" size={12} color={SECONDARY} />
                  <Text style={styles.infoChipText}>
                    {item.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              )}
              {item.price !== null && (
                <View style={styles.infoChip}>
                  <Ionicons name="cash-outline" size={12} color="#27AE60" />
                  <Text style={[styles.infoChipText, { color: '#27AE60' }]}>
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                      maximumFractionDigits: 0,
                    }).format(item.price)}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                acceptMutation.isPending && styles.acceptButtonDisabled,
              ]}
              onPress={() => handleAccept(item)}
              disabled={acceptMutation.isPending}
              activeOpacity={0.8}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Aceptar pedido</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin pedidos disponibles</Text>
            <Text style={styles.emptySubtitle}>
              No hay pedidos pendientes en tu zona ahora mismo
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: PRIMARY,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  orderWrapper: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  orderInfo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C3E50',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  map: {
    flex: 1,
  },
});
