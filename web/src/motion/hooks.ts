import { useEffect } from 'react';
import { useMotionValue, useSpring, useTransform } from 'motion/react';
import { springs } from './presets';

// ============================================================================
// PARAKH MOTION HOOKS
// Interactive micro-interactions using MotionValues and Springs
// ============================================================================

interface MagneticOptions {
  strength?: number;
}

/**
 * useMagnetic: Pulls an element subtly toward the mouse cursor when hovering
 * Returns motion values { x, y } to pass into style={{ x, y }} on a motion component.
 */
export function useMagnetic(
  ref: React.RefObject<HTMLElement | null>,
  { strength = 0.3 }: MagneticOptions = {}
) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, springs.snappy);
  const y = useSpring(rawY, springs.snappy);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      rawX.set(deltaX);
      rawY.set(deltaY);
    };

    const handleMouseLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, strength, rawX, rawY]);

  return { x, y };
}

interface TiltOptions {
  maxTilt?: number;
  scale?: number;
}

/**
 * useTilt: Creates an editorial 3D card tilt effect on mouse move
 * Animates ONLY transform properties: rotateX, rotateY, and scale
 */
export function useTilt(
  ref: React.RefObject<HTMLElement | null>,
  { maxTilt = 8, scale = 1.02 }: TiltOptions = {}
) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const isHovered = useMotionValue(0);

  const rotateXSpring = useSpring(
    useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]),
    springs.soft
  );
  const rotateYSpring = useSpring(
    useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]),
    springs.soft
  );
  const scaleSpring = useSpring(
    useTransform(isHovered, [0, 1], [1, scale]),
    springs.snappy
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;

      mouseX.set(xRatio);
      mouseY.set(yRatio);
      isHovered.set(1);
    };

    const handleMouseLeave = () => {
      mouseX.set(0.5);
      mouseY.set(0.5);
      isHovered.set(0);
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, mouseX, mouseY, isHovered]);

  return {
    rotateX: rotateXSpring,
    rotateY: rotateYSpring,
    scale: scaleSpring,
    transformStyle: 'preserve-3d' as const
  };
}

/**
 * useSpotlight: Exposes mouse coordinates relative to an element
 * Updates CSS custom properties --spotlight-x, --spotlight-y, and --spotlight-opacity
 * for hardware-accelerated radial spotlight gradients.
 */
export function useSpotlight(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty('--spotlight-x', `${x}px`);
      el.style.setProperty('--spotlight-y', `${y}px`);
      el.style.setProperty('--spotlight-opacity', '1');
    };

    const handleMouseLeave = () => {
      el.style.setProperty('--spotlight-opacity', '0');
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref]);
}
