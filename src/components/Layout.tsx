
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from './PageTransition';

interface LayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showFooter = true }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <main className="flex-grow w-full max-w-[2000px] mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
