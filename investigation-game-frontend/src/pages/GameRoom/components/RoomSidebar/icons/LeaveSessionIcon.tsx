import { motion, useAnimation, type Variants } from 'motion/react';
import { useIconAnimation } from './use-icon-animation';

const arrow: Variants = {
  normal: { x: 0 },
  animate: {
    x: [0, -1, 2.5, 0],
    transition: { duration: 0.5, times: [0, 0.2, 0.55, 1], ease: 'easeInOut' },
  },
};

export default function LeaveSessionIcon({ className }: { className: string }) {
  const controls = useAnimation();
  const { handleMouseEnter } = useIconAnimation({ controls, ref: null });

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <motion.path d="m16 17 5-5-5-5M21 12H9" variants={arrow} initial="normal" animate={controls} />
      </svg>
    </span>
  );
}
