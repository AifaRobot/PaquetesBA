import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAlert, errorAlert } from '@/src/lib/alerts';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';
const RECENT_KEY = '@pba_recent_track_codes';
const MAX_RECENT = 8;

export default function TrackScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [recentCodes, setRecentCodes] = useState<string[]>([]);

  // Load recent codes from AsyncStorage
  useEffect(() => {
    loadRecentCodes();
  }, []);

  async function loadRecentCodes() {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setRecentCodes(parsed);
      }
    } catch {
      // ignore storage errors
    }
  }

  async function saveRecentCode(newCode: string) {
    try {
      const next = [newCode, ...recentCodes.filter((c) => c !== newCode)].slice(
        0,
        MAX_RECENT,
      );
      setRecentCodes(next);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }

  async function removeRecentCode(toRemove: string) {
    try {
      const next = recentCodes.filter((c) => c !== toRemove);
      setRecentCodes(next);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function clearAllRecent() {
    confirmAlert(
      'Limpiar historial',
      '¿Querés borrar todos los códigos recientes?',
      async () => {
        setRecentCodes([]);
        await AsyncStorage.removeItem(RECENT_KEY);
      },
      'Limpiar',
    );
  }

  function navigateToTracking(trackingCode: string) {
    const normalized = trackingCode.trim().toUpperCase();
    if (!normalized) return;
    if (!normalized.match(/^PBA-\d{4}-[A-F0-9]{6}$/)) {
      errorAlert('Código inválido', 'El formato debe ser PBA-YYYY-XXXXXX (ej: PBA-2026-A3F9C1)');
      return;
    }
    saveRecentCode(normalized);
    router.push(`/(client)/track/${normalized}` as never);
  }

  function handleSubmit() {
    navigateToTracking(code);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={recentCodes}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons name="location" size={32} color={PRIMARY} />
                </View>
                <Text style={styles.heroTitle}>Rastrear paquete</Text>
                <Text style={styles.heroSubtitle}>
                  Ingresá el código de seguimiento para ver el estado de tu
                  envío en tiempo real
                </Text>
              </View>

              {/* Input */}
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>CÓDIGO DE RASTREO</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={(t) => setCode(t.toUpperCase())}
                    placeholder="PBA-2026-A3F9C1"
                    placeholderTextColor="#AAAAAA"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={handleSubmit}
                    accessibilityLabel="Código de rastreo"
                  />
                  <TouchableOpacity
                    style={[
                      styles.searchButton,
                      !code.trim() && styles.searchButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!code.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Buscar"
                  >
                    <Ionicons name="search" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.formatHint}>
                  Formato: PBA-YYYY-XXXXXX (ej: PBA-2026-A3F9C1)
                </Text>
              </View>

              {/* Recent header */}
              {recentCodes.length > 0 && (
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Recientes</Text>
                  <TouchableOpacity
                    onPress={clearAllRecent}
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearText}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.recentItem}
              onPress={() => navigateToTracking(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Rastrear ${item}`}
            >
              <View style={styles.recentIconWrapper}>
                <Ionicons name="time-outline" size={18} color={PRIMARY} />
              </View>
              <Text style={styles.recentCode}>{item}</Text>
              <TouchableOpacity
                onPress={() => removeRecentCode(item)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item} del historial`}
              >
                <Ionicons name="close-circle" size={18} color="#CCCCCC" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyRecent}>
              <Ionicons name="cube-outline" size={36} color="#CCCCCC" />
              <Text style={styles.emptyText}>
                Los códigos que consultes aparecerán aquí
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: SECONDARY,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: SECONDARY,
    fontWeight: '700',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchButton: {
    width: 52,
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  formatHint: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SECONDARY,
  },
  clearText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  recentIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentCode: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SECONDARY,
    letterSpacing: 0.5,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
  },
});
