import React from 'react';

export const DashboardIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    // We pass props like className to control size, etc.
    {...props} 
  >
    <path 
      id="secondary" 
      d="M22,4V7a2,2,0,0,1-2,2H15a2,2,0,0,1-2-2V4a2,2,0,0,1,2-2h5A2,2,0,0,1,22,4ZM9,15H4a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2H9a2,2,0,0,0,2-2V17A2,2,0,0,0,9,15Z" 
      // The secondary color (blue) remains fixed as part of your theme
      style={{ fill: 'rgb(44, 169, 188)' }} 
    />
    <path 
      id="primary" 
      d="M11,4v7a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2H9A2,2,0,0,1,11,4Zm9,7H15a2,2,0,0,0-2,2v7a2,2,0,0,0,2,2h5a2,2,0,0,0,2-2V13A2,2,0,0,0,20,11Z" 
      // The primary color (black) will now change with text color (e.g., text-red-500)
      style={{ fill: 'currentColor' }} 
    />
  </svg>
);