import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

import { getOrders, updateOrderStatus } from '@/src/api/orders';
import { updateLocation } from '@/src/api/drivers';
import { confirmAlert, infoAlert } from '@/src/lib/alerts';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { StatusBadge } from '@/src/components/StatusBadge';
import { socketService } from '@/src/services/socket.service';
import { useAuthStore } from '@/src/store/auth.store';
import { ShipmentStatus, type Order } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

interface StatusAction {
  label: string;
  nextStatus: ShipmentStatus;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

const STATUS_ACTIONS: Partial<Record<ShipmentStatus, StatusAction>> = {
  [ShipmentStatus.CONFIRMED]: {
    label: 'Llegué al origen',
    nextStatus: ShipmentStatus.PICKED_UP,
    icon: 'location',
    color: '#7C3AED',
  },
  [ShipmentStatus.PICKED_UP]: {
    label: 'En tránsito',
    nextStatus: ShipmentStatus.IN_TRANSIT,
    icon: 'car',
    color: '#D97706',
  },
  [ShipmentStatus.IN_TRANSIT]: {
    label: 'Saliendo a entregar',
    nextStatus: ShipmentStatus.OUT_FOR_DELIVERY,
    icon: 'navigate',
    color: PRIMARY,
  },
};

function formatAddress(addr: Order['pickupAddress']): string {
  return `${addr.street} ${addr.streetNumber}${addr.apartment ? `, Apt ${addr.apartment}` : ''}, ${addr.city}`;
}

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
  } | null>(null);
  const [problemModalVisible, setProblemModalVisible] = useState(false);
  const [failNotes, setFailNotes] = useState('');

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationPatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch active order (CONFIRMED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-active-order'],
    queryFn: async () => {
      // Try each active status to find the current active order
      const statuses = [
        ShipmentStatus.CONFIRMED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
      ];

      for (const status of statuses) {
        const result = await getOrders({ status, limit: 1, page: 1 });
        if (result.items.length > 0) {
          return result.items[0];
        }
      }
      return null;
    },
    staleTime: 0,
    refetchInterval: 15_000,
  });

  const activeOrder: Order | null = data ?? null;

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      notes,
    }: {
      orderId: string;
      status: ShipmentStatus;
      notes?: string;
    }) =>
      updateOrderStatus(orderId, {
        status: status as
          | 'PICKED_UP'
          | 'IN_TRANSIT'
          | 'OUT_FOR_DELIVERY'
          | 'DELIVERED'
          | 'FAILED',
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-active-order'] });
    },
    onError: () => {
      infoAlert('Error', 'No se pudo actualizar el estado.');
    },
  });

  // ─── GPS tracking ─────────────────────────────────────────────────────────

  const startLocationTracking = useCallback(async (orderId: string) => {
    // expo-location watchPositionAsync is not supported on web
    if (Platform.OS === 'web') return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      infoAlert('Permisos requeridos', 'Se necesita acceso a la ubicación para rastrear la entrega.');
      return;
    }

    // Connect socket if needed
    if (session?.access_token && !socketService.isConnected()) {
      socketService.connect(session.access_token);
    }

    // Watch position
    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5_000,
        distanceInterval: 10,
      },
      (location) => {
        const { latitude, longitude, heading } = location.coords;
        const lat = latitude;
        const lng = longitude;
        setDriverLocation({ lat, lng, heading: heading ?? undefined });
        latestLocationRef.current = { lat, lng };

        // Emit via WebSocket
        socketService.emitDriverLocation(
          lat,
          lng,
          heading ?? undefined,
          orderId,
        );
      },
    );

    // PATCH location every 10 seconds
    locationPatchIntervalRef.current = setInterval(() => {
      const loc = latestLocationRef.current;
      if (loc) {
        updateLocation({ lat: loc.lat, lng: loc.lng }).catch(() => {
          // Silent — best effort
        });
      }
    }, 10_000);
  }, [session]);

  const stopLocationTracking = useCallback(() => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    if (locationPatchIntervalRef.current) {
      clearInterval(locationPatchIntervalRef.current);
      locationPatchIntervalRef.current = null;
    }
    latestLocationRef.current = null;
  }, []);

  useEffect(() => {
    if (
      activeOrder &&
      [
        ShipmentStatus.CONFIRMED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
      ].includes(activeOrder.status)
    ) {
      startLocationTracking(activeOrder.id);
    } else {
      stopLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [activeOrder?.id, activeOrder?.status, startLocationTracking, stopLocationTracking]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusUpdate = useCallback(
    (nextStatus: ShipmentStatus) => {
      if (!activeOrder) return;
      statusMutation.mutate({
        orderId: activeOrder.id,
        status: nextStatus,
      });
    },
    [activeOrder, statusMutation],
  );

  const handleConfirmDelivery = useCallback(() => {
    if (!activeOrder) return;
    router.push({
      pathname: '/(driver)/delivery-confirm',
      params: { orderId: activeOrder.id },
    } as never);
  }, [activeOrder, router]);

  const handleReportProblem = useCallback(() => {
    setProblemModalVisible(true);
  }, []);

  const handleFailDelivery = useCallback(() => {
    if (!activeOrder) return;
    confirmAlert(
      'Reportar problema',
      '¿Confirmas que no pudiste completar esta entrega?',
      () => {
        setProblemModalVisible(false);
        statusMutation.mutate({
          orderId: activeOrder.id,
          status: ShipmentStatus.FAILED,
          notes: failNotes || 'Problema reportado por el conductor',
        });
      },
      'Confirmar',
    );
  }, [activeOrder, failNotes, statusMutation]);

  // ─── Loading / Empty states ───────────────────────────────────────────────

  if (isLoading) {
    return <LoadingScreen message="Cargando entrega activa..." />;
  }

  if (!activeOrder) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No tienes entregas activas</Text>
        <Text style={styles.emptySubtitle}>
          Acepta un pedido desde la pestaña Disponibles para empezar
        </Text>
        <TouchableOpacity
          style={styles.goToAvailableBtn}
          onPress={() => router.replace('/(driver)' as never)}
        >
          <Text style={styles.goToAvailableBtnText}>Ver pedidos disponibles</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Completion state ─────────────────────────────────────────────────────

  const isCompleted =
    activeOrder.status === ShipmentStatus.DELIVERED ||
    activeOrder.status === ShipmentStatus.FAILED ||
    activeOrder.status === ShipmentStatus.CANCELLED;

  if (isCompleted) {
    const isDelivered = activeOrder.status === ShipmentStatus.DELIVERED;
    return (
      <View style={styles.completionContainer}>
        <Ionicons
          name={isDelivered ? 'checkmark-circle' : 'close-circle'}
          size={96}
          color={isDelivered ? '#27AE60' : '#E74C3C'}
        />
        <Text style={styles.completionTitle}>
          {isDelivered ? '¡Entrega completada!' : 'Entrega fallida'}
        </Text>
        <Text style={styles.completionSubtitle}>
          {activeOrder.trackingCode}
        </Text>
        <StatusBadge status={activeOrder.status} size="lg" />
        <TouchableOpacity
          style={styles.goToAvailableBtn}
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ['driver-active-order'] });
            router.replace('/(driver)' as never);
          }}
        >
          <Text style={styles.goToAvailableBtnText}>Ver pedidos disponibles</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Map region ───────────────────────────────────────────────────────────

  const mapRegion = driverLocation
    ? {
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude:
          (activeOrder.pickupAddress.lat + activeOrder.deliveryAddress.lat) / 2,
        longitude:
          (activeOrder.pickupAddress.lng + activeOrder.deliveryAddress.lng) / 2,
        latitudeDelta:
          Math.abs(
            activeOrder.pickupAddress.lat - activeOrder.deliveryAddress.lat,
          ) + 0.02,
        longitudeDelta:
          Math.abs(
            activeOrder.pickupAddress.lng - activeOrder.deliveryAddress.lng,
          ) + 0.02,
      };

  const action = STATUS_ACTIONS[activeOrder.status];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Map — hidden on web (react-native-maps doesn't support web) */}
      {Platform.OS !== 'web' ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {driverLocation && (
            <Marker
              coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              title="Tu ubicación"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={18} color="#FFFFFF" />
              </View>
            </Marker>
          )}
          <Marker
            coordinate={{ latitude: activeOrder.pickupAddress.lat, longitude: activeOrder.pickupAddress.lng }}
            title="Punto de recogida"
            description={formatAddress(activeOrder.pickupAddress)}
            pinColor="#27AE60"
          />
          <Marker
            coordinate={{ latitude: activeOrder.deliveryAddress.lat, longitude: activeOrder.deliveryAddress.lng }}
            title="Punto de entrega"
            description={formatAddress(activeOrder.deliveryAddress)}
            pinColor={PRIMARY}
          />
          <Polyline
            coordinates={[
              { latitude: activeOrder.pickupAddress.lat, longitude: activeOrder.pickupAddress.lng },
              ...(driverLocation ? [{ latitude: driverLocation.lat, longitude: driverLocation.lng }] : []),
              { latitude: activeOrder.deliveryAddress.lat, longitude: activeOrder.deliveryAddress.lng },
            ]}
            strokeColor={PRIMARY}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        </MapView>
      ) : (
        <View style={styles.mapWebFallback}>
          <Ionicons name="navigate-circle-outline" size={28} color={PRIMARY} />
          <Text style={styles.mapWebText}>
            {formatAddress(activeOrder.pickupAddress)} → {formatAddress(activeOrder.deliveryAddress)}
          </Text>
        </View>
      )}

      {/* Order info card */}
      <ScrollView
        style={styles.infoPanel}
        contentContainerStyle={styles.infoPanelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.trackingCode}>{activeOrder.trackingCode}</Text>
            <Text style={styles.clientName}>
              {activeOrder.client
                ? `${activeOrder.client.firstName} ${activeOrder.client.lastName}`
                : 'Cliente'}
            </Text>
          </View>
          <StatusBadge status={activeOrder.status} size="md" />
        </View>

        {/* Package info */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Ionicons name="cube-outline" size={14} color={SECONDARY} />
            <Text style={styles.detailChipText}>{activeOrder.packageSize}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="pricetag-outline" size={14} color={SECONDARY} />
            <Text style={styles.detailChipText}>{activeOrder.packageType}</Text>
          </View>
          {activeOrder.distanceKm !== null && (
            <View style={styles.detailChip}>
              <Ionicons name="location-outline" size={14} color={SECONDARY} />
              <Text style={styles.detailChipText}>
                {activeOrder.distanceKm.toFixed(1)} km
              </Text>
            </View>
          )}
        </View>

        {/* Addresses */}
        <View style={styles.addressCard}>
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: '#27AE60' }]} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>RECOGIDA</Text>
              <Text style={styles.addressValue}>
                {formatAddress(activeOrder.pickupAddress)}
              </Text>
              {activeOrder.pickupAddress.contactName && (
                <Text style={styles.contactInfo}>
                  {activeOrder.pickupAddress.contactName}
                  {activeOrder.pickupAddress.contactPhone
                    ? ` · ${activeOrder.pickupAddress.contactPhone}`
                    : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.addressDivider} />
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: PRIMARY }]} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>ENTREGA</Text>
              <Text style={styles.addressValue}>
                {formatAddress(activeOrder.deliveryAddress)}
              </Text>
              {activeOrder.deliveryAddress.contactName && (
                <Text style={styles.contactInfo}>
                  {activeOrder.deliveryAddress.contactName}
                  {activeOrder.deliveryAddress.contactPhone
                    ? ` · ${activeOrder.deliveryAddress.contactPhone}`
                    : ''}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Notes */}
        {activeOrder.notes && (
          <View style={styles.notesCard}>
            <Ionicons name="information-circle-outline" size={16} color={PRIMARY} />
            <Text style={styles.notesText}>{activeOrder.notes}</Text>
          </View>
        )}

        {/* Status action button */}
        {action && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: action.color }]}
            onPress={() => handleStatusUpdate(action.nextStatus)}
            disabled={statusMutation.isPending}
            activeOpacity={0.8}
          >
            <Ionicons name={action.icon} size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        )}

        {/* Confirm delivery button (OUT_FOR_DELIVERY) */}
        {activeOrder.status === ShipmentStatus.OUT_FOR_DELIVERY && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#27AE60' }]}
            onPress={handleConfirmDelivery}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Confirmar entrega</Text>
          </TouchableOpacity>
        )}

        {/* Report problem button */}
        {!isCompleted && (
          <TouchableOpacity
            style={styles.problemButton}
            onPress={handleReportProblem}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={16} color="#E74C3C" />
            <Text style={styles.problemButtonText}>Reportar problema</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Problem modal */}
      <Modal
        visible={problemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProblemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar problema</Text>
              <TouchableOpacity onPress={() => setProblemModalVisible(false)}>
                <Ionicons name="close" size={24} color={SECONDARY} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              ¿Qué problema ocurrió con esta entrega?
            </Text>
            <TouchableOpacity
              style={styles.problemOption}
              onPress={() => {
                setFailNotes('No se encontró al destinatario');
                handleFailDelivery();
              }}
            >
              <Ionicons name="person-remove-outline" size={20} color="#E74C3C" />
              <Text style={styles.problemOptionText}>
                No se encontró al destinatario
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.problemOption}
              onPress={() => {
                setFailNotes('Dirección incorrecta o inaccesible');
                handleFailDelivery();
              }}
            >
              <Ionicons name="location-outline" size={20} color="#E74C3C" />
              <Text style={styles.problemOptionText}>
                Dirección incorrecta o inaccesible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.problemOption}
              onPress={() => {
                setFailNotes('Paquete dañado durante el transporte');
                handleFailDelivery();
              }}
            >
              <Ionicons name="cube-outline" size={20} color="#E74C3C" />
              <Text style={styles.problemOptionText}>Paquete dañado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.problemOption}
              onPress={() => {
                setFailNotes('Otro problema');
                handleFailDelivery();
              }}
            >
              <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color="#E74C3C" />
              <Text style={styles.problemOptionText}>Otro problema</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelProblemBtn}
              onPress={() => setProblemModalVisible(false)}
            >
              <Text style={styles.cancelProblemBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
    minHeight: 280,
    maxHeight: 320,
  },
  driverMarker: {
    backgroundColor: '#2980B9',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  infoPanel: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  infoPanelContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  trackingCode: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    color: SECONDARY,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    gap: 0,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 13,
    color: SECONDARY,
    fontWeight: '500',
  },
  contactInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addressDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 20,
    marginVertical: 10,
  },
  notesCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FED7AA',
    alignItems: 'flex-start',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  problemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    gap: 6,
    backgroundColor: '#FEF2F2',
  },
  problemButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F5F5F5',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SECONDARY,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F5F5F5',
    gap: 12,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: SECONDARY,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '600',
  },
  goToAvailableBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goToAvailableBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SECONDARY,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  problemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
  },
  problemOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
  },
  cancelProblemBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelProblemBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  mapWebFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FED7AA',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mapWebText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
});
