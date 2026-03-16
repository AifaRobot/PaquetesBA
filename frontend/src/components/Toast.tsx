import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { setToastFn } from '@/src/lib/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  text1: string;
  text2?: string;
}

interface ToastContextValue {
  show: (type: ToastType, text1: string, text2?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

// ─── Config ───────────────────────────────────────────────────────────────────

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: '#F0FDF4', border: '#22C55E', text: '#166534' },
  error:   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
  info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'i',
};

const DURATION: Record<ToastType, number> = {
  success: 3000,
  error:   4000,
  info:    3000,
};

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ msg, onDone }: { msg: ToastMessage; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const duration = DURATION[msg.type];
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  const c = COLORS[msg.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: c.bg, borderLeftColor: c.border },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: c.border }]}>
        <Text style={styles.iconText}>{ICONS[msg.type]}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.text1, { color: c.text }]} numberOfLines={2}>{msg.text1}</Text>
        {msg.text2 ? <Text style={[styles.text2, { color: c.text }]} numberOfLines={2}>{msg.text2}</Text> : null}
      </View>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((type: ToastType, text1: string, text2?: string) => {
    const id = ++_counter;
    setToasts((prev) => [...prev, { id, type, text1, text2 }]);
  }, []);

  // Register with the singleton so non-hook code (e.g. api interceptors) can call toast.error()
  useEffect(() => {
    setToastFn(show);
    return () => setToastFn(null);
  }, [show]);

  function remove(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((msg) => (
          <ToastItem key={msg.id} msg={msg} onDone={() => remove(msg.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  return useContext(ToastContext);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  textBlock: { flex: 1 },
  text1: { fontSize: 14, fontWeight: '700' },
  text2: { fontSize: 12, fontWeight: '400', marginTop: 2, opacity: 0.85 },
});
