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
import type { RegisterDriverRequest } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s\-()]{6,19}$/;

const VEHICLE_TYPES = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'BICI', label: 'Bicicleta' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'CAMIONETA', label: 'Camioneta' },
] as const;

type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];

export default function RegisterDriverScreen() {
  const router = useRouter();
  const { registerDriver, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleType: '' as VehicleType | '',
    licensePlate: '',
    licenseNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function updateField(key: keyof typeof form) {
    return (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectVehicle(value: VehicleType) {
    setForm((prev) => ({ ...prev, vehicleType: value }));
  }

  function validate(): string | null {
    if (!form.firstName.trim()) return 'El nombre es obligatorio.';
    if (!form.lastName.trim()) return 'El apellido es obligatorio.';
    if (!form.email.trim()) return 'El email es obligatorio.';
    if (!EMAIL_REGEX.test(form.email.trim())) return 'El email no tiene un formato válido.';
    if (!form.phone.trim()) return 'El teléfono es obligatorio.';
    if (!PHONE_REGEX.test(form.phone.trim())) return 'El teléfono no tiene un formato válido.';
    if (!form.password) return 'La contraseña es obligatoria.';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
    if (!form.vehicleType) return 'Selecciona el tipo de vehículo.';
    if (!form.licensePlate.trim()) return 'La patente/placa es obligatoria.';
    if (!form.licenseNumber.trim()) return 'El número de licencia es obligatorio.';
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      toast.error('Datos inválidos', validationError);
      return;
    }

    const payload: RegisterDriverRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
      vehicleType: form.vehicleType as VehicleType,
      licensePlate: form.licensePlate.trim().toUpperCase(),
      licenseNumber: form.licenseNumber.trim(),
    };

    try {
      await registerDriver(payload);
      router.replace('/(driver)');
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { error?: { message?: string | string[] } } } })
          ?.response?.data?.error?.message;
      const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'No se pudo crear la cuenta. Intenta de nuevo.');
      toast.error('Error al registrarse', message);
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
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
              <Text style={styles.backText}>← Volver</Text>
            </Pressable>
            <Text style={styles.logoText}>PaquetesBA</Text>
            <Text style={styles.screenTitle}>Crear cuenta</Text>
            <Text style={styles.screenSubtitle}>Regístrate como repartidor</Text>
          </View>

          {/* Personal info card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos personales</Text>

            {/* First / Last name */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan"
                  placeholderTextColor="#9CA3AF"
                  value={form.firstName}
                  onChangeText={updateField('firstName')}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <Text style={styles.label}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pérez"
                  placeholderTextColor="#9CA3AF"
                  value={form.lastName}
                  onChangeText={updateField('lastName')}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="juan@email.com"
                placeholderTextColor="#9CA3AF"
                value={form.email}
                onChangeText={updateField('email')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="+54 11 1234-5678"
                placeholderTextColor="#9CA3AF"
                value={form.phone}
                onChangeText={updateField('phone')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={form.password}
                  onChangeText={updateField('password')}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  returnKeyType="next"
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

            {/* Confirm password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  value={form.confirmPassword}
                  onChangeText={updateField('confirmPassword')}
                  secureTextEntry={!showConfirm}
                  textContentType="newPassword"
                  returnKeyType="next"
                />
                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Vehicle info card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos del vehículo</Text>

            {/* Vehicle type selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tipo de vehículo</Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_TYPES.map((vt) => {
                  const selected = form.vehicleType === vt.value;
                  return (
                    <Pressable
                      key={vt.value}
                      style={({ pressed }) => [
                        styles.vehicleOption,
                        selected && styles.vehicleOptionSelected,
                        pressed && styles.vehicleOptionPressed,
                      ]}
                      onPress={() => selectVehicle(vt.value)}
                    >
                      <Text
                        style={[
                          styles.vehicleOptionText,
                          selected && styles.vehicleOptionTextSelected,
                        ]}
                      >
                        {vt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* License plate */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Patente / Placa</Text>
              <TextInput
                style={styles.input}
                placeholder="AB 123 CD"
                placeholderTextColor="#9CA3AF"
                value={form.licensePlate}
                onChangeText={updateField('licensePlate')}
                autoCapitalize="characters"
                returnKeyType="next"
              />
            </View>

            {/* License number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Número de licencia</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de tu licencia de conducir"
                placeholderTextColor="#9CA3AF"
                value={form.licenseNumber}
                onChangeText={updateField('licenseNumber')}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            )}
          </Pressable>

          {/* Back to login */}
          <Pressable
            style={styles.loginLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={styles.loginLinkAccent}>Inicia sesión</Text>
            </Text>
          </Pressable>
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
    paddingVertical: 24,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SECONDARY,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
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
  // Vehicle selector
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicleOption: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#FAFAFA',
  },
  vehicleOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF3EE',
  },
  vehicleOptionPressed: {
    opacity: 0.7,
  },
  vehicleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  vehicleOptionTextSelected: {
    color: PRIMARY,
    fontWeight: '700',
  },
  // Error
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
  },
  // Primary button
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLinkAccent: {
    color: PRIMARY,
    fontWeight: '600',
  },
});
