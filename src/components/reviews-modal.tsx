import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useToast } from '@/components/toast-provider';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import { listReviews, replyToReview, type Review } from '@/services/catalog-api';

type Filter = 'All' | '5★' | '4★' | '3★' | 'Unresponded';
const FILTERS: Filter[] = ['All', '5★', '4★', '3★', 'Unresponded'];

function Stars({ rating, size = 13, inactiveColor }: { rating: number; size?: number; inactiveColor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : inactiveColor }}>★</Text>
      ))}
    </View>
  );
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avgRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function starDist(reviews: Review[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
  }));
}

interface Props {
  visible: boolean;
  sellerId: string;
  onClose: () => void;
}

export function ReviewsModal({ visible, sellerId, onClose }: Props) {
  const { showToast } = useToast();
  const c = useAppColors();
  const s = makeStyles(c);

  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [filter,     setFilter]     = useState<Filter>('All');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText,  setReplyText]  = useState('');
  const [savingId,   setSavingId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const data = await listReviews(sellerId);
      setReviews(data);
    } catch {
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  async function handleReply(id: string) {
    if (!replyText.trim()) return;
    setSavingId(id);
    try {
      const updated = await replyToReview(id, replyText.trim());
      setReviews(prev => prev.map(r => r.id === id ? updated : r));
      setReplyingId(null);
      setReplyText('');
      showToast('Reply sent', 'success');
    } catch {
      showToast('Failed to send reply', 'error');
    } finally {
      setSavingId(null);
    }
  }

  const avg  = avgRating(reviews);
  const dist = starDist(reviews);

  const filtered = reviews.filter((r) => {
    if (filter === 'All')         return true;
    if (filter === 'Unresponded') return !r.reply;
    return r.rating === parseInt(filter[0]);
  });

  const unrespondedCount = reviews.filter(r => !r.reply).length;

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

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color="#2d7a47" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Rating hero */}
              <View style={s.hero}>
                <View style={s.heroLeft}>
                  <Text style={s.heroScore}>{avg > 0 ? avg.toFixed(1) : '–'}</Text>
                  <Stars rating={Math.round(avg)} size={16} inactiveColor="rgba(255,255,255,0.3)" />
                  <Text style={s.heroCount}>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</Text>
                </View>
                <View style={s.distCol}>
                  {dist.map((d) => {
                    const pct = reviews.length > 0 ? (d.count / reviews.length) * 100 : 0;
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
                    {f === 'Unresponded' && unrespondedCount > 0 && (
                      <View style={s.filterBadge}>
                        <Text style={s.filterBadgeTxt}>{unrespondedCount}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              {/* Review list */}
              <View style={s.reviewList}>
                {filtered.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ fontSize: 36, marginBottom: 12 }}>📝</Text>
                    <Text style={{ fontSize: 13, color: c.textFaint }}>No reviews in this category</Text>
                  </View>
                ) : (
                  filtered.map((review) => (
                    <View key={review.id} style={s.reviewCard}>
                      <View style={s.reviewHeader}>
                        <View style={s.reviewAvatar}>
                          <Text style={s.reviewAvatarTxt}>{initials(review.buyerName)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={s.reviewBuyer}>{review.buyerName}</Text>
                            <Text style={s.reviewDate}>
                              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </Text>
                          </View>
                          <Stars rating={review.rating} inactiveColor={c.border} />
                        </View>
                      </View>
                      <Text style={s.reviewText}>{review.text}</Text>

                      {review.reply ? (
                        <View style={s.replyBubble}>
                          <Text style={s.replyLabel}>Your reply</Text>
                          <Text style={s.replyTxt}>{review.reply}</Text>
                        </View>
                      ) : replyingId === review.id ? (
                        <View style={s.replyForm}>
                          <TextInput
                            style={s.replyInput}
                            value={replyText}
                            onChangeText={setReplyText}
                            placeholder="Write your reply..."
                            placeholderTextColor={c.textFaint}
                            multiline
                            autoFocus
                          />
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <Pressable
                              style={s.cancelReply}
                              onPress={() => { setReplyingId(null); setReplyText(''); }}>
                              <Text style={s.cancelReplyTxt}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              style={[s.sendReply, (!replyText.trim() || savingId === review.id) && { opacity: 0.5 }]}
                              onPress={() => handleReply(review.id)}
                              disabled={!replyText.trim() || savingId === review.id}>
                              {savingId === review.id
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={s.sendReplyTxt}>Send Reply</Text>
                              }
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={s.reviewFooter}>
                          <Pressable
                            style={s.replyBtn}
                            onPress={() => { setReplyingId(review.id); setReplyText(''); }}>
                            <Text style={s.replyBtnTxt}>↩ Reply</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
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
      borderBottomColor: c.borderLight,
    },
    headTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32,
      backgroundColor: c.bgSubtle,
      borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { fontSize: 13, color: c.textSub, fontWeight: '700' },

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
      borderColor: c.border,
      backgroundColor: c.bgScreen,
    },
    filterChipActive: { borderColor: '#2d7a47', backgroundColor: c.primaryBg },
    filterTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    filterTxtActive: { color: c.primaryText },
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
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
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
    reviewBuyer: { fontSize: 13, fontWeight: '700', color: c.text },
    reviewDate: { fontSize: 11, color: c.textFaint },
    reviewText: { fontSize: 13, color: c.textSub, lineHeight: 19 },
    reviewFooter: { flexDirection: 'row' },

    replyBubble: {
      backgroundColor: c.primaryBg,
      borderRadius: 10,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#2d7a47',
    },
    replyLabel: { fontSize: 10, fontWeight: '700', color: '#2d7a47', marginBottom: 4 },
    replyTxt: { fontSize: 12, color: c.textSub, lineHeight: 17 },

    replyForm: {
      backgroundColor: c.bgScreen,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    replyInput: {
      fontSize: 13, color: c.text, minHeight: 60,
      textAlignVertical: 'top', lineHeight: 19,
    },
    cancelReply: {
      flex: 1, paddingVertical: 8, borderRadius: 8,
      borderWidth: 1, borderColor: c.borderMid, alignItems: 'center',
    },
    cancelReplyTxt: { fontSize: 12, fontWeight: '600', color: c.textSub },
    sendReply: {
      flex: 2, paddingVertical: 8, borderRadius: 8,
      backgroundColor: '#2d7a47', alignItems: 'center',
    },
    sendReplyTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

    replyBtn: {
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: c.borderMid,
    },
    replyBtnTxt: { fontSize: 11, fontWeight: '600', color: c.textSub },
  });
}
