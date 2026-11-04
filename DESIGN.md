# Parakh Design System: "The Case File"

> **Visual Metaphor:** Physical case file — paper index cards, docket numbers, rubber stamps, and red string on a dark editorial desk.

---

## 🎨 Color Palette & Design Tokens

| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--color-ink` | `#101114` | Deep obsidian ink background, primary text on paper |
| `--color-paper` | `#F4EFE6` | Aged parchment paper sheet background |
| `--color-paper-light`| `#FAF7F2` | Card surface and high-contrast paper sheet |
| `--color-paper-worn` | `#E8DFC8` | Stained/worn paper for ambiguous guideline clauses |
| `--color-stamp-red` | `#D7263D` | Official rubber stamps, violation borders, red string links |
| `--color-highlighter`| `#FFD60A` | Text highlighter sweep over flagged spans |
| `--color-verified` | `#2FBF71` | Approved status, valid citations, verified intent badge |
| `--color-steel` | `#8A8F98` | Metadata labels, secondary typography, dividers |
| `--color-steel-dark`| `#20232A` | Floating card surfaces, toolbars, sidebar backgrounds |

---

## 🖋️ Typography

* **Headings & Display:** `Playfair Display`, serif — editorial gravitas, official case file headers.
* **Dockets, Clauses & Technical Identifiers:** `Space Mono`, monospace — docket IDs (`PRK-0042`), clause numbers (`C-4.2`), diff markers, timestamps.
* **Body & UI Controls:** `DM Sans`, sans-serif — crisp, high-legibility interface typography.

---

## 🏛️ Signature UI Components

1. **Rubber Stamp Component (`RubberStamp`)**:
   * Text choices: `APPROVED`, `PRECEDENT`, `EXPIRED`, `CHANGES REQUIRED`.
   * Features: 2px distressed border, slight rotation (-4° to +6°), stamp-slam impact animation with 2px subtle screen shake and ink bleed.
2. **Tilted Index Card (`IndexCard`)**:
   * Paper texture overlay, docket number corner badge, 3D lift and shadow elevation on hover.
3. **Highlighter Sweep (`HighlighterSpan`)**:
   * Animated yellow marker sweep that unrolls across text when findings load.
4. **Red String Dependency Board (`FactRippleBoard`)**:
   * Custom SVG canvas with red strings joining facts to affected creative drafts with spring-tightening animations.
5. **Worn Paper Wall (`GuidelineDebugger`)**:
   * Clause strips whose aged wear and red stamp stains grow proportionately with their calculated Ambiguity Score.
6. **Vault Door Transition**:
   * Full-screen mechanical vault shutter effect when switching between client vaults.

---

## 🎬 Motion System (`motion/react`)

> **Guiding Principle:** Tactile, editorial physics modeled after handling physical dockets, parchment paper, and ink rubber stamps. All animations are hardware-accelerated.

### ⚡ Performance Rules
* **Strict Constraint:** Animate **only `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`**. Never animate layout-triggering properties (`width`, `height`, `top`, `left`, `margin`, `padding`).
* **Framework:** Standardized on `motion/react` via the centralized `/web/src/motion/` design module.
* **Global Configuration:** Wrapped in `<MotionConfig reducedMotion="user">` at the application root (`main.tsx`) to strictly respect OS vestibular preferences.

### 🌀 Spring Presets
| Preset | Stiffness | Damping | Mass | Role |
| :--- | :--- | :--- | :--- | :--- |
| `snappy` | 420 | 28 | 0.7 | Tactile feedback, buttons, chips, stamp slam impact |
| `soft` | 190 | 24 | 1.0 | Smooth modal entries, card reveals, drawer slides |
| `bouncy` | 320 | 14 | 0.8 | Gyroscopic pulses, playful recoil on action triggers |

### ⏱️ Timing & Easing Tokens
* **Durations:** `instant` (0.1s), `fast` (0.2s), `normal` (0.35s), `slow` (0.6s), `deliberate` (0.9s).
* **Easings:**
  * `editorial`: `[0.19, 1.0, 0.22, 1.0]` (high-end deceleration curve)
  * `caseFileOut`: `[0.16, 1, 0.3, 1]` (smooth docket unrolling)
  * `stampImpact`: `[0.34, 1.56, 0.64, 1]` (overshoot settling)

### 📦 Shared Motion Variants
1. `fadeUp`: Smooth opacity fade and upward translation (`y: 16 -> 0`).
2. `staggerContainer`: Coordinated child cascade with configurable stagger and delay.
3. `stampSlam`: Dramatic stamp entry from `scale: 2.2, rotate: -14°` to `scale: 1, rotate: -3°` with `snappy` spring.
4. `highlightSweep`: Horizontal marker unroll utilizing `scaleX: 0 -> 1` anchored at `originX: 0`.

### 🪝 Interactive Hooks
* **`useMagnetic(ref, { strength })`:** Gently pulls interactive icons and action buttons toward the cursor on hover.
* **`useTilt(ref, { maxTilt, scale })`:** Creates a 3D perspective tilt on index cards (`rotateX`, `rotateY`, `scale`).
* **`useSpotlight(ref)`:** Tracks mouse coordinates to power dynamic radial illumination without layout recalibration.

---

## ♿ Accessibility & Motion
* **Reduced Motion:** When `prefers-reduced-motion` is detected, all stamp-slam screen shakes, string physics, and highlighter sweeps fall back to instant, static visual states via `MotionConfig`.
* **Touch Targets:** Minimum 44×44px for all interactive buttons, chips, and toggles.
* **Color Contrast:** All UI elements exceed WCAG AA 4.5:1 ratio.

