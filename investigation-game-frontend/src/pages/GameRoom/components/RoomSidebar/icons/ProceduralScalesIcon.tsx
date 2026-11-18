import { motion, useAnimation, type Transition, type Variants } from 'motion/react';
import { useIconAnimation } from './use-icon-animation';

const settle: Transition = { duration: 0.68, times: [0, 0.28, 0.57, 0.79, 1], ease: 'easeInOut' };

const beam: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, 12, -7, 3, 0], transition: settle },
};

// The pans follow opposite ends of the beam while hanging upright.
const pan: Variants = {
  normal: { y: 0 },
  animate: (side: number) => ({ y: [0, 1.45 * side, -0.85 * side, 0.37 * side, 0], transition: settle }),
};

export default function ProceduralScalesIcon({ className }: { className: string }) {
  const controls = useAnimation();
  const { handleMouseEnter } = useIconAnimation({ controls, ref: null });

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M7 21h10M12 3v18" />
        <motion.path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" variants={beam}
          initial="normal" animate={controls} style={{ transformBox: 'view-box', originX: 0.5, originY: 5 / 24 }} />
        <motion.path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
          variants={pan} custom={-1} initial="normal" animate={controls} />
        <motion.path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"
          variants={pan} custom={1} initial="normal" animate={controls} />
      </svg>
    </span>
  );
}
