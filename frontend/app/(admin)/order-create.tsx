import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createOrder } from '@/src/api/orders';
import { getZones } from '@/src/api/zones';
import { errorAlert, successAlert } from '@/src/lib/alerts';
import { SearchablePicker } from '@/src/components/SearchablePicker';
import {
  getCitiesForProvince,
  getProvinceByName,
  provinces,
} from '@/src/data/argentina';
import { PackageSize, PackageType, type CreateOrderRequest, type OrderAddress } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

const PACKAGE_SIZES = Object.values(PackageSize);
const PACKAGE_TYPES = Object.values(PackageType);

// Default BA coordinates for empty addresses
const DEFAULT_LAT = -34.6037;
const DEFAULT_LNG = -58.3816;

function emptyAddress(): OrderAddress {
  return { street: '', streetNumber: '', apartment: null, city: 'Buenos Aires', province: 'CABA', postalCode: '', lat: DEFAULT_LAT, lng: DEFAULT_LNG, contactName: null, contactPhone: null };
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AAA"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

function OptionPicker<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label} <Text style={{ color: '#EF4444' }}>*</Text></Text>
      <View style={styles.optionsRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionChip, selected === opt && styles.optionChipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.optionChipText, selected === opt && styles.optionChipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function AddressForm({
  title,
  address,
  onChange,
}: {
  title: string;
  address: OrderAddress;
  onChange: (a: OrderAddress) => void;
}) {
  function set(key: keyof OrderAddress, value: string) {
    onChange({ ...address, [key]: value });
  }

  const provinceNames = provinces.map((p) => p.nombre);
  const selectedProvince = getProvinceByName(address.province);
  const cityOptions = selectedProvince
    ? getCitiesForProvince(selectedProvince.id)
    : [];

  function handleProvinceChange(province: string) {
    onChange({ ...address, province, city: '' });
  }

  const adminInputStyle = {
    fontSize: 15,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  };
  const adminLabelStyle = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#999',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.row2}>
        <View style={{ flex: 2 }}>
          <Field label="Calle" value={address.street} onChangeText={(v) => set('street', v)} placeholder="Corrientes" required />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Número" value={address.streetNumber} onChangeText={(v) => set('streetNumber', v)} placeholder="1234" keyboardType="numeric" required />
        </View>
      </View>
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Field label="Dpto" value={address.apartment ?? ''} onChangeText={(v) => set('apartment', v)} placeholder="3B" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="CP" value={address.postalCode} onChangeText={(v) => set('postalCode', v)} placeholder="1043" keyboardType="numeric" />
        </View>
      </View>
      <SearchablePicker
        label="Provincia"
        placeholder="Seleccionar provincia"
        value={address.province}
        items={provinceNames}
        onChange={handleProvinceChange}
        required
        inputStyle={adminInputStyle}
        labelStyle={adminLabelStyle}
      />
      <SearchablePicker
        label="Ciudad"
        placeholder={address.province ? 'Seleccionar ciudad' : 'Primero seleccioná una provincia'}
        value={address.city}
        items={cityOptions}
        onChange={(v) => set('city', v)}
        disabled={!address.province}
        required
        inputStyle={adminInputStyle}
        labelStyle={adminLabelStyle}
      />
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Field label="Lat" value={String(address.lat)} onChangeText={(v) => onChange({ ...address, lat: parseFloat(v) || DEFAULT_LAT })} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Lng" value={String(address.lng)} onChangeText={(v) => onChange({ ...address, lng: parseFloat(v) || DEFAULT_LNG })} keyboardType="decimal-pad" />
        </View>
      </View>
      <Field label="Contacto" value={address.contactName ?? ''} onChangeText={(v) => set('contactName', v)} placeholder="Nombre del contacto" />
      <Field label="Teléfono contacto" value={address.contactPhone ?? ''} onChangeText={(v) => set('contactPhone', v)} placeholder="+54 11 xxxx-xxxx" keyboardType="phone-pad" />
    </View>
  );
}

export default function OrderCreateScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [pickup, setPickup] = useState<OrderAddress>(emptyAddress());
  const [delivery, setDelivery] = useState<OrderAddress>(emptyAddress());
  const [packageSize, setPackageSize] = useState<PackageSize>(PackageSize.SMALL);
  const [packageType, setPackageType] = useState<PackageType>(PackageType.STANDARD);
  const [notes, setNotes] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      successAlert(
        'Pedido creado',
        `Código: ${order.trackingCode}`,
        () => router.replace({ pathname: '/(admin)/order-detail', params: { id: order.id } } as never),
      );
    },
    onError: () => errorAlert('Error', 'No se pudo crear el pedido. Verificá los datos.'),
  });

  function handleSubmit() {
    if (!pickup.street || !pickup.streetNumber || !pickup.city) {
      errorAlert('Datos incompletos', 'Completá la dirección de origen.');
      return;
    }
    if (!delivery.street || !delivery.streetNumber || !delivery.city) {
      errorAlert('Datos incompletos', 'Completá la dirección de destino.');
      return;
    }
    createMutation.mutate({
      pickupAddress: pickup,
      deliveryAddress: delivery,
      packageSize,
      packageType,
      notes: notes.trim() || undefined,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AddressForm title="Dirección de Origen" address={pickup} onChange={setPickup} />
        <AddressForm title="Dirección de Destino" address={delivery} onChange={setDelivery} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paquete</Text>
          <OptionPicker label="Tamaño" options={PACKAGE_SIZES} selected={packageSize} onSelect={setPackageSize} />
          <OptionPicker label="Tipo" options={PACKAGE_TYPES} selected={packageType} onSelect={setPackageType} />
          <Field label="Valor declarado (ARS)" value={estimatedValue} onChangeText={setEstimatedValue} placeholder="0" keyboardType="decimal-pad" />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notas</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Instrucciones de entrega..."
              placeholderTextColor="#AAA"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Crear pedido</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: SECONDARY },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, elevation: 2, shadowColor: SECONDARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  row2: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: { fontSize: 15, color: SECONDARY, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9F9F9' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  optionChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  optionChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  optionChipTextActive: { color: '#FFF' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
