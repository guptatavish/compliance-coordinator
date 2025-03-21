
import React from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface RoleBasedAccessProps {
  allowedRoles: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders content based on user roles
 */
const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  allowedRoles,
  children,
  fallback
}) => {
  const { hasPermission } = useAuth();
  
  if (hasPermission(allowedRoles)) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
};

export default RoleBasedAccess;
