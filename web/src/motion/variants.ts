import { Variants } from 'motion/react';
import { springs, durations, easings } from './presets';

// ============================================================================
// PARAKH SHARED MOTION VARIANTS
// Hardware-accelerated: Animates ONLY transform and opacity
// ============================================================================

/**
 * Clean entrance variant that fades in and lifts up
 */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 16
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.soft
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: durations.fast,
      ease: easings.editorial
    }
  }
};

/**
 * Orchestrated container variant to stagger children animations
 */
export const staggerContainer = (staggerChildren = 0.05, delayChildren = 0.03): Variants => ({
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
});

/**
 * Signature "Stamp Slam" impact animation for the RubberStamp component:
 * Starts oversized and rotated, slams down with overshoot, settling into place.
 */
export const stampSlam: Variants = {
  hidden: {
    opacity: 0,
    scale: 2.2,
    rotate: -14
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: -3,
    transition: springs.snappy
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: {
      duration: durations.fast
    }
  }
};

/**
 * Signature "Highlighter Sweep" animation for flagged text spans:
 * Unrolls across the text span horizontally from left to right via scaleX.
 */
export const highlightSweep: Variants = {
  hidden: {
    opacity: 0,
    scaleX: 0,
    originX: 0
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    originX: 0,
    transition: {
      duration: durations.slow,
      ease: easings.editorial
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast
    }
  }
};
