# RentWear — UI Reference Guide

> A practical design reference for recreating the RentWear premium outfit-rental collection page shown in the supplied screenshot.
>
> **Design direction:** premium, editorial, elegant, trustworthy, and easy to shop.  
> **Important:** Color values and measurements below are visual estimates from the reference image, not original design tokens.

## 1. Design principles

- **Premium editorial feel:** use an elegant serif for major headlines and a clean sans-serif for functional UI.
- **Calm visual hierarchy:** navy anchors the interface; warm ivory and pale blue keep it light.
- **Product-first layout:** product photography should dominate the browsing experience.
- **Clear rental information:** show the rental price per day and make the rental action prominent.
- **Low-friction discovery:** filters, search, sorting, and view controls should remain easy to find.
- **Consistent components:** reuse radii, borders, button styles, spacing, and typography throughout.

## 2. Color palette

The following palette approximates the screenshot.

| Token | Suggested value | Usage |
|---|---|---|
| Deep navy | `#0E3758` | Main navigation, dark backgrounds, primary brand surface |
| Primary blue | `#174F75` | Primary buttons, active controls, selected filter options |
| Mid blue | `#648CAC` | Decorative hero shapes, secondary blue accents |
| Pale blue | `#EAF2F8` | Hero background, soft highlights, selected states |
| Warm ivory | `#FBF9F7` | Main page and card backgrounds |
| Soft beige | `#D8C0AA` | Warm neutral surfaces and photography framing |
| Gold accent | `#D9A441` | Small highlights, stars, premium details |
| Text ink | `#15263A` | Main headings and body text |
| Muted text | `#657181` | Supporting copy, metadata, secondary labels |
| Border gray | `#E5E2DF` | Dividers, input borders, subtle card outlines |
| White | `#FFFFFF` | Inputs, cards, and contrast surfaces |

### Color usage rules

- Use deep navy for the global header and primary brand moments.
- Use primary blue for filled CTAs and selected controls.
- Reserve gold for small accents; do not use it for large surfaces.
- Use warm ivory instead of pure white for large page backgrounds.
- Keep text ink dark enough to remain readable over pale surfaces.
- Avoid introducing several unrelated saturated colors.

## 3. Typography

Use a two-family typography system.

| Role | Suggested font | Weight | Approximate size |
|---|---|---:|---:|
| Hero heading | Playfair Display / Georgia | 600–700 | 40–44 px |
| Section heading | Playfair Display / Georgia | 600–700 | 28–30 px |
| Product name | Inter / Arial | 600 | 16–18 px |
| Body text | Inter / Arial | 400 | 14–16 px |
| Navigation | Inter / Arial | 500–600 | 15–16 px |
| Filter heading | Inter / Arial | 600 | 14–15 px |
| Metadata | Inter / Arial | 400 | 12–14 px |
| Price | Inter / Arial | 700 | 20–22 px |
| Button label | Inter / Arial | 600 | 14 px |

### Typography rules

- Serif is for editorial emphasis: hero and major section headings.
- Sans-serif is for navigation, filters, product details, prices, and controls.
- Use the italic serif style selectively, as in “for Every Occasion”.
- Keep body copy compact and readable; avoid too many font sizes.
- Use consistent line heights: roughly 1.15–1.25 for headings and 1.4–1.55 for body copy.

## 4. Page structure

The page is composed of four main horizontal regions:

1. **Global navigation bar**
2. **Hero banner**
3. **Product browsing area**
   - Filter sidebar
   - Product listing header and controls
   - Product grid
4. **Additional product rows** continuing below the visible fold

### Desktop layout

- Header: full width, approximately 68 px high.
- Hero: full width, approximately 235 px high.
- Main content: centered with approximately 4–4.5% horizontal page padding.
- Main browsing area: two columns.
  - Filter sidebar: approximately 320 px wide.
  - Product area: fills the remaining width.
- Product grid: four columns at the reference viewport.
- Grid gap: approximately 24–28 px.
- Sidebar-to-grid gap: approximately 28–36 px.

Use a responsive layout rather than hardcoding the screenshot's exact pixel dimensions.

## 5. Component specifications

### 5.1 Navigation bar

**Purpose:** brand identity, primary navigation, search, and user actions.

Elements, from left to right:

- Hanger icon and RentWear wordmark
- Home
- Browse (active)
- How It Works
- Collections
- Search field
- Wishlist icon
- Shopping bag icon with item-count badge
- Profile icon

**Styling**
- Deep navy background.
- White navigation text and line icons.
- Gold or pale-blue underline for the active navigation item.
- Search field uses a light surface, rounded corners, and a leading search icon.
- Keep icon buttons visually consistent and generously clickable.
- The bag count appears as a small circular badge.

### 5.2 Hero banner

**Content**
- Main heading: “Rent Premium Outfits”
- Italic supporting headline: “for Every Occasion”
- Supporting line: “Designer looks, without the purchase.”
- Three reassurance points:
  - Rent for 1–7 Days
  - Professionally Cleaned
  - Sustainable & Affordable
- Primary action: “Explore Collection”
- Large lifestyle/product image showing premium outfits on hangers.

**Styling**
- Pale blue and ivory background.
- Abstract curved blue shapes add depth without competing with the text.
- Text sits on the left; outfit imagery sits on the right.
- Use a large serif heading and a dark-blue CTA.
- Keep the hero image cropped cleanly and avoid covering the headline.

### 5.3 Filter sidebar

**Purpose:** narrow the product collection without leaving the page.

**Container**
- Warm ivory/light neutral surface.
- Rounded outer corners.
- Subtle border or shadow.
- Internal padding around 16–24 px.

**Filter groups visible in the reference**
- Category: Men, Women, Unisex
- Occasion: Wedding, Party, Formal, Festive, Casual
- Rental Duration: 1 Day, 3 Days, 7 Days
- Size: XS, S, M, L, XL, XXL
- Price (per day): range slider

**Interactions**
- “Clear All” resets every selected filter.
- Category and occasion use checkboxes.
- Filter group headings can collapse/expand.
- Rental duration uses pill-style single selection.
- Size uses compact selectable chips.
- Price uses a two-ended range slider with visible minimum and maximum values.
- Selected states use primary blue with clear contrast.

### 5.4 Product listing header

Contains:

- Section title: “All Outfits”
- Result count: “128 outfits available for rent”
- Grid/list view toggle
- Sort label and dropdown (default: “Most Popular”)

**Styling**
- Section title uses the serif display style.
- Result count uses smaller muted sans-serif text.
- Active view toggle uses a filled navy/blue background.
- Inactive toggle remains light with a subtle border.
- Sort dropdown uses a white or ivory surface and rounded border.

### 5.5 Product card

**Card anatomy**
1. Large product image
2. Optional status badge (Trending, Premium, New)
3. Wishlist heart control
4. Product name
5. Star rating and review count
6. Rental price per day
7. “Rent Now” CTA

**Styling**
- Image is the dominant visual element.
- Use a consistent image ratio across the grid; the reference is close to portrait 4:3.
- Image corners are rounded (approximately 14–16 px).
- Card surface is white/warm ivory with a subtle border and soft shadow.
- Product name is medium-bold.
- Rating star is gold; rating text is dark ink.
- Price is bold and visually prominent.
- CTA is full-width, deep/primary blue, with white text and rounded corners.

**Example product content from the screenshot**
- Classic Navy Tuxedo — 4.8 (236) — ₹899 / day
- Embroidered Lehenga — 4.9 (412) — ₹1,799 / day
- Sherwani Set — 4.7 (189) — ₹1,299 / day
- Evening Gown — 4.8 (97) — ₹999 / day

These are reference examples, not live inventory data.

### 5.6 Badges

Examples:
- Trending
- Premium
- New

Use small rounded pills near the top-left of the product image.

- Trending / New: pale blue background.
- Premium: warm pale-gold background.
- Use dark text and compact padding.
- Badges should not obscure the outfit.

### 5.7 Buttons and controls

| Component | Appearance |
|---|---|
| Primary CTA | Filled primary blue, white semibold label |
| Secondary CTA | Light surface, blue outline, dark text |
| Icon action | Simple line icon in a light circular hit area |
| Selected chip | Primary blue fill, white text |
| Unselected chip | Ivory/white fill, gray border, dark text |
| Dropdown | Light surface, subtle gray border, rounded corners |
| Checkbox | Compact square outline with clear checked state |
| Range slider | Blue track with circular handles |

All controls should have hover, focus, active, disabled, and (where relevant) selected states.

## 6. Spacing, borders, and elevation

Use an 8 px spacing rhythm.

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4 px | Icon-to-label micro spacing |
| `space-2` | 8 px | Tight control spacing |
| `space-3` | 12 px | Compact internal padding |
| `space-4` | 16 px | Standard component padding |
| `space-5` | 20 px | Card content spacing |
| `space-6` | 24 px | Grid gaps and section spacing |
| `space-8` | 32 px | Major layout separation |
| `space-10` | 40 px | Large section spacing |

### Radius

- Small controls/chips: 16–22 px or fully pill-shaped.
- Inputs and dropdowns: 10–14 px.
- Product images: 14–16 px.
- Cards and sidebar: 14–18 px.
- Primary buttons: 10–12 px.

### Borders and shadows

- Prefer 1 px, low-contrast neutral borders.
- Use soft, subtle shadows only to lift cards from the background.
- Avoid heavy black shadows, strong outlines, and excessive glass effects.
- Dividers in the filter panel should be thin and understated.

## 7. Imagery and photography

- Use premium, editorial fashion photography.
- Keep lighting warm and soft, with beige, stone, or neutral studio backgrounds.
- Show the complete outfit clearly; avoid overly tight crops.
- Use a consistent image treatment across all product cards.
- Ensure model pose and garment details remain visible at card size.
- Use high-resolution images and consistent aspect ratios.
- Do not place text-heavy overlays on product photos.

## 8. Responsive behavior

### Desktop (1200 px and above)
- Full navigation with inline search and all actions.
- Filter sidebar visible.
- Four product columns where space permits.

### Tablet (768–1199 px)
- Reduce product grid to two or three columns depending on available width.
- Keep filters in a collapsible drawer or a narrower sidebar.
- Allow navigation links to compress; keep search accessible.

### Mobile (below 768 px)
- Use a compact header with brand, search action, wishlist/bag, and menu.
- Stack hero text and imagery or use a shorter hero crop.
- Move filters into a “Filters” drawer or bottom sheet.
- Use two product columns on wider phones and one column on narrow screens.
- Keep product price and Rent Now action visible without excessive scrolling.
- Ensure touch targets are comfortably sized (about 44 × 44 px minimum).

## 9. Accessibility and interaction checklist

- [ ] Text and controls have sufficient contrast.
- [ ] Every icon-only action has an accessible name.
- [ ] Filters can be operated by keyboard.
- [ ] Focus indicators are visible.
- [ ] Selected chips and toggles expose their selected state.
- [ ] Product images have useful alternative text.
- [ ] Price includes the rental period (“per day”).
- [ ] Sort and filter controls have clear labels.
- [ ] Buttons communicate their action clearly.
- [ ] Responsive layouts do not cause horizontal overflow.

## 10. Suggested design tokens

```css
:root {
  --color-navy: #0E3758;
  --color-primary: #174F75;
  --color-blue-mid: #648CAC;
  --color-blue-pale: #EAF2F8;
  --color-ivory: #FBF9F7;
  --color-beige: #D8C0AA;
  --color-gold: #D9A441;
  --color-ink: #15263A;
  --color-muted: #657181;
  --color-border: #E5E2DF;
  --color-white: #FFFFFF;

  --font-display: "Playfair Display", Georgia, serif;
  --font-ui: "Inter", Arial, sans-serif;

  --radius-control: 12px;
  --radius-card: 16px;
  --radius-panel: 18px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

## 11. Build priorities

1. Establish the global color, typography, spacing, and radius tokens.
2. Build the navigation bar and hero banner.
3. Build the filter sidebar with working filter state.
4. Build a reusable product card.
5. Add grid/list view and sorting controls.
6. Make the layout responsive.
7. Add accessible focus, hover, selected, and disabled states.
8. Populate the page with consistent fashion photography and real rental data.

---

## TL;DR

RentWear should feel like a premium fashion-rental boutique: deep navy navigation, warm ivory backgrounds, pale-blue accents, restrained gold details, elegant serif headlines, clean sans-serif UI, large editorial outfit photography, a clear filter sidebar, and product cards with visible daily rental prices and strong “Rent Now” actions.
