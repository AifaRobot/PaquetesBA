import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import type { Order } from '@/src/types';
import { StatusBadge } from './StatusBadge';

interface OrderCardProps {
  order: Order;
  onPress?: (order: Order) => void;
}

/** Format a price number to ARS currency string. */
function formatPrice(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Shorten an address to a single readable line. */
function shortAddress(address: Order['pickupAddress']): string {
  const parts = [
    `${address.street} ${address.streetNumber}`,
    address.apartment ? `Apt ${address.apartment}` : null,
    address.city,
  ].filter(Boolean);
  return parts.join(', ');
}

/** Format an ISO date string to a short locale string. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.secondary,
        },
      ]}
      onPress={() => onPress?.(order)}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      {console.log(order)}
      {/* ── Header row: tracking code + status ─────────────────────────── */}
      <View style={styles.header}>
        <Text
          style={[styles.trackingCode, { color: colors.primary }]}
          numberOfLines={1}
        >
          {order.trackingCode}
        </Text>
        <StatusBadge status={order.status} size="sm" />
      </View>

      {/* ── Address row ─────────────────────────────────────────────────── */}
      <View style={styles.addressBlock}>
        <AddressRow
          label="From"
          value={shortAddress(order.pickupAddress)}
          colors={colors}
          dot="#10B981"
        />
        <View
          style={[styles.addressDivider, { backgroundColor: colors.divider }]}
        />
        <AddressRow
          label="To"
          value={shortAddress(order.deliveryAddress)}
          colors={colors}
          dot={colors.primary}
        />
      </View>

      {/* ── Footer row: date + package info + price ─────────────────────── */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {formatDate(order.createdAt)}
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {order.packageSize} · {order.packageType}
        </Text>
        <Text style={[styles.price, { color: colors.secondary }]}>
          {formatPrice(order.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface AddressRowProps {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  dot: string;
}

function AddressRow({ label, value, colors, dot }: AddressRowProps) {
  return (
    <View style={styles.addressRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.addressTextWrapper}>
        <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={[styles.addressValue, { color: colors.text }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    // Shadow (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    // Elevation (Android)
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  trackingCode: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  addressBlock: {
    marginBottom: 12,
  },
  addressDivider: {
    height: 1,
    marginLeft: 24,
    marginVertical: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  addressTextWrapper: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  addressValue: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    flexShrink: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OrderCard;
