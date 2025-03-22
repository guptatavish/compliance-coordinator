
import React from 'react';
import Layout from '../components/Layout';
import CompanyForm from '../components/CompanyForm';

const CompanyProfile: React.FC = () => {
  return (
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
  );
};

export default CompanyProfile;
