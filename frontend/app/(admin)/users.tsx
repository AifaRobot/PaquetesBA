import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUsers, updateUserStatus } from '@/src/api/users';
import { confirmAlert, errorAlert } from '@/src/lib/alerts';
import { UserStatus, type User } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

export default function AdminUsersScreen() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => getUsers({ page, limit: 30 }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: () => errorAlert('Error', 'No se pudo actualizar el estado.'),
  });

  function handleToggleStatus(user: User) {
    const next = user.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    const label = next === UserStatus.SUSPENDED ? 'suspender' : 'reactivar';
    confirmAlert(
      `${next === UserStatus.SUSPENDED ? 'Suspender' : 'Reactivar'} usuario`,
      `¿Querés ${label} a ${user.firstName} ${user.lastName}?`,
      () => statusMutation.mutate({ id: user.id, status: next }),
      'Confirmar',
    );
  }

  const users: User[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {!isLoading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>{data?.total ?? users.length} usuario{(data?.total ?? users.length) !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar usuarios</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No hay usuarios</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, item.status === UserStatus.SUSPENDED && styles.avatarSuspended]}>
                  <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                </View>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
                <Text style={styles.joined}>Desde {new Date(item.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.statusBtn,
                  item.status === UserStatus.SUSPENDED && styles.statusBtnSuspended,
                  item.status === UserStatus.PENDING_VERIFICATION && styles.statusBtnPending,
                ]}
                onPress={() => handleToggleStatus(item)}
                disabled={statusMutation.isPending}
              >
                <Text style={[
                  styles.statusBtnText,
                  item.status === UserStatus.SUSPENDED && styles.statusBtnTextSuspended,
                  item.status === UserStatus.PENDING_VERIFICATION && styles.statusBtnTextPending,
                ]}>
                  {item.status === UserStatus.ACTIVE
                    ? 'Activo'
                    : item.status === UserStatus.SUSPENDED
                    ? 'Suspendido'
                    : 'Pendiente'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#CCC' : SECONDARY} />
                </TouchableOpacity>
                <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
                <TouchableOpacity style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]} onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <Ionicons name="chevron-forward" size={18} color={page >= totalPages ? '#CCC' : SECONDARY} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  countBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
  loader: { flex: 1 },
  list: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatarWrapper: { flexShrink: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: SECONDARY, alignItems: 'center', justifyContent: 'center' },
  avatarSuspended: { backgroundColor: '#9CA3AF' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: SECONDARY },
  email: { fontSize: 12, color: '#888', marginTop: 1 },
  phone: { fontSize: 12, color: '#888' },
  joined: { fontSize: 11, color: '#BBB', marginTop: 2 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#D1FAE5' },
  statusBtnSuspended: { backgroundColor: '#FEE2E2' },
  statusBtnPending: { backgroundColor: '#FEF3C7' },
  statusBtnText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  statusBtnTextSuspended: { color: '#991B1B' },
  statusBtnTextPending: { color: '#92400E' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 15, color: '#AAA' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 8 },
  pageBtnDisabled: { opacity: 0.3 },
  pageText: { fontSize: 14, color: SECONDARY, fontWeight: '600' },
});
