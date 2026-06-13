import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable,
  StyleSheet, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StockBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { ProductFormModal } from '@/components/product-form-modal';
import { useStore, ROLE_PERMISSIONS } from '@/context/store-context';
import {
  CatalogProduct,
  listProducts,
  updateProduct,
  deleteProduct,
} from '@/services/catalog-api';

// Derive stock status from API's boolean inStock
function toStockStatus(p: CatalogProduct): 'in_stock' | 'out_of_stock' {
  return p.inStock ? 'in_stock' : 'out_of_stock';
}

const filterTabs = ['All', 'In Stock', 'Out of Stock'] as const;
type FilterTab = (typeof filterTabs)[number];

export default function ProductsScreen() {
  const { activeStore } = useStore();
  const perms = ROLE_PERMISSIONS[activeStore.role];

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | undefined>();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Server filters by sellerId — no client-side filtering needed
      const items = await listProducts({ sellerId: activeStore.id });
      setProducts(items);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [activeStore.id]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleStock(product: CatalogProduct) {
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, inStock: !p.inStock } : p)
    );
    try {
      await updateProduct(product.id, { inStock: !product.inStock }, activeStore.id);
    } catch {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, inStock: product.inStock } : p)
      );
      Alert.alert('Error', 'Could not update stock status. Is the Catalog service running?');
    }
  }

  function confirmDelete(product: CatalogProduct) {
    Alert.alert(
      'Delete Product',
      `Remove "${product.name}" from your catalogue? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            try {
              await deleteProduct(product.id, activeStore.id);
            } catch {
              // If delete fails, re-fetch to restore correct state
              fetchProducts();
              Alert.alert('Error', 'Could not delete product.');
            }
          },
        },
      ]
    );
  }

  function openAdd() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEdit(product: CatalogProduct) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function onSaved(saved: CatalogProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === 'All' ? true :
      activeFilter === 'In Stock' ? p.inStock :
      !p.inStock;
    return matchSearch && matchFilter;
  });

  const activeCount  = products.filter((p) => p.inStock).length;
  const inactiveCount = products.filter((p) => !p.inStock).length;

  return (
    <View style={s.screen}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <ProductFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        editProduct={editingProduct}
      />

      {/* Header */}
      <View style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => setSwitcherOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.headerTitle}>My Products</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 }}>⌄</Text>
              </View>
              <Text style={s.headerSub}>{activeStore.name} · {products.length} listings</Text>
            </Pressable>
            {perms.canEditProducts && (
              <Pressable style={s.addBtn} onPress={openAdd}>
                <Text style={s.addBtnText}>＋ Add Product</Text>
              </Pressable>
            )}
          </View>

          {/* Search */}
          <View style={s.searchRow}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text style={{ color: '#9ca3af', fontSize: 16 }}>✕</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Filter Tabs */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {filterTabs.map((tab) => (
            <Pressable
              key={tab}
              style={[s.filterTab, activeFilter === tab && s.filterTabActive]}
              onPress={() => setActiveFilter(tab)}>
              <Text style={[s.filterTabTxt, activeFilter === tab && s.filterTabTxtActive]}>
                {tab}
                {tab === 'In Stock' && activeCount > 0 ? ` (${activeCount})` : ''}
                {tab === 'Out of Stock' && inactiveCount > 0 ? ` (${inactiveCount})` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Product List */}
      {loading ? (
        <View style={s.centeredState}>
          <ActivityIndicator size="large" color="#2d7a47" />
          <Text style={s.stateText}>Loading products...</Text>
        </View>
      ) : fetchError ? (
        <View style={s.centeredState}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={s.errorTitle}>Could not load products</Text>
          <Text style={s.errorSub}>{fetchError}</Text>
          <Pressable style={s.retryBtn} onPress={fetchProducts}>
            <Text style={s.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 40 }}>🌾</Text>
              <Text style={s.emptyTitle}>
                {products.length === 0 ? 'No products yet' : 'No products found'}
              </Text>
              <Text style={s.emptySub}>
                {products.length === 0
                  ? 'Tap "+ Add Product" to list your first item on HarvestConnect'
                  : 'Try a different search or filter'}
              </Text>
            </View>
          ) : (
            filtered.map((product) => (
              <View
                key={product.id}
                style={[s.productCard, !product.inStock && s.productCardInactive]}>

                {/* Left: emoji placeholder */}
                <View style={s.productEmoji}>
                  <Text style={{ fontSize: 28 }}>
                    {product.isHandmade ? '🪡' :
                     product.category === 'farm_products' ? '🌾' :
                     product.category === 'processed_foods' ? '🫙' :
                     product.category === 'foods' ? '🍱' :
                     product.category === 'services' ? '🔧' : '📦'}
                  </Text>
                </View>

                {/* Mid: info */}
                <View style={s.productMid}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={s.productName} numberOfLines={1}>{product.name}</Text>
                    <StockBadge status={toStockStatus(product)} />
                  </View>
                  <Text style={s.productCategory}>
                    {product.category.replace(/_/g, ' ')} · {product.unit}
                  </Text>
                  <View style={s.productMeta}>
                    <Text style={s.productPrice}>₹{Math.round(product.price / 100)}</Text>
                    <Text style={s.productDot}>·</Text>
                    <Text style={s.productOrders}>{product.reviewCount} reviews</Text>
                    {product.rating > 0 && (
                      <>
                        <Text style={s.productDot}>·</Text>
                        <Text style={s.productRating}>★ {product.rating.toFixed(1)}</Text>
                      </>
                    )}
                  </View>
                  <Text style={s.productShips}>🚚 Ships to {product.shipsTo}</Text>
                </View>

                {/* Right: toggle + actions */}
                <View style={s.productRight}>
                  <Switch
                    value={product.inStock}
                    onValueChange={() => perms.canEditProducts && toggleStock(product)}
                    trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                    thumbColor={product.inStock ? '#2d7a47' : '#9ca3af'}
                    disabled={!perms.canEditProducts}
                  />
                  {perms.canEditProducts && (
                    <View style={{ gap: 4 }}>
                      <Pressable style={s.editBtn} onPress={() => openEdit(product)}>
                        <Text style={s.editBtnTxt}>✏️ Edit</Text>
                      </Pressable>
                      <Pressable style={s.deleteBtn} onPress={() => confirmDelete(product)}>
                        <Text style={s.deleteBtnTxt}>🗑️</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Add Product CTA (always visible at bottom) */}
          {perms.canEditProducts && (
            <Pressable style={s.addProductCta} onPress={openAdd}>
              <Text style={{ fontSize: 28 }}>＋</Text>
              <Text style={s.addProductCtaTitle}>Add a New Product</Text>
              <Text style={s.addProductCtaSub}>
                List your farm produce, handmade goods, or local products
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },

  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: '#f3f4f6' },
  filterTabActive: { backgroundColor: '#2d7a47' },
  filterTabTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTabTxtActive: { color: '#fff' },

  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  stateText: { fontSize: 14, color: '#6b7280' },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  errorSub: { fontSize: 12, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
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
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 },

  productCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productCardInactive: { opacity: 0.55 },
  productEmoji: {
    width: 58,
    height: 58,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMid: { flex: 1, gap: 3 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  productCategory: { fontSize: 11, color: '#6b7280', textTransform: 'capitalize' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#2d7a47' },
  productDot: { fontSize: 11, color: '#d1d5db' },
  productOrders: { fontSize: 11, color: '#6b7280' },
  productRating: { fontSize: 11, color: '#c97b1a', fontWeight: '600' },
  productShips: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  productRight: { alignItems: 'center', gap: 6 },
  editBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnTxt: { fontSize: 11, color: '#374151', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  deleteBtnTxt: { fontSize: 13 },

  addProductCta: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#d1fae5',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addProductCtaTitle: { fontSize: 15, fontWeight: '700', color: '#2d7a47' },
  addProductCtaSub: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
