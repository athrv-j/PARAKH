import { Transition } from 'motion/react';

// ============================================================================
// PARAKH MOTION PRESETS & TOKENS
// Strict rule: Animate ONLY transform (x, y, scale, rotate) and opacity
// ============================================================================

/**
 * Spring transition presets tailored for the editorial "Case File" aesthetic:
 * - snappy: for UI controls, stamps, chips, quick feedback
 * - soft: for smooth cards, drawers, layout entrances
 * - bouncy: for playful stamp slam recoils, gyroscopic pulses
 */
export const springs = {
  snappy: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 28,
    mass: 0.7
  },
  soft: {
    type: 'spring' as const,
    stiffness: 190,
    damping: 24,
    mass: 1.0
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 320,
    damping: 14,
    mass: 0.8
  }
} satisfies Record<string, Transition>;

/**
 * Duration tokens in seconds
 */
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.6,
  deliberate: 0.9
} as const;

/**
 * Cubic bezier easing tokens
 */
export const easings = {
  editorial: [0.19, 1.0, 0.22, 1.0] as const, // High-end deceleration
  caseFileOut: [0.16, 1, 0.3, 1] as const,   // Smooth docket unrolling
  stampImpact: [0.34, 1.56, 0.64, 1] as const, // Slight overshoot
  standard: [0.4, 0.0, 0.2, 1] as const
} as const;
