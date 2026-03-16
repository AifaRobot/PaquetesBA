import { toast } from '@/src/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyProfile, getMyStats, updateMyProfile } from '@/src/api/drivers';
import { updateProfile } from '@/src/api/users';
import { infoAlert } from '@/src/lib/alerts';
import { useAuthStore } from '@/src/store/auth.store';
import type { UpdateDriverProfileRequest, UpdateProfileRequest } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

export default function DriverProfileScreen() {
  const { session, logout } = useAuthStore();
  const user = session?.user;
  const qc = useQueryClient();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);

  // Personal fields
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // Vehicle fields
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const { data: driverProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['driver-profile'],
    queryFn: getMyProfile,
    onSuccess: (data) => {
      setVehicleType(data.vehicleType);
      setLicensePlate(data.licensePlate);
      setLicenseNumber(data.licenseNumber);
    },
  } as any);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: getMyStats,
  });

  const personalMutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditingPersonal(false);
    },
    onError: () => infoAlert('Error', 'No se pudo actualizar el perfil.'),
  });

  const vehicleMutation = useMutation({
    mutationFn: (payload: UpdateDriverProfileRequest) => updateMyProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-profile'] });
      setEditingVehicle(false);
    },
    onError: () => infoAlert('Error', 'No se pudo actualizar el vehículo.'),
  });

  function handleSavePersonal() {
    const payload: UpdateProfileRequest = {};
    if (firstName.trim() !== user?.firstName) payload.firstName = firstName.trim();
    if (lastName.trim() !== user?.lastName) payload.lastName = lastName.trim();
    if (phone.trim() !== user?.phone) payload.phone = phone.trim();
    if (Object.keys(payload).length === 0) { setEditingPersonal(false); return; }
    personalMutation.mutate(payload);
  }

  function handleSaveVehicle() {
    const payload: UpdateDriverProfileRequest = {};
    if (vehicleType.trim() !== driverProfile?.vehicleType) payload.vehicleType = vehicleType.trim();
    if (licensePlate.trim() !== driverProfile?.licensePlate) payload.licensePlate = licensePlate.trim();
    if (licenseNumber.trim() !== driverProfile?.licenseNumber) payload.licenseNumber = licenseNumber.trim();
    if (Object.keys(payload).length === 0) { setEditingVehicle(false); return; }
    vehicleMutation.mutate(payload);
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      toast.success('¡Sesión Cerrada!');
      logout();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  }

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>{user.firstName} {user.lastName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Repartidor</Text>
          </View>
          {driverProfile && (
            <View style={[styles.onlineBadge, { backgroundColor: driverProfile.isOnline ? '#D1FAE5' : '#F3F4F6' }]}>
              <View style={[styles.onlineDot, { backgroundColor: driverProfile.isOnline ? '#10B981' : '#9CA3AF' }]} />
              <Text style={[styles.onlineText, { color: driverProfile.isOnline ? '#065F46' : '#6B7280' }]}>
                {driverProfile.isOnline ? 'En línea' : 'Fuera de línea'}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {statsLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginBottom: 16 }} />
        ) : stats ? (
          <View style={styles.statsCard}>
            <StatBox label="Entregas" value={String(stats.totalDeliveries)} icon="cube" color="#3B82F6" />
            <View style={styles.statsDivider} />
            <StatBox
              label="Rating"
              value={stats.averageRating != null ? stats.averageRating.toFixed(1) : '—'}
              icon="star"
              color="#F59E0B"
            />
            <View style={styles.statsDivider} />
            <StatBox
              label="Este mes"
              value={String(stats.ordersThisMonth)}
              icon="calendar"
              color="#10B981"
            />
          </View>
        ) : null}

        {/* Personal info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Información personal</Text>
            {!editingPersonal && (
              <TouchableOpacity onPress={() => setEditingPersonal(true)} style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          <Field label="Nombre" value={firstName} editing={editingPersonal} onChangeText={setFirstName} />
          <Field label="Apellido" value={lastName} editing={editingPersonal} onChangeText={setLastName} />
          <Field label="Teléfono" value={phone} editing={editingPersonal} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Email" value={user.email} editing={false} />
          {editingPersonal && (
            <EditActions
              onCancel={() => {
                setFirstName(user.firstName);
                setLastName(user.lastName);
                setPhone(user.phone);
                setEditingPersonal(false);
              }}
              onSave={handleSavePersonal}
              loading={personalMutation.isPending}
            />
          )}
        </View>

        {/* Vehicle info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vehículo</Text>
            {!editingVehicle && (
              <TouchableOpacity onPress={() => setEditingVehicle(true)} style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          {profileLoading ? (
            <ActivityIndicator color={PRIMARY} />
          ) : (
            <>
              <Field label="Tipo de vehículo" value={driverProfile?.vehicleType ?? ''} editing={editingVehicle} onChangeText={setVehicleType} />
              <Field label="Patente" value={driverProfile?.licensePlate ?? ''} editing={editingVehicle} onChangeText={setLicensePlate} autoCapitalize="characters" />
              <Field label="Licencia" value={driverProfile?.licenseNumber ?? ''} editing={editingVehicle} onChangeText={setLicenseNumber} autoCapitalize="characters" />
              {driverProfile?.zone && (
                <Field label="Zona" value={driverProfile.zone.name} editing={false} />
              )}
            </>
          )}
          {editingVehicle && (
            <EditActions
              onCancel={() => {
                setVehicleType(driverProfile?.vehicleType ?? '');
                setLicensePlate(driverProfile?.licensePlate ?? '');
                setLicenseNumber(driverProfile?.licenseNumber ?? '');
                setEditingVehicle(false);
              }}
              onSave={handleSaveVehicle}
              loading={vehicleMutation.isPending}
            />
          )}
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cuenta</Text>
          <InfoRow
            icon="shield-checkmark-outline"
            label="Estado"
            value={user.status === 'ACTIVE' ? 'Activa' : 'Suspendida'}
          />
          <InfoRow
            icon="calendar-outline"
            label="Miembro desde"
            value={new Date(user.createdAt).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  editing,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (t: string) => void;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'characters' | 'words';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'words'}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#999" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EditActions({ onCancel, onSave, loading }: { onCancel: () => void; onSave: () => void; loading: boolean }) {
  return (
    <View style={styles.editActions}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Guardar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 20, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  fullName: { fontSize: 20, fontWeight: '800', color: SECONDARY },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#FFF3EE', borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 12, fontWeight: '700' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statBoxValue: { fontSize: 18, fontWeight: '800', color: SECONDARY },
  statBoxLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  statsDivider: { width: 1, backgroundColor: '#EEE', marginVertical: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: SECONDARY },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  fieldValue: { fontSize: 15, color: SECONDARY, fontWeight: '500' },
  fieldInput: {
    fontSize: 15,
    color: SECONDARY,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoLabel: { flex: 1, fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: SECONDARY },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
