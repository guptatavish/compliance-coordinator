
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Duration = 'faster' | 'fast' | 'normal' | 'slow' | 'slower';

type MotionVariants = {
  hidden: Record<string, any>;
  visible: Record<string, any>;
};

const durations = {
  faster: 0.2,
  fast: 0.3,
  normal: 0.5,
  slow: 0.7,
  slower: 1,
};

export const fadeIn = (
  direction: Direction = 'up',
  duration: Duration = 'normal',
  delay: number = 0
): MotionVariants => {
  const directionOffset = {
    up: { y: 10 },
    down: { y: -10 },
    left: { x: 10 },
    right: { x: -10 },
  };

  return {
    hidden: {
      opacity: 0,
      ...directionOffset[direction],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: durations[duration],
        delay,
        ease: [0.25, 0.1, 0.25, 1.0], // Easing inspired by Apple's animations
      },
    },
  };
};

export const staggerContainer = (
  duration: Duration = 'normal',
  delay: number = 0
) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: delay,
      staggerChildren: durations[duration] / 5,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
});

export const scaleIn = (
  duration: Duration = 'normal',
  delay: number = 0
): MotionVariants => ({
  hidden: {
    opacity: 0,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: durations[duration],
      delay,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
});

// Subtle hover effects for interactive elements
export const subtleHover = {
  scale: 1.02,
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] },
};

// Realistic physics-based animations for button presses
export const buttonTap = {
  scale: 0.98,
  transition: { duration: 0.1, ease: [0.25, 0.1, 0.25, 1.0] },
};
