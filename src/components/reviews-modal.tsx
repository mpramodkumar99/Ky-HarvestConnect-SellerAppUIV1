import { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { useToast } from '@/components/toast-provider';

interface Review {
  id: string;
  buyer: string;
  avatar: string;
  rating: number;
  text: string;
  product: string;
  date: string;
  replied: boolean;
}

const REVIEWS: Review[] = [
  { id: 'r1', buyer: 'Ravi Kumar',    avatar: 'RK', rating: 5, text: 'Super fresh! Delivered on time and the quality was excellent. Will definitely order again.', product: 'Fresh Cow Milk 1L',    date: '2026-06-12', replied: false },
  { id: 'r2', buyer: 'Sunita Meena',  avatar: 'SM', rating: 4, text: 'Good product but packaging could be better. The curd was thick and tasty.',                  product: 'Thick Curd 500g',     date: '2026-06-11', replied: false },
  { id: 'r3', buyer: 'Prasad Reddy',  avatar: 'PR', rating: 5, text: 'Amazing quality! Pure and fresh. Best seller in Nizamabad.',                                  product: 'A2 Milk 500ml',       date: '2026-06-10', replied: true  },
  { id: 'r4', buyer: 'Lakshmi Devi',  avatar: 'LD', rating: 3, text: 'Delivery was 2 hours late. Product quality is good though.',                                   product: 'Paneer 250g',         date: '2026-06-09', replied: false },
  { id: 'r5', buyer: 'Venkat Babu',   avatar: 'VB', rating: 5, text: 'Pure cow ghee, worth every rupee. My family loved it!',                                        product: 'Pure Cow Ghee 500g',  date: '2026-06-08', replied: true  },
  { id: 'r6', buyer: 'Anitha Rao',    avatar: 'AR', rating: 4, text: 'Good flavour but I expected a slightly larger quantity for the price.',                         product: 'Fresh Butter 200g',   date: '2026-06-07', replied: false },
];

const STAR_DIST: { stars: number; count: number }[] = [
  { stars: 5, count: 280 },
  { stars: 4, count: 42  },
  { stars: 3, count: 12  },
  { stars: 2, count: 5   },
  { stars: 1, count: 3   },
];
const TOTAL_REVIEWS = STAR_DIST.reduce((s, d) => s + d.count, 0);

type Filter = 'All' | '5★' | '4★' | '3★' | 'Unresponded';
const FILTERS: Filter[] = ['All', '5★', '4★', '3★', 'Unresponded'];

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#e5e7eb' }}>★</Text>
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReviewsModal({ visible, onClose }: Props) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = REVIEWS.filter((r) => {
    if (filter === 'All')        return true;
    if (filter === 'Unresponded') return !r.replied;
    return r.rating === parseInt(filter[0]);
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

          <View style={s.head}>
            <Text style={s.headTitle}>Reviews & Ratings</Text>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Rating hero */}
            <View style={s.hero}>
              <View style={s.heroLeft}>
                <Text style={s.heroScore}>4.8</Text>
                <Stars rating={5} size={16} />
                <Text style={s.heroCount}>{TOTAL_REVIEWS} reviews</Text>
              </View>
              <View style={s.distCol}>
                {STAR_DIST.map((d) => {
                  const pct = (d.count / TOTAL_REVIEWS) * 100;
                  return (
                    <View key={d.stars} style={s.distRow}>
                      <Text style={s.distLabel}>{d.stars}★</Text>
                      <View style={s.distTrack}>
                        <View style={[s.distFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={s.distCount}>{d.count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.filterRow}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  style={[s.filterChip, filter === f && s.filterChipActive]}
                  onPress={() => setFilter(f)}>
                  <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
                  {f === 'Unresponded' && (
                    <View style={s.filterBadge}>
                      <Text style={s.filterBadgeTxt}>2</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Review list */}
            <View style={s.reviewList}>
              {filtered.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>No reviews in this category</Text>
                </View>
              ) : (
                filtered.map((review) => (
                  <View key={review.id} style={s.reviewCard}>
                    <View style={s.reviewHeader}>
                      <View style={s.reviewAvatar}>
                        <Text style={s.reviewAvatarTxt}>{review.avatar}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={s.reviewBuyer}>{review.buyer}</Text>
                          <Text style={s.reviewDate}>
                            {new Date(review.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                        <Stars rating={review.rating} />
                        <Text style={s.reviewProduct}>{review.product}</Text>
                      </View>
                    </View>
                    <Text style={s.reviewText}>{review.text}</Text>
                    <View style={s.reviewFooter}>
                      {review.replied ? (
                        <View style={s.repliedTag}>
                          <Text style={s.repliedTxt}>✓ Replied</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={s.replyBtn}
                          onPress={() => showToast('Reply feature coming with reviews service.', 'info')}>
                          <Text style={s.replyBtnTxt}>↩ Reply</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              <View style={s.syncNote}>
                <Text style={{ fontSize: 14 }}>ℹ️</Text>
                <Text style={s.syncNoteTxt}>
                  Reviews shown are sample data. Live buyer reviews will appear here once the reviews service is integrated.
                </Text>
              </View>
            </View>

          </ScrollView>
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
    overflow: 'hidden',
    maxHeight: '92%',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: {
    width: 32, height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#374151', fontWeight: '700' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: '#1a4a28',
  },
  heroLeft: { alignItems: 'center', gap: 4 },
  heroScore: { fontSize: 40, fontWeight: '800', color: '#fff' },
  heroCount: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  distCol: { flex: 1, gap: 5 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', width: 22, textAlign: 'right' },
  distTrack: {
    flex: 1, height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3, overflow: 'hidden',
  },
  distFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  distCount: { fontSize: 10, color: 'rgba(255,255,255,0.55)', width: 28 },

  filterRow: { paddingVertical: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  filterChipActive: { borderColor: '#2d7a47', backgroundColor: '#f0fdf4' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTxtActive: { color: '#166534' },
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 99,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },

  reviewList: { padding: 16, gap: 12 },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  reviewHeader: { flexDirection: 'row', gap: 10 },
  reviewAvatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: '#2d7a47',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  reviewBuyer: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reviewDate: { fontSize: 11, color: '#9ca3af' },
  reviewProduct: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  reviewText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  reviewFooter: { flexDirection: 'row' },
  repliedTag: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  repliedTxt: { fontSize: 11, color: '#2d7a47', fontWeight: '600' },
  replyBtn: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  replyBtnTxt: { fontSize: 11, fontWeight: '600', color: '#374151' },

  syncNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  syncNoteTxt: { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 16 },
});
