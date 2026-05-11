// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './components/layout/Footer';
import AppLoader from './components/common/AppLoader';

function App() {
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(() => {
    // Check if the splash screen animation has already played in this session
    return sessionStorage.getItem('hasAnimationPlayed') !== 'true';
  });

  // Define routes where Footer should be hidden
  const hideFooterRoutes = ['/login', '/signup', '/forgot-password'];
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem('hasAnimationPlayed', 'true');
      setIsLoading(false);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  return (
    isLoading ? (
      <AppLoader />
    ) : (
      <div className="app-route-surface flex min-h-screen flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
        <main className="flex-grow">
          <Outlet />
        </main>

        {/* Conditionally render Footer */}
        {shouldShowFooter && <Footer className="hidden md:block" />}
      </div>
    )
  );
}

export default App;
