
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole | UserRole[]; // Optional roles required for access
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles 
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      // First check if the user is authenticated
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      // Then check if the user has the required role(s)
      if (requiredRoles && !hasPermission(requiredRoles)) {
        // User doesn't have permission, redirect to dashboard
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, navigate, requiredRoles, hasPermission]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // This will be replaced by the redirect in useEffect
  }
  
  // If requiredRoles are specified, check if the user has permission
  if (requiredRoles && !hasPermission(requiredRoles)) {
    return null; // This will be replaced by the redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
