import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  value: string;
  items: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Match the input style of the parent form */
  inputStyle?: object;
  labelStyle?: object;
}

export function SearchablePicker({
  label,
  placeholder,
  value,
  items,
  onChange,
  disabled = false,
  required = false,
  inputStyle,
  labelStyle,
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, search]);

  function handleSelect(item: string) {
    onChange(item);
    setSearch('');
    setOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, labelStyle]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled, inputStyle]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${label}`}
      >
        <Text
          style={[styles.triggerText, !value && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? '#CCCCCC' : '#888888'}
        />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity
              onPress={() => { setSearch(''); setOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={24} color={SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#888888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              placeholderTextColor="#AAAAAA"
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, item === value && styles.itemActive]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[styles.itemText, item === value && styles.itemTextActive]}
                >
                  {item}
                </Text>
                {item === value && (
                  <Ionicons name="checkmark" size={16} color={PRIMARY} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.empty}>Sin resultados para "{search}"</Text>
            }
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
  required: {
    color: '#EF4444',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  triggerDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E8E8E8',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: SECONDARY,
    marginRight: 8,
  },
  triggerPlaceholder: {
    color: '#AAAAAA',
  },
  modal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SECONDARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: SECONDARY,
    paddingVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemActive: {
    backgroundColor: '#FFF3EE',
  },
  itemText: {
    fontSize: 15,
    color: SECONDARY,
    flex: 1,
  },
  itemTextActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
    marginLeft: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 14,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
