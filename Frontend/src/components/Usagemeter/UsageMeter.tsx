import React from 'react';

type ColorType = 'blue' | 'purple' | 'green';

interface UsageMeterProps {
  title: string;
  used: number;
  limit: number;
  unit?: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  color?: ColorType;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ 
  title, 
  used, 
  limit, 
  unit = '', 
  showUpgrade = false, 
  onUpgrade,
  color = 'blue'
}) => {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  
  const getColorClasses = (): string => {
    if (isAtLimit) return 'text-red-600 bg-red-100 border-red-200';
    if (isNearLimit) return 'text-orange-600 bg-orange-100 border-orange-200';
    
    switch (color) {
      case 'purple':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'green':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };
  
  const getProgressColor = (): string => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-orange-500';
    
    switch (color) {
      case 'purple':
        return 'bg-purple-500';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${getColorClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        {showUpgrade && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-xs px-2 py-1 bg-white rounded-md hover:bg-gray-50 transition-colors"
          >
            Upgrade
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{used.toLocaleString()} {unit} used</span>
          <span>{limit.toLocaleString()} {unit} limit</span>
        </div>
        
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="text-xs opacity-75">
          {percentage.toFixed(0)}% used
          {limit > used && (
            <span> • {(limit - used).toLocaleString()} {unit} remaining</span>
          )}
        </div>
        
        {isAtLimit && (
          <div className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
            Limit reached! Upgrade your plan to continue.
          </div>
        )}
        
        {isNearLimit && !isAtLimit && (
          <div className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded">
            Approaching limit. Consider upgrading your plan.
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageMeter;