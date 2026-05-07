import React, { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthToken';
import { ActivitySquare } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-opacity-80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center">
          <ActivitySquare className="h-12 w-12 text-clinical-blue animate-pulse mb-4" />
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 bg-clinical-blue rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-clinical-blue rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-clinical-blue rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/LoginToken" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;