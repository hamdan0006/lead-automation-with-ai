import { useMemo } from 'react';
import useAuthStore from '../stores/useAuthStore';

// Define plan types
export type PlanType = 'FREE' | 'TRIAL' | 'BASE' | 'PRO' | 'PLUS';

export type PlatformType = 'linkedin' | 'twitter' | 'facebook' | 'instagram'; // Add more as needed
export type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';
export type SupportType = 'community' | 'email' | 'priority_email' | 'live_chat';
export type AiPersonalizationType = 'basic' | 'advanced' | undefined;

export interface PlanLimit {
  maxConcurrentAutomations: number;
  maxMonthlyProfiles: number;
  smartFlows: number;
  flows?: boolean;
  platforms: PlatformType[];
  exportFormats: ExportFormat[];
  support: SupportType;
  aiPersonalization?: AiPersonalizationType;
  trialDays?: number;
  teamUsers?: number;
  whiteLabelOption?: boolean;
}

export interface FeatureAccess {
  smartFlows: boolean;
  flows: boolean;
  aiPersonalization: boolean;
  advancedExports: boolean;
  multiPlatform: boolean;
  teamFeatures: boolean;
  whiteLabelOption: boolean;
}

export interface LimitCheckResult {
  canCreate: boolean;
  limit: number;
  remaining: number;
  isNearLimit: boolean;
}

export interface ProfileLimitCheckResult {
  canUse: boolean;
  limit: number;
  remaining: number;
  usagePercentage: number;
  isNearLimit: boolean;
}

// Plan limits configuration - matches backend
const PLAN_LIMITS: Record<PlanType, PlanLimit> = {
  FREE: {
    maxConcurrentAutomations: 1,
    maxMonthlyProfiles: 100,
    smartFlows: 0,
    platforms: ['linkedin'],
    exportFormats: ['csv'],
    support: 'community'
  },
  TRIAL: {
    maxConcurrentAutomations: 5,
    maxMonthlyProfiles: 200,
    smartFlows: 1,
    platforms: ['linkedin', 'twitter'],
    exportFormats: ['csv', 'json', 'excel'],
    support: 'email',
    aiPersonalization: 'basic',
    trialDays: 14
  },
  BASE: {
    maxConcurrentAutomations: 2,
    maxMonthlyProfiles: 300,
    smartFlows: 0,
    platforms: ['linkedin'], // OR twitter
    exportFormats: ['csv'],
    support: 'email'
  },
  PRO: {
    maxConcurrentAutomations: 5,
    maxMonthlyProfiles: 1500,
    smartFlows: 1,
    flows: true, // Enable AI Flows for PRO
    platforms: ['linkedin', 'twitter'],
    exportFormats: ['csv', 'json', 'excel'],
    support: 'priority_email',
    aiPersonalization: 'basic'
  },
  PLUS: {
    maxConcurrentAutomations: 15,
    maxMonthlyProfiles: 5000,
    smartFlows: 3,
    flows: true, // Enable AI Flows for BUSINESS
    platforms: ['linkedin', 'twitter'],
    exportFormats: ['csv', 'json', 'excel', 'pdf'],
    support: 'live_chat',
    aiPersonalization: 'advanced',
    teamUsers: 3,
    whiteLabelOption: true
  }
};

export const usePlanLimits = () => {
  const { user } = useAuthStore();
  
  const planLimits = useMemo(() => {
    if (!user?.plan) return PLAN_LIMITS.FREE;
    
    const userPlan = user.plan as PlanType;
    return PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;
  }, [user?.plan]);
  
  const canUseFeature = useMemo((): FeatureAccess => ({
    smartFlows: planLimits.smartFlows > 0,
    flows: planLimits.flows === true, // New AI Flows feature
    aiPersonalization: planLimits.aiPersonalization !== undefined,
    advancedExports: planLimits.exportFormats.length > 1,
    multiPlatform: planLimits.platforms.length > 1,
    teamFeatures: (planLimits.teamUsers || 0) > 0,
    whiteLabelOption: planLimits.whiteLabelOption === true
  }), [planLimits]);
  
  const checkAutomationLimit = (currentCount: number): LimitCheckResult => {
    return {
      canCreate: currentCount < planLimits.maxConcurrentAutomations,
      limit: planLimits.maxConcurrentAutomations,
      remaining: planLimits.maxConcurrentAutomations - currentCount,
      isNearLimit: currentCount >= planLimits.maxConcurrentAutomations * 0.8
    };
  };
  
  const checkProfileLimit = (currentUsage: number): ProfileLimitCheckResult => {
    const usagePercentage = planLimits.maxMonthlyProfiles > 0 
      ? (currentUsage / planLimits.maxMonthlyProfiles) * 100 
      : 0;
    
    return {
      canUse: currentUsage < planLimits.maxMonthlyProfiles,
      limit: planLimits.maxMonthlyProfiles,
      remaining: planLimits.maxMonthlyProfiles - currentUsage,
      usagePercentage,
      isNearLimit: currentUsage >= planLimits.maxMonthlyProfiles * 0.8
    };
  };
  
  const getUpgradeMessage = (feature?: string): string => {
    const planName = user?.plan as PlanType | undefined;
    
    if (!planName || planName === 'FREE') {
      return 'Start a free trial or upgrade to unlock this feature.';
    }
    
    if (planName === 'TRIAL') {
      return 'Upgrade to Pro to unlock this feature after your trial ends.';
    }
    
    if (planName === 'BASE') {
      return 'Upgrade to Pro to unlock this feature.';
    }
    
    if (planName === 'PRO') {
      return 'Upgrade to Business to unlock this feature.';
    }
    
    return 'This feature is not available in your current plan.';
  };
  
  const isTrialExpired = useMemo(() => {
    if (user?.plan !== 'TRIAL' || !user?.trialEndsAt) return false;
    return new Date() > new Date(user.trialEndsAt);
  }, [user?.plan, user?.trialEndsAt]);
  
  const trialDaysRemaining = useMemo(() => {
    if (user?.plan !== 'TRIAL' || !user?.trialEndsAt) return 0;
    const now = new Date();
    const trialEnd = new Date(user.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [user?.plan, user?.trialEndsAt]);
  
  return {
    planLimits,
    canUseFeature,
    checkAutomationLimit,
    checkProfileLimit,
    getUpgradeMessage,
    isTrialExpired,
    trialDaysRemaining,
    currentPlan: (user?.plan as PlanType) || 'FREE'
  };
};

export default usePlanLimits;