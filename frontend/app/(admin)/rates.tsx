import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRate, deleteRate, getRates, updateRate } from '@/src/api/rates';
import { getZones } from '@/src/api/zones';
import { confirmAlert, errorAlert } from '@/src/lib/alerts';
import { PackageSize, PackageType, type Rate, type Zone } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const PACKAGE_SIZES = Object.values(PackageSize);
const PACKAGE_TYPES = Object.values(PackageType);

type FormState = {
  zoneId: string;
  packageSize: PackageSize;
  packageType: PackageType;
  basePrice: string;
  pricePerKm: string;
  isActive: boolean;
};

function emptyForm(zoneId = ''): FormState {
  return { zoneId, packageSize: PackageSize.SMALL, packageType: PackageType.STANDARD, basePrice: '', pricePerKm: '', isActive: true };
}

function formatPrice(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
}

function ChipSelector<T extends string>({ options, selected, onSelect }: { options: T[]; selected: T; onSelect: (v: T) => void }) {
  return (
    <View style={styles.chipsRow}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} style={[styles.optChip, selected === opt && styles.optChipActive]} onPress={() => onSelect(opt)}>
          <Text style={[styles.optChipText, selected === opt && styles.optChipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AdminRatesScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: rates = [], isLoading, isRefetching, refetch, isError } = useQuery({ queryKey: ['rates'], queryFn: getRates });
  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: getZones });

  const createMutation = useMutation({
    mutationFn: () => createRate({ zoneId: form.zoneId, packageSize: form.packageSize, packageType: form.packageType, basePrice: parseFloat(form.basePrice), pricePerKm: parseFloat(form.pricePerKm), isActive: form.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); closeModal(); },
    onError: () => errorAlert('Error', 'No se pudo crear la tarifa.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateRate(editing!.id, { basePrice: parseFloat(form.basePrice), pricePerKm: parseFloat(form.pricePerKm), isActive: form.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rates'] }); closeModal(); },
    onError: () => errorAlert('Error', 'No se pudo actualizar la tarifa.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rates'] }),
    onError: () => errorAlert('Error', 'No se pudo eliminar la tarifa.'),
  });

  function openCreate() {
    if (zones.length === 0) {
      errorAlert('Sin zonas', 'Primero creá al menos una zona antes de agregar tarifas.');
      return;
    }
    setEditing(null);
    setForm(emptyForm(zones[0]?.id ?? ''));
    setModalVisible(true);
  }

  function openEdit(rate: Rate) {
    setEditing(rate);
    setForm({ zoneId: rate.zoneId, packageSize: rate.packageSize, packageType: rate.packageType, basePrice: String(rate.basePrice), pricePerKm: String(rate.pricePerKm), isActive: rate.isActive });
    setModalVisible(true);
  }

  function closeModal() { setModalVisible(false); setEditing(null); }

  function handleSave() {
    if (!form.zoneId) { errorAlert('Zona requerida', 'Seleccioná una zona.'); return; }
    if (!form.basePrice || isNaN(parseFloat(form.basePrice))) { errorAlert('Precio base inválido'); return; }
    if (!form.pricePerKm || isNaN(parseFloat(form.pricePerKm))) { errorAlert('Precio por km inválido'); return; }
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }

  function handleDelete(rate: Rate) {
    confirmAlert(
      'Eliminar tarifa',
      `¿Eliminar esta tarifa (${rate.packageSize} · ${rate.packageType})?`,
      () => deleteMutation.mutate(rate.id),
      'Eliminar',
    );
  }

  // Group rates by zone
  const byZone = zones.map((zone) => ({
    zone,
    rates: rates.filter((r) => r.zoneId === zone.id),
  })).filter((g) => g.rates.length > 0);
  const ungrouped = rates.filter((r) => !zones.find((z) => z.id === r.zoneId));

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.countText}>{rates.length} tarifa{rates.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Nueva tarifa</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar tarifas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : rates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pricetag-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No hay tarifas configuradas</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}><Text style={styles.addBtnText}>Crear primera tarifa</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[...byZone, ...(ungrouped.length > 0 ? [{ zone: null, rates: ungrouped }] : [])]}
          keyExtractor={(item, idx) => item.zone?.id ?? `ungrouped-${idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} colors={[PRIMARY]} />}
          renderItem={({ item }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Ionicons name="location" size={16} color={PRIMARY} />
                <Text style={styles.groupTitle}>{item.zone?.name ?? 'Sin zona'}</Text>
                <Text style={styles.groupCount}>{item.rates.length} tarifa{item.rates.length !== 1 ? 's' : ''}</Text>
              </View>
              {item.rates.map((rate) => (
                <View key={rate.id} style={styles.rateRow}>
                  <View style={styles.rateInfo}>
                    <View style={styles.rateChips}>
                      <View style={styles.rateChip}><Text style={styles.rateChipText}>{rate.packageSize}</Text></View>
                      <View style={[styles.rateChip, styles.rateChipType]}><Text style={styles.rateChipText}>{rate.packageType}</Text></View>
                      {!rate.isActive && <View style={[styles.rateChip, styles.rateChipInactive]}><Text style={[styles.rateChipText, { color: '#9CA3AF' }]}>Inactiva</Text></View>}
                    </View>
                    <View style={styles.ratePrices}>
                      <Text style={styles.ratePrice}>Base: {formatPrice(rate.basePrice)}</Text>
                      <Text style={styles.ratePrice}>Por km: {formatPrice(rate.pricePerKm)}</Text>
                    </View>
                  </View>
                  <View style={styles.rateActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(rate)}><Ionicons name="pencil-outline" size={18} color={SECONDARY} /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(rate)} disabled={deleteMutation.isPending}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar tarifa' : 'Nueva tarifa'}</Text>
              <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color={SECONDARY} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {!editing && (
                <>
                  <Text style={styles.inputLabel}>Zona *</Text>
                  <View style={styles.chipsRow}>
                    {zones.map((z) => (
                      <TouchableOpacity key={z.id} style={[styles.optChip, form.zoneId === z.id && styles.optChipActive]} onPress={() => setForm((f) => ({ ...f, zoneId: z.id }))}>
                        <Text style={[styles.optChipText, form.zoneId === z.id && styles.optChipTextActive]}>{z.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Tamaño *</Text>
                  <ChipSelector options={PACKAGE_SIZES} selected={form.packageSize} onSelect={(v) => setForm((f) => ({ ...f, packageSize: v }))} />
                  <Text style={styles.inputLabel}>Tipo *</Text>
                  <ChipSelector options={PACKAGE_TYPES} selected={form.packageType} onSelect={(v) => setForm((f) => ({ ...f, packageType: v }))} />
                </>
              )}

              <Text style={styles.inputLabel}>Precio base (ARS) *</Text>
              <TextInput style={styles.input} value={form.basePrice} onChangeText={(v) => setForm((f) => ({ ...f, basePrice: v }))} placeholder="500" keyboardType="decimal-pad" placeholderTextColor="#AAA" />

              <Text style={styles.inputLabel}>Precio por km (ARS) *</Text>
              <TextInput style={styles.input} value={form.pricePerKm} onChangeText={(v) => setForm((f) => ({ ...f, pricePerKm: v }))} placeholder="50" keyboardType="decimal-pad" placeholderTextColor="#AAA" />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Tarifa activa</Text>
                <Switch value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} trackColor={{ false: '#D1D5DB', true: '#FED7C0' }} thumbColor={form.isActive ? PRIMARY : '#9CA3AF'} />
              </View>

              <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editing ? 'Guardar cambios' : 'Crear tarifa'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontSize: 13, color: '#FFF', fontWeight: '700' },
  loader: { flex: 1 },
  list: { padding: 16, gap: 16 },
  group: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9F9F9', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  groupTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: SECONDARY },
  groupCount: { fontSize: 12, color: '#888' },
  rateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F5F5F5' },
  rateInfo: { flex: 1 },
  rateChips: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  rateChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#EEF2FF' },
  rateChipType: { backgroundColor: '#F0FDF4' },
  rateChipInactive: { backgroundColor: '#F3F4F6' },
  rateChipText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  ratePrices: { flexDirection: 'row', gap: 12 },
  ratePrice: { fontSize: 13, fontWeight: '600', color: SECONDARY },
  rateActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#AAA' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: SECONDARY },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: SECONDARY, backgroundColor: '#F9F9F9', marginBottom: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  optChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  optChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  optChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  optChipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: SECONDARY },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
