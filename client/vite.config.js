import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const vendorGroups = [
  ['vendor-react', ['react', 'react-dom', 'react-router-dom']],
  ['vendor-query', ['@tanstack/react-query']],
  ['vendor-maps', ['leaflet', 'react-leaflet', '@react-google-maps/api']],
  ['vendor-charts', ['recharts']],
  ['vendor-calendar', ['@fullcalendar', 'react-datepicker', 'react-date-range', 'react-day-picker', 'date-fns']],
  ['vendor-icons', ['lucide-react', '@heroicons/react', 'react-icons']],
  ['vendor-motion', ['framer-motion']],
  ['vendor-utils', ['axios', 'lodash', 'jwt-decode', 'socket.io-client']],
];

const packageMatcher = (id, packageName) => {
  const normalizedId = id.replace(/\\/g, '/');
  return normalizedId.includes(`/node_modules/${packageName}/`);
};

const manualChunks = (id) => {
  if (id.includes('commonjsHelpers')) return 'vendor-runtime';
  if (!id.includes('node_modules')) return undefined;

  for (const [chunkName, packages] of vendorGroups) {
    if (packages.some((packageName) => packageMatcher(id, packageName))) {
      return chunkName;
    }
  }

  return undefined;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
     
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      
    },
  },
});
