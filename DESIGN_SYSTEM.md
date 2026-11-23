# NIRALIX HRMS — Official Design System & Architecture Guidelines
> **CRITICAL RULE FOR ALL DEVELOPERS & AI AGENTS:**  
> This design system is the **immutable single source of truth** for NIRALIX HRMS.  
> **NEVER override, replace, or deviate from these color tokens, component patterns, or glassmorphic standards.** Any new page, modal, or component must strictly adhere to these specifications.

---

## 1. Brand Identity & Core Principles

- **Product Name:** NIRALIX HRMS
- **Design Philosophy:** Modern, ergonomic enterprise glassmorphism with high visual comfort.
- **Atmosphere:** Warm, porcelain-beige base canvas paired with frosted translucent glass, crisp typography, and deep navy authority.
- **Strict Prohibition:** Do NOT use generic SaaS electric blues (`#2563eb`, `#1d4ed8`, `bg-blue-500`), cold greys (`#f1f5f9`), or harsh high-contrast black/white splits.

---

## 2. Master Color Palette (The 5 Immutable Brand Colors)

| Token Name | Hex Code | Tailwind / RGB Equivalent | Role & Proper Usage |
|:---|:---|:---|:---|
| **Deep Navy (Main Theme)** | `#2F4156` | `rgb(47, 65, 86)` | **Primary Authority Color.** Primary buttons, headings, active step indicators, high-emphasis text, brand monograms. |
| **Slate Teal** | `#567C8D` | `rgb(86, 124, 141)` | **Secondary Support Color.** Subtitles, inactive icons, subtle borders, input field borders, field labels. |
| **Soft Sky Blue** | `#C8D9E6` | `rgb(200, 217, 230)` | **Accent & Surface Tint.** Badges, tags, active indicators, ambient radial lighting, soft hover pills. |
| **Frosty Ice-Blue Sky** | `#E7EEF6` | `rgb(231, 238, 246)` | **Global Canvas Background.** The entire page background, login right-side backdrop, onboarding canvas, footer base. |
| **Frosted White** | `#FFFFFF` | `rgba(255, 255, 255, α)` | **Glassmorphic Cards & Overlays.** Used with variable alpha (`0.45` – `0.75`) + backdrop blur for true frosty glass surfaces. |

### Color Rules & Constraints
1. **Button Rule:** All primary buttons use the **Master Navy-to-Slate Gradient (`linear-gradient(135deg, #304358 0%, #557A8B 100%)`)** with white text and clean inner borders, matching the "Clock In Now" reference.
2. **Background Rule:** Global page canvas uses **Cool Frosty Ice-Blue (`#E7EEF6`)** layered with ambient radial glow orbs (`#C8D9E6` and `#E7EEF6`). Never use stark pure white `#ffffff` or pitch black as the global background. Avoid warm beige/cream.

---

## 3. Glassmorphism Design Formula

Glassmorphism is the signature visual pattern of NIRALIX HRMS. A flat solid card must **never** be substituted where glassmorphism is specified.

### Official Frosted Glass Card Recipe

```css
/* Standard Glass Surface Card */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1.5px solid rgba(255, 255, 255, 0.75);
  border-radius: 20px;
  box-shadow: 
    0 12px 32px -6px rgba(47, 65, 86, 0.08),
    inset 0 1px 2px 0 rgba(255, 255, 255, 0.9);
}

/* Subtle Interactive Glass Surface (Hoverable) */
.glass-card-interactive {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px);
  border: 1.5px solid rgba(255, 255, 255, 0.65);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card-interactive:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(86, 124, 141, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 16px 36px -8px rgba(47, 65, 86, 0.12);
}
```

### Ambient Canvas Requirement (Why Glass Works)
Because `backdrop-filter: blur()` cannot blur a single flat solid color, the background canvas must always contain soft, ambient floating color orbs:
```html
<div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
  <!-- Top Right Sky Blue Glow -->
  <div style="position: absolute; top: -10%; right: -5%; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(200, 217, 230, 0.45) 0%, transparent 70%); filter: blur(50px);" />
  <!-- Bottom Left Slate Teal Glow -->
  <div style="position: absolute; bottom: -5%; left: -10%; width: 650px; height: 650px; border-radius: 50%; background: radial-gradient(circle, rgba(86, 124, 141, 0.16) 0%, transparent 70%); filter: blur(60px);" />
</div>
```

---

## 4. Component Standards & Token Mapping

### A. Buttons (Universal Master Standard)

#### 1. Primary Button (Call to Action / Submit / Clock In)
- **Background:** `linear-gradient(135deg, #304358 0%, #557A8B 100%)` (Navy-to-Slate Gradient from "Clock In Now" reference)
- **Text Color:** `#FFFFFF` (Font weight: 600–700)
- **Border:** `1px solid rgba(255, 255, 255, 0.25)`
- **Border Radius:** `12px` to `14px` (`rounded-xl` or `border-radius: 12px`)
- **Shadow:** `0 4px 14px rgba(47, 65, 86, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.35)`
- **Hover State:** `background: linear-gradient(135deg, #243546 0%, #466776 100%); transform: translateY(-1px); box-shadow: 0 8px 22px rgba(47, 65, 86, 0.35);`
- **Active / Pressed:** `transform: translateY(0); box-shadow: 0 2px 8px rgba(47, 65, 86, 0.25);`
- **Rule:** This gradient and styling is the **common master standard across all buttons in NIRALIX HRMS**.

#### 2. Secondary / Outline Button
- **Background:** `rgba(255, 255, 255, 0.65)` with `backdrop-filter: blur(12px)`
- **Text Color:** `#2F4156` (Font weight: 600)
- **Border:** `1.5px solid rgba(86, 124, 141, 0.3)`
- **Hover State:** `background: #FFFFFF; border-color: #567C8D;`

#### 3. Ghost / Action Button
- **Background:** `transparent`
- **Text Color:** `#567C8D`
- **Hover State:** `background: rgba(86, 124, 141, 0.1); color: #2F4156;`

---

### B. Input Fields & Form Controls

- **Container Background:** `rgba(255, 255, 255, 0.75)` to `#FFFFFF`
- **Text Color:** `#2F4156`
- **Border:** `1.5px solid rgba(86, 124, 141, 0.28)`
- **Border Radius:** `12px` (`rounded-xl`)
- **Padding:** `0.75rem 1rem`
- **Focus State:** `outline: none; border-color: #567C8D; box-shadow: 0 0 0 3px rgba(86, 124, 141, 0.15);`
- **Placeholder:** `#8da4b0`
- **Label:** `font-size: 0.82rem; font-weight: 600; color: #567C8D; letter-spacing: 0.02em;`

---

### C. Badges & Pills

- **Standard Pill:**
  - Background: `rgba(200, 217, 230, 0.55)` (`#C8D9E6`)
  - Border: `1px solid rgba(86, 124, 141, 0.22)`
  - Text: `#2F4156` (font-size: `11px`, font-weight: `700`, uppercase, tracking: `0.06em`)
- **Active Dot / Indicator:** `#567C8D` or `#2F4156`

---

### D. Navigation & Sidebar

- **Desktop Dock:** 72px slim vertical dock with glass backdrop (`rgba(245, 239, 235, 0.75)` or `#2F4156` dark variant).
- **Flyout Sub-Menu:**
  - Background: `rgba(245, 239, 235, 0.95)` with `backdrop-filter: blur(28px)`
  - Border: `1.5px solid rgba(255, 255, 255, 0.8)`
  - Border Radius: `20px`
  - Active Item Pill: `background: rgba(200, 217, 230, 0.45); color: #2F4156; font-weight: 700;`
  - Rule: Never use heavy dark charcoal or pure black backgrounds for flyout menus in light mode.

---

## 5. Typography Standards

- **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Headings (H1, H2, H3):**
  - Color: `#2F4156`
  - Weight: `800` (Extrabold) or `900` (Black)
  - Letter Spacing: `-0.025em` (tight tracking)
- **Body & Paragraphs:**
  - Color: `#567C8D` (muted body) or `#2F4156` (high readability text)
  - Weight: `400` / `500`
  - Line Height: `1.6` to `1.7`
- **Sub-headers & Category Labels:**
  - Color: `#567C8D`
  - Weight: `700`
  - Text Transform: `uppercase`
  - Letter Spacing: `0.15em` to `0.25em`

---

## 6. Official Implementation Rules (Checklist for Developers & Agents)

When adding or modifying any UI in this project, you must verify:

- [ ] **Canvas Color:** Is the root page background `#E7EEF6` (Frosty Ice-Blue)?
- [ ] **Card Glassmorphism:** Are cards translucent (`rgba(255, 255, 255, 0.5 - 0.75)`) with `backdrop-filter: blur(20px)` and white border?
- [ ] **Buttons:** Are all primary call-to-action buttons using the Master Button gradient `linear-gradient(135deg, #304358 0%, #557A8B 100%)` with white text and inner bevel shadow?
- [ ] **Branding:** Is the brand name strictly **NIRALIX HRMS** with the monogram interlocking logo?
- [ ] **No Generic Tailwind Blues or Warm Creams:** Have you eliminated `#2563eb`, `#1d4ed8`, `#3b82f6`, and all warm beige `#F5EFEB`?
- [ ] **Contrast & Accessibility:** Is all text on `#E7EEF6` and glass cards legible with high contrast against `#2F4156` and `#567C8D`?

---
*Created and enforced for NIRALIX HRMS. Modifications to this file require explicit authorization.*
