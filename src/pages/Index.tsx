
import React from 'react';
import Layout from '../components/Layout';
import Hero from '../components/Hero';
import Features from '../components/Features';

const Index: React.FC = () => {
  return (
    <Layout>
      <Hero />
      <Features />
      <div className="py-24 bg-background" id="about">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-bold tracking-tight">Why Choose ComplianceSync?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We help financial businesses navigate complex regulatory landscapes with confidence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Reduce Compliance Risk</h3>
                  <p className="text-muted-foreground">
                    Our advanced analysis engine identifies potential compliance gaps before they become issues, helping you proactively address regulatory requirements.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Save Time and Resources</h3>
                  <p className="text-muted-foreground">
                    Automate the tedious process of monitoring regulatory changes across multiple jurisdictions, freeing your team to focus on strategic initiatives.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Expand with Confidence</h3>
                  <p className="text-muted-foreground">
                    Enter new markets knowing you understand the regulatory landscape and compliance requirements for your specific business model.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-lg"></div>
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20"></div>
                  <div className="absolute inset-0 subtle-grid"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/80 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl">
                      CS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-32 max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-semibold mb-6">Ready to transform your compliance approach?</h3>
            <p className="text-muted-foreground mb-8">
              Join hundreds of financial institutions already using ComplianceSync to navigate global regulations with confidence.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex flex-col items-center p-6 bg-muted rounded-lg w-60">
                <div className="text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground text-center mt-2">
                  Reduction in time spent on manual compliance monitoring
                </div>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-muted rounded-lg w-60">
                <div className="text-3xl font-bold text-primary">75%</div>
                <div className="text-sm text-muted-foreground text-center mt-2">
                  Decrease in compliance-related costs
                </div>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-muted rounded-lg w-60">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground text-center mt-2">
                  Improved audit readiness
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
