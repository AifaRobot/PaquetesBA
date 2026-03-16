import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toast } from '@/src/lib/toast';
import { useAuthStore } from '@/src/store/auth.store';
import { UserRole } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, session } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!identifier.trim()) {
      toast.error('Campo requerido', 'Ingresá tu email o teléfono.');
      return;
    }
    if (!password) {
      toast.error('Campo requerido', 'Ingresá tu contraseña.');
      return;
    }

    try {
      await login({ identifier: identifier.trim(), password });
      const role = useAuthStore.getState().session?.user.role;
      if (role === UserRole.CLIENT) {
        router.replace('/(client)');
      } else if (role === UserRole.DRIVER) {
        router.replace('/(driver)');
      } else if (role === UserRole.ADMIN) {
        router.replace('/(admin)');
      }
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { error?: { message?: string | string[] } } } })
          ?.response?.data?.error?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Credenciales incorrectas. Intentá de nuevo.');
      toast.error('Error al iniciar sesión', message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>PaquetesBA</Text>
            <Text style={styles.tagline}>Tu envío, siempre a tiempo</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {/* Identifier */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email o teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="ej. usuario@email.com"
                placeholderTextColor="#9CA3AF"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              )}
            </Pressable>
          </View>

          {/* Register links */}
          <View style={styles.registerSection}>
            <Text style={styles.registerIntro}>¿No tienes cuenta? Regístrate como:</Text>
            <View style={styles.registerButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  pressed && styles.outlineButtonPressed,
                ]}
                onPress={() => router.push('/(auth)/register-client')}
              >
                <Text style={styles.outlineButtonText}>Soy cliente</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  styles.outlineButtonSecondary,
                  pressed && styles.outlineButtonPressed,
                ]}
                onPress={() => router.push('/(auth)/register-driver')}
              >
                <Text style={[styles.outlineButtonText, styles.outlineButtonTextSecondary]}>
                  Soy repartidor
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 24,
  },
  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  // Primary button
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Register section
  registerSection: {
    alignItems: 'center',
  },
  registerIntro: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  registerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  outlineButtonSecondary: {
    borderColor: SECONDARY,
  },
  outlineButtonPressed: {
    opacity: 0.7,
  },
  outlineButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButtonTextSecondary: {
    color: SECONDARY,
  },
});
