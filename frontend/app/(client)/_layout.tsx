import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getNotifications } from '@/src/api/notifications';
import { useAuthStore } from '@/src/store/auth.store';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const INACTIVE = '#999';

function NotificationBell() {
  const router = useRouter();
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push('/(client)/notifications' as never)}
      style={styles.bellButton}
      accessibilityLabel={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={24} color={SECONDARY} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ClientLayout() {
  const { session, isLoading } = useAuthStore();
  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 1,
          shadowOpacity: 0.08,
        },
        headerTitleStyle: {
          color: SECONDARY,
          fontSize: 18,
          fontWeight: '800',
        },
        headerTitle: 'PaquetesBA',
        headerRight: () => <NotificationBell />,
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Rastrear',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens — not shown as tabs */}
      <Tabs.Screen
        name="new-order"
        options={{ href: null, headerShown: true, headerTitle: 'Nuevo pedido' }}
      />
      <Tabs.Screen
        name="order/[id]"
        options={{ href: null, headerShown: true, headerTitle: 'Detalle del pedido' }}
      />
      <Tabs.Screen
        name="track/[trackingCode]"
        options={{ href: null, headerShown: true, headerTitle: 'Rastreo en vivo' }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null, headerShown: true, headerTitle: 'Notificaciones' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: PRIMARY,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
});
