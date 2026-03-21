import { useState, useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';

// TRIAL usage limit - 3 total executions across Trobs and Flows
const TRIAL_EXECUTION_LIMIT = 3;

// Type definitions
type PlanType = 'TRIAL' | 'BASIC' | 'PLUS' | 'PREMIUM' | 'ENTERPRISE';

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

interface TrackExecutionResult {
  success: boolean;
  count: number;
  remaining: number;
  hasReachedLimit: boolean;
}

interface UseUsageTrackingReturn {
  executionCount: number;
  remainingExecutions: number;
  hasReachedLimit: boolean;
  canExecute: boolean;
  trackExecution: () => TrackExecutionResult;
  resetUsage: () => void;
  loading: boolean;
  plan?: PlanType;
}

export const useUsageTracking = (): UseUsageTrackingReturn => {
  const { user } = useAuthStore() as AuthStore;
  const [executionCount, setExecutionCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Load execution count from localStorage
  useEffect(() => {
    const loadExecutionCount = async (): Promise<void> => {
      if (!user) {
        setExecutionCount(0);
        setLoading(false);
        return;
      }

      try {
        // For TRIAL users, load from localStorage
        if (user.plan === 'TRIAL') {
          const savedCount = localStorage.getItem('trialExecutionCount');
          setExecutionCount(savedCount ? parseInt(savedCount, 10) : 0);
        } else {
          // For non-TRIAL users, they have unlimited usage
          setExecutionCount(0);
        }
      } catch (error) {
        console.error('Error loading execution count:', error);
        setExecutionCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadExecutionCount();
  }, [user]);

  // Track a new execution
  const trackExecution = (): TrackExecutionResult => {
    if (!user || user.plan !== 'TRIAL') {
      // Non-TRIAL users don't have execution limits
      return { 
        success: true, 
        count: 0, 
        remaining: -1, 
        hasReachedLimit: false 
      };
    }

    const newCount = executionCount + 1;
    localStorage.setItem('trialExecutionCount', newCount.toString());
    setExecutionCount(newCount);

    const remaining = Math.max(0, TRIAL_EXECUTION_LIMIT - newCount);
    const hasReachedLimit = newCount > TRIAL_EXECUTION_LIMIT;

    return {
      success: !hasReachedLimit,
      count: newCount,
      remaining,
      hasReachedLimit
    };
  };

  // Check if user has reached their execution limit
  const hasReachedLimit = user?.plan === 'TRIAL' && executionCount >= TRIAL_EXECUTION_LIMIT;

  // Reset usage (for testing purposes or if needed)
  const resetUsage = (): void => {
    if (user?.plan === 'TRIAL') {
      localStorage.setItem('trialExecutionCount', '0');
      setExecutionCount(0);
    }
  };

  // Check if user is allowed to execute
  const canExecute = user?.plan !== 'TRIAL' || executionCount < TRIAL_EXECUTION_LIMIT;

  return {
    executionCount,
    remainingExecutions: Math.max(0, TRIAL_EXECUTION_LIMIT - executionCount),
    hasReachedLimit,
    canExecute,
    trackExecution,
    resetUsage,
    loading,
    plan: user?.plan
  };
};

export default useUsageTracking;