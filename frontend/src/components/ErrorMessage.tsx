import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';

interface ErrorMessageProps {
  /** The error to display. Accepts string, Error, or unknown. */
  error: unknown;
  /** Optional retry callback. When provided a "Retry" button is rendered. */
  onRetry?: () => void;
  /** Override the message shown (uses extracted message as fallback). */
  message?: string;
  /** Visual style: 'inline' renders inside a parent, 'fullscreen' fills available space. */
  variant?: 'inline' | 'fullscreen';
}

/** Extract a human-readable message from any error value. */
function extractMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  // Axios / fetch errors from backend: { error: { message } }
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosErr = error as {
      response?: { data?: { error?: { message?: string }; message?: string } };
    };
    const data = axiosErr.response?.data;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'An unexpected error occurred.';
}

export function ErrorMessage({
  error,
  onRetry,
  message,
  variant = 'inline',
}: ErrorMessageProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const displayMessage = message ?? extractMessage(error);

  const containerStyle =
    variant === 'fullscreen' ? styles.fullscreen : styles.inline;

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        { backgroundColor: colors.statusFailedBg, borderColor: colors.error },
      ]}
    >
      {/* Error icon placeholder — using emoji for zero-dependency rendering */}
      <Text style={styles.icon}>!</Text>

      <View style={styles.textWrapper}>
        <Text style={[styles.title, { color: colors.statusFailedText }]}>
          Something went wrong
        </Text>
        <Text style={[styles.body, { color: colors.statusFailedText }]}>
          {displayMessage}
        </Text>
      </View>

      {onRetry ? (
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.error }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[styles.retryText, { color: colors.error }]}>
            Retry
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inline: {
    marginHorizontal: 0,
  },
  fullscreen: {
    flex: 1,
    margin: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  icon: {
    fontSize: 20,
    fontWeight: '900',
    width: 28,
    textAlign: 'center',
  },
  textWrapper: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ErrorMessage;
