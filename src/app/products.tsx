import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { StoreSwitcher } from '@/components/store-switcher';
import { useToast } from '@/components/toast-provider';
import { ProductFormModal } from '@/components/product-form-modal';
import { ProductDetailModal } from '@/components/product-detail-modal';
import { useStore, ROLE_PERMISSIONS } from '@/context/store-context';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import {
  CatalogProduct, ProductStatus,
  listProducts, updateProduct, deleteProduct,
  LOW_STOCK_THRESHOLD,
} from '@/services/catalog-api';

type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';

function stockLevel(p: CatalogProduct): StockLevel {
  const threshold = p.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  if (p.stockQuantity === 0) return 'out_of_stock';
  if (p.stockQuantity <= threshold) return 'low_stock';
  return 'in_stock';
}

// ── Stock badge ────────────────────────────────────────────────────────────────

interface StockBadgeProps {
  level: StockLevel; qty: number;
  outLabel: string; lowLabel: string; inLabel: string;
  c: AppColors;
}
function StockBadge({ level, qty, outLabel, lowLabel, inLabel, c }: StockBadgeProps) {
  const base = { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 } as const;
  if (level === 'out_of_stock')
    return <View style={[base, { backgroundColor: c.errorBg }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.errorTextDark }}>{outLabel}</Text></View>;
  if (level === 'low_stock')
    return <View style={[base, { backgroundColor: c.warningBg }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.warningText }}>{lowLabel} · {qty}</Text></View>;
  return <View style={[base, { backgroundColor: c.primaryBgStrong }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.primaryText }}>{inLabel} · {qty}</Text></View>;
}

// ── Status badge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: ProductStatus;
  activeLabel: string; draftLabel: string; archivedLabel: string;
  c: AppColors;
}
function StatusBadge({ status, activeLabel, draftLabel, archivedLabel, c }: StatusBadgeProps) {
  const base = { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 } as const;
  if (status === 'active')
    return <View style={[base, { backgroundColor: c.primaryBgStrong }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.primaryText }}>{activeLabel}</Text></View>;
  if (status === 'draft')
    return <View style={[base, { backgroundColor: c.warningBg }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.warningText }}>{draftLabel}</Text></View>;
  return <View style={[base, { backgroundColor: c.bgSubtle }]}><Text style={{ fontSize: 9, fontWeight: '700', color: c.textFaint }}>{archivedLabel}</Text></View>;
}

type FilterTabValue = 'All' | 'Active' | 'Draft' | 'Archived' | 'Low Stock';
const FILTER_TAB_VALUES: FilterTabValue[] = ['All', 'Active', 'Draft', 'Archived', 'Low Stock'];

// ── Bulk Actions Bar ──────────────────────────────────────────────────────────

interface BulkBarProps {
  count: number;
  total: number;
  onActivate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

function BulkActionsBar({ count, total, onActivate, onArchive, onDelete, onSelectAll, onClear }: BulkBarProps) {
  const { t } = useLanguage();
  const c = useAppColors();
  const bulk = makeBulkStyles(c);
  return (
    <View style={bulk.bar}>
      <View style={bulk.topRow}>
        <Text style={bulk.count}>{count} {t('products_selected')}</Text>
        <View style={bulk.topBtns}>
          <Pressable onPress={onSelectAll} style={bulk.topBtn}>
            <Text style={bulk.topBtnTxt}>{t('products_bulk_select_all')} ({total})</Text>
          </Pressable>
          <Pressable onPress={onClear} style={bulk.topBtn}>
            <Text style={[bulk.topBtnTxt, { color: c.textMuted }]}>{t('products_bulk_clear')}</Text>
          </Pressable>
        </View>
      </View>
      <View style={bulk.actionRow}>
        <Pressable style={[bulk.actionBtn, bulk.activateBtn]} onPress={onActivate}>
          <Text style={bulk.activateTxt}>{t('products_bulk_activate')}</Text>
        </Pressable>
        <Pressable style={[bulk.actionBtn, bulk.archiveBtn]} onPress={onArchive}>
          <Text style={[bulk.archiveTxt, { color: c.textSub }]}>{t('products_bulk_archive')}</Text>
        </Pressable>
        <Pressable style={[bulk.actionBtn, bulk.deleteBtn]} onPress={onDelete}>
          <Text style={bulk.deleteTxt}>{t('products_bulk_delete')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const { activeStore } = useStore();
  const perms = ROLE_PERMISSIONS[activeStore.role];
  const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
  const { showToast, showConfirm } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeScreenStyles(c);

  const [switcherOpen, setSwitcherOpen]   = useState(false);
  const [formOpen, setFormOpen]           = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | undefined>();
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null);
  const [search, setSearch]               = useState('');
  const [activeFilter, setActiveFilter]   = useState<FilterTabValue>('All');
  const [products, setProducts]           = useState<CatalogProduct[]>([]);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());

  const isSelecting = selectedIds.size > 0;

  const filterTabLabels: Record<FilterTabValue, string> = {
    'All':       t('products_filter_all'),
    'Active':    t('products_filter_active'),
    'Draft':     t('products_filter_draft'),
    'Archived':  t('products_filter_archived'),
    'Low Stock': t('products_filter_low_stock'),
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items = await listProducts({ sellerId: activeStore.id });
      setProducts(items);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [activeStore.id]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleListingStatus(product: CatalogProduct) {
    const newStatus: ProductStatus = product.status === 'active' ? 'draft' : 'active';
    setProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, status: newStatus } : p)
    );
    try {
      await updateProduct(product.id, { status: newStatus }, activeStore.id);
    } catch (e: unknown) {
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, status: product.status } : p)
      );
      showToast(e instanceof Error ? e.message : 'Could not update listing status.', 'error');
    }
  }

  function confirmDelete(product: CatalogProduct) {
    showConfirm({
      title: 'Delete Product',
      message: `Remove "${product.name}" from your catalogue? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        try {
          await deleteProduct(product.id, activeStore.id);
        } catch {
          fetchProducts();
          showToast('Could not delete product.', 'error');
        }
      },
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkUpdateStatus(newStatus: ProductStatus) {
    const ids = [...selectedIds];
    const snapshots = products.filter((p) => ids.includes(p.id));
    setProducts((prev) =>
      prev.map((p) => ids.includes(p.id) ? { ...p, status: newStatus } : p)
    );
    clearSelection();
    try {
      await Promise.all(
        ids.map((id) => updateProduct(id, { status: newStatus }, activeStore.id))
      );
      showToast(`${ids.length} product${ids.length > 1 ? 's' : ''} ${newStatus === 'active' ? 'activated' : 'archived'}.`, 'success');
    } catch {
      setProducts((prev) =>
        prev.map((p) => {
          const snap = snapshots.find((s) => s.id === p.id);
          return snap ? { ...p, status: snap.status } : p;
        })
      );
      showToast('Some updates failed. Please try again.', 'error');
    }
  }

  function bulkDelete() {
    const ids = [...selectedIds];
    showConfirm({
      title: `Delete ${ids.length} Product${ids.length > 1 ? 's' : ''}`,
      message: `Permanently remove ${ids.length} product${ids.length > 1 ? 's' : ''} from your catalogue? This cannot be undone.`,
      confirmLabel: 'Delete All',
      destructive: true,
      onConfirm: async () => {
        setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
        clearSelection();
        const results = await Promise.allSettled(
          ids.map((id) => deleteProduct(id, activeStore.id))
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          showToast(`${failed} deletion${failed > 1 ? 's' : ''} failed. Refreshing...`, 'error');
          fetchProducts();
        } else {
          showToast(`${ids.length} product${ids.length > 1 ? 's' : ''} deleted.`, 'success');
        }
      },
    });
  }

  function openAddForm()  { setEditingProduct(undefined); setFormOpen(true); }
  function openEdit(product: CatalogProduct) { setEditingProduct(product); setFormOpen(true); }
  function openDetail(product: CatalogProduct) { setDetailProduct(product); }

  useEffect(() => {
    if (openAdd === 'true' && perms.canEditProducts) openAddForm();
  }, [openAdd]);

  function onSaved(saved: CatalogProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next;
      }
      return [saved, ...prev];
    });
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const level = stockLevel(p);
    const matchFilter =
      activeFilter === 'All'       ? true :
      activeFilter === 'Active'    ? p.status === 'active' :
      activeFilter === 'Draft'     ? p.status === 'draft' :
      activeFilter === 'Archived'  ? p.status === 'archived' :
      /* Low Stock */                level === 'low_stock';
    return matchSearch && matchFilter;
  });

  const counts = {
    active:   products.filter((p) => p.status === 'active').length,
    draft:    products.filter((p) => p.status === 'draft').length,
    archived: products.filter((p) => p.status === 'archived').length,
    lowStock: products.filter((p) => stockLevel(p) === 'low_stock').length,
  };

  function tabLabel(tab: FilterTabValue) {
    const base = filterTabLabels[tab];
    if (tab === 'Active'    && counts.active   > 0) return `${base} (${counts.active})`;
    if (tab === 'Draft'     && counts.draft    > 0) return `${base} (${counts.draft})`;
    if (tab === 'Archived'  && counts.archived > 0) return `${base} (${counts.archived})`;
    if (tab === 'Low Stock' && counts.lowStock > 0) return `${base} (${counts.lowStock})`;
    return base;
  }

  return (
    <View style={s.screen}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      <ProductFormModal
        visible={formOpen}
        storeType={activeStore.type}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        editProduct={editingProduct}
      />

      <ProductDetailModal
        visible={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={(p) => { setDetailProduct(null); openEdit(p); }}
        onToggleStatus={(p) => { setDetailProduct(null); toggleListingStatus(p); }}
        canEdit={perms.canEditProducts}
      />

      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>
                  {isSelecting ? `${selectedIds.size} ${t('products_selected')}` : t('products_title')}
                </Text>
                {!isSelecting && (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
                )}
              </View>
              <Text style={s.headerSub}>{activeStore.name} · {products.length} {t('products_listings')}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isSelecting ? (
                <Pressable style={s.cancelSelBtn} onPress={clearSelection}>
                  <Text style={s.cancelSelTxt}>{t('products_cancel_sel')}</Text>
                </Pressable>
              ) : (
                perms.canEditProducts && (
                  <Pressable style={s.addBtn} onPress={openAddForm}>
                    <Text style={s.addBtnText}>＋ {t('products_add')}</Text>
                  </Pressable>
                )
              )}
            </View>
          </View>

          {!isSelecting && (
            <View style={s.searchRow}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder={t('products_search_placeholder')}
                placeholderTextColor={c.textFaint}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Text style={{ color: c.textFaint, fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Filter Tabs */}
      {!isSelecting && (
        <View style={s.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
            {FILTER_TAB_VALUES.map((tab) => (
              <Pressable
                key={tab}
                style={[s.filterTab, activeFilter === tab && s.filterTabActive]}
                onPress={() => setActiveFilter(tab)}>
                <Text style={[s.filterTabTxt, activeFilter === tab && s.filterTabTxtActive]}>
                  {tabLabel(tab)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selection hint */}
      {isSelecting && (
        <View style={s.selHint}>
          <Text style={s.selHintTxt}>{t('products_sel_hint')}</Text>
        </View>
      )}

      {/* Product List */}
      {loading ? (
        <View style={s.centeredState}>
          <ActivityIndicator size="large" color="#2d7a47" />
          <Text style={s.stateText}>{t('products_loading')}</Text>
        </View>
      ) : fetchError ? (
        <View style={s.centeredState}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={s.errorTitle}>{t('products_cant_load')}</Text>
          <Text style={s.errorSub}>{fetchError}</Text>
          <Pressable style={s.retryBtn} onPress={fetchProducts}>
            <Text style={s.retryTxt}>{t('products_retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.listContent, isSelecting && { paddingBottom: 120 }]}>
          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 40 }}>🌾</Text>
              <Text style={s.emptyTitle}>
                {products.length === 0 ? t('products_no_products_yet') : t('products_no_products_found')}
              </Text>
              <Text style={s.emptySub}>
                {products.length === 0
                  ? t('products_empty_add_sub')
                  : t('products_empty_filter_sub')}
              </Text>
            </View>
          ) : (
            filtered.map((product) => {
              const level = stockLevel(product);
              const isInactive = product.status !== 'active' || level === 'out_of_stock';
              const isSelected = selectedIds.has(product.id);

              return (
                <Pressable
                  key={product.id}
                  style={[
                    s.productCard,
                    isInactive && !isSelected && s.productCardInactive,
                    isSelected && s.productCardSelected,
                  ]}
                  onPress={() => {
                    if (isSelecting) { toggleSelect(product.id); }
                    else { openDetail(product); }
                  }}
                  onLongPress={() => {
                    if (!isSelecting) toggleSelect(product.id);
                  }}
                  delayLongPress={300}>

                  {/* Selection overlay */}
                  {isSelecting && (
                    <View style={s.selCircle}>
                      {isSelected ? (
                        <View style={s.selCircleChecked}>
                          <Text style={s.selCheckTxt}>✓</Text>
                        </View>
                      ) : (
                        <View style={s.selCircleEmpty} />
                      )}
                    </View>
                  )}

                  {/* Left: emoji */}
                  <View style={s.productEmoji}>
                    <Text style={{ fontSize: 26 }}>
                      {product.isHandmade ? '🪡' :
                       product.category === 'farm_products'   ? '🌾' :
                       product.category === 'processed_foods' ? '🫙' :
                       product.category === 'foods'           ? '🍱' :
                       product.category === 'services'        ? '🔧' : '📦'}
                    </Text>
                  </View>

                  {/* Mid: info */}
                  <View style={s.productMid}>
                    <Text style={s.productName} numberOfLines={1}>{product.name}</Text>

                    <View style={s.badgeRow}>
                      <StatusBadge
                        status={product.status}
                        activeLabel={t('products_status_active')}
                        draftLabel={t('products_status_draft')}
                        archivedLabel={t('products_status_archived')}
                        c={c}
                      />
                      <StockBadge
                        level={level}
                        qty={product.stockQuantity}
                        outLabel={t('products_out_of_stock')}
                        lowLabel={t('products_low_stock')}
                        inLabel={t('products_in_stock')}
                        c={c}
                      />
                    </View>

                    <Text style={s.productCategory}>
                      {product.category.replace(/_/g, ' ')} · {product.unit}
                    </Text>
                    <View style={s.productMeta}>
                      <Text style={s.productPrice}>₹{Math.round(product.price / 100)}</Text>
                      {product.reviewCount > 0 && (
                        <>
                          <Text style={s.productDot}>·</Text>
                          <Text style={s.productOrders}>{product.reviewCount} {t('products_reviews')}</Text>
                        </>
                      )}
                      {product.rating > 0 && (
                        <>
                          <Text style={s.productDot}>·</Text>
                          <Text style={s.productRating}>★ {product.rating.toFixed(1)}</Text>
                        </>
                      )}
                    </View>
                    <Text style={s.productShips}>{t('products_ships_to')} {product.shipsTo}</Text>
                  </View>

                  {/* Right: toggle + actions (hidden in selection mode) */}
                  {perms.canEditProducts && !isSelecting && (
                    <View style={s.productRight}>
                      <Pressable
                        style={[
                          s.statusToggleBtn,
                          product.status === 'active' ? s.statusToggleBtnActive : s.statusToggleBtnDraft,
                        ]}
                        onPress={() => toggleListingStatus(product)}
                        disabled={product.status === 'archived'}>
                        <Text style={s.statusToggleTxt}>
                          {product.status === 'active'
                            ? t('products_status_active')
                            : product.status === 'draft'
                              ? t('products_status_draft')
                              : t('products_status_archived')}
                        </Text>
                      </Pressable>

                      <View style={{ gap: 4, marginTop: 6 }}>
                        <Pressable style={s.editBtn} onPress={() => openEdit(product)}>
                          <Text style={s.editBtnTxt}>{t('products_edit')}</Text>
                        </Pressable>
                        <Pressable style={s.deleteBtn} onPress={() => confirmDelete(product)}>
                          <Text style={s.deleteBtnTxt}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}

          {perms.canEditProducts && !isSelecting && (
            <Pressable style={s.addProductCta} onPress={openAddForm}>
              <Text style={{ fontSize: 28 }}>＋</Text>
              <Text style={s.addProductCtaTitle}>{t('products_add_new')}</Text>
              <Text style={s.addProductCtaSub}>{t('products_add_cta_sub')}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Bulk Actions Bar — floats over the list when in selection mode */}
      {isSelecting && perms.canEditProducts && (
        <BulkActionsBar
          count={selectedIds.size}
          total={filtered.length}
          onActivate={() => bulkUpdateStatus('active')}
          onArchive={() => bulkUpdateStatus('archived')}
          onDelete={bulkDelete}
          onSelectAll={selectAll}
          onClear={clearSelection}
        />
      )}
    </View>
  );
}

function makeBulkStyles(c: AppColors) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 12,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    count: { fontSize: 15, fontWeight: '700', color: c.text },
    topBtns: { flexDirection: 'row', gap: 12 },
    topBtn: { paddingVertical: 4 },
    topBtnTxt: { fontSize: 13, fontWeight: '600', color: c.primary },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
    },
    activateBtn: { backgroundColor: '#2d7a47' },
    archiveBtn:  { backgroundColor: c.bgSubtle, borderWidth: 1, borderColor: c.border },
    deleteBtn:   { backgroundColor: c.errorBg, borderWidth: 1, borderColor: c.errorBorder },
    activateTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    archiveTxt:  { fontSize: 13, fontWeight: '700' },
    deleteTxt:   { fontSize: 13, fontWeight: '700', color: c.errorText },
  });
}

function makeScreenStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgScreen },

    header: {
      backgroundColor: '#2d7a47',
      paddingHorizontal: 16,
      paddingBottom: 18,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
      marginTop: 8,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    addBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { fontSize: 13, fontWeight: '700', color: '#2d7a47' },
    cancelSelBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    cancelSelTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: { marginRight: 8, fontSize: 14 },
    searchInput: { flex: 1, fontSize: 13, color: '#fff' },

    filterWrap: { backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border },
    filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: c.bgSubtle },
    filterTabActive: { backgroundColor: '#2d7a47' },
    filterTabTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    filterTabTxtActive: { color: '#fff' },

    selHint: {
      backgroundColor: c.warningBg,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.warningBorder,
    },
    selHintTxt: { fontSize: 11, color: c.warningText, textAlign: 'center', fontWeight: '500' },

    centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
    stateText: { fontSize: 14, color: c.textMuted },
    errorTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    errorSub: { fontSize: 12, color: c.textMuted, textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: {
      marginTop: 4,
      backgroundColor: '#2d7a47',
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    retryTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

    listContent: { padding: 16, gap: 10, paddingBottom: 32 },

    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingHorizontal: 24 },

    productCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    productCardInactive: { opacity: 0.6 },
    productCardSelected: { borderColor: '#2d7a47', borderWidth: 2, backgroundColor: c.primaryBg },

    selCircle: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 10,
    },
    selCircleEmpty: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.borderMid,
      backgroundColor: c.bg,
    },
    selCircleChecked: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#2d7a47',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selCheckTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

    productEmoji: {
      width: 54,
      height: 54,
      backgroundColor: c.bgSubtle,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    productMid: { flex: 1, gap: 3 },
    productName: { fontSize: 13, fontWeight: '700', color: c.text },
    badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
    productCategory: { fontSize: 11, color: c.textMuted, textTransform: 'capitalize', marginTop: 2 },
    productMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    productPrice: { fontSize: 13, fontWeight: '700', color: c.primary },
    productDot: { fontSize: 11, color: c.borderMid },
    productOrders: { fontSize: 11, color: c.textMuted },
    productRating: { fontSize: 11, color: '#c97b1a', fontWeight: '600' },
    productShips: { fontSize: 10, color: c.textFaint, marginTop: 1 },

    productRight: { alignItems: 'center' },
    statusToggleBtn: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      minWidth: 60,
      alignItems: 'center',
    },
    statusToggleBtnActive: { backgroundColor: c.primaryBgStrong },
    statusToggleBtnDraft:  { backgroundColor: c.warningBg },
    statusToggleTxt: { fontSize: 10, fontWeight: '700', color: c.textSub },

    editBtn: { backgroundColor: c.bgSubtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    editBtnTxt: { fontSize: 11, color: c.textSub, fontWeight: '600' },
    deleteBtn: {
      backgroundColor: c.errorBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      alignItems: 'center',
    },
    deleteBtnTxt: { fontSize: 13 },

    addProductCta: {
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 6,
      borderWidth: 2,
      borderColor: c.primaryBorder,
      borderStyle: 'dashed',
      marginTop: 4,
    },
    addProductCtaTitle: { fontSize: 15, fontWeight: '700', color: c.primary },
    addProductCtaSub: { fontSize: 12, color: c.textMuted, textAlign: 'center' },
  });
}
