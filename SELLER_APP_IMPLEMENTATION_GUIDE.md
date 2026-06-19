# HarvestConnect Seller App — Implementation Guide

**Repo:** `Ky-HarvestConnect-SellerAppUIV1`  
**Active branch:** `features/Pramod/seller-app-product-enhancements` → merged to `Dev` (PR #3)  
**Stack:** Expo SDK 56 · Expo Router · React Native · React 19 · TypeScript

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Seller App (React Native)                  │
│                                                             │
│  Screens            Components             Context           │
│  ─────────          ──────────             ───────           │
│  index.tsx          toast-provider         StoreProvider     │
│  products.tsx       store-switcher         LanguageProvider  │
│  profile.tsx        product-form-modal     OrderAlertContext │
│  orders.tsx         bank-account-modal                       │
│  analytics.tsx      create-store-modal                       │
│                     edit-store-modal                         │
│                     delivery-zones-modal                     │
│                     kyc-upload-modal                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch (HTTP/JSON)
            ┌──────────┴──────────┐
            │                     │
     ┌──────▼──────┐       ┌──────▼──────┐
     │  UserSvc    │       │  CatalogSvc │
     │  port 3002  │       │  port 3003  │
     │             │       │             │
     │  Users      │       │  Products   │
     │  Addresses  │       │  (CRUD)     │
     │  Sellers    │       │  (owned by  │
     │  Team       │       │   sellerId) │
     │  BankAcct   │       │             │
     └─────────────┘       └─────────────┘
```

The app talks to two backend microservices. Both run locally during development. The Android emulator reaches the host machine via `10.0.2.2` (not `localhost`).

---

## Running Locally

### 1. Start UserSvc (port 3002)
```bash
cd HC_UserSvc/Ky-HarvestConnect-User-svc
npm run dev
# → user-svc running on http://localhost:3002
```

### 2. Start CatalogSvc (port 3003)
```bash
cd HC_CatalogSvc/Ky-HarvestConnect-Catalog-svc
npm run dev
# → catalog-svc running on http://localhost:3003
```

### 3. Start the Seller App
```bash
cd HC_SellerAppV1/Ky-HarvestConnect-SellerAppUIV1
npx expo start --android
```

All three must be running simultaneously for full functionality. If a service is down, the app falls back to seed data (no crash).

**Android emulator DNS fix:** If the emulator has no internet (pincode lookup fails), launch with:
```bash
emulator -avd <avd_name> -dns-server 8.8.8.8,8.8.4.4
```
The internal resolver `10.0.2.3` sometimes fails on Play Store images. This bypasses it.

---

## File Structure

```
src/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root layout: providers + dark mode
│   ├── index.tsx                # Dashboard / home screen
│   ├── products.tsx             # Product listing, status toggle, delete
│   ├── profile.tsx              # Store profile, team, bank account, store list
│   ├── orders.tsx               # Orders screen (order alert context wired)
│   └── analytics.tsx            # Analytics screen (placeholder)
│
├── components/
│   ├── toast-provider.tsx       # In-app toast + confirm bottom-sheet system
│   ├── store-switcher.tsx       # Store switcher modal
│   ├── product-form-modal.tsx   # Add/edit product bottom-sheet form
│   ├── bank-account-modal.tsx   # Add/update bank account bottom-sheet
│   ├── create-store-modal.tsx   # Create new seller account form
│   ├── edit-store-modal.tsx     # Edit existing store (name, type, businessType, status)
│   ├── delivery-zones-modal.tsx # Custom delivery zone configuration
│   ├── kyc-upload-modal.tsx     # KYC document upload
│   ├── seller-ui.tsx            # Shared: KycBadge, RoleBadge
│   ├── app-tabs.tsx             # Bottom tab navigator
│   └── animated-icon.tsx        # Tab icon animation
│
├── context/
│   ├── store-context.tsx        # Active store state, live UserSvc fetch, team members
│   ├── language-context.tsx     # i18n: EN / TE / HI translation strings + t() hook
│   └── order-alert-context.tsx  # Order notification sound + badge state
│
├── services/
│   ├── user-api.ts              # All UserSvc API calls (users, sellers, team, bank)
│   └── catalog-api.ts           # All CatalogSvc API calls (products CRUD)
│
├── utils/
│   └── pincode.ts               # India Post API lookup + in-memory cache
│
├── data/
│   └── india-geo.ts             # State / district / mandal hierarchy for zone picker
│
├── hooks/
│   ├── use-app-colors.ts        # Dark/light mode color tokens via AppColors
│   └── use-color-scheme.ts
│
└── assets/
    └── sounds/
        ├── order-alert.m4a      # Order notification sound (iOS)
        └── order-alert.wav      # Order notification sound (Android)
```

---

## Backend Service Wiring

### Host URL Resolution

```typescript
// src/services/user-api.ts
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3002'   // Android emulator → host machine
  : 'http://localhost:3002';  // iOS simulator → host directly

// src/services/catalog-api.ts — same pattern on port 3003
```

**Physical device:** Replace `10.0.2.2` with your machine's local IP (e.g. `192.168.1.x`).

---

### UserSvc API (`src/services/user-api.ts`)

Port **3002**. All functions throw `Error` with the server's `error.title` on non-2xx responses.

#### Types
```typescript
type UserType     = 'buyer' | 'seller'
type SellerType   = 'farmer' | 'artisan' | 'dairy' | 'homefood' | 'trades' | 'kirana'
type BusinessType = 'retail' | 'wholesale'   // kirana only
type ShipsTo      = 'mandal' | 'district' | 'state' | 'national'
type SellerRole   = 'owner' | 'manager' | 'staff'
type MemberStatus = 'active' | 'pending'

interface Seller {
  id, userId?, name, type: SellerType, phone, email?,
  description?, imageUrl?, bannerUrl?, location, pincode,
  lat, lng, deliveryZones: ShipsTo[],
  businessType?: BusinessType,   // kirana only — retail or wholesale
  fssaiNumber?, address?,
  socialHandles?: { instagram?, facebook?, whatsapp?, website?, youtube? },
  verified, verifiedAt?, documentUrls, createdAt, updatedAt
}
```

#### API Functions

| Function | Method | Endpoint | Notes |
|---|---|---|---|
| `createUser(input)` | POST | `/v1/users` | 409 if phone exists |
| `getUser(id)` | GET | `/v1/users/:id` | |
| `updateUser(id, input)` | PATCH | `/v1/users/:id` | phone immutable |
| `listAddresses(userId)` | GET | `/v1/users/:id/addresses` | |
| `addAddress(userId, input)` | POST | `/v1/users/:id/addresses` | geocodes pincode server-side |
| `updateAddress(userId, addrId, input)` | PATCH | `/v1/users/:id/addresses/:addrId` | |
| `deleteAddress(userId, addrId)` | DELETE | `/v1/users/:id/addresses/:addrId` | |
| `listSellers(filters?)` | GET | `/v1/sellers` | filters: type, verified, userId, phone |
| `getSeller(id)` | GET | `/v1/sellers/:id` | |
| `createSeller(input)` | POST | `/v1/sellers` | blocks same phone+type; allows same phone+different type |
| `updateSeller(id, input)` | PATCH | `/v1/sellers/:id` | includes businessType for kirana |
| `getSellersByUser(userId)` | GET | `/v1/users/:id/sellers` | multi-store switcher |
| `addDocument(sellerId, url)` | POST | `/v1/sellers/:id/documents` | KYC doc URL |
| `removeDocument(sellerId, url)` | DELETE | `/v1/sellers/:id/documents` | |
| `listMembers(sellerId)` | GET | `/v1/sellers/:id/members` | |
| `inviteMember(sellerId, input)` | POST | `/v1/sellers/:id/members` | status: pending |
| `updateMemberRole(sellerId, memberId, input)` | PATCH | `/v1/sellers/:id/members/:memberId` | |
| `activateMember(sellerId, memberId, userId)` | PATCH | `.../activate` | X-User-Id header |
| `removeMember(sellerId, memberId)` | DELETE | `/v1/sellers/:id/members/:memberId` | |
| `getBankAccount(sellerId)` | GET | `/v1/sellers/:id/bank-account` | accountNumber masked |
| `setBankAccount(sellerId, input)` | POST | `/v1/sellers/:id/bank-account` | upsert |
| `updateBankAccount(sellerId, input)` | PATCH | `/v1/sellers/:id/bank-account` | |

---

### CatalogSvc API (`src/services/catalog-api.ts`)

Port **3003**. Seller identity is passed via `X-Seller-Id` header for ownership-protected operations.

#### Types
```typescript
type Category      = 'farm_products' | 'processed_foods' | 'foods' | 'arts_handmade' | 'services'
type ProductStatus = 'draft' | 'active' | 'archived'
type ShipsTo       = 'mandal' | 'district' | 'state' | 'national'

interface CatalogProduct {
  id, name, description, category, subCategory
  price, originalPrice?          // in paise — divide by 100 for ₹
  unit, stockQuantity
  sellerId, sellerName, location
  inStock                        // server-derived: stockQuantity > 0
  isVerified                     // admin-controlled, read-only
  isHandmade, shipsTo
  minimumOrderQty?               // wholesale kirana only — minimum units per order
  images                         // ordered list, max 5 URLs
  status, rating, reviewCount
  createdAt, updatedAt
}
```

#### API Functions

| Function | Method | Endpoint | Notes |
|---|---|---|---|
| `listProducts(filters?)` | GET | `/v1/products` | filters: category, subCategory, shipsTo, sellerId, status |
| `getProduct(id)` | GET | `/v1/products/:id` | |
| `createProduct(input)` | POST | `/v1/products` | |
| `updateProduct(id, input, sellerId)` | PATCH | `/v1/products/:id` | X-Seller-Id header |
| `deleteProduct(id, sellerId)` | DELETE | `/v1/products/:id` | X-Seller-Id header |

---

## Store Context (`src/context/store-context.tsx`)

The central state hub. Wraps the whole app in `_layout.tsx`.

### Context Value

```typescript
interface StoreContextValue {
  stores: Store[];
  activeStore: Store;
  teamMembers: TeamMember[];
  loadingStores: boolean;
  loadingTeam: boolean;
  setActiveStore(store: Store): void;
  addStore(store: Store): void;
  refreshTeam(): Promise<void>;
  refreshSeller(id: string): Promise<void>;
  updateStoreStatus(id: string, status: 'live' | 'offline'): void;
}
```

### Store Interface

```typescript
interface Store {
  id: string;
  name: string;
  type: SellerType;
  businessType?: BusinessType;   // kirana only
  category: string;
  icon: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  location: string;
  address?: string;
  phone: string;
  pincode: string;
  deliveryZones: ShipsTo[];
  customDeliveryZone?: CustomDeliveryZone;  // set via DeliveryZonesModal
  verified: boolean;
  fssaiNumber?: string;
  socialHandles?: { instagram?, facebook?, whatsapp?, website?, youtube? };
  status: 'live' | 'offline';
  role: SellerRole;
  memberCount: number;
  productCount: number;
  ordersToday: number;
  revenueToday: string;
}
```

### Exported Helpers

```typescript
SELLER_TYPE_CONFIG: Record<SellerType, { label, icon, category }>
DELIVERY_ZONE_CONFIG: Record<ShipsTo, { label, icon, bg, text }>
sellerToStore(seller, role?): Store
ROLE_CONFIG: Record<SellerRole, { label, bg, color }>
ROLE_PERMISSIONS: Record<SellerRole, { canEditProducts, canViewAnalytics, ... }>
```

---

## Language / Translation (`src/context/language-context.tsx`)

All UI strings go through `t('key')` — never hardcode display text in components.

### Usage
```typescript
const { t, language, setLanguage } = useLanguage();
// language: 'en' | 'te' | 'hi'
t('create_store_retail')  // → 'Retail' / 'రిటైల్' / 'रिटेल'
```

### Key Groups

| Prefix | Component |
|---|---|
| `create_store_*` | CreateStoreModal |
| `edit_store_*` | EditStoreModal |
| `product_form_*` | ProductFormModal |
| `profile_*` | profile.tsx |
| `delivery_zone_*` | DeliveryZonesModal |
| `kyc_*` | KycUploadModal |

### Kirana-specific keys added
```
create_store_business_model    — 'Business Model'
create_store_retail            — 'Retail'
create_store_retail_sub        — 'Sells to consumers'
create_store_wholesale         — 'Wholesale'
create_store_wholesale_sub     — 'Bulk to shops / resellers'
create_store_dup_title_prefix  — 'You already have a'
create_store_dup_title_suffix  — 'store'
create_store_dup_desc          — duplicate warning body
create_store_dup_confirm       — 'Create Anyway'
product_form_moq_label         — 'Minimum Order Quantity (MOQ)'
product_form_custom_area       — 'Custom Area'
product_form_custom_area_title — 'Custom Delivery Area'
product_form_custom_area_desc  — description text
```

---

## Pincode Utility (`src/utils/pincode.ts`)

Calls the India Post API and caches results in memory.

```typescript
export interface PincodeInfo { name: string; district: string; state: string; }

await lookupPincode('503245')
// → { name: 'Navipet', district: 'Nizamabad', state: 'Telangana' }
```

### Name resolution logic

| Condition | `name` value used |
|---|---|
| `BranchType === 'Head Post Office'` | `po.Name` (the PO name is the town) |
| `Block === District` | Sub Post Office `Name` from the list (avoids redundancy like "Nizamabad, Nizamabad") |
| Otherwise | `po.Block` (the mandal/block name) |

**Example — 503245:** District="Nizamabad", Block="Nizamabad" (same) → uses Sub PO "Navipet" instead.

---

## Components

### `CreateStoreModal`

Bottom-sheet form for registering a new seller account.

**Fields:**
- Store Type — all 6 types: `farmer | artisan | dairy | homefood | trades | kirana`
- Business Model — **kirana only**: Retail 🛍️ / Wholesale 📦 toggle
- Store Name, Mobile Number (auto-normalised to E.164), Location, Pincode
- Delivery Zones — cascade chip selector (see below)
- Custom Area toggle — stores a `customDeliveryZone` flag; full zone config via DeliveryZonesModal post-creation
- Description (optional), FSSAI License (optional)

**Duplicate store type warning:**
When creating a store with a type the user already has under the same phone, a soft inline warning appears ("You already have a 🏪 Kirana store…") with Cancel / **Create Anyway**. The backend additionally hard-blocks same phone + same type with a 409.

**Zone cascade:**
Selecting a zone auto-selects all lower zones. Deselecting removes all higher zones.
```
national → selects: national, state, district, mandal
district → selects: district, mandal
```

### `EditStoreModal`

Bottom-sheet form for editing an existing store.

**Fields:** Store Name, Description, Location, Address, Store Type, Business Model (kirana only), Status (Live / Offline)

- **Business Model toggle** shown only when `type === 'kirana'`; pre-fills from `store.businessType ?? 'retail'`
- Sends `businessType` in the PATCH payload only for kirana stores
- `kirana` is included in the type grid (can be changed to/from kirana)
- Status change is applied locally via `updateStoreStatus` in context (no extra API call)

### `ProductFormModal`

Bottom-sheet form for adding and editing products.

**Kirana-specific fields:**
- **Minimum Order Quantity (MOQ)** — shown only when store is `kirana` + `businessType === 'wholesale'`; sets `minimumOrderQty` on the product
- **Custom Area toggle** — shown when the active store has a `customDeliveryZone`; when enabled, `shipsTo` is derived automatically from the zone's finest granularity (mandal > district > state)

**Ships To cascade:** Chips highlight all lower zones when a higher zone is selected (same cascade logic as CreateStoreModal).

**Category filtering:** `CATEGORIES_BY_SELLER_TYPE` limits visible categories to those relevant for the active store type.

### `DeliveryZonesModal`

Configures `customDeliveryZone` on the active store — select specific states, districts, and mandals from the India geo hierarchy (`src/data/india-geo.ts`).

### `StoreSwitcher`

Lists all stores. Passes `existingTypes={stores.map(s => s.type)}` to `CreateStoreModal` to enable the duplicate-type warning.

---

## Order Alert Context (`src/context/order-alert-context.tsx`)

Manages real-time order notification state and sound playback. Wired into the orders tab header.

```typescript
const { hasNewOrders, clearAlerts, playAlertSound } = useOrderAlert();
```

Audio assets at `assets/sounds/order-alert.m4a` (iOS) and `.wav` (Android).

---

## Key Design Decisions

### 1. Seed data as immediate state, live data as overlay
The app renders immediately from hardcoded seed rather than showing a blank loading screen. UserSvc data is fetched in the background and merged without resetting the UI.

### 2. Multi-store under same phone
A seller can have multiple stores under one phone number as long as they are different types (e.g. farmer + kirana). The same phone + same type combination is blocked at the backend (409 ConflictError). The client shows a soft "Create Anyway" warning before hitting the backend, so the UX is friendly for intentional duplicates.

### 3. Kirana business model affects product form
`businessType` on the store flows down to product creation: wholesale kirana stores get the MOQ field; retail stores don't. This is derived via `isWholesale = storeType === 'kirana' && activeStore.businessType === 'wholesale'` in `ProductFormModal`.

### 4. Zone cascade anchored on DELIVERY_ZONES array order
```typescript
const DELIVERY_ZONES: ShipsTo[] = ['mandal', 'district', 'state', 'national'];
// Selecting idx=2 (state) → slice(0, 3) → ['mandal', 'district', 'state']
// Deselecting idx=1 (district) → slice(0, 1) → ['mandal']
```
This keeps selection logic to a single array operation with no special cases.

### 5. Pincode Sub PO fallback for ambiguous localities
When the India Post API returns a pincode where `Block === District` (common in district headquarters), using the Block name is redundant. The Sub Post Office name (e.g. "Navipet" for 503245) is a more useful locality label.

### 6. Account number never round-trips in full
`BankAccountModal` forces re-entry of the account number when updating because the API only returns `···1234` (masked). This is a deliberate security boundary.

### 7. Fixed seller IDs in UserSvc seed
UserSvc originally used `randomUUID()` in its seed loop, causing 404s on restart because IDs regenerated. Fixed by seeding with literal IDs (`seller-112`, `seller-105`, etc.) matching CatalogSvc and the app's store context.

### 8. Dark mode via `makeStyles(c: AppColors)`
Every component uses `const c = useAppColors(); const s = makeStyles(c)` — no hardcoded hex colours in JSX. `AppColors` tokens cover `bg`, `bgScreen`, `bgSubtle`, `primaryBg`, `text`, `textSub`, `textMuted`, `textFaint`, `border`, `borderLight`, `borderMid`, `primaryText`, `errorBg`, `errorBorder`, `errorText`.

---

## What's Next

| Feature | Requires | Notes |
|---|---|---|
| **Store Settings screen** | — | Full edit: imageUrl, bannerUrl, socialHandles, deliveryZones via `updateSeller` |
| **KYC Documents screen** | — | List `documentUrls`; `addDocument` / `removeDocument` |
| **Invite Team Member flow** | — | Form calling `inviteMember`; `refreshTeam` after |
| **Bank & Payouts screen** | — | Deeper bank account view; transaction history placeholder |
| **Real-time product count** | CatalogSvc | `listProducts({ sellerId })` count in store card |
| **Orders screen wiring** | OrderSvc | Wire OrderAlertContext to live order feed |
| **Analytics screen** | OrderSvc | Revenue charts, top products |
| **Auth / Login** | AuthSvc | Replace hardcoded `role: 'owner'`; wire `X-User-Id` for activateMember |
| **Image upload** | StoragePort (S3) | Upload → URL → `addDocument` or `imageUrl` |
| **Physical device support** | — | `catalog-api.ts` BASE_URL already platform-aware |
| **Translation wiring** | — | Replace remaining hardcoded strings in create-store-modal and product-form-modal with `t()` calls |
