import { toast } from '@/src/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Redirect, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthStore } from '@/src/store/auth.store';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

type DrawerContentProps = Parameters<typeof DrawerContentScrollView>[0] & {
  state: { routes: Array<{ key: string; name: string }> };
  navigation: { navigate: (name: string) => void };
  descriptors: Record<string, { options: Record<string, unknown> }>;
};

function AdminDrawerContent(props: DrawerContentProps) {
  const { session, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      toast.success('¡Sesión Cerrada!');
      logout();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const adminName = session?.user
    ? `${session.user.firstName} ${session.user.lastName}`
    : 'Administrador';
  const adminEmail = session?.user?.email ?? '';

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {adminName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.drawerName} numberOfLines={1}>
          {adminName}
        </Text>
        <Text style={styles.drawerEmail} numberOfLines={1}>
          {adminEmail}
        </Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Items */}
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminLayout() {
  const { session, isLoading } = useAuthStore();
  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;

  return (
    <Drawer
      drawerContent={(props) => <AdminDrawerContent {...(props as DrawerContentProps)} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { color: SECONDARY, fontWeight: '800', fontSize: 18 },
        headerTintColor: PRIMARY,
        drawerActiveTintColor: PRIMARY,
        drawerInactiveTintColor: '#6B7280',
        drawerActiveBackgroundColor: '#FFF0EB',
        drawerLabelStyle: { fontSize: 14, fontWeight: '600' },
        drawerStyle: { width: 280 },
        headerTitle: 'PaquetesBA Admin',
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="fleet-map"
        options={{
          title: 'Mapa de Flota',
          drawerLabel: 'Mapa de Flota',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          drawerLabel: 'Pedidos',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="drivers"
        options={{
          title: 'Repartidores',
          drawerLabel: 'Repartidores',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bicycle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          title: 'Usuarios',
          drawerLabel: 'Usuarios',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="zones"
        options={{
          title: 'Zonas',
          drawerLabel: 'Zonas',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="rates"
        options={{
          title: 'Tarifas',
          drawerLabel: 'Tarifas',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          title: 'Informes',
          drawerLabel: 'Informes',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Drawer.Screen
        name="order-detail"
        options={{ drawerItemStyle: { display: 'none' }, title: 'Detalle de Pedido' }}
      />
      <Drawer.Screen
        name="order-create"
        options={{ drawerItemStyle: { display: 'none' }, title: 'Crear Pedido' }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    backgroundColor: SECONDARY,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  drawerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  drawerEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
});
