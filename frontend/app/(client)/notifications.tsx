import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getNotifications, markAllAsRead, markAsRead } from '@/src/api/notifications';
import type { Notification } from '@/src/types';
import { NotifType } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

function notifIcon(type: NotifType): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  switch (type) {
    case NotifType.ORDER_DELIVERED:
      return { name: 'checkmark-circle', color: '#10B981' };
    case NotifType.ORDER_CANCELLED:
    case NotifType.ORDER_FAILED:
      return { name: 'close-circle', color: '#EF4444' };
    case NotifType.ORDER_IN_TRANSIT:
    case NotifType.ORDER_PICKED_UP:
    case NotifType.ORDER_OUT_FOR_DELIVERY:
      return { name: 'car', color: '#3B82F6' };
    case NotifType.ORDER_CONFIRMED:
    case NotifType.ORDER_ASSIGNED:
      return { name: 'checkmark-done', color: PRIMARY };
    case NotifType.PAYMENT_RECEIVED:
      return { name: 'card', color: '#8B5CF6' };
    default:
      return { name: 'notifications', color: SECONDARY };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

function NotifItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) {
  const icon = notifIcon(notif.type);
  return (
    <TouchableOpacity
      style={[styles.item, !notif.isRead && styles.itemUnread]}
      onPress={() => { if (!notif.isRead) onRead(notif.id); }}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: icon.color + '20' }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !notif.isRead && styles.itemTitleUnread]}>
          {notif.title}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>{notif.body}</Text>
        <Text style={styles.itemTime}>{timeAgo(notif.createdAt)}</Text>
      </View>
      {!notif.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const readMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {unreadCount > 0 && (
        <View style={styles.topBar}>
          <Text style={styles.unreadLabel}>{unreadCount} sin leer</Text>
          <TouchableOpacity onPress={() => readAllMutation.mutate()}>
            <Text style={styles.readAllText}>Marcar todas como leídas</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PRIMARY} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={52} color="#CCC" />
          <Text style={styles.emptyText}>No tenés notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NotifItem notif={item} onRead={(id) => readMutation.mutate(id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loader: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  unreadLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  readAllText: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  itemUnread: {
    backgroundColor: '#FFF8F5',
    borderColor: '#FFD5C2',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: SECONDARY, marginBottom: 3 },
  itemTitleUnread: { fontWeight: '800' },
  itemBody: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  itemTime: { fontSize: 11, color: '#AAA' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    alignSelf: 'center',
    flexShrink: 0,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#AAA' },
});
