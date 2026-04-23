import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if roles specified
  if (roles && !roles.includes(user.role)) {
    // Redirect to user's own dashboard
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
}

export default PrivateRoute;
