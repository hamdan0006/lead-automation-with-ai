import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Play,
    Pause,
    Square,
    Activity,
    Clock,
    Users,
    TrendingUp,
    Settings,
    MoreVertical,
    Calendar,
    Target,
    MessageCircle,
    Eye,
    BarChart3,
    Trash,
    CircleSlash,
    LucideIcon
} from 'lucide-react';

// Type definitions
interface FlowTemplate {
    id: string;
    displayName: string;
    summary?: string;
    description?: string;
    platform?: string;
    category?: string;
}

interface FlowAnalytics {
    prospectStats?: {
        totalConnectionRequests?: number;
        connectionsAccepted?: number;
        [key: string]: any;
    };
    executionStats?: {
        totalRuns?: number;
        successfulRuns?: number;
        [key: string]: any;
    };
    performance?: {
        [key: string]: any;
    };
    scheduling?: {
        runsPerDay?: number;
        [key: string]: any;
    };
}

interface FlowState {
    prospectTracking?: {
        totalConnectionRequests?: number;
        connectionsAccepted?: number;
        [key: string]: any;
    };
    executionStats?: {
        totalRuns?: number;
        successfulRuns?: number;
        [key: string]: any;
    };
}

interface FlowConfig {
    executionSettings?: {
        runsPerDay?: number;
        [key: string]: any;
    };
}

export interface UserFlow {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'PENDING';
    template: FlowTemplate;
    createdAt: string;
    updatedAt: string;
    analytics?: FlowAnalytics;
    state?: FlowState;
    config?: FlowConfig;
    lastExecutedAt?: string;
    nextExecutionAt?: string;
    executionCount?: number;
    successCount?: number;
    failureCount?: number;
}

interface FlowCardProps {
    flow: UserFlow;
    onPause: (flowId: string) => Promise<void>;
    onResume: (flowId: string) => Promise<void>;
    onStop: (flowId: string) => Promise<void>;
}

const FlowCard: React.FC<FlowCardProps> = ({ flow, onPause, onResume, onStop }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleAction = async (action: (flowId: string) => Promise<void>, actionName: string) => {
        setIsLoading(true);
        try {
            await action(flow.id);
            setIsDropdownOpen(false);
        } catch (error) {
            console.error(`Failed to ${actionName}:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'PAUSED':
                return 'bg-yellow-100 text-yellow-800';
            case 'COMPLETED':
                return 'bg-blue-100 text-blue-800';
            case 'FAILED':
                return 'bg-red-100 text-red-800';
            case 'STOPPED':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string): React.ReactNode => {
        switch (status) {
            case 'ACTIVE':
                return <Activity className="w-3 h-3" />;
            case 'PAUSED':
                return <Pause className="w-3 h-3" />;
            case 'COMPLETED':
                return <Target className="w-3 h-3" />;
            case 'FAILED':
                return <Square className="w-3 h-3" />;
            case 'STOPPED':
                return <Square className="w-3 h-3" />;
            default:
                return <Clock className="w-3 h-3" />;
        }
    };

    const formatNextRun = (nextRun?: string): string => {
        if (!nextRun) return 'Not scheduled';
        const date = new Date(nextRun);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'Running soon';
        if (diffHours < 24) return `In ${diffHours}h`;
        return date.toLocaleDateString();
    };

    // Enhanced analytics access with better fallbacks
    const analytics = flow.analytics || {};
    const prospectStats = analytics.prospectStats || flow.state?.prospectTracking || {};
    const executionStats = analytics.executionStats || flow.state?.executionStats || {};
    const performance = analytics.performance || {};
    const scheduling = analytics.scheduling || flow.config?.executionSettings || {};

    // Better connection rate calculation with safety checks
    const getConnectionRate = (): string => {
        const totalRequests = prospectStats.totalConnectionRequests || 0;
        const accepted = prospectStats.connectionsAccepted || 0;

        if (totalRequests === 0) return '0%';

        const rate = ((accepted / totalRequests) * 100).toFixed(1);
        return `${rate}%`;
    };

    // Better success rate calculation with safety checks
    const getSuccessRate = (): string => {
        const totalRuns = executionStats.totalRuns || 0;
        const successfulRuns = executionStats.successfulRuns || 0;

        if (totalRuns === 0) return '0%';

        const rate = ((successfulRuns / totalRuns) * 100).toFixed(1);
        return `${rate}%`;
    };

    const connectionRatePercentage = parseFloat(getConnectionRate()) || 0;

    return (
        <div className="pt-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 relative">

            {/* Header */}
            <div className="p-7 pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {flow.name || flow.template?.displayName}
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                            {flow.template?.summary || flow.template?.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Created {new Date(flow.createdAt).toLocaleDateString()}</span>
                            </div>
                            {flow.template?.platform && (
                                <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    <span className="capitalize">{flow.template.platform}</span>
                                </div>
                            )}
                            {scheduling.runsPerDay && (
                                <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    <span>{scheduling.runsPerDay}x daily</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Analytics Stats */}
            <div className="px-5 pb-4">
                {/* Connection Rate Progress Bar */}
                {(prospectStats.totalConnectionRequests || 0) > 0 && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                            <span>Connection Rate</span>
                            <span>{getConnectionRate()}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                                style={{
                                    width: `${connectionRatePercentage}%`
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    {flow.status?.toUpperCase() === 'ACTIVE' && (
                        <button
                            onClick={() => handleAction(onPause, 'pause')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-md transition-colors"
                            disabled={isLoading}
                        >
                            <Pause className="w-3 h-3" />
                            Pause
                        </button>
                    )}
                    {flow.status?.toUpperCase() === 'PAUSED' && (
                        <button
                            onClick={() => handleAction(onResume, 'resume')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 text-green-800 dark:text-green-400 rounded-md transition-colors"
                            disabled={isLoading}
                        >
                            <Play className="w-3 h-3" />
                            Resume
                        </button>
                    )}
                    <button
                        onClick={() => handleAction(onStop, 'delete')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md transition-colors"
                        disabled={isLoading}
                    >
                        <Trash className="w-3 h-3" />
                        Delete
                    </button>

                    {/* View Options */}
                    <Link
                        to={`/flows/${flow.id}/analytics`}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                    </Link>
                    <Link
                        to={`/flows/${flow.id}/activities`}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                    >
                        <Activity className="w-4 h-4" />
                        Activities
                    </Link>
                    <Link
                        to={`/flows/${flow.id}/prospects`}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                    >
                        <Users className="w-4 h-4" />
                        Prospects
                    </Link>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center rounded-lg z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
                </div>
            )}
        </div>
    );
};

export default FlowCard;