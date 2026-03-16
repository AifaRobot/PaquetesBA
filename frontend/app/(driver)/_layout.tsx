import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { useAuthStore } from '@/src/store/auth.store';

const PRIMARY = '#FF6B35';
const INACTIVE = '#999';

export default function DriverLayout() {
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
          color: '#2C3E50',
          fontSize: 18,
          fontWeight: '800',
        },
        headerTitle: 'PaquetesBA',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Disponibles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active-delivery"
        options={{
          title: 'Entrega Activa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
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
        name="delivery-confirm"
        options={{
          href: null,
          headerShown: true,
          headerTitle: 'Confirmar entrega',
        }}
      />
    </Tabs>
  );
}
