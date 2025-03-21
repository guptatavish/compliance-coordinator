
import React from 'react';
import { 
  Globe, 
  ShieldCheck, 
  Bell, 
  BarChart2, 
  FileText, 
  Users,
  Clock,
  Lock,
  CloudUpload
} from 'lucide-react';

const features = [
  {
    title: 'Multi-Jurisdiction Coverage',
    description: 'Track compliance requirements across multiple countries and regions simultaneously.',
    icon: Globe,
  },
  {
    title: 'Automated Compliance Analysis',
    description: 'AI-powered analysis identifies compliance gaps and provides actionable recommendations.',
    icon: ShieldCheck,
  },
  {
    title: 'Real-Time Monitoring',
    description: 'Stay updated on regulatory changes affecting your business with instant notifications.',
    icon: Bell,
  },
  {
    title: 'Interactive Analytics',
    description: 'Visualize compliance data across jurisdictions with intuitive charts and dashboards.',
    icon: BarChart2,
  },
  {
    title: 'Comprehensive Reporting',
    description: 'Generate detailed compliance reports in multiple formats for audits and stakeholders.',
    icon: FileText,
  },
  {
    title: 'Role-Based Access',
    description: 'Customize user permissions based on roles and responsibilities within your organization.',
    icon: Users,
  },
  {
    title: 'Historical Tracking',
    description: 'Maintain a complete audit trail of compliance activities and regulatory changes.',
    icon: Clock,
  },
  {
    title: 'Secure Document Storage',
    description: 'Safely store and manage all compliance-related documentation in one place.',
    icon: Lock,
  },
  {
    title: 'Easy Integration',
    description: 'Connect with your existing tools and systems for a seamless compliance workflow.',
    icon: CloudUpload,
  },
];

const Features: React.FC = () => {
  return (
    <div className="py-24 bg-background relative overflow-hidden" id="features">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 subtle-grid" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-bold tracking-tight text-foreground animate-slideDown">
            Comprehensive Compliance Management
          </h2>
          <p className="mt-4 text-lg text-muted-foreground animate-slideDown" style={{ animationDelay: '100ms' }}>
            Our platform offers everything you need to navigate complex regulatory landscapes with confidence.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="relative group bg-background border border-border rounded-lg p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-md animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col h-full">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground flex-grow">{feature.description}</p>
              </div>
              
              {/* Subtle hover effect */}
              <div className="absolute inset-0 border border-primary/0 rounded-lg transition-all duration-300 group-hover:border-primary/20 pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
