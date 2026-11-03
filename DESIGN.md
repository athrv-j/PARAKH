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

## ♿ Accessibility & Motion
* **Reduced Motion:** When `prefers-reduced-motion` is detected, all stamp-slam screen shakes, string physics, and highlighter sweeps fall back to instant, static visual states.
* **Touch Targets:** Minimum 44×44px for all interactive buttons, chips, and toggles.
* **Color Contrast:** All UI elements exceed WCAG AA 4.5:1 ratio.
