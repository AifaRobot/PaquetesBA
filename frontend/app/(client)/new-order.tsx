import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createOrder } from '@/src/api/orders';
import { SearchablePicker } from '@/src/components/SearchablePicker';
import {
  getCitiesForProvince,
  getProvinceByName,
  provinces,
} from '@/src/data/argentina';
import { toast } from '@/src/lib/toast';
import type { CreateOrderRequest, OrderAddress } from '@/src/types';
import { PackageSize, PackageType } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const TOTAL_STEPS = 4;

// ─── Address form shape ───────────────────────────────────────────────────────

interface AddressForm {
  street: string;
  streetNumber: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
  lat: string;
  lng: string;
}

const emptyAddress: AddressForm = {
  street: '',
  streetNumber: '',
  apartment: '',
  city: '',
  province: '',
  postalCode: '',
  lat: '',
  lng: '',
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function addressFormToOrderAddress(form: AddressForm): OrderAddress {
  return {
    street: form.street,
    streetNumber: form.streetNumber,
    apartment: form.apartment || null,
    city: form.city,
    province: form.province,
    postalCode: form.postalCode,
    lat: parseFloat(form.lat) || 0,
    lng: parseFloat(form.lng) || 0,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: number;
  total: number;
}

function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              stepStyles.dot,
              i + 1 === current && stepStyles.dotActive,
              i + 1 < current && stepStyles.dotDone,
            ]}
          >
            {i + 1 < current ? (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  stepStyles.dotText,
                  (i + 1 === current || i + 1 < current) &&
                    stepStyles.dotTextActive,
                ]}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < total - 1 && (
            <View
              style={[stepStyles.line, i + 1 < current && stepStyles.lineDone]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: PRIMARY,
  },
  dotDone: {
    backgroundColor: '#10B981',
  },
  dotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999999',
  },
  dotTextActive: {
    color: '#FFFFFF',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  lineDone: {
    backgroundColor: '#10B981',
  },
});

// ─── Address Step ─────────────────────────────────────────────────────────────

interface AddressStepProps {
  title: string;
  subtitle: string;
  form: AddressForm;
  onChange: (field: keyof AddressForm, value: string) => void;
  onProvinceChange: (province: string) => void;
  onUseCurrentLocation: () => void;
  locating: boolean;
}

function AddressStep({
  title,
  subtitle,
  form,
  onChange,
  onProvinceChange,
  onUseCurrentLocation,
  locating,
}: AddressStepProps) {
  const provinceNames = provinces.map((p) => p.nombre);
  const selectedProvince = getProvinceByName(form.province);
  const cityOptions = selectedProvince
    ? getCitiesForProvince(selectedProvince.id)
    : [];

  return (
    <View>
      <Text style={formStyles.stepTitle}>{title}</Text>
      <Text style={formStyles.stepSubtitle}>{subtitle}</Text>

      <TouchableOpacity
        style={formStyles.locationButton}
        onPress={onUseCurrentLocation}
        disabled={locating}
        accessibilityRole="button"
      >
        {locating ? (
          <ActivityIndicator size="small" color={PRIMARY} />
        ) : (
          <Ionicons name="location" size={16} color={PRIMARY} />
        )}
        <Text style={formStyles.locationButtonText}>
          {locating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
        </Text>
      </TouchableOpacity>

      <SearchablePicker
        label="Provincia *"
        placeholder="Seleccionar provincia"
        value={form.province}
        items={provinceNames}
        onChange={onProvinceChange}
        required
      />
      <SearchablePicker
        label="Ciudad *"
        placeholder={
          form.province ? 'Seleccionar ciudad' : 'Primero seleccioná una provincia'
        }
        value={form.city}
        items={cityOptions}
        onChange={(v) => onChange('city', v)}
        disabled={!form.province}
        required
      />
      <Field
        label="Calle *"
        value={form.street}
        onChangeText={(v) => onChange('street', v)}
        placeholder="Av. Corrientes"
      />
      <Field
        label="Número *"
        value={form.streetNumber}
        onChangeText={(v) => onChange('streetNumber', v)}
        placeholder="1234"
        keyboardType="number-pad"
      />
      <Field
        label="Piso / Departamento"
        value={form.apartment}
        onChangeText={(v) => onChange('apartment', v)}
        placeholder="3B (opcional)"
      />
      <Field
        label="Código Postal *"
        value={form.postalCode}
        onChangeText={(v) => onChange('postalCode', v)}
        placeholder="C1043"
        keyboardType="default"
      />
      <View style={formStyles.row}>
        <View style={formStyles.halfField}>
          <Field
            label="Latitud"
            value={form.lat}
            onChangeText={(v) => onChange('lat', v)}
            placeholder="-34.60"
            keyboardType="numeric"
          />
        </View>
        <View style={formStyles.halfField}>
          <Field
            label="Longitud"
            value={form.lng}
            onChangeText={(v) => onChange('lng', v)}
            placeholder="-58.38"
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Field component ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: FieldProps) {
  return (
    <View style={formStyles.fieldWrapper}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={[formStyles.input, multiline && formStyles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AAAAAA"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const formStyles = StyleSheet.create({
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SECONDARY,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3EE',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD5C4',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  locationButtonText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: SECONDARY,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
});

// ─── Package Details Step ─────────────────────────────────────────────────────

interface PackageStepProps {
  packageSize: PackageSize;
  packageType: PackageType;
  notes: string;
  estimatedValue: string;
  onSizeChange: (v: PackageSize) => void;
  onTypeChange: (v: PackageType) => void;
  onNotesChange: (v: string) => void;
  onValueChange: (v: string) => void;
}

const SIZE_OPTIONS: { value: PackageSize; label: string; icon: string; desc: string }[] = [
  { value: PackageSize.SMALL, label: 'Pequeño', icon: '📦', desc: 'Hasta 5kg' },
  { value: PackageSize.MEDIUM, label: 'Mediano', icon: '🗃️', desc: '5-15kg' },
  { value: PackageSize.LARGE, label: 'Grande', icon: '📫', desc: '15-30kg' },
  { value: PackageSize.EXTRA_LARGE, label: 'Extra Grande', icon: '🚛', desc: '+30kg' },
];

const TYPE_OPTIONS: { value: PackageType; label: string; icon: string }[] = [
  { value: PackageType.STANDARD, label: 'Estándar', icon: '📦' },
  { value: PackageType.FRAGILE, label: 'Frágil', icon: '🥚' },
  { value: PackageType.REFRIGERATED, label: 'Refrigerado', icon: '❄️' },
  { value: PackageType.DOCUMENT, label: 'Documento', icon: '📄' },
];

function PackageStep({
  packageSize,
  packageType,
  notes,
  estimatedValue,
  onSizeChange,
  onTypeChange,
  onNotesChange,
  onValueChange,
}: PackageStepProps) {
  return (
    <View>
      <Text style={formStyles.stepTitle}>Detalles del paquete</Text>
      <Text style={formStyles.stepSubtitle}>
        Indicanos las características de tu envío
      </Text>

      {/* Package Size */}
      <Text style={pkgStyles.groupLabel}>Tamaño *</Text>
      <View style={pkgStyles.sizeGrid}>
        {SIZE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              pkgStyles.sizeCard,
              packageSize === opt.value && pkgStyles.sizeCardActive,
            ]}
            onPress={() => onSizeChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: packageSize === opt.value }}
          >
            <Text style={pkgStyles.sizeIcon}>{opt.icon}</Text>
            <Text
              style={[
                pkgStyles.sizeLabel,
                packageSize === opt.value && pkgStyles.sizeLabelActive,
              ]}
            >
              {opt.label}
            </Text>
            <Text style={pkgStyles.sizeDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Package Type */}
      <Text style={[pkgStyles.groupLabel, { marginTop: 20 }]}>Tipo *</Text>
      <View style={pkgStyles.typeRow}>
        {TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              pkgStyles.typeChip,
              packageType === opt.value && pkgStyles.typeChipActive,
            ]}
            onPress={() => onTypeChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: packageType === opt.value }}
          >
            <Text style={pkgStyles.typeIcon}>{opt.icon}</Text>
            <Text
              style={[
                pkgStyles.typeLabel,
                packageType === opt.value && pkgStyles.typeLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 20 }}>
        <Field
          label="Valor declarado (ARS)"
          value={estimatedValue}
          onChangeText={onValueChange}
          placeholder="0 (opcional)"
          keyboardType="decimal-pad"
        />
        <Field
          label="Notas para el repartidor"
          value={notes}
          onChangeText={onNotesChange}
          placeholder="Instrucciones especiales, referencias... (opcional)"
          multiline
        />
      </View>
    </View>
  );
}

const pkgStyles = StyleSheet.create({
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    padding: 12,
    alignItems: 'center',
  },
  sizeCardActive: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF3EE',
  },
  sizeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sizeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 2,
  },
  sizeLabelActive: {
    color: PRIMARY,
  },
  sizeDesc: {
    fontSize: 11,
    color: '#888888',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeChipActive: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF3EE',
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
  },
  typeLabelActive: {
    color: PRIMARY,
  },
});

// ─── Summary Step ─────────────────────────────────────────────────────────────

interface SummaryStepProps {
  pickup: AddressForm;
  delivery: AddressForm;
  packageSize: PackageSize;
  packageType: PackageType;
  notes: string;
  estimatedValue: string;
}

function SummaryStep({
  pickup,
  delivery,
  packageSize,
  packageType,
  notes,
  estimatedValue,
}: SummaryStepProps) {
  const sizeLabel =
    SIZE_OPTIONS.find((s) => s.value === packageSize)?.label ?? packageSize;
  const typeLabel =
    TYPE_OPTIONS.find((t) => t.value === packageType)?.label ?? packageType;

  return (
    <View>
      <Text style={formStyles.stepTitle}>Resumen del pedido</Text>
      <Text style={formStyles.stepSubtitle}>
        Revisá los datos antes de confirmar
      </Text>

      <SummaryCard title="Origen" icon="location" color="#10B981">
        <Text style={summaryStyles.addressText}>
          {pickup.street} {pickup.streetNumber}
          {pickup.apartment ? `, ${pickup.apartment}` : ''}
        </Text>
        <Text style={summaryStyles.addressSub}>
          {pickup.city}, {pickup.province} {pickup.postalCode}
        </Text>
      </SummaryCard>

      <SummaryCard title="Destino" icon="flag" color={PRIMARY}>
        <Text style={summaryStyles.addressText}>
          {delivery.street} {delivery.streetNumber}
          {delivery.apartment ? `, ${delivery.apartment}` : ''}
        </Text>
        <Text style={summaryStyles.addressSub}>
          {delivery.city}, {delivery.province} {delivery.postalCode}
        </Text>
      </SummaryCard>

      <SummaryCard title="Paquete" icon="cube" color="#8B5CF6">
        <View style={summaryStyles.packageRow}>
          <View style={summaryStyles.packageTag}>
            <Text style={summaryStyles.packageTagText}>{sizeLabel}</Text>
          </View>
          <View style={summaryStyles.packageTag}>
            <Text style={summaryStyles.packageTagText}>{typeLabel}</Text>
          </View>
        </View>
        {estimatedValue ? (
          <Text style={summaryStyles.addressSub}>
            Valor declarado: ${estimatedValue}
          </Text>
        ) : null}
        {notes ? (
          <Text style={summaryStyles.addressSub}>Nota: {notes}</Text>
        ) : null}
      </SummaryCard>

      <View style={summaryStyles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color="#888888" />
        <Text style={summaryStyles.disclaimerText}>
          El precio final se calculará una vez que el pedido sea confirmado y
          asignado a un repartidor.
        </Text>
      </View>
    </View>
  );
}

interface SummaryCardProps {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}

function SummaryCard({ title, icon, color, children }: SummaryCardProps) {
  return (
    <View style={summaryStyles.card}>
      <View style={[summaryStyles.cardIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as never} size={18} color={color} />
      </View>
      <View style={summaryStyles.cardBody}>
        <Text style={summaryStyles.cardTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY,
    marginBottom: 2,
  },
  addressSub: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  packageRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  packageTag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  packageTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewOrderScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [locatingDelivery, setLocatingDelivery] = useState(false);

  const [pickupForm, setPickupForm] = useState<AddressForm>({ ...emptyAddress });
  const [deliveryForm, setDeliveryForm] = useState<AddressForm>({ ...emptyAddress });
  const [packageSize, setPackageSize] = useState<PackageSize>(PackageSize.SMALL);
  const [packageType, setPackageType] = useState<PackageType>(PackageType.STANDARD);
  const [notes, setNotes] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  const { mutate: submitOrder, isPending } = useMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: (order) => {
      toast.success('¡Pedido creado!', `Código: ${order.trackingCode}`);
      router.replace('/(client)' as never);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Error al crear el pedido';
      toast.error('Error al crear el pedido', message);
    },
  });

  function updatePickup(field: keyof AddressForm, value: string) {
    setPickupForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDelivery(field: keyof AddressForm, value: string) {
    setDeliveryForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePickupProvinceChange(province: string) {
    setPickupForm((prev) => ({ ...prev, province, city: '' }));
  }

  function handleDeliveryProvinceChange(province: string) {
    setDeliveryForm((prev) => ({ ...prev, province, city: '' }));
  }

  async function useCurrentLocation(
    setter: (field: keyof AddressForm, value: string) => void,
    setLocating: (v: boolean) => void,
  ) {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permiso denegado', 'Necesitamos acceso a tu ubicación para usar esta función.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setter('lat', String(loc.coords.latitude));
      setter('lng', String(loc.coords.longitude));
    } catch {
      toast.error('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  }

  function validateStep(): boolean {
    if (step === 1) {
      const { street, streetNumber, city, province, postalCode } = pickupForm;
      if (!street || !streetNumber || !city || !province || !postalCode) {
        toast.error('Campos requeridos', 'Completá todos los campos obligatorios del domicilio de origen.');
        return false;
      }
    }
    if (step === 2) {
      const { street, streetNumber, city, province, postalCode } = deliveryForm;
      if (!street || !streetNumber || !city || !province || !postalCode) {
        toast.error('Campos requeridos', 'Completá todos los campos obligatorios del domicilio de destino.');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleSubmit() {
    const payload: CreateOrderRequest = {
      pickupAddress: addressFormToOrderAddress(pickupForm),
      deliveryAddress: addressFormToOrderAddress(deliveryForm),
      packageSize,
      packageType,
      notes: notes || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    };
    submitOrder(payload);
  }

  const stepLabels = ['Origen', 'Destino', 'Paquete', 'Resumen'];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Step indicator */}
        <View style={styles.stepHeader}>
          <StepIndicator current={step} total={TOTAL_STEPS} />
          <Text style={styles.stepLabel}>{stepLabels[step - 1]}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <AddressStep
              title="Domicilio de origen"
              subtitle="¿Desde dónde retiramos el paquete?"
              form={pickupForm}
              onChange={updatePickup}
              onProvinceChange={handlePickupProvinceChange}
              onUseCurrentLocation={() =>
                useCurrentLocation(updatePickup, setLocatingPickup)
              }
              locating={locatingPickup}
            />
          )}

          {step === 2 && (
            <AddressStep
              title="Domicilio de destino"
              subtitle="¿A dónde entregamos el paquete?"
              form={deliveryForm}
              onChange={updateDelivery}
              onProvinceChange={handleDeliveryProvinceChange}
              onUseCurrentLocation={() =>
                useCurrentLocation(updateDelivery, setLocatingDelivery)
              }
              locating={locatingDelivery}
            />
          )}

          {step === 3 && (
            <PackageStep
              packageSize={packageSize}
              packageType={packageType}
              notes={notes}
              estimatedValue={estimatedValue}
              onSizeChange={setPackageSize}
              onTypeChange={setPackageType}
              onNotesChange={setNotes}
              onValueChange={setEstimatedValue}
            />
          )}

          {step === 4 && (
            <SummaryStep
              pickup={pickupForm}
              delivery={deliveryForm}
              packageSize={packageSize}
              packageType={packageType}
              notes={notes}
              estimatedValue={estimatedValue}
            />
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navBar}>
          {step > 1 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={18} color={SECONDARY} />
              <Text style={styles.backButtonText}>Atrás</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              accessibilityRole="button"
            >
              <Text style={styles.nextButtonText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isPending}
              accessibilityRole="button"
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.nextButtonText}>Confirmar pedido</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
  stepHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
