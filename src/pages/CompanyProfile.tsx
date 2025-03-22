
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CompanyForm from '../components/CompanyForm';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

const CompanyProfile: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Check user role for access control (if roles are implemented)
  const hasAccess = () => {
    if (!user || !user.role) return true; // Default to allowing access if role system isn't active
    
    // Allow only specific roles to edit company profile
    const allowedRoles = ['admin', 'compliance_officer', 'finance_manager', 'executive'];
    return allowedRoles.includes(user.role);
  };

  return (
    <ProtectedRoute>
      <Layout showFooter={false}>
        <div className="container px-4 py-8 mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
            <p className="text-muted-foreground">
              Provide your company details to receive tailored compliance insights.
            </p>
          </div>
          
          {!hasAccess() ? (
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Access Restricted</AlertTitle>
              <AlertDescription>
                You do not have permission to edit company profile information. 
                Please contact your administrator for assistance.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="max-w-4xl mx-auto">
              <CompanyForm />
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default CompanyProfile;
