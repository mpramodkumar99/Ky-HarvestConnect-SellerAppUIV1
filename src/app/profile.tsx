import { useState, useEffect } from 'react';
import { Modal, Share, ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { KycBadge, RoleBadge } from '@/components/seller-ui';
import { StoreSwitcher } from '@/components/store-switcher';
import { BankAccountModal } from '@/components/bank-account-modal';
import { InviteMemberModal } from '@/components/invite-member-modal';
import { MemberActionModal } from '@/components/member-action-modal';
import { EditStoreModal } from '@/components/edit-store-modal';
import { ImagePickerSheet } from '@/components/image-picker-sheet';
import { DeliveryZonesModal, type CustomZoneData, getCustomZoneKey } from '@/components/delivery-zones-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KycUploadModal } from '@/components/kyc-upload-modal';
import { PromotionsModal } from '@/components/promotions-modal';
import { ReviewsModal } from '@/components/reviews-modal';
import { HelpSupportModal } from '@/components/help-support-modal';
import { AppSettingsModal } from '@/components/app-settings-modal';
import { SocialHandlesModal } from '@/components/social-handles-modal';
import { EditProfileModal } from '@/components/edit-profile-modal';
import { PendingInviteModal } from '@/components/pending-invite-modal';
import { TransactionHistoryModal } from '@/components/transaction-history-modal';
import { useStore, ROLE_PERMISSIONS, ROLE_CONFIG, DELIVERY_ZONE_CONFIG } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/toast-provider';
import { useLanguage } from '@/context/language-context';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';
import { getBankAccount, setBankAccount as saveBankAccount, updateSeller, type BankAccount, type CreateBankAccountInput } from '@/services/user-api';
import { lookupPincode, type PincodeInfo } from '@/utils/pincode';
import { DISTRICT_BY_MANDAL, STATE_BY_DISTRICT } from '@/data/india-geo';
import { listProducts } from '@/services/catalog-api';
import { listOrders } from '@/services/order-api';

type MenuKey =
  | 'store_settings'
  | 'my_products'
  | 'order_history'
  | 'bank_payouts'
  | 'transaction_history'
  | 'kyc_documents'
  | 'promotions'
  | 'social_handles'
  | 'share_store'
  | 'reviews'
  | 'help_support'
  | 'app_settings';

type MenuItem = {
  key:        MenuKey;
  icon:       string;
  label:      string;
  desc:       string;
  badge?:     string;
  highlight?: boolean;
  route?:     string;
  comingSoon?: boolean;
};


export default function ProfileScreen() {
  const { stores, activeStore, teamMembers, loadingTeam, pendingInvites, setActiveStore, refreshTeam, refreshSeller } = useStore();
  const { logout, session } = useAuth();
  const perms = ROLE_PERMISSIONS[activeStore.role];
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const c = useAppColors();
  const s = makeStyles(c);
  const [switcherOpen, setSwitcherOpen]         = useState(false);
  const [bankAccount, setBankAccountState]       = useState<BankAccount | null>(null);
  const [bankModalOpen, setBankModalOpen]        = useState(false);
  const [inviteModalOpen, setInviteModalOpen]     = useState(false);
  const [memberAction,    setMemberAction]        = useState<import('@/context/store-context').TeamMember | null>(null);
  const [editStoreOpen,   setEditStoreOpen]     = useState(false);
  const [zonesOpen,       setZonesOpen]         = useState(false);
  const [kycOpen,         setKycOpen]           = useState(false);
  const [promosOpen,      setPromosOpen]        = useState(false);
  const [reviewsOpen,     setReviewsOpen]       = useState(false);
  const [helpOpen,        setHelpOpen]          = useState(false);
  const [settingsOpen,    setSettingsOpen]      = useState(false);
  const [socialOpen,      setSocialOpen]        = useState(false);
  const [editProfileOpen, setEditProfileOpen]   = useState(false);
  const [invitesOpen,      setInvitesOpen]      = useState(false);
  const [logoutOpen,       setLogoutOpen]       = useState(false);
  const [txHistoryOpen,    setTxHistoryOpen]    = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [iconPickerOpen,   setIconPickerOpen]   = useState(false);
  const [productCount, setProductCount]         = useState<number | null>(null);
  const [orderCount, setOrderCount]             = useState<number | null>(null);
  const [customZoneData,   setCustomZoneData]   = useState<CustomZoneData | null>(null);
  const [storePincodeInfo, setStorePincodeInfo] = useState<PincodeInfo | null>(null);

  const menuItems: MenuItem[] = [
    { key: 'store_settings',      icon: '🏪', label: t('store_settings'),        desc: t('menu_store_settings_desc') },
    { key: 'my_products',         icon: '🌾', label: t('menu_my_products'),       desc: t('menu_my_products_desc'),     route: '/products' },
    { key: 'order_history',       icon: '📦', label: t('menu_order_history'),     desc: t('menu_order_history_desc'),   route: '/orders' },
    { key: 'bank_payouts',        icon: '💳', label: t('store_bank_payouts'),     desc: t('menu_bank_payouts_desc'),    highlight: true },
    { key: 'transaction_history', icon: '📊', label: t('menu_tx_history'),        desc: t('menu_tx_history_desc') },
    { key: 'kyc_documents',       icon: '🛡️', label: t('menu_kyc'),              desc: t('menu_kyc_desc') },
    { key: 'promotions',          icon: '🎁', label: t('menu_promotions'),        desc: t('menu_promotions_desc') },
    { key: 'social_handles',      icon: '📱', label: t('menu_social_handles'),    desc: t('menu_social_handles_desc') },
    { key: 'share_store',         icon: '📣', label: t('menu_share_store'),       desc: t('menu_share_store_desc') },
    { key: 'reviews',             icon: '⭐', label: t('menu_reviews'),           desc: t('menu_reviews_desc'), badge: '2 new' },
    { key: 'help_support',        icon: '❓', label: t('menu_help'),              desc: t('menu_help_desc') },
    { key: 'app_settings',        icon: '⚙️', label: t('menu_app_settings'),     desc: t('menu_app_settings_desc') },
  ];

  useEffect(() => {
    getBankAccount(activeStore.id)
      .then(setBankAccountState)
      .catch(() => setBankAccountState(null));
    listProducts({ sellerId: activeStore.id })
      .then((ps) => setProductCount(ps.length))
      .catch(() => setProductCount(null));
    listOrders({ sellerId: activeStore.id })
      .then((os) => setOrderCount(os.length))
      .catch(() => setOrderCount(null));
    loadCustomZoneData(activeStore.id);
    lookupPincode(activeStore.pincode).then(setStorePincodeInfo).catch(() => setStorePincodeInfo(null));
  }, [activeStore.id]);

  function loadCustomZoneData(sellerId: string) {
    const apiZone = activeStore.customDeliveryZone;
    if (apiZone) {
      setCustomZoneData(apiZone);
    } else {
      AsyncStorage.getItem(getCustomZoneKey(sellerId))
        .then(stored => setCustomZoneData(stored ? JSON.parse(stored) : null))
        .catch(() => setCustomZoneData(null));
    }
  }

  async function handleSaveBankAccount(input: CreateBankAccountInput) {
    const saved = await saveBankAccount(activeStore.id, input);
    setBankAccountState(saved);
    showToast('Bank account saved successfully.', 'success');
  }

  async function handleStoreUpdated() {
    await refreshSeller(activeStore.id);
    loadCustomZoneData(activeStore.id);
    showToast('Store updated successfully.', 'success');
  }

  async function handleBannerPick(uri: string) {
    try {
      await updateSeller(activeStore.id, { bannerUrl: uri });
      await refreshSeller(activeStore.id);
      showToast('Store banner updated.', 'success');
    } catch {
      showToast('Failed to save banner. Try again.', 'error');
    }
  }

  async function handleIconPick(uri: string) {
    try {
      await updateSeller(activeStore.id, { imageUrl: uri });
      await refreshSeller(activeStore.id);
      showToast('Store icon updated.', 'success');
    } catch {
      showToast('Failed to save icon. Try again.', 'error');
    }
  }

  function handleMenuPress(item: MenuItem) {
    if (item.key === 'store_settings')      { setEditStoreOpen(true); return; }
    if (item.key === 'kyc_documents')       { setKycOpen(true); return; }
    if (item.key === 'promotions')          { setPromosOpen(true); return; }
    if (item.key === 'reviews')             { setReviewsOpen(true); return; }
    if (item.key === 'bank_payouts')        { setBankModalOpen(true); return; }
    if (item.key === 'transaction_history') { setTxHistoryOpen(true); return; }
    if (item.key === 'social_handles')      { setSocialOpen(true); return; }
    if (item.key === 'help_support')        { setHelpOpen(true); return; }
    if (item.key === 'app_settings')        { setSettingsOpen(true); return; }
    if (item.key === 'share_store') {
      Share.share({
        message: `Shop fresh from ${activeStore.name} on HarvestConnect!\n\nhttps://harvestconnect.in/store/${activeStore.id}`,
        title: activeStore.name,
      });
      return;
    }
    if (item.route) { router.push(item.route as string); return; }
    if (item.comingSoon) { showToast(`${item.label} is coming soon.`, 'info'); }
  }

  function handleLogout() {
    setLogoutOpen(true);
  }

  const displayMenuItems = menuItems.map(item =>
    item.key === 'my_products' && productCount !== null
      ? { ...item, badge: `${productCount} listed` }
      : item
  );

  const owner = teamMembers.find((m) => m.role === 'owner');
  const ownerDisplay = owner
    ? `${owner.name} · Seller since ${new Date(owner.joinedAt ?? owner.invitedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
    : 'HarvestConnect Seller';

  const storeStats = [
    { label: t('profile_stat_products'), value: productCount !== null ? String(productCount) : '…', icon: '🌾' },
    { label: t('profile_stat_orders'),   value: orderCount   !== null ? String(orderCount)   : '…', icon: '📦' },
    { label: t('profile_stat_rating'),   value: '4.8★',  icon: '⭐' },
    { label: t('profile_stat_gmv'),      value: '₹6.8L', icon: '💰' },
  ];

  return (
    <>
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <StoreSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <BankAccountModal
        visible={bankModalOpen}
        existing={bankAccount}
        onSave={handleSaveBankAccount}
        onClose={() => setBankModalOpen(false)}
      />
      <InviteMemberModal
        visible={inviteModalOpen}
        sellerId={activeStore.id}
        onClose={() => setInviteModalOpen(false)}
        onInvited={() => {
          refreshTeam();
          showToast('Invite sent successfully!', 'success');
        }}
      />
      <MemberActionModal
        visible={!!memberAction}
        member={memberAction}
        sellerId={activeStore.id}
        onClose={() => setMemberAction(null)}
        onUpdated={() => {
          refreshTeam();
          showToast('Team updated.', 'success');
        }}
      />
      <EditStoreModal
        visible={editStoreOpen}
        store={activeStore}
        onClose={() => setEditStoreOpen(false)}
        onUpdated={handleStoreUpdated}
      />
      <DeliveryZonesModal
        visible={zonesOpen}
        sellerId={activeStore.id}
        currentZones={activeStore.deliveryZones}
        currentCustomZone={activeStore.customDeliveryZone}
        storePincodeInfo={storePincodeInfo ?? undefined}
        onClose={() => setZonesOpen(false)}
        onUpdated={handleStoreUpdated}
      />
      <KycUploadModal
        visible={kycOpen}
        sellerId={activeStore.id}
        storeType={activeStore.type}
        currentFssai={activeStore.fssaiNumber}
        currentGst={activeStore.gstNumber}
        verified={activeStore.verified}
        onClose={() => setKycOpen(false)}
        onUpdated={handleStoreUpdated}
      />
      <PromotionsModal
        visible={promosOpen}
        store={activeStore}
        onClose={() => setPromosOpen(false)}
      />
      <ReviewsModal
        visible={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
      />
      <HelpSupportModal
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
      <AppSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <SocialHandlesModal
        visible={socialOpen}
        store={activeStore}
        onClose={() => setSocialOpen(false)}
        onUpdated={handleStoreUpdated}
      />
      <EditProfileModal
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onUpdated={(name) => {
          setEditProfileOpen(false);
          refreshTeam();
          showToast(`Profile updated — welcome, ${name}!`, 'success');
        }}
      />
      {/* Header — banner behind store details */}
      <ImageBackground
        source={activeStore.bannerUrl ? { uri: activeStore.bannerUrl } : undefined}
        style={s.header}
        imageStyle={s.bannerImg}>
        {activeStore.bannerUrl ? <View style={s.bannerDim} /> : null}

        <SafeAreaView edges={['top']}>
          <View style={s.avatarRow}>
            <Pressable style={s.avatarWrap} onPress={() => setSwitcherOpen(true)}>
              <View style={s.avatar}>
                {activeStore.imageUrl
                  ? <Image source={{ uri: activeStore.imageUrl }} style={s.avatarImage} />
                  : <Text style={s.avatarText}>{activeStore.icon}</Text>}
              </View>
              {activeStore.role === 'owner'
                ? (
                  <Pressable
                    style={s.iconUploadBadge}
                    onPress={() => setIconPickerOpen(true)}
                    hitSlop={6}>
                    <Text style={s.iconUploadTxt}>📷</Text>
                  </Pressable>
                ) : (
                  <View style={s.switchBadge}>
                    <View style={s.arrowDown} />
                  </View>
                )}
            </Pressable>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.storeName}>{activeStore.name}</Text>
                <RoleBadge role={activeStore.role} />
              </View>
              <Text style={s.sellerName}>{ownerDisplay}</Text>
              <View style={s.locationRow}>
                <Text style={s.locationTxt}>📍 {activeStore.location}</Text>
                {storePincodeInfo && (
                  <Text style={s.pincodeTxt}>
                    {storePincodeInfo.name}, {storePincodeInfo.district}, {activeStore.pincode}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ gap: 8, alignItems: 'center' }}>
              <Pressable
                style={s.editBtn}
                onPress={() => {
                  if (activeStore.role !== 'owner') {
                    showToast('Only store owners can edit store details.', 'info');
                    return;
                  }
                  setEditStoreOpen(true);
                }}>
                <Text style={{ fontSize: 16, transform: [{ rotate: '90deg' }] }}>✏️</Text>
              </Pressable>
              {activeStore.role === 'owner' && (
                <Pressable
                  style={s.bannerUploadBtn}
                  onPress={() => setBannerPickerOpen(true)}>
                  <Text style={s.bannerUploadTxt}>🖼️</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Store Stats */}
          <View style={s.statsRow}>
            {storeStats.map((stat, i) => (
              <View key={stat.label} style={[s.stat, i < storeStats.length - 1 && s.statBorder]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={s.statVal}>{stat.value}</Text>
                <Text style={s.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Image pickers */}
      <ImagePickerSheet
        visible={bannerPickerOpen}
        title="Store Banner"
        sizeHint="1500 × 500 px  ·  3:1 landscape  ·  use a wide pre-cropped photo"
        aspect={[3, 1]}
        allowsEditing={false}
        onPick={handleBannerPick}
        onClose={() => setBannerPickerOpen(false)}
      />
      <ImagePickerSheet
        visible={iconPickerOpen}
        title="Store Profile Icon"
        sizeHint="400 × 400 px  ·  1:1 square"
        aspect={[1, 1]}
        onPick={handleIconPick}
        onClose={() => setIconPickerOpen(false)}
      />

      {/* KYC + Bank Status */}
      <View style={s.statusCardWrap}>
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View style={s.statusIcon}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>{t('profile_identity')}</Text>
              <Text style={s.statusSub}>{t('profile_identity_sub')}</Text>
            </View>
            <KycBadge status={activeStore.verified ? 'verified' : 'pending'} />
          </View>

          <View style={[s.statusRow, { marginTop: 10 }]}>
            <View style={s.statusIcon}>
              <Text style={{ fontSize: 18 }}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>{t('profile_payout_account')}</Text>
              <Text style={s.statusSub}>
                {bankAccount
                  ? `${bankAccount.bankName} · ${bankAccount.accountNumber} · ${bankAccount.ifscCode}`
                  : t('profile_bank_not_setup')}
              </Text>
            </View>
            <Pressable style={s.changeBtn} onPress={() => setBankModalOpen(true)}>
              <Text style={s.changeTxt}>{bankAccount ? t('profile_change_bank') : t('profile_add_bank')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Store Coverage */}
      <View style={s.coverageWrap}>
        <View style={s.coverageCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={s.coverageTitle}>{t('profile_delivery_coverage')}</Text>
            <Pressable onPress={() => setZonesOpen(true)}><Text style={s.editCoverage}>{t('profile_edit_coverage')}</Text></Pressable>
          </View>
          <View style={s.coverageBadges}>
            {customZoneData ? (
              <>
                {customZoneData.states.map(st => (
                  <View key={`st-${st}`} style={[s.coverageBadge, { backgroundColor: '#ede9fe' }]}>
                    <Text style={[s.coverageBadgeTxt, { color: '#6d28d9' }]}>🗺️ {st}</Text>
                  </View>
                ))}
                {customZoneData.districts.map(d => {
                  const parent = STATE_BY_DISTRICT[d];
                  return (
                    <View key={`d-${d}`} style={[s.coverageBadge, { backgroundColor: '#e0f2fe' }]}>
                      <Text style={[s.coverageBadgeTxt, { color: '#0369a1' }]}>
                        🏙️ {d}{parent ? `, ${parent}` : ''}
                      </Text>
                    </View>
                  );
                })}
                {customZoneData.mandals.map(m => {
                  const parent = DISTRICT_BY_MANDAL[m];
                  return (
                    <View key={`m-${m}`} style={[s.coverageBadge, { backgroundColor: '#f0fdf4' }]}>
                      <Text style={[s.coverageBadgeTxt, { color: '#166534' }]}>
                        📍 {m}{parent ? `, ${parent}` : ''}
                      </Text>
                    </View>
                  );
                })}
                {(customZoneData.resolvedPins ?? []).map(rp => (
                  <View key={`pin-${rp.pin}`} style={[s.coverageBadge, { backgroundColor: '#fef9c3' }]}>
                    <Text style={[s.coverageBadgeTxt, { color: '#854d0e' }]}>
                      📮 {rp.pin} – {rp.name}, {rp.district}
                    </Text>
                  </View>
                ))}
              </>
            ) : activeStore.deliveryZones.length > 0 ? (
              activeStore.deliveryZones.map(zone => {
                const zc = DELIVERY_ZONE_CONFIG[zone];
                const label =
                  zone === 'mandal'   && storePincodeInfo ? `${storePincodeInfo.name} Area Wide` :
                  zone === 'district' && storePincodeInfo ? `${storePincodeInfo.district} District Wide` :
                  zone === 'state'    && storePincodeInfo ? `${storePincodeInfo.state} State Wide` :
                  zc.label;
                return (
                  <View key={zone} style={[s.coverageBadge, { backgroundColor: zc.bg }]}>
                    <Text style={[s.coverageBadgeTxt, { color: zc.text }]}>{zc.icon} {label}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: 12, color: c.textFaint }}>{t('profile_no_zones')}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Compliance — FSSAI (edible only) + GST */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.fssaiCard}>
          {['farmer', 'dairy', 'homefood'].includes(activeStore.type) && (
            <View style={s.complianceRow}>
              <Text style={s.fssaiIcon}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.fssaiTitle}>{t('profile_fssai_title')}</Text>
                <Text style={s.fssaiNum}>
                  {activeStore.fssaiNumber ?? t('profile_fssai_not_provided')}
                </Text>
              </View>
              <View style={[s.fssaiStatus, { backgroundColor: activeStore.fssaiNumber ? c.primaryBgStrong : c.bgSubtle }]}>
                <Text style={[s.fssaiStatusTxt, { color: activeStore.fssaiNumber ? c.primaryText : c.textMuted }]}>
                  {activeStore.fssaiNumber ? t('profile_fssai_active') : t('profile_fssai_pending')}
                </Text>
              </View>
            </View>
          )}
          <View style={[s.complianceRow, ['farmer', 'dairy', 'homefood'].includes(activeStore.type) && s.complianceRowBorder]}>
            <Text style={s.fssaiIcon}>🏛️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.fssaiTitle}>GST Number</Text>
              <Text style={s.fssaiNum}>
                {activeStore.gstNumber ?? 'Not provided'}
              </Text>
            </View>
            <View style={[s.fssaiStatus, { backgroundColor: activeStore.gstNumber ? c.primaryBgStrong : c.bgSubtle }]}>
              <Text style={[s.fssaiStatusTxt, { color: activeStore.gstNumber ? c.primaryText : c.textMuted }]}>
                {activeStore.gstNumber ? 'Active' : 'Not set'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Store Invitations */}
      {pendingInvites.length > 0 && (
        <View style={s.sectionWrap}>
          <Pressable style={s.inviteBanner} onPress={() => setInvitesOpen(true)}>
            <View style={s.inviteBannerLeft}>
              <Text style={s.inviteBannerIcon}>🏪</Text>
              <View>
                <Text style={s.inviteBannerTitle}>
                  {pendingInvites.length} {pendingInvites.length > 1 ? t('profile_invite_count_p') : t('profile_invite_count')}
                </Text>
                <Text style={s.inviteBannerSub}>{t('profile_invite_sub')}</Text>
              </View>
            </View>
            <View style={s.inviteBannerBadge}>
              <Text style={s.inviteBannerBadgeTxt}>{pendingInvites.length}</Text>
            </View>
          </Pressable>
        </View>
      )}
      <PendingInviteModal visible={invitesOpen} onDone={() => setInvitesOpen(false)} />

      {/* My Stores */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>{t('store_my_stores')}</Text>
          <Pressable onPress={() => setSwitcherOpen(true)}>
            <Text style={s.seeAll}>{t('profile_switch')}</Text>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          {stores.map((store) => {
            const rc = ROLE_CONFIG[store.role];
            const isActive = store.id === activeStore.id;
            return (
              <Pressable
                key={store.id}
                style={[s.storeCard, isActive && s.storeCardActive]}
                onPress={() => setActiveStore(store)}>
                <View style={[s.storeCardIcon, isActive && s.storeCardIconActive]}>
                  {store.imageUrl
                    ? <Image source={{ uri: store.imageUrl }} style={s.storeCardImage} />
                    : <Text style={{ fontSize: 22 }}>{store.icon}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[s.storeCardName, isActive && s.storeCardNameActive]}>{store.name}</Text>
                    <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                      <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
                    </View>
                    {isActive && (
                      <View style={s.activeDot}>
                        <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{t('profile_viewing')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={[s.storeStatusPill, store.status === 'live' ? s.storeStatusLive : s.storeStatusOffline]}>
                      <Text style={[s.storeStatusTxt, store.status === 'live' ? s.storeStatusLiveTxt : s.storeStatusOfflineTxt]}>
                        {store.status === 'live' ? t('profile_store_live') : t('profile_store_offline')}
                      </Text>
                    </View>
                    <Text style={s.storeCardMeta}>{store.productCount} products · {store.ordersToday} orders today</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, color: isActive ? c.primary : c.borderMid }}>
                  {isActive ? '✓' : '›'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Team Members */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHead}>
          <View>
            <Text style={s.sectionTitle}>{t('store_team_members')}</Text>
            <Text style={s.sectionSub}>{activeStore.name}</Text>
          </View>
          {perms.canInviteMembers && (
            <Pressable style={s.inviteBtn} onPress={() => setInviteModalOpen(true)}>
              <Text style={s.inviteBtnTxt}>＋ {t('store_invite_member')}</Text>
            </Pressable>
          )}
        </View>
        <View style={s.teamCard}>
          {loadingTeam && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2d7a47" />
            </View>
          )}
          {!loadingTeam && teamMembers.map((member, i) => {
            const rc = ROLE_CONFIG[member.role];
            const isMe      = !!session?.userId && member.userId === session.userId;
            const canManage = perms.canInviteMembers && member.role !== 'owner';
            return (
              <Pressable
                key={member.id}
                style={[s.memberRow, i > 0 && s.memberRowBorder]}
                onPress={canManage ? () => setMemberAction(member) : undefined}
                disabled={!canManage && !isMe}>
                <View style={s.memberAvatar}>
                  {member.imageUrl
                    ? <Image source={{ uri: member.imageUrl }} style={s.memberAvatarImg} />
                    : <Text style={s.memberAvatarTxt}>{member.avatar}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.memberName}>{member.name}</Text>
                    {isMe && <Text style={s.meMark}>{t('profile_you')}</Text>}
                  </View>
                  <Text style={s.memberPhone}>{member.phone}</Text>
                  <Text style={s.memberJoined}>
                    {member.status === 'pending'
                      ? `${t('profile_invited')} ${new Date(member.invitedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                      : member.joinedAt
                        ? `${t('profile_joined')} ${new Date(member.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                        : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                    <Text style={[s.rolePillTxt, { color: rc.color }]}>{rc.label}</Text>
                  </View>
                  <View style={[
                    s.statusPill,
                    { backgroundColor: member.status === 'active' ? '#dcfce7' : '#fef3c7' },
                  ]}>
                    <Text style={[
                      s.statusPillTxt,
                      { color: member.status === 'active' ? '#166534' : '#92400e' },
                    ]}>
                      {member.status === 'active' ? t('profile_member_active') : t('profile_member_pending')}
                    </Text>
                  </View>
                </View>
                {isMe && (
                  <Pressable
                    style={s.memberEditBtn}
                    onPress={() => setEditProfileOpen(true)}
                    hitSlop={8}>
                    <Text style={s.memberEditIcon}>✏️</Text>
                  </Pressable>
                )}
                {!isMe && canManage && (
                  <View style={{ justifyContent: 'center', paddingLeft: 4 }}>
                    <Text style={{ fontSize: 16, color: c.borderMid }}>›</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Menu Items */}
      <View style={s.menuSection}>
        {displayMenuItems.map((item, i) => (
          <Pressable key={i} style={[s.menuItem, item.highlight && s.menuItemHL]} onPress={() => handleMenuPress(item)}>
            <View style={[s.menuIcon, item.highlight && s.menuIconHL]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuDesc}>{item.desc}</Text>
            </View>
            {item.badge && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Seller Tier */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={s.tierCard}>
          <Text style={s.tierIcon}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tierTitle}>{t('profile_tier_title')}</Text>
            <Text style={s.tierSub}>{t('profile_tier_sub')}</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>{t('profile_logout_btn')}</Text>
        </Pressable>
        <Text style={s.version}>HarvestConnect Seller · v1.0.0</Text>
      </View>
    </ScrollView>

    {/* Logout confirmation modal */}
    <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
      <Pressable style={s.modalBackdrop} onPress={() => setLogoutOpen(false)}>
        <Pressable style={s.modalCard} onPress={() => {}}>
          <View style={s.modalBrand}>
            <View style={s.modalLogoRing}>
              <Text style={s.modalLogoIcon}>🌾</Text>
            </View>
          </View>
          <Text style={s.modalTitle}>{t('profile_logout_title')}</Text>
          <Text style={s.modalMessage}>{t('profile_logout_msg')}</Text>
          <View style={s.modalActions}>
            <Pressable style={s.modalCancelBtn} onPress={() => setLogoutOpen(false)}>
              <Text style={s.modalCancelTxt}>{t('profile_logout_cancel')}</Text>
            </Pressable>
            <Pressable
              style={s.modalLogoutBtn}
              onPress={async () => { setLogoutOpen(false); await logout(); }}>
              <Text style={s.modalLogoutTxt}>{t('profile_logout_confirm')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    <TransactionHistoryModal
      visible={txHistoryOpen}
      sellerId={activeStore.id}
      storeName={activeStore.name}
      onClose={() => setTxHistoryOpen(false)}
    />
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgScreen },

    header: {
      backgroundColor: '#2d7a47',
      paddingHorizontal: 16,
      paddingBottom: 32,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      overflow: 'hidden',
    },
    bannerImg: {
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    bannerDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.42)',
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20,
      marginTop: 8,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.55)',
      overflow: 'hidden',
    },
    avatarImage: { width: 76, height: 76, borderRadius: 38 },
    avatarText: { fontSize: 36 },
    switchBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 26,
      height: 26,
      backgroundColor: '#fff',
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#2d7a47',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
    iconUploadBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 28,
      height: 28,
      backgroundColor: '#fff',
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#2d7a47',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 4,
    },
    iconUploadTxt: { fontSize: 13 },
    arrowDown: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 6,
      borderStyle: 'solid',
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: '#1a4a28',
      marginTop: 2,
    },
    storeName: { fontSize: 20, fontWeight: '700', color: '#fff' },
    sellerName: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    locationRow: { marginTop: 3, gap: 1 },
    locationTxt:  { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
    pincodeTxt:   { fontSize: 11, color: 'rgba(255,255,255,0.50)' },
    editBtn: {
      width: 36,
      height: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerUploadBtn: {
      width: 36,
      height: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerUploadTxt: { fontSize: 16 },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 14,
      justifyContent: 'space-around',
    },
    stat: { alignItems: 'center', flex: 1 },
    statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
    statIcon: { fontSize: 16, marginBottom: 2 },
    statVal: { fontSize: 16, fontWeight: '700', color: '#fff' },
    statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 1, textAlign: 'center' },

    statusCardWrap: { paddingHorizontal: 16, marginTop: -16, zIndex: 1, marginBottom: 12 },
    statusCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusIcon: {
      width: 38,
      height: 38,
      backgroundColor: c.primaryBg,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusTitle: { fontSize: 13, fontWeight: '600', color: c.text },
    statusSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    changeBtn: {
      backgroundColor: c.bgSubtle,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    changeTxt: { fontSize: 11, color: c.textSub, fontWeight: '600' },

    coverageWrap: { paddingHorizontal: 16, marginBottom: 12 },
    coverageCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    coverageTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    editCoverage: { fontSize: 12, color: c.primary, fontWeight: '600' },
    coverageBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    coverageBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
    coverageBadgeTxt: { fontSize: 11, fontWeight: '600' },

    fssaiCard: {
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    complianceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
    },
    complianceRowBorder: {
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    fssaiIcon: { fontSize: 22 },
    fssaiTitle: { fontSize: 13, fontWeight: '600', color: c.text },
    fssaiNum: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    fssaiStatus: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    fssaiStatusTxt: { fontSize: 11, fontWeight: '700' },

    menuSection: { paddingHorizontal: 16, paddingTop: 4, gap: 2 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
    },
    menuItemHL: { backgroundColor: c.primaryBg },
    menuIcon: {
      width: 40,
      height: 40,
      backgroundColor: c.bgSubtle,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconHL: { backgroundColor: c.primaryBgStrong },
    menuLabel: { fontSize: 14, fontWeight: '600', color: c.text },
    menuDesc: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    badge: {
      backgroundColor: c.primaryBgStrong,
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: { fontSize: 10, color: c.primaryText, fontWeight: '600' },
    chevron: { fontSize: 18, color: c.textFaint },

    tierCard: {
      flexDirection: 'row',
      backgroundColor: '#1a4a28',
      borderRadius: 14,
      padding: 14,
      gap: 12,
      alignItems: 'center',
    },
    tierIcon: { fontSize: 28 },
    tierTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
    tierSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3, lineHeight: 16 },

    logoutBtn: {
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 12,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    logoutText: { fontSize: 14, fontWeight: '600', color: c.errorText },
    version: { fontSize: 10, color: c.textFaint, textAlign: 'center' },

    modalBackdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    modalCard: {
      width: '100%', backgroundColor: c.bg,
      borderRadius: 24, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, elevation: 16,
    },
    modalBrand: {
      backgroundColor: '#2d7a47',
      paddingVertical: 24, alignItems: 'center',
    },
    modalLogoRing: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    },
    modalLogoIcon:    { fontSize: 26 },
    modalTitle:       { fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'center', marginTop: 20, marginHorizontal: 24 },
    modalMessage:     { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 8, marginHorizontal: 24, lineHeight: 19, marginBottom: 24 },
    modalActions:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.borderLight },
    modalCancelBtn:   { flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: c.borderLight },
    modalCancelTxt:   { fontSize: 15, fontWeight: '600', color: c.textSub },
    modalLogoutBtn:   { flex: 1, paddingVertical: 16, alignItems: 'center' },
    modalLogoutTxt:   { fontSize: 15, fontWeight: '700', color: '#ef4444' },

    inviteBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.bg, borderRadius: 14, padding: 14,
      borderWidth: 1.5, borderColor: '#fbbf24',
    },
    inviteBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    inviteBannerIcon:  { fontSize: 28 },
    inviteBannerTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    inviteBannerSub:   { fontSize: 11, color: c.textMuted, marginTop: 2 },
    inviteBannerBadge: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
    },
    inviteBannerBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },

    sectionWrap: { paddingHorizontal: 16, paddingTop: 16 },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    sectionSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    seeAll: { fontSize: 12, color: c.primary, fontWeight: '600' },
    storeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    storeCardActive: { backgroundColor: c.primaryBg, borderColor: c.primaryLight },
    storeCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: c.bgSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    storeCardImage: { width: 48, height: 48, borderRadius: 12 },
    storeCardIconActive: { backgroundColor: c.primaryBgStrong },
    storeCardName: { fontSize: 13, fontWeight: '700', color: c.text },
    storeCardNameActive: { color: c.primaryText },
    storeCardMeta: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    rolePill: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
    rolePillTxt: { fontSize: 10, fontWeight: '700' },
    activeDot: {
      backgroundColor: '#2d7a47',
      borderRadius: 99,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    storeStatusPill: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
    storeStatusLive:    { backgroundColor: '#dcfce7' },
    storeStatusOffline: { backgroundColor: c.bgSubtle },
    storeStatusTxt:        { fontSize: 10, fontWeight: '700' },
    storeStatusLiveTxt:    { color: '#166534' },
    storeStatusOfflineTxt: { color: c.textMuted },

    inviteBtn: {
      backgroundColor: c.primaryBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: c.primaryLight,
    },
    inviteBtnTxt: { fontSize: 12, fontWeight: '700', color: c.primary },

    teamCard: {
      backgroundColor: c.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    memberRowBorder: { borderTopWidth: 1, borderTopColor: c.borderLight },
    memberAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#2d7a47',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    memberAvatarImg: { width: 44, height: 44, borderRadius: 22 },
    memberAvatarTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    memberName:    { fontSize: 13, fontWeight: '600', color: c.text },
    memberPhone:   { fontSize: 11, color: c.textMuted, marginTop: 1 },
    memberJoined:  { fontSize: 10, color: c.textFaint, marginTop: 1 },
    meMark:        { fontSize: 10, color: c.primary, fontWeight: '600' },
    memberEditBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center',
      marginLeft: 4,
    },
    memberEditIcon: { fontSize: 14, transform: [{ rotate: '90deg' }] },
    statusPill:    { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
    statusPillTxt: { fontSize: 10, fontWeight: '600' },
  });
}
