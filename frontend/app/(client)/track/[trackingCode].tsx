import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { trackOrder } from '@/src/api/orders';
import { StatusBadge } from '@/src/components/StatusBadge';
import { socketService } from '@/src/services/socket.service';
import { useAuthStore } from '@/src/store/auth.store';
import { useTrackingStore } from '@/src/store/tracking.store';
import { ShipmentStatus } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const ACTIVE_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.CONFIRMED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: 'Esperando confirmación',
  [ShipmentStatus.CONFIRMED]: 'Confirmado — el repartidor se dirige a buscar el paquete',
  [ShipmentStatus.PICKED_UP]: 'Paquete recogido',
  [ShipmentStatus.IN_TRANSIT]: 'En tránsito',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'El repartidor está cerca',
  [ShipmentStatus.DELIVERED]: '¡Entregado exitosamente!',
  [ShipmentStatus.FAILED]: 'Entrega fallida',
  [ShipmentStatus.CANCELLED]: 'Pedido cancelado',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveTrackingScreen() {
  const { trackingCode } = useLocalSearchParams<{ trackingCode: string }>();
  const { session } = useAuthStore();
  const { driverLocation, setDriverLocation, clearTracking } = useTrackingStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['track', trackingCode],
    queryFn: () => trackOrder(trackingCode),
    refetchInterval: 15_000,
    enabled: !!trackingCode,
  });

  const isActive = order ? ACTIVE_STATUSES.includes(order.status) : false;

  // Pulse animation for driver marker
  useEffect(() => {
    if (!isActive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isActive, pulseAnim]);

  // WebSocket — connect and join order room when order is active
  useEffect(() => {
    if (!order || !isActive || !session?.access_token) return;

    socketService.connect(session.access_token);
    socketService.joinOrderRoom(order.id);
    socketService.onDriverLocation(setDriverLocation);

    return () => {
      socketService.offDriverLocation();
    };
  }, [order?.id, isActive, session?.access_token]);

  // Clear tracking state on unmount
  useEffect(() => {
    return () => clearTracking();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Código de rastreo inválido</Text>
          <Text style={styles.errorSub}>{trackingCode}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pickup = order.pickupAddress;
  const delivery = order.deliveryAddress;

  // Map region — center between pickup and delivery
  const midLat = (pickup.lat + delivery.lat) / 2;
  const midLng = (pickup.lng + delivery.lng) / 2;
  const latDelta = Math.abs(pickup.lat - delivery.lat) * 1.8 + 0.01;
  const lngDelta = Math.abs(pickup.lng - delivery.lng) * 1.8 + 0.01;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: driverLocation?.lat ?? midLat,
          longitude: driverLocation?.lng ?? midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
      >
        {/* Pickup marker */}
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          title="Origen"
          description={`${pickup.street} ${pickup.streetNumber}`}
          pinColor="#10B981"
        />

        {/* Delivery marker */}
        <Marker
          coordinate={{ latitude: delivery.lat, longitude: delivery.lng }}
          title="Destino"
          description={`${delivery.street} ${delivery.streetNumber}`}
          pinColor={PRIMARY}
        />

        {/* Driver marker */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Repartidor"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View
              style={[styles.driverMarker, { transform: [{ scale: pulseAnim }] }]}
            >
              <Ionicons name="car" size={18} color="#FFF" />
            </Animated.View>
          </Marker>
        )}

        {/* Route line */}
        <Polyline
          coordinates={[
            { latitude: pickup.lat, longitude: pickup.lng },
            { latitude: delivery.lat, longitude: delivery.lng },
          ]}
          strokeColor={PRIMARY}
          strokeWidth={2}
          lineDashPattern={[6, 4]}
        />
      </MapView>

      {/* Bottom info panel */}
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        {/* Tracking code + status */}
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <Text style={styles.trackingCode}>{order.trackingCode}</Text>
            <Text style={styles.statusLabel}>{STATUS_LABELS[order.status]}</Text>
          </View>
          <StatusBadge status={order.status} size="sm" />
        </View>

        {/* Driver info */}
        {order.driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={20} color={PRIMARY} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {order.driver.firstName} {order.driver.lastName}
              </Text>
              {order.driver.driverProfile && (
                <Text style={styles.driverVehicle}>
                  {order.driver.driverProfile.vehicleType} · {order.driver.driverProfile.licensePlate}
                </Text>
              )}
            </View>
            {driverLocation && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>En vivo</Text>
              </View>
            )}
          </View>
        )}

        {/* Addresses */}
        <View style={styles.addrCard}>
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: '#10B981' }]} />
            <View>
              <Text style={styles.addrLabel}>ORIGEN</Text>
              <Text style={styles.addrValue}>
                {pickup.street} {pickup.streetNumber}, {pickup.city}
              </Text>
            </View>
          </View>
          <View style={styles.addrDivider} />
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: PRIMARY }]} />
            <View>
              <Text style={styles.addrLabel}>DESTINO</Text>
              <Text style={styles.addrValue}>
                {delivery.street} {delivery.streetNumber}, {delivery.city}
              </Text>
            </View>
          </View>
        </View>

        {/* Status history (last 3 entries) */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Últimas actualizaciones</Text>
            {order.statusHistory.slice(0, 3).map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyDot} />
                <Text style={styles.historyStatus}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </Text>
                <Text style={styles.historyTime}>{formatTime(entry.changedAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  errorSub: { fontSize: 13, color: '#AAA' },
  map: { flex: 1, minHeight: 260 },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  panel: { maxHeight: '50%', backgroundColor: '#FFF' },
  panelContent: { padding: 16, paddingBottom: 32, gap: 12 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: { flex: 1, marginRight: 12 },
  trackingCode: { fontSize: 15, fontWeight: '800', color: SECONDARY, letterSpacing: 0.8 },
  statusLabel: { fontSize: 13, color: '#666', marginTop: 3 },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  driverVehicle: { fontSize: 12, color: '#888', marginTop: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  addrCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
  },
  addrRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  addrDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  addrLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.6 },
  addrValue: { fontSize: 13, color: SECONDARY, fontWeight: '500', marginTop: 1 },
  addrDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 10, marginLeft: 20 },
  historyCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  historyTitle: { fontSize: 12, fontWeight: '800', color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY, flexShrink: 0 },
  historyStatus: { flex: 1, fontSize: 13, color: SECONDARY },
  historyTime: { fontSize: 12, color: '#AAA' },
});
