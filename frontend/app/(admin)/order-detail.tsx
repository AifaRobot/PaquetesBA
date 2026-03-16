import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAvailableDrivers, type DriverProfileWithUser } from '@/src/api/drivers';
import { assignDriver, cancelOrder, getOrder, updateOrderStatus } from '@/src/api/orders';
import { StatusBadge } from '@/src/components/StatusBadge';
import { confirmAlert, errorAlert, successAlert } from '@/src/lib/alerts';
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

const NEXT_STATUSES: Partial<Record<ShipmentStatus, { label: string; value: ShipmentStatus; color: string }[]>> = {
  [ShipmentStatus.CONFIRMED]: [
    { label: 'Marcar recogido', value: ShipmentStatus.PICKED_UP, color: '#8B5CF6' },
  ],
  [ShipmentStatus.PICKED_UP]: [
    { label: 'En tránsito', value: ShipmentStatus.IN_TRANSIT, color: '#D97706' },
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    { label: 'En reparto', value: ShipmentStatus.OUT_FOR_DELIVERY, color: PRIMARY },
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    { label: 'Marcar entregado', value: ShipmentStatus.DELIVERED, color: '#10B981' },
    { label: 'Marcar fallido', value: ShipmentStatus.FAILED, color: '#EF4444' },
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPrice(value: number | null) {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });

  const { data: availableDrivers = [] } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: () => getAvailableDrivers(order?.zoneId ?? undefined),
    enabled: assignModalVisible,
  });

  const assignMutation = useMutation({
    mutationFn: (driverId: string) => assignDriver(id, { driverId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setAssignModalVisible(false);
      successAlert('Repartidor asignado', 'El repartidor fue asignado correctamente.');
    },
    onError: () => errorAlert('Error', 'No se pudo asignar el repartidor.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: ShipmentStatus; notes?: string }) =>
      updateOrderStatus(id, { status: status as any, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => errorAlert('Error', 'No se pudo actualizar el estado.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      successAlert('Cancelado', 'El pedido fue cancelado.', () => router.back());
    },
    onError: () => errorAlert('Error', 'No se pudo cancelar.'),
  });

  function handleStatusUpdate(status: ShipmentStatus, label: string) {
    confirmAlert('Cambiar estado', `¿Confirmar: "${label}"?`, () => statusMutation.mutate({ status }));
  }

  function handleCancel() {
    confirmAlert('Cancelar pedido', '¿Estás seguro?', () => cancelMutation.mutate(), 'Sí, cancelar');
  }

  if (isLoading) return <SafeAreaView style={styles.safe} edges={['bottom']}><ActivityIndicator style={styles.loader} color={PRIMARY} /></SafeAreaView>;
  if (isError || !order) return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.center}><Text style={styles.errorText}>No se pudo cargar el pedido</Text></View>
    </SafeAreaView>
  );

  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
  const canAssign = !order.driverId && [ShipmentStatus.PENDING, ShipmentStatus.CONFIRMED].includes(order.status);
  const canCancel = [ShipmentStatus.PENDING, ShipmentStatus.CONFIRMED].includes(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.trackingCode}>{order.trackingCode}</Text>
          <StatusBadge status={order.status} size="lg" />
          <Text style={styles.createdAt}>{formatDate(order.createdAt)}</Text>
        </View>

        {/* Client */}
        {order.client && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cliente</Text>
            <Row label="Nombre" value={`${order.client.firstName} ${order.client.lastName}`} />
            <Row label="Email" value={order.client.email} />
            <Row label="Teléfono" value={order.client.phone} />
          </View>
        )}

        {/* Driver */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Repartidor</Text>
            {canAssign && (
              <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignModalVisible(true)}>
                <Ionicons name="person-add-outline" size={15} color={PRIMARY} />
                <Text style={styles.assignBtnText}>Asignar</Text>
              </TouchableOpacity>
            )}
          </View>
          {order.driver ? (
            <>
              <Row label="Nombre" value={`${order.driver.firstName} ${order.driver.lastName}`} />
              {order.driver.driverProfile && (
                <>
                  <Row label="Vehículo" value={order.driver.driverProfile.vehicleType} />
                  <Row label="Patente" value={order.driver.driverProfile.licensePlate} />
                </>
              )}
            </>
          ) : (
            <Text style={styles.noDriver}>Sin repartidor asignado</Text>
          )}
        </View>

        {/* Addresses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Direcciones</Text>
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: '#10B981' }]} />
            <View style={styles.addrInfo}>
              <Text style={styles.addrLabel}>ORIGEN</Text>
              <Text style={styles.addrValue}>{order.pickupAddress.street} {order.pickupAddress.streetNumber}, {order.pickupAddress.city}</Text>
            </View>
          </View>
          <View style={styles.addrDivider} />
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: PRIMARY }]} />
            <View style={styles.addrInfo}>
              <Text style={styles.addrLabel}>DESTINO</Text>
              <Text style={styles.addrValue}>{order.deliveryAddress.street} {order.deliveryAddress.streetNumber}, {order.deliveryAddress.city}</Text>
            </View>
          </View>
        </View>

        {/* Package */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paquete</Text>
          <Row label="Tamaño" value={order.packageSize} />
          <Row label="Tipo" value={order.packageType} />
          {order.distanceKm !== null && <Row label="Distancia" value={`${order.distanceKm.toFixed(1)} km`} />}
          {order.price !== null && <Row label="Precio" value={formatPrice(order.price)} />}
          {order.notes && <Row label="Notas" value={order.notes} />}
        </View>

        {/* Payment */}
        {order.payment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pago</Text>
            <Row label="Monto" value={formatPrice(order.payment.amount)} />
            <Row label="Estado" value={order.payment.status === 'PAID' ? 'Pagado' : order.payment.status === 'REFUNDED' ? 'Reembolsado' : 'Pendiente'} />
          </View>
        )}

        {/* Status history */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historial de estado</Text>
            {order.statusHistory.map((entry, idx) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyDotCol}>
                  <View style={[styles.historyDot, idx === 0 && styles.historyDotActive]} />
                  {idx < order.statusHistory!.length - 1 && <View style={styles.historyLine} />}
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyStatus}>{STATUS_LABELS[entry.status] ?? entry.status}</Text>
                  <Text style={styles.historyDate}>{formatDate(entry.changedAt)}</Text>
                  {entry.notes && <Text style={styles.historyNotes}>{entry.notes}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Status actions */}
        {nextStatuses.length > 0 && (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Cambiar estado</Text>
            {nextStatuses.map((action) => (
              <TouchableOpacity
                key={action.value}
                style={[styles.actionBtn, { backgroundColor: action.color }]}
                onPress={() => handleStatusUpdate(action.value, action.label)}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>{action.label}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? <ActivityIndicator color="#EF4444" size="small" /> : <Text style={styles.cancelBtnText}>Cancelar pedido</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Assign driver modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar repartidor</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={SECONDARY} />
              </TouchableOpacity>
            </View>
            {availableDrivers.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.noDriver}>No hay repartidores disponibles</Text>
              </View>
            ) : (
              <FlatList
                data={availableDrivers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }: { item: DriverProfileWithUser }) => (
                  <TouchableOpacity
                    style={styles.driverRow}
                    onPress={() => assignMutation.mutate(item.userId)}
                    disabled={assignMutation.isPending}
                  >
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverAvatarText}>{item.user.firstName[0]}</Text>
                    </View>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{item.user.firstName} {item.user.lastName}</Text>
                      <Text style={styles.driverVehicle}>{item.vehicleType} · {item.licensePlate}</Text>
                    </View>
                    <View style={styles.onlineDot} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#EF4444' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  headerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  trackingCode: { fontSize: 18, fontWeight: '800', color: SECONDARY, letterSpacing: 1 },
  createdAt: { fontSize: 12, color: '#AAA' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assignBtnText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  noDriver: { fontSize: 14, color: '#AAA', fontStyle: 'italic' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 14, color: '#888' },
  rowValue: { fontSize: 14, fontWeight: '600', color: SECONDARY, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  addrRow: { flexDirection: 'row', gap: 12 },
  addrDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3, flexShrink: 0 },
  addrInfo: { flex: 1 },
  addrLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 2 },
  addrValue: { fontSize: 14, color: SECONDARY },
  addrDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10, marginLeft: 24 },
  historyItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  historyDotCol: { alignItems: 'center', width: 16 },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#DDD', marginTop: 3 },
  historyDotActive: { backgroundColor: PRIMARY },
  historyLine: { flex: 1, width: 2, backgroundColor: '#EEE', marginTop: 4, minHeight: 20 },
  historyContent: { flex: 1, paddingBottom: 16 },
  historyStatus: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  historyDate: { fontSize: 12, color: '#AAA', marginTop: 2 },
  historyNotes: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
  actionsSection: { gap: 10 },
  actionsTitle: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF' },
  cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: SECONDARY },
  driverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  driverAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: SECONDARY },
  driverVehicle: { fontSize: 12, color: '#888', marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', flexShrink: 0 },
});
