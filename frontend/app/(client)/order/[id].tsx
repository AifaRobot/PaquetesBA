import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cancelOrder, getOrder, rateOrder } from '@/src/api/orders';
import { StatusBadge } from '@/src/components/StatusBadge';
import { errorAlert, successAlert } from '@/src/lib/alerts';
import { ShipmentStatus } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: 'Pendiente',
  [ShipmentStatus.CONFIRMED]: 'Confirmado',
  [ShipmentStatus.PICKED_UP]: 'Recogido',
  [ShipmentStatus.IN_TRANSIT]: 'En tránsito',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'En camino',
  [ShipmentStatus.DELIVERED]: 'Entregado',
  [ShipmentStatus.FAILED]: 'Fallido',
  [ShipmentStatus.CANCELLED]: 'Cancelado',
};

const ACTIVE_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.CONFIRMED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number | null) {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function addressLine(addr: { street: string; streetNumber: string; apartment?: string | null; city: string }) {
  return [
    `${addr.street} ${addr.streetNumber}`,
    addr.apartment ? `Apt. ${addr.apartment}` : null,
    addr.city,
  ]
    .filter(Boolean)
    .join(', ');
}

// ─── Rating modal ─────────────────────────────────────────────────────────────

function RatingModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  loading: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ratingStyles.overlay}>
        <View style={ratingStyles.sheet}>
          <Text style={ratingStyles.title}>Calificar entrega</Text>
          <Text style={ratingStyles.subtitle}>¿Cómo fue tu experiencia?</Text>

          <View style={ratingStyles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#F59E0B' : '#DDD'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={ratingStyles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Comentario opcional..."
            placeholderTextColor="#AAA"
            multiline
            numberOfLines={3}
          />

          <View style={ratingStyles.actions}>
            <TouchableOpacity style={ratingStyles.cancelBtn} onPress={onClose}>
              <Text style={ratingStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ratingStyles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={() => onSubmit(rating, comment)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={ratingStyles.submitText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [ratingVisible, setRatingVisible] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      successAlert('Pedido cancelado', 'Tu pedido fue cancelado correctamente.');
    },
    onError: () => errorAlert('Error', 'No se pudo cancelar el pedido.'),
  });

  const rateMutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) =>
      rateOrder(id, { rating, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      setRatingVisible(false);
      successAlert('¡Gracias!', 'Tu calificación fue enviada.');
    },
    onError: () => errorAlert('Error', 'No se pudo enviar la calificación.'),
  });

  function handleCancel() {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que querés cancelar este pedido?')) cancelMutation.mutate();
      return;
    }
    Alert.alert(
      'Cancelar pedido',
      '¿Estás seguro de que querés cancelar este pedido?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }

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
          <Text style={styles.errorText}>No se pudo cargar el pedido</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = ACTIVE_STATUSES.includes(order.status);
  const canCancel = order.status === ShipmentStatus.PENDING;
  const canRate = order.status === ShipmentStatus.DELIVERED && !order.rating;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.trackingCode}>{order.trackingCode}</Text>
          <StatusBadge status={order.status} size="lg" />
          <Text style={styles.createdAt}>Creado el {formatDate(order.createdAt)}</Text>
        </View>

        {/* Live tracking button */}
        {isActive && order.driverId && (
          <TouchableOpacity
            style={styles.liveBtn}
            onPress={() => router.push(`/(client)/track/${order.trackingCode}` as never)}
          >
            <Ionicons name="navigate" size={18} color="#FFF" />
            <Text style={styles.liveBtnText}>Ver rastreo en vivo</Text>
          </TouchableOpacity>
        )}

        {/* Addresses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Direcciones</Text>
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: '#10B981' }]} />
            <View style={styles.addrInfo}>
              <Text style={styles.addrLabel}>ORIGEN</Text>
              <Text style={styles.addrValue}>{addressLine(order.pickupAddress)}</Text>
              {order.pickupAddress.contactName && (
                <Text style={styles.addrContact}>
                  {order.pickupAddress.contactName}
                  {order.pickupAddress.contactPhone ? ` · ${order.pickupAddress.contactPhone}` : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.addrDivider} />
          <View style={styles.addrRow}>
            <View style={[styles.addrDot, { backgroundColor: PRIMARY }]} />
            <View style={styles.addrInfo}>
              <Text style={styles.addrLabel}>DESTINO</Text>
              <Text style={styles.addrValue}>{addressLine(order.deliveryAddress)}</Text>
              {order.deliveryAddress.contactName && (
                <Text style={styles.addrContact}>
                  {order.deliveryAddress.contactName}
                  {order.deliveryAddress.contactPhone ? ` · ${order.deliveryAddress.contactPhone}` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Package */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paquete</Text>
          <Row label="Tamaño" value={order.packageSize} />
          <Row label="Tipo" value={order.packageType} />
          {order.distanceKm !== null && (
            <Row label="Distancia" value={`${order.distanceKm.toFixed(1)} km`} />
          )}
          {order.price !== null && (
            <Row label="Precio estimado" value={formatPrice(order.price)} />
          )}
          {order.estimatedValue !== null && (
            <Row label="Valor declarado" value={formatPrice(order.estimatedValue)} />
          )}
          {order.notes && <Row label="Notas" value={order.notes} />}
        </View>

        {/* Driver */}
        {order.driver && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Repartidor</Text>
            <Row
              label="Nombre"
              value={`${order.driver.firstName} ${order.driver.lastName}`}
            />
            {order.driver.driverProfile && (
              <>
                <Row label="Vehículo" value={order.driver.driverProfile.vehicleType} />
                <Row label="Patente" value={order.driver.driverProfile.licensePlate} />
              </>
            )}
          </View>
        )}

        {/* Payment */}
        {order.payment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pago</Text>
            <Row label="Total" value={formatPrice(order.payment.amount)} />
            <Row
              label="Estado"
              value={
                order.payment.status === 'PAID'
                  ? 'Pagado'
                  : order.payment.status === 'REFUNDED'
                  ? 'Reembolsado'
                  : 'Pendiente'
              }
            />
            {order.payment.method && <Row label="Método" value={order.payment.method} />}
          </View>
        )}

        {/* Rating */}
        {order.rating !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tu calificación</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= (order.rating ?? 0) ? 'star' : 'star-outline'}
                  size={22}
                  color="#F59E0B"
                />
              ))}
            </View>
            {order.ratingComment && (
              <Text style={styles.ratingComment}>{order.ratingComment}</Text>
            )}
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

        {/* Actions */}
        <View style={styles.actions}>
          {canRate && (
            <TouchableOpacity style={styles.rateBtn} onPress={() => setRatingVisible(true)}>
              <Ionicons name="star-outline" size={18} color="#FFF" />
              <Text style={styles.rateBtnText}>Calificar entrega</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancelar pedido</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <RatingModal
        visible={ratingVisible}
        onClose={() => setRatingVisible(false)}
        onSubmit={(rating, comment) => rateMutation.mutate({ rating, comment })}
        loading={rateMutation.isPending}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 15, color: '#EF4444' },
  scroll: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trackingCode: { fontSize: 18, fontWeight: '800', color: SECONDARY, letterSpacing: 1 },
  createdAt: { fontSize: 12, color: '#AAA' },
  liveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  liveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: SECONDARY, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrRow: { flexDirection: 'row', gap: 12 },
  addrDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  addrInfo: { flex: 1 },
  addrLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 2 },
  addrValue: { fontSize: 14, color: SECONDARY, fontWeight: '500' },
  addrContact: { fontSize: 12, color: '#888', marginTop: 2 },
  addrDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12, marginLeft: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 14, color: '#888' },
  rowValue: { fontSize: 14, fontWeight: '600', color: SECONDARY, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  starsRow: { flexDirection: 'row', gap: 4 },
  ratingComment: { fontSize: 13, color: '#666', marginTop: 8, fontStyle: 'italic' },
  historyItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  historyDotCol: { alignItems: 'center', width: 16 },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#DDD', marginTop: 3 },
  historyDotActive: { backgroundColor: PRIMARY },
  historyLine: { flex: 1, width: 2, backgroundColor: '#EEE', marginTop: 4, minHeight: 20 },
  historyContent: { flex: 1, paddingBottom: 16 },
  historyStatus: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  historyDate: { fontSize: 12, color: '#AAA', marginTop: 2 },
  historyNotes: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
  actions: { gap: 10, marginTop: 4 },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
  },
  rateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});

const ratingStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: { fontSize: 20, fontWeight: '800', color: SECONDARY, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: SECONDARY,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#666' },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
