# HarvestConnect Seller App — Implementation Guide

**Repo:** `Ky-HarvestConnect-SellerAppUIV1`  
**Branch:** `features/Pramod/seller-app-product-enhancements`  
**Stack:** Expo SDK 56 · Expo Router · React Native · React 19 · TypeScript

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Seller App (React Native)                │
│                                                         │
│  Screens          Components          Context           │
│  ─────────        ──────────          ───────           │
│  index.tsx        toast-provider      StoreProvider     │
│  products.tsx     store-switcher      (active store,    │
│  profile.tsx      product-form-modal  team members,     │
│  orders.tsx       bank-account-modal  live fetch)       │
│  analytics.tsx    create-store-modal                    │
│                   seller-ui                             │
└────────────────────┬────────────────────────────────────┘
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

---

## File Structure

```
src/
├── app/                     # Expo Router screens
│   ├── _layout.tsx          # Root layout: StoreProvider + ToastProvider wrappers
│   ├── index.tsx            # Dashboard / home screen
│   ├── products.tsx         # Product listing, status toggle, delete
│   ├── profile.tsx          # Store profile, team, bank account, store list
│   ├── orders.tsx           # Orders screen (placeholder)
│   └── analytics.tsx        # Analytics screen (placeholder)
│
├── components/
│   ├── toast-provider.tsx   # In-app toast + confirm bottom-sheet system
│   ├── store-switcher.tsx   # Store switcher modal (switch between seller accounts)
│   ├── product-form-modal.tsx  # Add/edit product bottom-sheet form
│   ├── bank-account-modal.tsx  # Add/update bank account bottom-sheet
│   ├── create-store-modal.tsx  # Create new seller account form
│   ├── seller-ui.tsx        # Shared: KycBadge, RoleBadge
│   ├── app-tabs.tsx         # Bottom tab navigator
│   └── animated-icon.tsx    # Tab icon animation
│
├── context/
│   └── store-context.tsx    # Active store state, live UserSvc fetch, team members
│
├── services/
│   ├── user-api.ts          # All UserSvc API calls (users, sellers, team, bank)
│   └── catalog-api.ts       # All CatalogSvc API calls (products CRUD)
│
├── hooks/
│   ├── use-theme.ts
│   └── use-color-scheme.ts
│
└── constants/
    └── theme.ts
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
const BASE_URL = 'http://10.0.2.2:3003';  // TODO: make platform-aware
```

**Physical device:** Replace `10.0.2.2` with your machine's local IP (e.g. `192.168.1.x`).

---

### UserSvc API (`src/services/user-api.ts`)

Port **3002**. All functions throw `Error` with the server's `error.title` on non-2xx responses.

#### Types
```typescript
type UserType    = 'buyer' | 'seller'
type SellerType  = 'farmer' | 'artisan' | 'dairy' | 'homefood' | 'trades'
type ShipsTo     = 'mandal' | 'district' | 'state' | 'national'
type SellerRole  = 'owner' | 'manager' | 'staff'
type MemberStatus = 'active' | 'pending'

interface User        { id, name, phone, email?, type, verified, createdAt, updatedAt }
interface Address     { id, userId, label, line1, line2?, city, district, state,
                        pincode, lat, lng, isDefault, createdAt, updatedAt }
interface Seller      { id, userId?, name, type, phone, email?, description?,
                        imageUrl?, location, pincode, lat, lng, deliveryZones,
                        fssaiNumber?, verified, verifiedAt?, documentUrls,
                        createdAt, updatedAt }
interface SellerMember { id, sellerId, userId?, name, phone, role, status,
                         invitedAt, joinedAt? }
interface BankAccount { id, sellerId, accountHolderName, accountNumber,  // masked ···XXXX
                        ifscCode, bankName, upiId?, createdAt, updatedAt }
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
| `getSeller(id)` | GET | `/v1/sellers/:id` | inter-service contract endpoint |
| `createSeller(input)` | POST | `/v1/sellers` | always starts unverified |
| `updateSeller(id, input)` | PATCH | `/v1/sellers/:id` | |
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
type SubCategory   = 'grains_staples' | 'vegetables_spices' | 'animal_products' | 'pastes_powders'
                   | 'oils' | 'preserved_packaged' | 'furniture' | 'iron_works' | 'vendor_products'
                   | 'dealer_products' | 'materials_finishes' | 'utilities' | 'beauty_wellness'
                   | 'technical' | 'construction_finishing' | 'mechanical' | 'rentals'
type ProductStatus = 'draft' | 'active' | 'archived'
type ShipsTo       = 'mandal' | 'district' | 'state' | 'national'

interface CatalogProduct {
  id, name, description, category, subCategory
  price, originalPrice?       // in paise — divide by 100 for ₹
  unit, stockQuantity
  sellerId, sellerName, location
  inStock                     // server-derived: stockQuantity > 0
  isVerified                  // admin-controlled, read-only
  isHandmade, shipsTo
  images                      // ordered list, max 5 URLs
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

#### Ownership verification (server-side)
```
No header     → 401 Unauthorized
Wrong sellerId → 403 Forbidden
Correct seller → execute operation
```

---

## Store Context (`src/context/store-context.tsx`)

The central state hub. Wraps the whole app in `_layout.tsx`.

### What it does

1. **Seed data as starting state** — 3 pre-seeded stores (seller-112, seller-113, seller-105) render immediately
2. **Live fetch on mount** — calls `getSeller(id)` for each seeded store in parallel; merges live fields (name, type, phone, location, pincode, deliveryZones, description, imageUrl, verified, fssaiNumber) over the seed
3. **Team fetch on store switch** — calls `listMembers(sellerId)` whenever active store changes; updates `memberCount` on the store object
4. **Offline fallback** — if UserSvc is unreachable, seed data is used unchanged (no crash)
5. **addStore** — called after `createSeller` succeeds; appends the new store and switches to it

### Context Value

```typescript
interface StoreContextValue {
  stores: Store[];              // full list; starts as seed, updates from UserSvc
  activeStore: Store;           // derived from storeList + activeStoreId
  teamMembers: TeamMember[];    // live members for the active store
  loadingStores: boolean;       // true while fetching all sellers on mount
  loadingTeam: boolean;         // true while fetching members on store switch
  setActiveStore(store: Store): void;
  addStore(store: Store): void; // adds new store and switches to it
  refreshTeam(): Promise<void>; // re-fetch team after invite/remove
  refreshSeller(id: string): Promise<void>; // re-fetch single seller after profile update
}
```

### Exported Helpers

```typescript
// Maps SellerType → display label, icon, category string
SELLER_TYPE_CONFIG: Record<SellerType, { label, icon, category }>

// Maps ShipsTo → display label, icon, bg/text colours for badges
DELIVERY_ZONE_CONFIG: Record<ShipsTo, { label, icon, bg, text }>

// Converts a UserSvc Seller API response to a Store UI object
sellerToStore(seller: Seller, role?: SellerRole): Store

// Role colours for pills and badges
ROLE_CONFIG: Record<SellerRole, { label, bg, color }>

// Role-based permission flags
ROLE_PERMISSIONS: Record<SellerRole, {
  canEditProducts, canViewAnalytics, canManagePayouts, canInviteMembers
}>
```

### Store Interface

```typescript
interface Store {
  id: string;             // sellerId — matches UserSvc and CatalogSvc
  name: string;
  type: SellerType;
  category: string;       // UI-only: human-readable label
  icon: string;           // UI-only: emoji for the store avatar
  description?: string;
  imageUrl?: string;
  location: string;
  phone: string;
  pincode: string;
  deliveryZones: ShipsTo[];
  verified: boolean;
  fssaiNumber?: string;
  role: SellerRole;       // this user's role — 'owner' for self-created stores
  memberCount: number;    // updated from listMembers response
  productCount: number;   // placeholder — future: from CatalogSvc
  ordersToday: number;    // placeholder — future: from OrderSvc
  revenueToday: string;   // placeholder — future: from OrderSvc
}
```

### Seller ID Alignment

All three systems must use the same seller IDs for inter-service lookups to work:

| Seller | ID | CatalogSvc seed | UserSvc seed | App seed |
|---|---|---|---|---|
| Desi Dairy Armoor | `seller-112` | ✓ | ✓ (fixed) | ✓ |
| Amma Kitchen | `seller-113` | ✓ | ✓ (fixed) | ✓ |
| Spice Route Nizamabad | `seller-105` | ✓ | ✓ (fixed) | ✓ |

UserSvc previously used `randomUUID()` in the seed loop — this broke cross-service lookups on every restart. Fixed by using `this.store.set(fixedId, seller)` directly in the seed method.

---

## In-App Toast System (`src/components/toast-provider.tsx`)

Replaces all native `Alert.alert()` calls with themed in-app overlays.

### Usage

```typescript
import { useToast } from '@/components/toast-provider';

const { showToast, showConfirm } = useToast();

// Toast notification (auto-dismisses after 3.2s)
showToast('Product deleted.', 'success');
showToast('You can add up to 5 images.', 'warning');
showToast(e.message, 'error');
showToast('Feature is coming soon.', 'info');

// Confirmation bottom-sheet
showConfirm({
  title: 'Delete Product',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  destructive: true,
  onConfirm: async () => { await deleteProduct(id, sellerId); },
});
```

### Toast Variants

| Type | Background | Border | Icon | Text |
|---|---|---|---|---|
| `success` | `#f0fdf4` | `#86efac` | ✅ | `#166534` |
| `error` | `#fef2f2` | `#fca5a5` | ✕ | `#991b1b` |
| `warning` | `#fffbeb` | `#fde68a` | ⚠️ | `#92400e` |
| `info` | `#f0f9ff` | `#bae6fd` | 💬 | `#075985` |

### Where it's used

| Screen / Component | Event | Type |
|---|---|---|
| `profile.tsx` | Menu item press (coming soon) | info |
| `profile.tsx` | Bank account saved | success |
| `profile.tsx` | New store created | success |
| `products.tsx` | Toggle status error | error |
| `products.tsx` | Delete product (confirm) | — (confirm sheet) |
| `products.tsx` | Delete error | error |
| `product-form-modal.tsx` | 6th image attempt | warning |

### Provider Setup (`src/app/_layout.tsx`)

```tsx
<StoreProvider>
  <ToastProvider>
    <AnimatedSplashOverlay />
    <AppTabs />
  </ToastProvider>
</StoreProvider>
```

---

## Screens

### `index.tsx` — Dashboard

Shows today's summary cards (orders, revenue, pending actions) for the active store. Data is currently seeded from the store context. Future: wire to OrderSvc.

### `products.tsx` — Product Management

- Fetches products via `listProducts({ sellerId: activeStore.id })` from CatalogSvc
- Status toggle: `updateProduct` with `{ status: 'active' | 'archived' }`
- Delete: `showConfirm` → `deleteProduct(id, activeStore.id)`
- Floating `+` button opens `ProductFormModal`
- `X-Seller-Id` header is sent automatically by `updateProduct` / `deleteProduct`

### `profile.tsx` — Store Profile

The most feature-rich screen. Sections:
1. **Header** — active store avatar (tap to switch), name, role badge, location, store stats
2. **KYC + Bank** — verification badge from `activeStore.verified`; payout row fetches `getBankAccount` on mount; Add/Change opens `BankAccountModal`
3. **Delivery Coverage** — badges rendered from `activeStore.deliveryZones` via `DELIVERY_ZONE_CONFIG`
4. **FSSAI** — `activeStore.fssaiNumber` with Active/Pending badge
5. **My Stores** — all stores from context; tap to switch; **＋ New** opens `CreateStoreModal`
6. **Team Members** — live from `listMembers` via context; spinner while `loadingTeam`; Invited/Joined dates formatted from ISO timestamps
7. **Menu** — navigation and coming-soon items
8. **Seller Tier** — static display
9. **Logout**

### `orders.tsx` / `analytics.tsx`

Placeholder screens — to be wired when OrderSvc is built.

---

## Components

### `ProductFormModal`

Bottom-sheet form for creating and editing products. Fields match `CatalogProduct`:
- Name, description, category (with sub-category that updates based on category), price, original price, unit, stock quantity, shipsTo, isHandmade, images (max 5 URLs), status

On create: calls `createProduct(input)`.  
On edit: calls `updateProduct(id, input, activeStore.id)` with `X-Seller-Id`.

### `BankAccountModal`

Bottom-sheet form for bank account. Fields: account holder name, account number (`secureTextEntry`), IFSC code (auto-uppercased, regex-validated `^[A-Z]{4}0[A-Z0-9]{6}$`), bank name, UPI ID (optional).

- **Existing account**: pre-fills all fields except account number (only masked version available from API; user must re-enter to change)
- Calls `setBankAccount(sellerId, input)` — upsert semantics (safe for both add and change)
- Success → updates payout row in profile via `setBankAccountState`

Validation (client-side before API call):
- Account number: `^\d{9,18}$`
- IFSC: `^[A-Z]{4}0[A-Z0-9]{6}$`

### `CreateStoreModal`

Bottom-sheet form for registering a new seller account on UserSvc.

Fields:
- **Store Type** — horizontal scroll selector (Farmer/Dairy/Home Food/Artisan/Trades) with icon chips
- **Store Name** — text input
- **Mobile Number** — auto-normalises: `9876543210` → `+919876543210`; `919876543210` → `+919876543210`
- **Location** — display string (e.g. "Nizamabad, Telangana")
- **Pincode** — 6-digit number; UserSvc geocodes this to lat/lng
- **Delivery Zones** — 2×2 checkbox grid (Mandal / District / State / All India)
- **Description** — optional, multiline
- **FSSAI License** — optional

On save:
1. Validates all required fields client-side
2. Calls `createSeller(input)` → UserSvc returns a Seller with a server-assigned UUID
3. Calls `sellerToStore(seller, 'owner')` to convert to Store
4. Calls `addStore(store)` in context → list updates, active store switches
5. Shows success toast

New stores start as `verified: false`. The KYC badge on the new store will show "Pending" until an admin verifies via `PATCH /v1/sellers/:id/verify`.

### `StoreSwitcher`

Modal that lists all stores and lets the user tap to switch active store.

### `KycBadge` / `RoleBadge` (`seller-ui.tsx`)

```tsx
<KycBadge status="verified" />   // green "Verified ✓" pill
<KycBadge status="pending" />    // amber "Pending" pill

<RoleBadge role="owner" />       // role pill using ROLE_CONFIG colours
```

---

## Key Design Decisions

### 1. Seed data as immediate state, live data as overlay
The app renders immediately from hardcoded seed rather than showing a blank loading screen. UserSvc data is fetched in the background and merged without resetting the UI.

### 2. `teamMembers` is per-active-store, not a Record
Changed from `Record<string, TeamMember[]>` to `TeamMember[]`. The context always holds the team for the currently active store, fetched fresh on every store switch. This keeps memory lean and data fresh.

### 3. Account number never round-trips in full
`BankAccountModal` forces re-entry of the account number when updating because the API only returns `···1234` (masked). This is a deliberate security boundary — the app never holds the full number.

### 4. Fixed seller IDs in UserSvc seed
UserSvc originally used `randomUUID()` in its seed loop. This caused `getSeller('seller-112')` to 404 on every restart because IDs regenerated. Fixed by seeding with literal IDs (`seller-112`, `seller-105`, etc.) matching catalog-svc and the app's store context.

### 5. Phone auto-normalisation in CreateStoreModal
Users type Indian numbers in many formats. The modal accepts `9876543210`, `919876543210`, or `+919876543210` and normalises to E.164 (`+91XXXXXXXXXX`) before sending to UserSvc.

---

## What's Next

| Feature | Requires | Notes |
|---|---|---|
| **Store Settings screen** | — | Edit seller name, description, imageUrl, deliveryZones via `updateSeller` |
| **KYC Documents screen** | — | List `documentUrls`; call `addDocument` / `removeDocument` |
| **Invite Team Member** | — | Form calling `inviteMember`; refresh via `refreshTeam` after |
| **Bank & Payouts screen** | — | Deeper bank account view; transaction history placeholder |
| **Real-time product count** | CatalogSvc | `listProducts({ sellerId })` count in store card |
| **Orders screen** | OrderSvc | Wire when UC-ORD-01 is built |
| **Analytics screen** | OrderSvc | Revenue charts, top products |
| **Auth / Login** | AuthSvc | Replace hardcoded `role: 'owner'`; wire `X-User-Id` for activateMember |
| **Image upload** | StoragePort (S3) | Upload to storage → get URL → call `addDocument` or set `imageUrl` |
| **Physical device support** | — | Make `catalog-api.ts` BASE_URL platform-aware (same as user-api.ts) |
