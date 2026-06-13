import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  Switch, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CatalogProduct, CreateProductInput, Category, SubCategory,
  CATEGORIES, SUB_CATEGORIES_BY_CATEGORY, SHIPS_TO_OPTIONS, COMMON_UNITS,
  createProduct, updateProduct,
} from '@/services/catalog-api';
import { useStore } from '@/context/store-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (product: CatalogProduct) => void;
  editProduct?: CatalogProduct; // if provided → edit mode
}

interface FormState {
  name: string;
  description: string;
  category: Category;
  subCategory: SubCategory;
  priceRupees: string;  // user types rupees, we convert to paise
  unit: string;
  shipsTo: 'mandal' | 'district' | 'state' | 'national';
  inStock: boolean;
  isHandmade: boolean;
}

const defaultForm = (): FormState => ({
  name: '',
  description: '',
  category: 'farm_products',
  subCategory: 'grains_staples',
  priceRupees: '',
  unit: 'kg',
  shipsTo: 'district',
  inStock: true,
  isHandmade: false,
});

function formFromProduct(p: CatalogProduct): FormState {
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    subCategory: p.subCategory,
    priceRupees: String(Math.round(p.price / 100)),
    unit: p.unit,
    shipsTo: p.shipsTo,
    inStock: p.inStock,
    isHandmade: p.isHandmade,
  };
}

export function ProductFormModal({ visible, onClose, onSaved, editProduct }: Props) {
  const { activeStore } = useStore();
  const isEdit = !!editProduct;

  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(isEdit && editProduct ? formFromProduct(editProduct) : defaultForm());
      setError(null);
    }
  }, [visible, editProduct]);

  // When category changes, auto-select first valid subcategory
  function setCategory(cat: Category) {
    const firstSub = SUB_CATEGORIES_BY_CATEGORY[cat][0].value;
    setForm((f) => ({ ...f, category: cat, subCategory: firstSub }));
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const priceRupees = parseFloat(form.priceRupees);
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (isNaN(priceRupees) || priceRupees <= 0) { setError('Enter a valid price in ₹.'); return; }

    setSaving(true);
    setError(null);

    const input: CreateProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      subCategory: form.subCategory,
      price: Math.round(priceRupees * 100), // ₹ → paise
      unit: form.unit.trim() || 'piece',
      sellerId: activeStore.id,
      sellerName: activeStore.name,
      location: activeStore.location,
      inStock: form.inStock,
      isHandmade: form.isHandmade,
      shipsTo: form.shipsTo,
      rating: 0,
      reviewCount: 0,
    };

    try {
      const saved = isEdit && editProduct
        ? await updateProduct(editProduct.id, input, activeStore.id)
        : await createProduct(input);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save product. Is the Catalog service running?');
    } finally {
      setSaving(false);
    }
  }

  const subCats = SUB_CATEGORIES_BY_CATEGORY[form.category];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{isEdit ? 'Edit Product' : 'Add New Product'}</Text>
              <Pressable style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.formContent}
              keyboardShouldPersistTaps="handled">

              {/* Error */}
              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorTxt}>⚠️ {error}</Text>
                </View>
              )}

              {/* Store context pill */}
              <View style={s.storePill}>
                <Text style={s.storePillTxt}>
                  {activeStore.icon} Listing under {activeStore.name}
                </Text>
              </View>

              {/* Product Name */}
              <View style={s.field}>
                <Text style={s.label}>Product Name <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Organic Turmeric Powder"
                  placeholderTextColor="#9ca3af"
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  maxLength={120}
                />
              </View>

              {/* Description */}
              <View style={s.field}>
                <Text style={s.label}>Description</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder="Tell buyers what makes this product special — origin, process, quality..."
                  placeholderTextColor="#9ca3af"
                  value={form.description}
                  onChangeText={(v) => setField('description', v)}
                  maxLength={1000}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Category */}
              <View style={s.field}>
                <Text style={s.label}>Category <Text style={s.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c.value}
                      style={[s.chip, form.category === c.value && s.chipActive]}
                      onPress={() => setCategory(c.value)}>
                      <Text style={[s.chipTxt, form.category === c.value && s.chipTxtActive]}>
                        {c.icon} {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* SubCategory */}
              <View style={s.field}>
                <Text style={s.label}>Sub-Category <Text style={s.required}>*</Text></Text>
                <View style={s.subCatGrid}>
                  {subCats.map((sc) => (
                    <Pressable
                      key={sc.value}
                      style={[s.subCatChip, form.subCategory === sc.value && s.chipActive]}
                      onPress={() => setField('subCategory', sc.value as SubCategory)}>
                      <Text style={[s.chipTxt, form.subCategory === sc.value && s.chipTxtActive]}>
                        {sc.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Price */}
              <View style={s.field}>
                <Text style={s.label}>Price (₹) <Text style={s.required}>*</Text></Text>
                <View style={s.priceRow}>
                  <View style={s.pricePrefix}>
                    <Text style={s.prefixTxt}>₹</Text>
                  </View>
                  <TextInput
                    style={[s.input, s.priceInput]}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={form.priceRupees}
                    onChangeText={(v) => setField('priceRupees', v.replace(/[^0-9.]/g, ''))}
                  />
                </View>
              </View>

              {/* Unit */}
              <View style={s.field}>
                <Text style={s.label}>Unit <Text style={s.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {COMMON_UNITS.map((u) => (
                    <Pressable
                      key={u}
                      style={[s.chip, form.unit === u && s.chipActive]}
                      onPress={() => setField('unit', u)}>
                      <Text style={[s.chipTxt, form.unit === u && s.chipTxtActive]}>{u}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <TextInput
                  style={[s.input, { marginTop: 8 }]}
                  placeholder="Or type custom unit..."
                  placeholderTextColor="#9ca3af"
                  value={form.unit}
                  onChangeText={(v) => setField('unit', v)}
                  maxLength={30}
                />
              </View>

              {/* Ships To */}
              <View style={s.field}>
                <Text style={s.label}>Delivery Scope <Text style={s.required}>*</Text></Text>
                <View style={s.shipsRow}>
                  {SHIPS_TO_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[s.shipsChip, form.shipsTo === opt.value && s.chipActive]}
                      onPress={() => setField('shipsTo', opt.value)}>
                      <Text style={[s.chipTxt, form.shipsTo === opt.value && s.chipTxtActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Toggles */}
              <View style={s.toggleRow}>
                <View style={s.toggleItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleLabel}>In Stock</Text>
                    <Text style={s.toggleSub}>Available for orders right now</Text>
                  </View>
                  <Switch
                    value={form.inStock}
                    onValueChange={(v) => setField('inStock', v)}
                    trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                    thumbColor={form.inStock ? '#2d7a47' : '#9ca3af'}
                  />
                </View>
                <View style={[s.toggleItem, { borderTopWidth: 1, borderTopColor: '#f3f4f6' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleLabel}>Handmade / Artisan</Text>
                    <Text style={s.toggleSub}>Made by hand or local craft</Text>
                  </View>
                  <Switch
                    value={form.isHandmade}
                    onValueChange={(v) => setField('isHandmade', v)}
                    trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                    thumbColor={form.isHandmade ? '#2d7a47' : '#9ca3af'}
                  />
                </View>
              </View>

            </ScrollView>

            {/* Save Button */}
            <View style={s.footer}>
              <Pressable
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveTxt}>{isEdit ? '💾 Save Changes' : '＋ Add Product'}</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '93%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '600' },

  formContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },

  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
  },
  errorTxt: { fontSize: 13, color: '#991b1b', lineHeight: 18 },

  storePill: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  storePillTxt: { fontSize: 12, color: '#166534', fontWeight: '600' },

  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  required: { color: '#dc2626' },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
  },

  textArea: { height: 80, paddingTop: 10 },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  pricePrefix: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    justifyContent: 'center',
  },
  prefixTxt: { fontSize: 16, fontWeight: '700', color: '#374151' },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  chips: { gap: 8 },
  chip: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#2d7a47', borderColor: '#2d7a47' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTxtActive: { color: '#fff' },

  subCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subCatChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  shipsRow: { flexDirection: 'row', gap: 8 },
  shipsChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  toggleRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  toggleItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  toggleSub: { fontSize: 11, color: '#6b7280', marginTop: 1 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  saveBtn: {
    backgroundColor: '#2d7a47',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#86efac' },
  saveTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
