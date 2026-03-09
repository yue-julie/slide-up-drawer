# SlideUpDrawer

## Objective

`SlideUpDrawer` is a shared, reusable overlay component for showing contextual content without navigating away from the current page.

It is used in this codebase for patterns such as:
- stock/help messaging
- backorder alternative shopping flows
- exclusion details in cart promotions
- mobile bottom-sheet experiences

The component is exposed globally as `window.SlideUpDrawer` and is designed to support both desktop side drawers and mobile bottom drawers from the same API.

---

## Source Files in /ASSETS

- `common/components/slide-up-drawer/slide-up-drawer.js`
- `common/components/slide-up-drawer/slide-up-drawer.css`

---

## What the Component Does

`SlideUpDrawer`:
- opens a global drawer with custom HTML content
- supports `right`, `left`, `top`, and `bottom` positions
- supports responsive overrides with media queries
- supports GSAP animation or CSS-transition fallback
- locks page scroll while open
- restores focus when closed
- supports backdrop click and `Escape` to close

---

## Requirements

This component does **not** create its own DOM scaffold. The required drawer markup must already exist on the page before the script initializes.

### Required Markup

```html
<!-- GSAP prelayers -->
<div
  class="slide-up-drawer__prelayers"
  data-target="slideUpDrawerPrelayers"
  aria-hidden="true"
></div>

<!-- Backdrop -->
<div
  class="slide-up-drawer__backdrop"
  data-target="slideUpDrawerBackdrop"
  aria-hidden="true"
></div>

<!-- Drawer -->
<div
  class="slide-up-drawer"
  data-target="slideUpDrawer"
  role="dialog"
  aria-hidden="true"
  data-position="bottom"
>
  <button
    type="button"
    class="slide-up-drawer__close"
    data-target="slideUpDrawerClose"
    aria-label="Close"
  >
    <svg
      class="slide-up-drawer__close-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>

  <div class="slide-up-drawer__body" data-target="slideUpDrawerBody"></div>
</div>
```

### Dependencies

- `slide-up-drawer.css` must be loaded
- `slide-up-drawer.js` must be loaded after the required markup exists
- GSAP is optional and is only needed when using `animation: 'gsap'`
- `getBrandColor()` is optional; if present, it helps build the default stagger colors

### Current Script Implementation

This is the current include pattern used by the implementation.

#### In `<head>`

```html
<link type="text/css" rel="stylesheet" href="/assets/common/components/slide-up-drawer/slide-up-drawer.css?v=0.0.43" />
```

#### At the top of `<footer>`

```html
<!-- common UI components -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="/assets/common/components/slide-up-drawer/slide-up-drawer.js?v=0.0.40" type="text/javascript" charset="utf-8"></script>
```

### Load Order Notes

- load the CSS in `<head>` so drawer styles are available before first paint
- load GSAP before `slide-up-drawer.js` if you want GSAP animation mode
- load `slide-up-drawer.js` after the required drawer markup exists on the page
- if GSAP is not loaded, the drawer falls back to its CSS transition mode


---

## Public API

### `SlideUpDrawer.open(options)`

Opens the drawer with the provided content and configuration.

### `SlideUpDrawer.close()`

Closes the drawer and clears sizing styles after animation finishes.

### `SlideUpDrawer.manualClose()`

Used for user-initiated close behavior. This resets resize tracking before closing.

### `SlideUpDrawer.setDefaultColors(colors)`

Overrides the default GSAP prelayer colors used when no `colors` array is passed into `open()`.

### `SlideUpDrawer.getDefaultMobileMQ()`

Returns the component default mobile breakpoint:

```javascript
'(max-width: 991px)'
```

---

## `open()` Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `contentHtml` | `string` | `''` | HTML injected into the drawer body. |
| `position` | `'right' \| 'left' \| 'top' \| 'bottom'` | `'bottom'` | Base drawer position. |
| `animation` | `'gsap' \| 'css'` | CSS fallback when not `'gsap'` | Uses GSAP only if GSAP exists and `animation === 'gsap'`. |
| `colors` | `string[]` | `['#000', brandColor]` | Used for GSAP stagger/prelayer animation. |
| `size.width` | `string \| number` | none | Drawer width for side drawers. Numbers become `px`. |
| `size.height` | `string \| number` | none | Drawer height for top/bottom drawers. Numbers become `px`. |
| `size.maxWidth` | `string \| number` | none | Sets `--drawer-max-width`. |
| `size.maxHeight` | `string \| number` | none | Sets `--drawer-max-height`. |
| `enabled` | `boolean \| function` | `true` | Enables or disables the drawer. If `false`, `open()` does nothing. |
| `animate` | `boolean` | `true` | Present in the API, but currently should not be treated as a full animation off switch. |
| `responsive` | `Array<object>` | `[]` | Responsive overrides applied when media queries match. |

### `responsive[]` Object

Each responsive rule can contain:

| Parameter | Type | Description |
|---|---|---|
| `mq` | `string` | Media query to test with `window.matchMedia()`. |
| `enabled` | `boolean \| function` | Override enabled state for that breakpoint. |
| `position` | `'right' \| 'left' \| 'top' \| 'bottom'` | Override drawer position. |
| `size` | `object` | Override width/height/maxWidth/maxHeight. |
| `contentHtml` | `string` | Replace content for that breakpoint. |
| `colors` | `string[]` | Override GSAP prelayer colors. |
| `animation` | `'gsap' \| 'css'` | Override animation mode. |
| `animate` | `boolean` | Override animate flag. |

### Responsive Resolution Rules

- Responsive rules are evaluated in order.
- The **last matching rule wins**.
- On resize, the component recalculates position and responsive sizing.
- If a resize changes `enabled` from `true` to `false`, the drawer closes automatically.
- If the drawer was closed by resize and later becomes enabled again, it can reopen automatically.

---

## Usage Examples

### 1. Basic Desktop Right Drawer / Mobile Bottom Drawer

```javascript
window.SlideUpDrawer.open({
  contentHtml: `
    <div>
      <p style="margin: 0 0 16px; font-weight: 700;">Privacy Policy</p>
      <p>This is a test drawer with GSAP animation.</p>
      <p>On desktop it slides from the right.</p>
      <p>On mobile it slides up from the bottom.</p>
    </div>
  `,
  position: 'right',
  animation: 'gsap',
  colors: ['#B19EEF', '#5227FF'],
  size: { width: '450px' },
  responsive: [{
    mq: '(max-width: 991px)',
    position: 'bottom',
    size: { height: '60vh' }
  }]
});
```

### 2. Stock Information Drawer

Used when the user clicks a stock-info trigger.

```javascript
window.SlideUpDrawer.open({
  contentHtml: `<p class="stock-message__drawer-content">Stock information goes here.</p>`,
  position: 'right',
  animation: 'gsap',
  size: { width: '350px' },
  responsive: [{
    mq: '(max-width: 991px)',
    position: 'bottom',
    size: { height: 'auto' }
  }]
});
```

### 3. Async Loading Drawer

Open immediately with loading content, then replace the drawer body after async work completes.

```javascript
window.SlideUpDrawer.open({
  contentHtml: `
    <div class="drawer-loading">
      <p>Finding similar items…</p>
    </div>
  `,
  position: 'right',
  animation: 'gsap',
  size: { width: '550px' },
  responsive: [{
    mq: '(max-width: 991px)',
    position: 'bottom',
    size: { height: '90vh' }
  }]
});

const body = document.querySelector('[data-target="slideUpDrawerBody"]');
if (body) {
  body.innerHTML = '<div>Updated async content</div>';
}
```

### 4. Cart Exclusions Drawer

Useful for legal copy, exclusions, or promotion details.

```javascript
window.SlideUpDrawer.open({
  contentHtml: `
    <div>
      <p style="margin: 0 0 12px; font-weight: 700;">Exclusions</p>
      <ul>
        <li>Item one</li>
        <li>Item two</li>
        <li>Item three</li>
      </ul>
    </div>
  `,
  position: 'right',
  animation: 'gsap',
  size: { width: '380px' },
  responsive: [{
    mq: '(max-width: 991px)',
    position: 'bottom',
    size: { height: '70vh' }
  }]
});
```

### 5. CSS Animation Fallback Example

Use this when GSAP is not needed.

```javascript
window.SlideUpDrawer.open({
  contentHtml: '<div><p>Simple CSS-transition drawer.</p></div>',
  position: 'left',
  animation: 'css',
  size: { width: 420 }
});
```

### 6. Conditional Drawer Availability

Use `enabled` when the drawer should only be available at certain breakpoints or states.

```javascript
window.SlideUpDrawer.open({
  contentHtml: '<div><p>This drawer only opens on tablet/mobile.</p></div>',
  position: 'bottom',
  enabled: window.matchMedia('(max-width: 991px)').matches
});
```

---

## Common Use Cases

### Informational Drawer
Use for policy text, help content, disclaimers, stock information, or short educational content.

### Merchandising / Recommendation Drawer
Use for larger content blocks such as in-stock alternatives, recommendation cards, or promotional content.

### Mobile Bottom Sheet
Use a desktop side drawer with a mobile `bottom` override so the same feature feels native on smaller screens.

### Async Content Container
Open the drawer instantly with a loading state, then replace `slideUpDrawerBody` content once data is returned.

### Follow-Up Action Flow
Open a drawer for context, then programmatically close it before launching another action such as Quick View or navigation.

---

## Accessibility and UX Behavior

Current built-in behavior includes:
- `Escape` key closes the drawer
- clicking the backdrop closes the drawer
- focus moves to the close button on open
- focus returns to the previously focused element on close
- `aria-hidden` toggles on drawer and backdrop
- `aria-modal="true"` is added while open
- page scroll is locked while the drawer is open
- reduced-motion CSS removes transition effects for the CSS animation path

### Important Accessibility Note

This component does **not** currently implement a full focus trap. It behaves like a lightweight dialog, but not a fully managed modal system.

---

## Styling / Sizing Notes

The component uses CSS custom properties internally:
- `--drawer-width`
- `--drawer-height`
- `--drawer-max-width`
- `--drawer-max-height`

These are applied automatically from the `size` object.

Examples:

```javascript
size: { width: '450px' }
size: { height: '70vh' }
size: { width: 420 }
size: { maxWidth: '100vw', maxHeight: '100dvh' }
```

Numeric values are automatically converted to pixel units.

---

## Caveats

- `contentHtml` is injected with `innerHTML`, so content should be sanitized before passing it in.
- This is a singleton component: only one drawer instance exists on the page.
- Calling `open()` while the drawer is already open does nothing.
- GSAP prelayer colors are only used in GSAP mode.
- `animate` exists in the API, but current implementation does not make it a full no-animation mode.
- If the required markup is missing when the script initializes, the drawer instance will not function correctly.

---

## Real Repo Examples

Current codebase consumers on Galls and USP include:
- `fulfillment/availability/stock-status.js`
- `fulfillment/availability/backorder-similar-items.js`
- `cart/buy-more-save-more/buy-more-save-more.js`
- `cart/cart-promo-bar/cart-promo-bar.js`

These are good references when implementing new drawer use cases in this repository.
