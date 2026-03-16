import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createZone, deleteZone, getZones, updateZone } from '@/src/api/zones';
import { confirmAlert, errorAlert } from '@/src/lib/alerts';
import type { Zone } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

type FormState = { name: string; description: string; status: 'ACTIVE' | 'INACTIVE' };
const emptyForm = (): FormState => ({ name: '', description: '', status: 'ACTIVE' });

export default function AdminZonesScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: zones = [], isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
  });

  const createMutation = useMutation({
    mutationFn: () => createZone({ name: form.name.trim(), description: form.description.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); closeModal(); },
    onError: () => errorAlert('Error', 'No se pudo crear la zona.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateZone(editing!.id, { name: form.name.trim(), description: form.description.trim() || undefined, status: form.status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); closeModal(); },
    onError: () => errorAlert('Error', 'No se pudo actualizar la zona.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteZone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    onError: () => errorAlert('Error', 'No se pudo eliminar la zona.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateZone(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    onError: () => errorAlert('Error', 'No se pudo cambiar el estado.'),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalVisible(true);
  }

  function openEdit(zone: Zone) {
    setEditing(zone);
    setForm({ name: zone.name, description: zone.description ?? '', status: zone.status });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
    setForm(emptyForm());
  }

  function handleSave() {
    if (!form.name.trim()) { errorAlert('Nombre requerido', 'Ingresá un nombre para la zona.'); return; }
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }

  function handleDelete(zone: Zone) {
    confirmAlert(
      'Eliminar zona',
      `¿Eliminar "${zone.name}"? Esta acción no se puede deshacer.`,
      () => deleteMutation.mutate(zone.id),
      'Eliminar',
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <Text style={styles.countText}>{zones.length} zona{zones.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Nueva zona</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar zonas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity>
        </View>
      ) : zones.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No hay zonas creadas</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>Crear primera zona</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} colors={[PRIMARY]} />}
          renderItem={({ item }) => (
            <View style={styles.zoneCard}>
              <View style={styles.zoneHeader}>
                <View style={styles.zoneLeft}>
                  <View style={[styles.zoneIcon, { backgroundColor: item.status === 'ACTIVE' ? '#FFF3EE' : '#F3F4F6' }]}>
                    <Ionicons name="location" size={20} color={item.status === 'ACTIVE' ? PRIMARY : '#9CA3AF'} />
                  </View>
                  <View>
                    <Text style={styles.zoneName}>{item.name}</Text>
                    {item.description && <Text style={styles.zoneDesc}>{item.description}</Text>}
                  </View>
                </View>
                <Switch
                  value={item.status === 'ACTIVE'}
                  onValueChange={(v) => toggleMutation.mutate({ id: item.id, status: v ? 'ACTIVE' : 'INACTIVE' })}
                  trackColor={{ false: '#D1D5DB', true: '#FED7C0' }}
                  thumbColor={item.status === 'ACTIVE' ? PRIMARY : '#9CA3AF'}
                />
              </View>
              <View style={styles.zoneActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                  <Ionicons name="pencil-outline" size={15} color={SECONDARY} />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} disabled={deleteMutation.isPending}>
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar zona' : 'Nueva zona'}</Text>
              <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color={SECONDARY} /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Ej: Palermo" placeholderTextColor="#AAA" autoFocus />

            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Descripción opcional" placeholderTextColor="#AAA" multiline numberOfLines={3} />

            {editing && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Zona activa</Text>
                <Switch
                  value={form.status === 'ACTIVE'}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v ? 'ACTIVE' : 'INACTIVE' }))}
                  trackColor={{ false: '#D1D5DB', true: '#FED7C0' }}
                  thumbColor={form.status === 'ACTIVE' ? PRIMARY : '#9CA3AF'}
                />
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editing ? 'Guardar cambios' : 'Crear zona'}</Text>}
            </TouchableOpacity>
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
  list: { padding: 16, gap: 12 },
  zoneCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  zoneIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  zoneName: { fontSize: 16, fontWeight: '700', color: SECONDARY },
  zoneDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  zoneActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: SECONDARY },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#AAA' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: SECONDARY },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: SECONDARY, backgroundColor: '#F9F9F9', marginBottom: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: SECONDARY },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
