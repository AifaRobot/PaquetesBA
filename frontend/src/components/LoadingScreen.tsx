import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';

interface LoadingScreenProps {
  /** Optional message shown below the spinner. */
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App logo / wordmark */}
      <View style={styles.logoWrapper}>
        <Text style={[styles.logoText, { color: colors.primary }]}>
          Paquetes
        </Text>
        <Text style={[styles.logoAccent, { color: colors.secondary }]}>BA</Text>
      </View>

      {/* Spinner */}
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
      />

      {/* Optional status message */}
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoAccent: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  spinner: {
    marginBottom: 20,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoadingScreen;
