
import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    // Add transition animations on route change
    const element = ref.current;
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px)';
      
      // Trigger animation after a tiny delay to ensure it runs
      setTimeout(() => {
        element.style.transition = 'opacity 500ms ease, transform 500ms ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 10);
    }
    
    // Cleanup
    return () => {
      if (element) {
        element.style.transition = '';
      }
    };
  }, [location.pathname]);

  return (
    <div ref={ref} className="w-full min-h-full">
      {children}
    </div>
  );
};

export default PageTransition;
