# Rentals — Product Specification

A mobile-first website where local dress rental shops list their clothes and users browse them. When a user likes something, the site opens a ready-made WhatsApp message to that shop. **We are only a discovery platform:** no payments, bookings or delivery happen on the site. Shop and user agree everything on WhatsApp.

- **Launch city:** Barwani, Madhya Pradesh, India
- **Languages:** Hindi and English (toggle)
- **Framework:** Next.js (App Router)
- **Target users:** people with little experience of websites, often on cheap Android phones and slow connections. Every design choice should favour simplicity over features.

---

## 1. Roles

| Role | Account? | What they do |
|---|---|---|
| **User (customer)** | No account, ever | Browse, filter, search, save, share, send a WhatsApp enquiry |
| **Seller (shop)** | Yes: phone + OTP | Manage shop profile, upload products, update availability, see stats |
| **Admin** | Yes | Everything a seller can do, for any shop, plus moderation and platform settings |

---

## 2. Tech requirements

- **Next.js App Router with server-side rendering** for every public page: home, listing, product, shop.
  - **Product and shop pages must be server-rendered** with Open Graph tags. WhatsApp's link-preview fetcher does not run JavaScript, and the WhatsApp preview image is a core feature (see §7).
- **Database:** relational (recommended: PostgreSQL + Prisma).
- **Image storage:** object storage behind a CDN (e.g. S3-compatible storage or Cloudinary).
- **OTP:** put the SMS/WhatsApp OTP provider behind an interface so it can be swapped later. OTP costs money per message, so rate-limit sends.
- **Auth:** seller sessions in an httpOnly cookie, long-lived (30 days), so sellers rarely have to log in again.
- **Internationalisation:** all UI text in translation files (hi, en). Option lists (categories, colours, etc.) store both Hindi and English labels.
- **Performance budget:** pages must work on 3G and low-end Android.
  - WebP images, lazy loading, responsive sizes, minimal client JavaScript.
  - Installable PWA.

---

## 3. Data model

```
City ──< Area
Shop (belongs to Area) ──< Design ──< Product (one per colour) ──< ProductSize
                                         └──< ProductImage
```

### Shop
- `id`, `slug` (for the public shop URL)
- `shopName`, `ownerName`
- `loginPhone`, `whatsappPhone` (can be the same)
- `cityId`, `areaId`, `addressLine` (free text, used only for directions)
- `mapPin` (optional lat/lng), `shopPhoto` (optional)
- `status`: `pending | approved | suspended`
- `isVerified` (badge)
- `createdAt`, `updatedAt`

### Design
Shared data for all colours of the same dress.
- `id`, `shopId`
- `categoryId`, `forWhom[]`, `ageRangeIds[]`, `occasionIds[]`
- `description` (optional, the only free-text field)
- `setPieces[]`: which pieces come with it, e.g. Blouse, Skirt, Dupatta. Chosen from an option list; the count is derived.
- **Pricing (all optional, at least one required):**
  - `rentPerDay`
  - `rentPerWeek`
  - `sellPrice`
  - `securityDeposit` (optional)
- `measurements` (JSON, reserved for later)

### Product
One per colour. This is the thing users browse.
- `id`, `designId`
- `code`: short public code, unique and auto-generated, e.g. `R1042`
- `colourId`
- `title`: auto-generated from category + colour + for-whom, in both languages, e.g. "Green Lehenga – Women" / "हरा लहंगा – महिला"
- `isHidden`
- `isFeatured` (set by admin only)
- `lastSellerTouchAt`: updated whenever the seller edits or changes availability
- `viewCount`, `enquiryCount` (counters; raw events are stored separately)

### ProductSize
Availability is tracked **per size**.
- `id`, `productId`, `sizeId`
- `stockCount`: how many pieces of this size the shop has
- `availableCount`: 0 to stockCount
- `freeFromDate` (optional): when `availableCount` returns to `stockCount`
- `soldCount` (for items that are for sale)

### ProductImage
- `id`, `productId`, `url`, `ogUrl`, `sortOrder`
- The first image is the cover.
- Each colour has **its own** images.

### Option lists (admin-managed, bilingual)
- `Category`: Lehenga, Saree, Gown, Sherwani, Kurta Set…
- `Occasion`: Haldi, Mehendi, Wedding, Sangeet, Party, Festival…
- `Colour`: name (hi/en) + hex value; shown as colour circles
- `Size`
- `AgeRange`
- `ForWhom`: Women, Men, Girls, Boys
- `SetPiece`
- `City`, `Area`
- `SearchSynonym`: e.g. lehnga / lehenga / लहंगा → Lehenga

### Events and moderation
- `ProductView` (productId, timestamp)
- `EnquiryClick` (productId, sizeId?, timestamp)
- `Report` (productId, reason, status, timestamp)
- `AuditLog` (actor, action, entity, before/after, timestamp)

---

## 4. Seller onboarding

Keep it to the fewest possible steps.

1. Enter mobile number → receive OTP → verify.
2. **One form:**
   - Shop name
   - Owner name
   - WhatsApp number, with a "Same as login number" tick (ticked by default)
   - City dropdown (Barwani preselected) → Area dropdown
   - Address line
   - Optional: shop photo, map pin
3. Account is created with status **Pending**. Show a clear "Waiting for approval" screen.
4. After admin approves, the shop goes live.

**Seller account settings:**
- Change WhatsApp number
- Edit profile
- Log out
- Delete account (soft-delete the shop and hide its products)

---

## 5. Product upload

**Rule: everything is choose-from-options (chips, buttons, colour circles). There are no dropdowns for main fields, and the only typing is the optional description.**

Steps (one scrolling page or a short wizard, mobile-first):

1. **Category:** chips
2. **For whom:** chips
3. **Age range:** chips (multi-select)
4. **Occasions:** chips (multi-select)
5. **Set pieces:** chips (multi-select)
6. **Colours:** tap one or more colour circles.
   - **Choosing N colours creates N Products** under one Design.
   - Shared fields (category, occasions, price, description…) are entered once.
   - For **each colour** the seller then sets:
     - **Images:** multiple, chosen from the camera or gallery (the per-product image limit is a config value, decided later)
     - **Sizes:** tap the sizes available, and set a **stock count** for each size with a +/− stepper (default 1)
7. **Pricing:** per day / per week / selling price. Each is optional, but at least one is required. Security deposit is optional. Use a numeric keypad.
8. **Description:** optional text box.
9. **Save:** the products go live immediately (the shop is already approved). A code is auto-generated for each product.

**Image handling:**
- Compress in the browser before upload: WebP, max about 1600px on the long side.
- After upload, also generate an OG-friendly version: about 1200px, under 300 KB, JPEG for widest WhatsApp support.
- Seller can reorder images (first image = cover) and delete them.

**Later (keep space for it, don't build yet):** measurement fields.

---

## 6. Seller dashboard

- **One list of product cards**, each showing:
  - Cover photo, title, code
  - **One row per size** with a big availability control:
    - Shows "X of N available"
    - +/− buttons to change `availableCount`
    - When it reaches 0, offer an optional **"Free from [date]"** picker
    - On that date, `availableCount` resets to `stockCount` automatically (daily job)
  - **Hide / Show** toggle for the whole product
  - **Mark Sold** (for sale items; reduces stock)
  - Views and WhatsApp clicks (last 30 days and all time)
  - Actions: **Edit**, **Duplicate** (copies the design into a new draft), **Delete**
- **Stale warning:** products with `lastSellerTouchAt` older than 30 days show a "Still available? Tap to confirm" banner. Confirming updates the timestamp.
- **"Add product"** button always visible.
- **"My shop page"** link with a Share-on-WhatsApp button, so sellers can post it on their WhatsApp status.

---

## 7. Discovery (users, no account)

### Home / listing page
- **Location:** defaults to Barwani. Show the city selector even though there's only one city for now.
- **Quick-filter chip rows**, generated from the option lists:
  - Occasion (Haldi, Wedding…)
  - Category (Lehenga, Saree…)
  - Colour (colour circles)
  - For whom
- **Filter panel:** size, age range, price range, rent / buy, area.
- **Sort:** Recommended (default), Newest, Price low→high, Price high→low.
  - **Recommended ordering:**
    1. Available items first
    2. Then items rented out with a free-from date
    3. Featured items boosted
    4. Stale items (no seller update in 30 days or more) ranked lower
- **Search box:**
  - Matches titles, categories, occasions and colours in both languages
  - Expands via `SearchSynonym`
  - Tolerates common spelling variants
- **Product card:** cover image, title, price (e.g. "₹500 / din"), shop name and area, plus a badge:
  - "Available"
  - "Rented — free from 12 Nov"
  - "All rented"
- **Hidden products never appear.** Fully rented products **do** appear, with their badge.
- Infinite scroll or "Load more".

### Product detail page (`/p/[code]`)
- Swipeable image gallery
- Colour switcher showing sibling products of the same design
- Size chips showing availability per size
- Price block: per day / per week / selling price / deposit
- Set pieces, occasions, for whom, age range, description
- Shop card: name, area, verified badge, link to the shop page
- **Primary button:** "WhatsApp पर पूछें / Ask on WhatsApp"
- Secondary buttons:
  - 📞 Call
  - ❤️ Save
  - Share on WhatsApp
  - Report this listing
- **Server-rendered Open Graph tags:**
  - `og:title`: title + price
  - `og:description`: shop name + area
  - `og:image`: absolute https URL to the OG image version
  - `og:url`

### Shop page (`/shop/[slug]`)
- Shop info and all visible products, with the same filters
- Share button
- Server-rendered OG tags (shop photo, or the cover of the first product)

### Saved items
- Stored in `localStorage` only; no login
- A "Saved" page lists them
- Wrap storage reads and writes in try/catch, because storage can fail on some phones

### Share
- "Share on WhatsApp" opens `https://wa.me/?text=<title> <product URL>`. The OG preview shows the dress.

---

## 8. Rent / enquiry flow (most important)

1. User taps **"WhatsApp पर पूछें"** (the selected size, if any, is passed along).
2. **A pop-up opens** showing:
   - Product cover image, title, code, price
   - One line: "Rent ki baat karne ke liye dukaan ko WhatsApp par message bhejein" (English version when English is selected)
   - Big green button **"WhatsApp पर भेजें"** and a **Cancel** button
   - A small hint showing WhatsApp's send ➤ icon with the text "WhatsApp khulne par bas send dabayein"
3. When the user taps the button:
   - Record an `EnquiryClick` using `navigator.sendBeacon` so it isn't lost when the page navigates away
   - Open `https://wa.me/91<whatsappPhone>?text=<encoded message>`
4. **Pre-filled message** (in the user's chosen language; the product URL **must** be in it so WhatsApp shows the image preview):

```
Namaste 🙏 Mujhe yeh dress chahiye:
👗 Green Lehenga – Women
🔖 Code: R1042
📏 Size: M
🔗 https://<domain>/p/R1042
Kya yeh available hai?
```

   - Leave out the Size line when no size was selected.
   - The product code and title are always included, in case the link preview doesn't load.

**Why not attach the image directly:**
- `wa.me` links can only carry text.
- The Web Share API can share an image file, but the user would then have to pick WhatsApp and search for the shop's contact. That's too many steps for these users.
- The OG link preview is the chosen approach.

**Call button:** `tel:+91<whatsappPhone>`.

---

## 9. Admin panel ("god mode")

- **Shops:**
  - List / search shops
  - Approve, suspend, delete
  - Verified badge
  - **Create a shop on a seller's behalf** without OTP (for onboarding the first shops in person)
- **Login as seller:** see and act on that seller's dashboard exactly as they would
- **Products:** everything a seller can do, for any shop, plus Feature / Unfeature and force-hide
- **Option lists:** create, edit, reorder and disable categories, occasions, colours, sizes, age ranges, for-whom options, set pieces, cities, areas and search synonyms (both languages)
- **Reports queue:** view reported listings, resolve or dismiss them, hide the product
- **Stats:**
  - Total shops and products
  - Views and enquiry clicks over time
  - Top products and top shops
- **Audit log** of every admin and seller change to shops, products and availability
- Admin accounts are separate from sellers and protected by role

---

## 10. Report a listing

The button on the product page opens a small sheet with reason chips:
- Not available
- Wrong price
- Wrong photos
- Fake / scam
- Other

No login is needed. Rate-limit by IP.

---

## 11. Language

- Hindi / English toggle in the header.
- On the first visit, show a language choice pop-up. Remember the choice in `localStorage`.
- Applies to UI text, option labels, product titles and the WhatsApp message.

---

## 12. Static pages

- **About**
- **How it works:** a simple 3-step illustration (Browse → Ask on WhatsApp → Talk to the shop)
- **For shops:** how to join
- **Terms:** we are a discovery platform only and not a party to any rental or sale
- **Privacy:** what is stored. Seller phone numbers are public by design; no user personal data is collected.

---

## 13. UX rules (apply everywhere)

- Mobile-first; large tap targets (at least 48px)
- Icons next to every label
- Short text, simple Hindi
- No dropdowns for main choices: use chips, buttons and colour circles
- Prices always shown as "₹X / din" or "₹X / hafta"
- Clear empty states, plus loading skeletons instead of spinners
- Works without WhatsApp Desktop: `wa.me` falls back to WhatsApp Web on desktop

---

## 14. Background jobs

- **Daily:**
  - Reset `availableCount` to `stockCount` for sizes whose `freeFromDate` has passed, then clear the date
  - Recompute stale flags for ranking
- **On image upload:** generate the OG version

---

## 15. Not in scope (for now)

- Payments, bookings, calendars, delivery
- User accounts
- In-site chat
- Reviews / ratings
- Measurement fields (reserved in the data model)
- Monetisation: only `isFeatured` exists for now; no billing
- Image-count limit per product (config value, decided later)
- Automated WhatsApp reminders to sellers
