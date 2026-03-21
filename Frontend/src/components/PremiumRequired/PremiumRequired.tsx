import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import Flowbtn from '../ui/flowbtns/Flowbtn';

// Type definitions
type PlanType = 'BASIC' | 'PLUS' | 'PREMIUM' | 'ENTERPRISE';

interface User {
  plan?: PlanType;
  // Add other user properties as needed
  [key: string]: any;
}

interface AuthStore {
  user: User | null;
  // Add other auth store properties as needed
  [key: string]: any;
}

interface PremiumRequiredProps {
  children: ReactNode;
  requiredPlan?: PlanType;
  featureName?: string;
}

const PremiumRequired: React.FC<PremiumRequiredProps> = ({ 
  children, 
  requiredPlan = 'PLUS', 
  featureName = 'this feature' 
}) => {
  const { user } = useAuthStore() as AuthStore;
  const navigate = useNavigate();

  // Check if user has the required plan
  const hasRequiredPlan = user && user.plan && user.plan === requiredPlan;

  if (!hasRequiredPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
          <p className="text-gray-600 mb-6">
            The {featureName} requires a {requiredPlan} plan or higher. Please upgrade your account to continue.
          </p>
          
          <div className="space-y-3">
            <Flowbtn
              onClick={() => navigate('/pricing')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              View Pricing Plans
            </Flowbtn>
            
            <Flowbtn
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Back to Dashboard
            </Flowbtn>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PremiumRequired;