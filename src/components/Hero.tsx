
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-background pt-16">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 subtle-grid" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center pt-16 sm:pt-24 pb-16">
          {/* Pill label */}
          <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm mb-6 animate-slideDown">
            <span className="font-medium text-primary">New</span>
            <span className="ml-1 text-muted-foreground">Multi-jurisdiction compliance made simple</span>
          </div>
          
          {/* Heading */}
          <h1 className="font-bold tracking-tight text-foreground max-w-4xl animate-slideDown" style={{ animationDelay: '100ms' }}>
            Manage financial compliance across <span className="text-primary">global jurisdictions</span> with confidence
          </h1>
          
          {/* Subheading */}
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl animate-slideDown" style={{ animationDelay: '200ms' }}>
            ComplianceSync automates regulatory tracking, provides actionable insights, and simplifies compliance management for businesses operating in multiple countries.
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-slideDown" style={{ animationDelay: '300ms' }}>
            <Button size="lg" asChild>
              <Link to="/signup">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">
                Log in
              </Link>
            </Button>
          </div>

          {/* Dashboard preview */}
          <div className="mt-16 w-full max-w-5xl mx-auto animate-slideUp" style={{ animationDelay: '400ms' }}>
            <div className="relative">
              <div className="aspect-[16/9] rounded-lg overflow-hidden border border-border shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/10 to-gray-900/30 z-10"></div>
                <div className="w-full h-full bg-card">
                  <div className="flex items-center h-8 px-4 border-b border-border bg-muted/50">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-danger/40"></div>
                      <div className="w-3 h-3 rounded-full bg-warning/40"></div>
                      <div className="w-3 h-3 rounded-full bg-success/40"></div>
                    </div>
                  </div>
                  <div className="flex h-[calc(100%-2rem)]">
                    <div className="w-56 border-r border-border h-full p-4">
                      <div className="space-y-4">
                        <div className="w-full h-6 rounded-md bg-muted/50"></div>
                        <div className="w-full h-6 rounded-md bg-primary/10"></div>
                        <div className="w-full h-6 rounded-md bg-muted/50"></div>
                        <div className="w-full h-6 rounded-md bg-muted/50"></div>
                        <div className="w-full h-6 rounded-md bg-muted/50"></div>
                      </div>
                    </div>
                    <div className="flex-1 p-6">
                      <div className="mb-6 flex items-center justify-between">
                        <div className="w-48 h-8 rounded-md bg-muted/50"></div>
                        <div className="w-32 h-8 rounded-md bg-primary/20"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="h-24 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-success/20"></div>
                        </div>
                        <div className="h-24 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-warning/20"></div>
                        </div>
                        <div className="h-24 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-danger/20"></div>
                        </div>
                      </div>
                      <div className="w-full h-48 rounded-lg bg-muted/30 border border-border"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Add a reflection */}
              <div className="absolute -bottom-12 inset-x-0 h-32 bg-gradient-to-b from-background/80 to-transparent blur-md transform scale-y-[-0.3] opacity-40"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
