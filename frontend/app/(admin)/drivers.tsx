import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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

import { getDrivers, type DriverProfileWithUser } from '@/src/api/drivers';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

type Filter = 'all' | 'online' | 'offline';

export default function AdminDriversScreen() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['admin-drivers', filter],
    queryFn: () =>
      getDrivers({
        isOnline: filter === 'all' ? undefined : filter === 'online',
        limit: 100,
      }),
  });

  const drivers: DriverProfileWithUser[] = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filter */}
      <View style={styles.filterBar}>
        {(['all', 'online', 'offline'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            {f === 'online' && <View style={[styles.dot, { backgroundColor: filter === f ? '#FFF' : '#10B981' }]} />}
            {f === 'offline' && <View style={[styles.dot, { backgroundColor: filter === f ? '#FFF' : '#9CA3AF' }]} />}
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'Todos' : f === 'online' ? 'En línea' : 'Fuera de línea'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      {!isLoading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>{data?.total ?? drivers.length} repartidor{(data?.total ?? drivers.length) !== 1 ? 'es' : ''}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar repartidores</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bicycle-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No hay repartidores</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
          renderItem={({ item }: { item: DriverProfileWithUser }) => <DriverRow driver={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

function DriverRow({ driver }: { driver: DriverProfileWithUser }) {
  const isOnline = driver.isOnline;
  const initials = `${driver.user.firstName?.[0] ?? ''}${driver.user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.row}>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#D1D5DB' }]} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{driver.user.firstName} {driver.user.lastName}</Text>
        <Text style={styles.sub}>{driver.user.email}</Text>
        <Text style={styles.vehicle}>{driver.vehicleType} · {driver.licensePlate}</Text>
        {driver.zone && (
          <View style={styles.zoneBadge}>
            <Ionicons name="location-outline" size={11} color="#6B7280" />
            <Text style={styles.zoneText}>{driver.zone.name}</Text>
          </View>
        )}
      </View>
      <View style={styles.statusCol}>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#D1FAE5' : '#F3F4F6' }]}>
          <Text style={[styles.statusText, { color: isOnline ? '#065F46' : '#6B7280' }]}>
            {isOnline ? 'En línea' : 'Offline'}
          </Text>
        </View>
        <Text style={[styles.accountStatus, driver.user.status === 'SUSPENDED' && styles.suspended]}>
          {driver.user.status === 'SUSPENDED' ? 'Suspendido' : 'Activo'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  filterBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: SECONDARY, borderColor: SECONDARY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#FFF' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  countBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  countText: { fontSize: 13, color: '#888', fontWeight: '600' },
  loader: { flex: 1 },
  list: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatarWrapper: { position: 'relative', flexShrink: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: SECONDARY },
  sub: { fontSize: 12, color: '#888', marginTop: 1 },
  vehicle: { fontSize: 12, color: '#666', marginTop: 2 },
  zoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  zoneText: { fontSize: 11, color: '#6B7280' },
  statusCol: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  accountStatus: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  suspended: { color: '#EF4444' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 15, color: '#AAA' },
  errorText: { fontSize: 15, color: '#EF4444' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
});
