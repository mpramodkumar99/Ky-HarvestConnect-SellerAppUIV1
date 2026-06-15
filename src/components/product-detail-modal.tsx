import { useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView,
  StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import type { CatalogProduct } from '@/services/catalog-api';
import { LOW_STOCK_THRESHOLD } from '@/services/catalog-api';

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_H = 220;

interface Props {
  visible: boolean;
  product: CatalogProduct | null;
  onClose: () => void;
  onEdit: (product: CatalogProduct) => void;
  onToggleStatus: (product: CatalogProduct) => void;
  canEdit: boolean;
}

function stockColor(qty: number, threshold: number): string {
  if (qty === 0) return '#dc2626';
  if (qty <= threshold) return '#d97706';
  return '#16a34a';
}

function stockLabel(qty: number, threshold: number): string {
  if (qty === 0) return 'Out of Stock';
  if (qty <= threshold) return `Low Stock · ${qty} left`;
  return `In Stock · ${qty} units`;
}

export function ProductDetailModal({ visible, product, onClose, onEdit, onToggleStatus, canEdit }: Props) {
  const [imgIdx, setImgIdx] = useState(0);

  if (!product) return null;

  const threshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  const hasImages = product.images.length > 0;
  const categoryEmoji =
    product.isHandmade          ? '🪡' :
    product.category === 'farm_products'   ? '🌾' :
    product.category === 'processed_foods' ? '🫙' :
    product.category === 'foods'           ? '🍱' :
    product.category === 'services'        ? '🔧' : '📦';

  const createdDate = new Date(product.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
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
          <View style={s.head}>
            <Text style={s.headTitle}>Product Details</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* Image carousel */}
            <View style={s.imageSection}>
              {hasImages ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                      setImgIdx(idx);
                    }}>
                    {product.images.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={{ width: SCREEN_W, height: IMAGE_H }}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                  {product.images.length > 1 && (
                    <View style={s.dots}>
                      {product.images.map((_, i) => (
                        <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={s.imagePlaceholder}>
                  <Text style={{ fontSize: 64 }}>{categoryEmoji}</Text>
                  <Text style={s.placeholderTxt}>No images added</Text>
                </View>
              )}
            </View>

            <View style={s.body}>
              {/* Name + category */}
              <Text style={s.productName}>{product.name}</Text>
              <View style={s.catRow}>
                <View style={s.catChip}>
                  <Text style={s.catTxt}>{product.category.replace(/_/g, ' ')}</Text>
                </View>
                <View style={[s.catChip, { backgroundColor: '#f3f4f6' }]}>
                  <Text style={[s.catTxt, { color: '#6b7280' }]}>
                    {product.subCategory.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {/* Price row */}
              <View style={s.priceRow}>
                <Text style={s.price}>₹{Math.round(product.price / 100)}</Text>
                <Text style={s.unit}>/ {product.unit}</Text>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text style={s.originalPrice}>₹{Math.round(product.originalPrice / 100)}</Text>
                )}
              </View>

              {/* Stock */}
              <View style={s.stockRow}>
                <View style={[s.stockDot, { backgroundColor: stockColor(product.stockQuantity, threshold) }]} />
                <Text style={[s.stockTxt, { color: stockColor(product.stockQuantity, threshold) }]}>
                  {stockLabel(product.stockQuantity, threshold)}
                </Text>
                <Text style={s.thresholdNote}>· alert at {threshold}</Text>
              </View>

              {/* Status + Ships to */}
              <View style={s.badgeRow}>
                <View style={[
                  s.badge,
                  product.status === 'active' ? s.badgeGreen :
                  product.status === 'draft'  ? s.badgeYellow : s.badgeGray,
                ]}>
                  <Text style={[
                    s.badgeTxt,
                    product.status === 'active' ? s.badgeTxtGreen :
                    product.status === 'draft'  ? s.badgeTxtYellow : s.badgeTxtGray,
                  ]}>
                    {product.status === 'active' ? '● Live' :
                     product.status === 'draft'  ? '○ Draft' : '✕ Archived'}
                  </Text>
                </View>
                <View style={[s.badge, s.badgeBlue]}>
                  <Text style={[s.badgeTxt, s.badgeTxtBlue]}>
                    🚚 {product.shipsTo.charAt(0).toUpperCase() + product.shipsTo.slice(1)}
                  </Text>
                </View>
                {product.isHandmade && (
                  <View style={[s.badge, { backgroundColor: '#fdf4ff' }]}>
                    <Text style={[s.badgeTxt, { color: '#7e22ce' }]}>🪡 Handmade</Text>
                  </View>
                )}
                {product.isVerified && (
                  <View style={[s.badge, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[s.badgeTxt, { color: '#065f46' }]}>✓ Verified</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {product.description ? (
                <View style={s.descBox}>
                  <Text style={s.descLabel}>Description</Text>
                  <Text style={s.descTxt}>{product.description}</Text>
                </View>
              ) : null}

              {/* Stats */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {product.rating > 0 ? `★ ${product.rating.toFixed(1)}` : '—'}
                  </Text>
                  <Text style={s.statLabel}>Rating</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {product.reviewCount > 0 ? String(product.reviewCount) : '—'}
                  </Text>
                  <Text style={s.statLabel}>Reviews</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{createdDate}</Text>
                  <Text style={s.statLabel}>Listed on</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer actions */}
          {canEdit && (
            <View style={s.footer}>
              {product.status !== 'archived' && (
                <Pressable
                  style={s.toggleBtn}
                  onPress={() => { onToggleStatus(product); onClose(); }}>
                  <Text style={s.toggleTxt}>
                    {product.status === 'active' ? '○ Move to Draft' : '● Make Live'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={s.editBtn}
                onPress={() => { onEdit(product); onClose(); }}>
                <Text style={s.editTxt}>✏️ Edit Product</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  imageSection: { backgroundColor: '#f9fafb' },
  imagePlaceholder: {
    height: IMAGE_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderTxt: { fontSize: 13, color: '#9ca3af' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#2d7a47', width: 18 },

  body: { padding: 20, gap: 14 },

  productName: { fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 26 },

  catRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catTxt: { fontSize: 11, fontWeight: '700', color: '#166534', textTransform: 'capitalize' },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 28, fontWeight: '800', color: '#2d7a47' },
  unit: { fontSize: 14, color: '#6b7280' },
  originalPrice: { fontSize: 14, color: '#9ca3af', textDecorationLine: 'line-through' },

  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockTxt: { fontSize: 13, fontWeight: '600' },
  thresholdNote: { fontSize: 11, color: '#9ca3af' },

  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f3f4f6',
  },
  badgeGreen:  { backgroundColor: '#dcfce7' },
  badgeYellow: { backgroundColor: '#fef3c7' },
  badgeGray:   { backgroundColor: '#f3f4f6' },
  badgeBlue:   { backgroundColor: '#dbeafe' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  badgeTxtGreen:  { color: '#166534' },
  badgeTxtYellow: { color: '#92400e' },
  badgeTxtGray:   { color: '#6b7280' },
  badgeTxtBlue:   { color: '#1e40af' },

  descBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  descLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  descTxt: { fontSize: 13, color: '#374151', lineHeight: 20 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
  editBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2d7a47',
    alignItems: 'center',
  },
  editTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
