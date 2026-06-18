import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView,
  Switch, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';

import {
  CatalogProduct, CreateProductInput, Category, SubCategory,
  CATEGORIES, SUB_CATEGORIES_BY_CATEGORY, CATEGORIES_BY_SELLER_TYPE,
  SHIPS_TO_OPTIONS, COMMON_UNITS, LOW_STOCK_THRESHOLD,
  createProduct, updateProduct,
} from '@/services/catalog-api';
import type { SellerType, ShipsTo } from '@/services/user-api';
import { lookupPincode, type PincodeInfo } from '@/utils/pincode';
import { DELIVERY_ZONE_CONFIG } from '@/context/store-context';
import { useStore } from '@/context/store-context';
import { useToast } from '@/components/toast-provider';
import { useLanguage } from '@/context/language-context';
import { ImagePickerSheet } from '@/components/image-picker-sheet';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

const MAX_IMAGES = 5;

interface Props {
  visible: boolean;
  storeType: SellerType;
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
  originalPriceRupees: string;
  stockQuantity: string;
  lowStockThreshold: string;
  unit: string;
  shipsTo: 'mandal' | 'district' | 'state' | 'national';
  isHandmade: boolean;
  minimumOrderQty: string;
  customArea: boolean;
  images: string[];
  status: 'active' | 'draft';
}

const defaultForm = (): FormState => ({
  name: '',
  description: '',
  category: 'farm_products',
  subCategory: 'grains_staples',
  priceRupees: '',
  originalPriceRupees: '',
  stockQuantity: '',
  lowStockThreshold: String(LOW_STOCK_THRESHOLD),
  unit: 'kg',
  shipsTo: 'district',
  isHandmade: false,
  minimumOrderQty: '',
  customArea: false,
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
    originalPriceRupees: p.originalPrice ? String(Math.round(p.originalPrice / 100)) : '',
    stockQuantity: String(p.stockQuantity),
    lowStockThreshold: String(p.lowStockThreshold ?? LOW_STOCK_THRESHOLD),
    unit: p.unit,
    shipsTo: p.shipsTo,
    isHandmade: p.isHandmade,
    minimumOrderQty: p.minimumOrderQty ? String(p.minimumOrderQty) : '',
    customArea: false,
    images: p.images ?? [],
    status: p.status === 'archived' ? 'draft' : p.status,
  };
}

function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

export function ProductFormModal({ visible, storeType, onClose, onSaved, editProduct }: Props) {
  const { activeStore } = useStore();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const isEdit = !!editProduct;

  const allowedCategories = CATEGORIES.filter(c =>
    (CATEGORIES_BY_SELLER_TYPE[storeType] ?? CATEGORIES.map(c => c.value)).includes(c.value)
  );
  const isWholesale = storeType === 'kirana' && activeStore.businessType === 'wholesale';

  const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null);
  useEffect(() => {
    if (activeStore.pincode) lookupPincode(activeStore.pincode).then(setPincodeInfo);
  }, [activeStore.pincode]);

  function shipsToLabel(zone: ShipsTo): string {
    if (pincodeInfo) {
      if (zone === 'mandal')   return `${pincodeInfo.name} Area Wide`;
      if (zone === 'district') return `${pincodeInfo.district} District Wide`;
      if (zone === 'state')    return `${pincodeInfo.state} State Wide`;
    }
    return DELIVERY_ZONE_CONFIG[zone].label;
  }

  const hasCustomZone = !!activeStore.customDeliveryZone;

  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isEdit && editProduct) {
        setForm(formFromProduct(editProduct));
      } else {
        const firstCat = allowedCategories[0]?.value ?? 'farm_products';
        const firstSub = SUB_CATEGORIES_BY_CATEGORY[firstCat][0].value;
        setForm({ ...defaultForm(), category: firstCat, subCategory: firstSub });
      }
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

  function addImageUrl() {
    const url = newImageUrl.trim();
    if (!url) return;
    if (form.images.length >= MAX_IMAGES) {
      showToast(t('product_form_img_limit'), 'warning');
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setNewImageUrl('');
  }

  function addImageUri(uri: string) {
    if (form.images.length >= MAX_IMAGES) {
      showToast(t('product_form_img_limit'), 'warning');
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, uri] }));
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    const priceRupees = parseFloat(form.priceRupees);
    const stockQty = parseInt(form.stockQuantity, 10);
    const threshold = parseInt(form.lowStockThreshold, 10);
    const origPriceRupees = form.originalPriceRupees.trim()
      ? parseFloat(form.originalPriceRupees)
      : undefined;

    if (!form.name.trim())                  { setError(t('product_form_err_name')); return; }
    if (isNaN(priceRupees) || priceRupees <= 0) { setError(t('product_form_err_price')); return; }
    if (isNaN(stockQty)    || stockQty < 0) { setError(t('product_form_err_stock')); return; }

    setSaving(true);
    setError(null);

    const input: CreateProductInput = {
      name:               form.name.trim(),
      description:        form.description.trim(),
      category:           form.category,
      subCategory:        form.subCategory,
      price:              Math.round(priceRupees * 100),
      originalPrice:      origPriceRupees !== undefined ? Math.round(origPriceRupees * 100) : undefined,
      unit:               form.unit.trim() || 'piece',
      stockQuantity:      stockQty,
      sellerId:           activeStore.id,
      sellerName:         activeStore.name,
      location:           activeStore.location,
      isHandmade:         form.isHandmade,
      shipsTo:            form.customArea
        ? (activeStore.customDeliveryZone?.mandals?.length   ? 'mandal'
          : activeStore.customDeliveryZone?.districts?.length ? 'district'
          : activeStore.customDeliveryZone?.states?.length    ? 'state'
          : 'district')
        : form.shipsTo,
      images:             form.images,
      status:             form.status,
      rating:             editProduct?.rating ?? 0,
      reviewCount:        editProduct?.reviewCount ?? 0,
      lowStockThreshold:  isNaN(threshold) || threshold < 0 ? LOW_STOCK_THRESHOLD : threshold,
      ...(isWholesale && form.minimumOrderQty
        ? { minimumOrderQty: parseInt(form.minimumOrderQty, 10) || 1 }
        : {}),
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
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}>
        <View style={s.container}>
          <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />

          <View style={s.sheet}>
            {/* Header */}
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>
                {isEdit ? t('product_form_edit_title') : t('product_form_add_title')}
              </Text>
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
                  {activeStore.icon} {t('product_form_listing_under')} {activeStore.name}
                </Text>
              </View>

              {/* Product Name */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_name')} <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  placeholder={t('product_form_name_ph')}
                  placeholderTextColor={c.textFaint}
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                  maxLength={120}
                />
              </View>

              {/* Description */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_desc')}</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  placeholder={t('product_form_desc_ph')}
                  placeholderTextColor={c.textFaint}
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
                <Text style={s.label}>{t('product_form_category')} <Text style={s.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                  {allowedCategories.map((cat) => (
                    <Pressable
                      key={cat.value}
                      style={[s.chip, form.category === cat.value && s.chipActive]}
                      onPress={() => setCategory(cat.value)}>
                      <Text style={[s.chipTxt, form.category === cat.value && s.chipTxtActive]}>
                        {cat.icon} {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* SubCategory */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_subcategory')} <Text style={s.required}>*</Text></Text>
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

              {/* Price + Stock row */}
              <View style={s.twoColRow}>
                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>{t('product_form_price')} <Text style={s.required}>*</Text></Text>
                  <View style={s.priceRow}>
                    <View style={s.pricePrefix}>
                      <Text style={s.prefixTxt}>₹</Text>
                    </View>
                    <TextInput
                      style={[s.input, s.priceInput]}
                      placeholder="0"
                      placeholderTextColor={c.textFaint}
                      keyboardType="numeric"
                      value={form.priceRupees}
                      onChangeText={(v) => setField('priceRupees', v.replace(/[^0-9.]/g, ''))}
                    />
                  </View>
                </View>

                <View style={[s.field, { flex: 1 }]}>
                  <Text style={s.label}>{t('product_form_stock')} <Text style={s.required}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 50"
                    placeholderTextColor={c.textFaint}
                    keyboardType="numeric"
                    value={form.stockQuantity}
                    onChangeText={(v) => setField('stockQuantity', v.replace(/[^0-9]/g, ''))}
                  />
                </View>
              </View>

              {/* Original / MRP Price */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_orig_price')}</Text>
                <Text style={s.fieldHint}>{t('product_form_orig_price_hint')}</Text>
                <View style={s.priceRow}>
                  <View style={s.pricePrefix}>
                    <Text style={s.prefixTxt}>₹</Text>
                  </View>
                  <TextInput
                    style={[s.input, s.priceInput]}
                    placeholder="0"
                    placeholderTextColor={c.textFaint}
                    keyboardType="numeric"
                    value={form.originalPriceRupees}
                    onChangeText={(v) => setField('originalPriceRupees', v.replace(/[^0-9.]/g, ''))}
                  />
                </View>
              </View>

              {/* Low stock threshold */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_threshold')}</Text>
                <Text style={s.fieldHint}>{t('product_form_threshold_hint')}</Text>
                <View style={s.thresholdRow}>
                  <TextInput
                    style={[s.input, s.thresholdInput]}
                    placeholder={String(LOW_STOCK_THRESHOLD)}
                    placeholderTextColor={c.textFaint}
                    keyboardType="numeric"
                    value={form.lowStockThreshold}
                    onChangeText={(v) => setField('lowStockThreshold', v.replace(/[^0-9]/g, ''))}
                  />
                  <Text style={s.thresholdSuffix}>{t('product_form_threshold_unit')}</Text>
                </View>
              </View>

              {/* Minimum Order Quantity — wholesale kirana only */}
              {isWholesale && (
                <View style={s.field}>
                  <Text style={s.label}>{t('product_form_moq_label')}</Text>
                  <Text style={s.fieldHint}>Buyers must order at least this many units</Text>
                  <View style={s.thresholdRow}>
                    <TextInput
                      style={[s.input, s.thresholdInput]}
                      placeholder="e.g. 25"
                      placeholderTextColor={c.textFaint}
                      keyboardType="numeric"
                      value={form.minimumOrderQty}
                      onChangeText={(v) => setField('minimumOrderQty', v.replace(/[^0-9]/g, ''))}
                    />
                    <Text style={s.thresholdSuffix}>units</Text>
                  </View>
                </View>
              )}

              {/* Unit */}
              <View style={s.field}>
                <Text style={s.label}>{t('product_form_unit')} <Text style={s.required}>*</Text></Text>
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
                  placeholder={t('product_form_unit_ph')}
                  placeholderTextColor={c.textFaint}
                  value={form.unit}
                  onChangeText={(v) => setField('unit', v)}
                  maxLength={30}
                />
              </View>

              {/* Ships To */}
              <View style={s.field}>
                <View style={s.fieldHeaderRow}>
                  <Text style={s.label}>{t('product_form_delivery')} <Text style={s.required}>*</Text></Text>
                  {hasCustomZone && (
                    <Pressable
                      style={[s.customAreaBtn, form.customArea && s.customAreaBtnActive]}
                      onPress={() => setField('customArea', !form.customArea)}>
                      <Text style={[s.customAreaBtnTxt, form.customArea && s.customAreaBtnTxtActive]}>
                        {t('product_form_custom_area')}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {form.customArea ? (
                  <View style={s.customAreaNote}>
                    <Text style={s.customAreaNoteTitle}>{t('product_form_custom_area_title')}</Text>
                    <Text style={s.customAreaNoteDesc}>{t('product_form_custom_area_desc')}</Text>
                  </View>
                ) : (
                  <View style={s.shipsRow}>
                    {SHIPS_TO_OPTIONS.map((opt) => {
                      const order: ShipsTo[] = ['mandal', 'district', 'state', 'national'];
                      const implied = order.indexOf(opt.value as ShipsTo) <= order.indexOf(form.shipsTo);
                      return (
                        <Pressable
                          key={opt.value}
                          style={[s.shipsChip, implied && s.chipActive]}
                          onPress={() => setField('shipsTo', opt.value as ShipsTo)}>
                          <Text style={[s.chipTxt, implied && s.chipTxtActive]}>
                            {shipsToLabel(opt.value as ShipsTo)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Images */}
              <View style={s.field}>
                <Text style={s.label}>
                  {t('product_form_images')} ({form.images.length}/{MAX_IMAGES})
                </Text>

                {/* Thumbnail grid */}
                {form.images.length > 0 && (
                  <View style={s.thumbGrid}>
                    {form.images.map((uri, idx) => (
                      <View key={idx} style={s.thumbWrap}>
                        <Image
                          source={{ uri }}
                          style={s.thumb}
                          contentFit="cover"
                        />
                        {isLocalUri(uri) && (
                          <View style={s.localBadge}>
                            <Text style={s.localBadgeTxt}>local</Text>
                          </View>
                        )}
                        <Pressable style={s.thumbRemove} onPress={() => removeImage(idx)}>
                          <Text style={s.thumbRemoveTxt}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add image actions */}
                {form.images.length < MAX_IMAGES && (
                  <View style={s.imageActions}>
                    <Pressable style={s.pickBtn} onPress={() => setPickerOpen(true)}>
                      <Text style={s.pickBtnTxt}>{t('product_form_pick_device')}</Text>
                    </Pressable>
                    <View style={s.imageAddRow}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder={t('product_form_paste_url')}
                        placeholderTextColor={c.textFaint}
                        value={newImageUrl}
                        onChangeText={setNewImageUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                      <Pressable style={s.imageAddBtn} onPress={addImageUrl}>
                        <Text style={s.imageAddTxt}>{t('product_form_add_url')}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              {/* Toggles */}
              <View style={s.toggleRow}>
                {/* Status */}
                <View style={s.toggleItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleLabel}>{t('product_form_status')}</Text>
                    <Text style={s.toggleSub}>
                      {form.status === 'active'
                        ? t('product_form_status_active_desc')
                        : t('product_form_status_draft_desc')}
                    </Text>
                  </View>
                  <View style={s.statusToggleWrap}>
                    <Pressable
                      style={[s.statusPill, form.status === 'draft' && s.statusPillActive]}
                      onPress={() => setField('status', 'draft')}>
                      <Text style={[s.statusPillTxt, form.status === 'draft' && s.statusPillTxtActive]}>
                        {t('product_form_draft')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.statusPill, form.status === 'active' && s.statusPillActiveGreen]}
                      onPress={() => setField('status', 'active')}>
                      <Text style={[s.statusPillTxt, form.status === 'active' && s.statusPillTxtActive]}>
                        {t('product_form_active')}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Handmade toggle */}
                <View style={[s.toggleItem, { borderTopWidth: 1, borderTopColor: c.borderLight }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleLabel}>{t('product_form_handmade')}</Text>
                    <Text style={s.toggleSub}>{t('product_form_handmade_sub')}</Text>
                  </View>
                  <Switch
                    value={form.isHandmade}
                    onValueChange={(v) => setField('isHandmade', v)}
                    trackColor={{ false: c.border, true: '#86efac' }}
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
                  <Text style={s.saveTxt}>
                    {isEdit ? t('product_form_save') : t('product_form_add_btn')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ImagePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addImageUri}
      />
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    scrollArea: { maxHeight: 540 },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '600' },

    formContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },

    errorBox: { backgroundColor: c.errorBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.errorBorder },
    errorTxt: { fontSize: 13, color: c.errorTextDark, lineHeight: 18 },

    storePill: {
      backgroundColor: c.primaryBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.primaryBorder,
    },
    storePillTxt: { fontSize: 12, color: c.primaryText, fontWeight: '600' },

    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: '700', color: c.textSub },
    required: { color: '#dc2626' },
    fieldHint: { fontSize: 11, color: c.textFaint, marginTop: -4 },

    input: {
      borderWidth: 1,
      borderColor: c.borderMid,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bgScreen,
    },
    textArea: { height: 80, paddingTop: 10 },

    twoColRow: { flexDirection: 'row', gap: 12 },

    thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    thresholdInput: { width: 100 },
    thresholdSuffix: { fontSize: 13, color: c.textMuted },

    priceRow: { flexDirection: 'row', alignItems: 'center' },
    pricePrefix: {
      height: 44,
      paddingHorizontal: 14,
      backgroundColor: c.bgSubtle,
      borderWidth: 1,
      borderColor: c.borderMid,
      borderRightWidth: 0,
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
      justifyContent: 'center',
    },
    prefixTxt: { fontSize: 16, fontWeight: '700', color: c.textSub },
    priceInput: { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },

    chips: { gap: 8 },
    chip: {
      borderRadius: 99,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: c.bgSubtle,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: '#2d7a47', borderColor: '#2d7a47' },
    chipTxt: { fontSize: 12, fontWeight: '600', color: c.textSub },
    chipTxtActive: { color: '#fff' },

    subCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    subCatChip: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: c.bgSubtle,
      borderWidth: 1,
      borderColor: c.border,
    },

    fieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    customAreaBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgSubtle },
    customAreaBtnActive: { backgroundColor: '#1e40af', borderColor: '#1e40af' },
    customAreaBtnTxt: { fontSize: 12, color: c.textSecondary },
    customAreaBtnTxtActive: { color: '#fff' },
    customAreaNote: {
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: '#1e40af',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#eff6ff',
    },
    customAreaNoteTitle: { fontSize: 13, fontWeight: '600', color: '#1e40af', marginBottom: 2 },
    customAreaNoteDesc: { fontSize: 12, color: '#3b82f6' },

    shipsRow: { flexDirection: 'row', gap: 8 },
    shipsChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.bgSubtle,
      borderWidth: 1,
      borderColor: c.border,
    },

    // Image section
    thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    thumbWrap: { position: 'relative', width: 80, height: 80 },
    thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: c.bgSubtle },
    localBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    localBadgeTxt: { fontSize: 8, color: '#fff', fontWeight: '700' },
    thumbRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      backgroundColor: '#dc2626',
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbRemoveTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

    imageActions: { gap: 10 },
    pickBtn: {
      borderWidth: 1.5,
      borderColor: '#2d7a47',
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: c.primaryBg,
    },
    pickBtnTxt: { fontSize: 13, fontWeight: '700', color: '#2d7a47' },
    imageAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    imageAddBtn: {
      backgroundColor: '#2d7a47',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    imageAddTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    toggleRow: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    toggleItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    toggleLabel: { fontSize: 13, fontWeight: '600', color: c.text },
    toggleSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },

    statusToggleWrap: { flexDirection: 'row', gap: 6 },
    statusPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 99,
      backgroundColor: c.bgSubtle,
      borderWidth: 1,
      borderColor: c.border,
    },
    statusPillActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
    statusPillActiveGreen: { backgroundColor: '#2d7a47', borderColor: '#2d7a47' },
    statusPillTxt: { fontSize: 11, fontWeight: '700', color: c.textMuted },
    statusPillTxtActive: { color: '#fff' },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
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
}
