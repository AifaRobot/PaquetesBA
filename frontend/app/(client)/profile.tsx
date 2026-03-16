import { toast } from '@/src/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

import { updateProfile } from '@/src/api/users';
import { useAuthStore } from '@/src/store/auth.store';
import { errorAlert } from '@/src/lib/alerts';
import type { UpdateProfileRequest } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

export default function ProfileScreen() {
  const { session, logout } = useAuthStore();
  const user = session?.user;
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
    },
    onError: () => {
      errorAlert('Error', 'No se pudo actualizar el perfil. Intentá de nuevo.');
    },
  });

  function handleSave() {
    const payload: UpdateProfileRequest = {};
    if (firstName.trim() !== user?.firstName) payload.firstName = firstName.trim();
    if (lastName.trim() !== user?.lastName) payload.lastName = lastName.trim();
    if (phone.trim() !== user?.phone) payload.phone = phone.trim();
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(payload);
  }

  function handleCancel() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setEditing(false);
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
            <Text style={styles.roleText}>Cliente</Text>
          </View>
        </View>

        {/* Profile info card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Información personal</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={16} color={PRIMARY} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          <Field
            label="Nombre"
            value={firstName}
            editing={editing}
            onChangeText={setFirstName}
          />
          <Field
            label="Apellido"
            value={lastName}
            editing={editing}
            onChangeText={setLastName}
          />
          <Field
            label="Teléfono"
            value={phone}
            editing={editing}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field label="Email" value={user.email} editing={false} />

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updateMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cuenta</Text>
          <InfoRow icon="shield-checkmark-outline" label="Estado" value={user.status === 'ACTIVE' ? 'Activa' : 'Suspendida'} />
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

function Field({
  label,
  value,
  editing,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
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
          autoCapitalize="words"
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  fullName: { fontSize: 20, fontWeight: '800', color: SECONDARY, marginBottom: 6 },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
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
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
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
