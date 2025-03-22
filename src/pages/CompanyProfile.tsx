
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CompanyForm from '../components/CompanyForm';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

const CompanyProfile: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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
          
          <div className="max-w-4xl mx-auto">
            <CompanyForm />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default CompanyProfile;
