import React from 'react';

const shapes = {
  text: 'h-4 w-full rounded-md',
  avatar: 'h-12 w-12 rounded-full',
  card: 'h-40 rounded-2xl',
  image: 'aspect-[4/3] w-full rounded-2xl',
  button: 'h-11 w-28 rounded-xl',
};

const Skeleton = ({ variant = 'text', className = '' }) => (
  <div className={`skeleton-wave bg-light-border dark:bg-dark-input ${shapes[variant] || shapes.text} ${className}`} />
);

export default Skeleton;
