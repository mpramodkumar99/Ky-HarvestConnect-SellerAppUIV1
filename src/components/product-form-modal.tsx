import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  Switch, StyleSheet, ActivityIndicator,
} from 'react-native';

import {
  CatalogProduct, CreateProductInput, Category, SubCategory, ProductStatus,
  CATEGORIES, SUB_CATEGORIES_BY_CATEGORY, SHIPS_TO_OPTIONS, COMMON_UNITS,
  createProduct, updateProduct,
} from '@/services/catalog-api';
import { useStore } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';

const MAX_IMAGES = 5;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (product: CatalogProduct) => void;
  editProduct?: CatalogProduct;
}

interface FormState {
  name: string;
  description: string;
  category: Category;
  subCategory: SubCategory;
  priceRupees: string;
  stockQuantity: string;
  unit: string;
  shipsTo: 'mandal' | 'district' | 'state' | 'national';
  isHandmade: boolean;
  images: string[];
  status: 'active' | 'draft';
}

const defaultForm = (): FormState => ({
  name: '',
  description: '',
  category: 'farm_products',
  subCategory: 'grains_staples',
  priceRupees: '',
  stockQuantity: '',
  unit: 'kg',
  shipsTo: 'district',
  isHandmade: false,
  images: [],
  status: 'active',
});

function formFromProduct(p: CatalogProduct): FormState {
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    subCategory: p.subCategory,
    priceRupees: String(Math.round(p.price / 100)),
    stockQuantity: String(p.stockQuantity),
    unit: p.unit,
    shipsTo: p.shipsTo,
    isHandmade: p.isHandmade,
    images: p.images ?? [],
    status: p.status === 'archived' ? 'draft' : p.status,
  };
}

export function ProductFormModal({ visible, onClose, onSaved, editProduct }: Props) {
  const { activeStore } = useStore();
  const { showToast } = useToast();
  const isEdit = !!editProduct;

  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    if (visible) {
      setForm(isEdit && editProduct ? formFromProduct(editProduct) : defaultForm());
      setError(null);
      setNewImageUrl('');
    }
  }, [visible, editProduct]);

  function setCategory(cat: Category) {
    const firstSub = SUB_CATEGORIES_BY_CATEGORY[cat][0].value;
    setForm((f) => ({ ...f, category: cat, subCategory: firstSub }));
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addImage() {
    const url = newImageUrl.trim();
    if (!url) return;
    if (form.images.length >= MAX_IMAGES) {
      showToast(`You can add up to ${MAX_IMAGES} images.`, 'warning');
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setNewImageUrl('');
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    const priceRupees = parseFloat(form.priceRupees);
    const stockQty = parseInt(form.stockQuantity, 10);

    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (isNaN(priceRupees) || priceRupees <= 0) { setError('Enter a valid price in ₹.'); return; }
    if (isNaN(stockQty) || stockQty < 0) { setError('Enter a valid stock quantity (0 or more).'); return; }

    setSaving(true);
    setError(null);

    const input: CreateProductInput = {
      name:          form.name.trim(),
      description:   form.description.trim(),
      category:      form.category,
      subCategory:   form.subCategory,
      price:         Math.round(priceRupees * 100),
      unit:          form.unit.trim() || 'piece',
      stockQuantity: stockQty,
      sellerId:      activeStore.id,
      sellerName:    activeStore.name,
      location:      activeStore.location,
      isHandmade:    form.isHandmade,
      shipsTo:       form.shipsTo,
      images:        form.images,
      status:        form.status,
      rating:        editProduct?.rating ?? 0,
      reviewCount:   editProduct?.reviewCount ?? 0,
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
      {/*
        CORRECT bottom-sheet pattern:
        - container: flex:1 + justifyContent:'flex-end' → pushes sheet to bottom
        - backdrop: absoluteFill (out of flex flow, so it doesn't consume height)
        - sheet: normal flex child → lands at bottom
      */}
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />

        <View style={s.sheet}>
          {/* Header */}
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{isEdit ? 'Edit Product' : 'Add New Product'}</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={s.scrollArea}
            contentContainerStyle={s.formContent}
            keyboardShouldPersistTaps="handled">

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

            {/* Price + Stock Quantity row */}
            <View style={s.twoColRow}>
              <View style={[s.field, { flex: 1 }]}>
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

              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Stock Qty <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 50"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={form.stockQuantity}
                  onChangeText={(v) => setField('stockQuantity', v.replace(/[^0-9]/g, ''))}
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

            {/* Images */}
            <View style={s.field}>
              <Text style={s.label}>Product Images ({form.images.length}/{MAX_IMAGES})</Text>
              {form.images.map((url, idx) => (
                <View key={idx} style={s.imageRow}>
                  <Text style={s.imageUrl} numberOfLines={1}>{url}</Text>
                  <Pressable style={s.imageRemoveBtn} onPress={() => removeImage(idx)}>
                    <Text style={s.imageRemoveTxt}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {form.images.length < MAX_IMAGES && (
                <View style={s.imageAddRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Paste image URL..."
                    placeholderTextColor="#9ca3af"
                    value={newImageUrl}
                    onChangeText={setNewImageUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <Pressable style={s.imageAddBtn} onPress={addImage}>
                    <Text style={s.imageAddTxt}>Add</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Toggles */}
            <View style={s.toggleRow}>
              {/* Status: Active vs Draft */}
              <View style={s.toggleItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Listing Status</Text>
                  <Text style={s.toggleSub}>
                    {form.status === 'active' ? 'Active — visible to buyers' : 'Draft — hidden from buyers'}
                  </Text>
                </View>
                <View style={s.statusToggleWrap}>
                  <Pressable
                    style={[s.statusPill, form.status === 'draft' && s.statusPillActive]}
                    onPress={() => setField('status', 'draft')}>
                    <Text style={[s.statusPillTxt, form.status === 'draft' && s.statusPillTxtActive]}>Draft</Text>
                  </Pressable>
                  <Pressable
                    style={[s.statusPill, form.status === 'active' && s.statusPillActiveGreen]}
                    onPress={() => setField('status', 'active')}>
                    <Text style={[s.statusPillTxt, form.status === 'active' && s.statusPillTxtActive]}>Active</Text>
                  </Pressable>
                </View>
              </View>

              {/* Handmade toggle */}
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
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Correct bottom-sheet layout:
  // flex:1 container + justifyContent:'flex-end' pushes sheet to the bottom.
  // Backdrop is absoluteFill (not a flex child) so it doesn't consume height.
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollArea: {
    maxHeight: 520,
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

  errorBox: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12 },
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

  twoColRow: { flexDirection: 'row', gap: 12 },

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
  priceInput: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },

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

  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  imageUrl: { flex: 1, fontSize: 11, color: '#374151' },
  imageRemoveBtn: {
    width: 24, height: 24,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveTxt: { fontSize: 10, color: '#dc2626', fontWeight: '700' },
  imageAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  imageAddBtn: {
    backgroundColor: '#2d7a47',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageAddTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

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

  statusToggleWrap: { flexDirection: 'row', gap: 6 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusPillActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  statusPillActiveGreen: { backgroundColor: '#2d7a47', borderColor: '#2d7a47' },
  statusPillTxt: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  statusPillTxtActive: { color: '#fff' },

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
