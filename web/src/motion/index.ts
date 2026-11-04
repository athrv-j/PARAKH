// ============================================================================
// PARAKH MOTION MODULE
// Clean re-exports of presets, variants, hooks, and motion/react core
// ============================================================================

export * from './presets';
export * from './variants';
export * from './hooks';

// Re-export core motion components & hooks from 'motion/react'
export {
  motion,
  MotionConfig,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform
} from 'motion/react';
export type { Variants, Transition } from 'motion/react';
