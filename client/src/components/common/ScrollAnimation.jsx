import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const ScrollAnimation = ({ children }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true, // Animation sirf ek baar chalegi
    threshold: 0.1,    // Section ka 10% dikhne par animation shuru ho
  });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }Spinner
  }, [controls, inView]);

  const boxVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={boxVariants}
    >
      {children}
    </motion.div>
  );
};

export default ScrollAnimation;