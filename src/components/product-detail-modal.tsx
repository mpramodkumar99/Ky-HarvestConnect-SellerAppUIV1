import { useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView,
  StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import type { CatalogProduct } from '@/services/catalog-api';
import { LOW_STOCK_THRESHOLD } from '@/services/catalog-api';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

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

export function ProductDetailModal({ visible, product, onClose, onEdit, onToggleStatus, canEdit }: Props) {
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [imgIdx, setImgIdx] = useState(0);

  if (!product) return null;

  const threshold = product.lowStockThreshold ?? LOW_STOCK_THRESHOLD;

  function stockLabel(qty: number, thr: number): string {
    if (qty === 0) return t('product_detail_out_stock');
    if (qty <= thr) return `${t('product_detail_low_stock')} · ${qty} ${t('product_detail_left')}`;
    return `${t('product_detail_in_stock')} · ${qty} ${t('product_detail_units')}`;
  }

  const hasImages = (product.images?.length ?? 0) > 0;
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
            <Text style={s.headTitle}>{t('product_detail_title')}</Text>
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
                    {(product.images ?? []).map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={{ width: SCREEN_W, height: IMAGE_H }}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                  {(product.images?.length ?? 0) > 1 && (
                    <View style={s.dots}>
                      {(product.images ?? []).map((_, i) => (
                        <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={s.imagePlaceholder}>
                  <Text style={{ fontSize: 64 }}>{categoryEmoji}</Text>
                  <Text style={s.placeholderTxt}>{t('product_detail_no_images')}</Text>
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
                <View style={[s.catChip, s.catChipSub]}>
                  <Text style={[s.catTxt, s.catTxtSub]}>
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
                <Text style={s.thresholdNote}>· {t('product_detail_alert')} {threshold}</Text>
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
                    {product.status === 'active' ? t('product_detail_live') :
                     product.status === 'draft'  ? t('product_detail_draft') : t('product_detail_archived_lbl')}
                  </Text>
                </View>
                <View style={[s.badge, s.badgeBlue]}>
                  <Text style={[s.badgeTxt, s.badgeTxtBlue]}>
                    🚚 {product.shipsTo.charAt(0).toUpperCase() + product.shipsTo.slice(1)}
                  </Text>
                </View>
                {product.isHandmade && (
                  <View style={[s.badge, { backgroundColor: '#fdf4ff' }]}>
                    <Text style={[s.badgeTxt, { color: '#7e22ce' }]}>{t('product_detail_handmade')}</Text>
                  </View>
                )}
                {product.isVerified && (
                  <View style={[s.badge, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[s.badgeTxt, { color: '#065f46' }]}>{t('product_detail_verified')}</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {product.description ? (
                <View style={s.descBox}>
                  <Text style={s.descLabel}>{t('product_detail_desc')}</Text>
                  <Text style={s.descTxt}>{product.description}</Text>
                </View>
              ) : null}

              {/* Stats */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {product.rating > 0 ? `★ ${product.rating.toFixed(1)}` : '—'}
                  </Text>
                  <Text style={s.statLabel}>{t('product_detail_rating')}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {product.reviewCount > 0 ? String(product.reviewCount) : '—'}
                  </Text>
                  <Text style={s.statLabel}>{t('product_detail_reviews')}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{createdDate}</Text>
                  <Text style={s.statLabel}>{t('product_detail_listed')}</Text>
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
                    {product.status === 'active' ? t('product_detail_to_draft') : t('product_detail_make_live')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={s.editBtn}
                onPress={() => { onEdit(product); onClose(); }}>
                <Text style={s.editTxt}>{t('product_detail_edit')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: c.bg,
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
      borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

    imageSection: { backgroundColor: c.bgScreen },
    imagePlaceholder: {
      height: IMAGE_H,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    placeholderTxt: { fontSize: 13, color: c.textFaint },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderMid },
    dotActive: { backgroundColor: '#2d7a47', width: 18 },

    body: { padding: 20, gap: 14 },

    productName: { fontSize: 20, fontWeight: '800', color: c.text, lineHeight: 26 },

    catRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    catChip: {
      backgroundColor: c.primaryBgStrong,
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    catChipSub: { backgroundColor: c.bgSubtle },
    catTxt: { fontSize: 11, fontWeight: '700', color: c.primaryText, textTransform: 'capitalize' },
    catTxtSub: { color: c.textMuted },

    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    price: { fontSize: 28, fontWeight: '800', color: c.primary },
    unit: { fontSize: 14, color: c.textMuted },
    originalPrice: { fontSize: 14, color: c.textFaint, textDecorationLine: 'line-through' },

    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockDot: { width: 8, height: 8, borderRadius: 4 },
    stockTxt: { fontSize: 13, fontWeight: '600' },
    thresholdNote: { fontSize: 11, color: c.textFaint },

    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: {
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: c.bgSubtle,
    },
    badgeGreen:  { backgroundColor: '#dcfce7' },
    badgeYellow: { backgroundColor: '#fef3c7' },
    badgeGray:   { backgroundColor: c.bgSubtle },
    badgeBlue:   { backgroundColor: '#dbeafe' },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    badgeTxtGreen:  { color: '#166534' },
    badgeTxtYellow: { color: '#92400e' },
    badgeTxtGray:   { color: c.textMuted },
    badgeTxtBlue:   { color: '#1e40af' },

    descBox: {
      backgroundColor: c.bgScreen,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
    },
    descLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    descTxt: { fontSize: 13, color: c.textSub, lineHeight: 20 },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.bgScreen,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
    statValue: { fontSize: 14, fontWeight: '700', color: c.text },
    statLabel: { fontSize: 10, color: c.textFaint, fontWeight: '600', textTransform: 'uppercase' },
    statDivider: { width: 1, backgroundColor: c.border, marginVertical: 10 },

    footer: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.borderMid,
      alignItems: 'center',
    },
    toggleTxt: { fontSize: 14, fontWeight: '600', color: c.textSub },
    editBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: '#2d7a47',
      alignItems: 'center',
    },
    editTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
