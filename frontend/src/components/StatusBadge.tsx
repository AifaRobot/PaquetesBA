import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import Colors from '@/constants/Colors';
import { ShipmentStatus } from '@/src/types';

interface StatusBadgeProps {
  status: ShipmentStatus;
  /** 'sm' — compact (for lists), 'md' — default, 'lg' — prominent */
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PENDING]: 'Pending',
  [ShipmentStatus.CONFIRMED]: 'Confirmed',
  [ShipmentStatus.PICKED_UP]: 'Picked Up',
  [ShipmentStatus.IN_TRANSIT]: 'In Transit',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ShipmentStatus.DELIVERED]: 'Delivered',
  [ShipmentStatus.FAILED]: 'Failed',
  [ShipmentStatus.CANCELLED]: 'Cancelled',
};

type ColorKeys = keyof typeof Colors.light;

const STATUS_COLORS: Record<ShipmentStatus, { bg: ColorKeys; text: ColorKeys }> =
  {
    [ShipmentStatus.PENDING]: {
      bg: 'statusPendingBg',
      text: 'statusPendingText',
    },
    [ShipmentStatus.CONFIRMED]: {
      bg: 'statusConfirmedBg',
      text: 'statusConfirmedText',
    },
    [ShipmentStatus.PICKED_UP]: {
      bg: 'statusPickedUpBg',
      text: 'statusPickedUpText',
    },
    [ShipmentStatus.IN_TRANSIT]: {
      bg: 'statusInTransitBg',
      text: 'statusInTransitText',
    },
    [ShipmentStatus.OUT_FOR_DELIVERY]: {
      bg: 'statusOutForDeliveryBg',
      text: 'statusOutForDeliveryText',
    },
    [ShipmentStatus.DELIVERED]: {
      bg: 'statusDeliveredBg',
      text: 'statusDeliveredText',
    },
    [ShipmentStatus.FAILED]: {
      bg: 'statusFailedBg',
      text: 'statusFailedText',
    },
    [ShipmentStatus.CANCELLED]: {
      bg: 'statusCancelledBg',
      text: 'statusCancelledText',
    },
  };

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const colorKeys = STATUS_COLORS[status];

  const bgColor = colors[colorKeys.bg] as string;
  const textColor = colors[colorKeys.text] as string;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        size === 'lg' && styles.badgeLg,
        { backgroundColor: bgColor },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
  textLg: {
    fontSize: 14,
    letterSpacing: 0.6,
  },
});

export default StatusBadge;
