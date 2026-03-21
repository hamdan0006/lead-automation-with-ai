import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search,
    Workflow,
    Clock,
    Filter,
    Plus,
    Activity,
    Linkedin,
    Twitter,
    Instagram,
    Globe,
    RefreshCw,
    AlertCircle,
    Info,
    X,
    Zap,
    LucideIcon
} from 'lucide-react';
import FlowCard from '../../components/ui/flowbtns/FlowCard';
import Flowbtn from '../../components/ui/flowbtns/Flowbtn';
import {
    getFlowTemplates,
    getUserFlows,
    pauseFlow,
    resumeFlow,
    deleteFlow
} from '../../api/flows';

import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

// Type definitions
type FlowStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'PENDING';
type Platform = 'linkedin' | 'twitter' | 'x' | 'instagram' | 'other';
type FlowCategory = 'engagement' | 'outreach' | 'analytics' | 'automation';

interface FlowStage {
    id: string;
    name: string;
    description: string;
    order: number;
    estimatedDuration: string;
}

interface FlowTemplate {
    id: string;
    displayName: string;
    description: string;
    summary: string;
    platform: Platform;
    category: FlowCategory;
    estimatedTime: string;
    stages: FlowStage[];
}

interface UserFlow {
    id: string;
    name: string;
    status: FlowStatus;
    template: FlowTemplate;
    createdAt: string;
    updatedAt: string;
    lastExecutedAt?: string;
    nextExecutionAt?: string;
    executionCount: number;
    successCount: number;
    failureCount: number;
    config: Record<string, any>;
}

interface ApiResponse<T> {
    status: 'success' | 'error';
    data: T;
    message?: string;
}

interface FlowsResponse {
    flows: UserFlow[];
}

interface FlowTemplatesResponse {
    flows: FlowTemplate[];
}

type TabType = 'available' | 'active';
type StatusFilterType = 'all' | FlowStatus;
type PlatformFilterType = 'all' | Platform;

const Flows: React.FC = () => {
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('available');
    const [flows, setFlows] = useState<UserFlow[]>([]);
    const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilterType>('all');
    const [showInfoBanner, setShowInfoBanner] = useState<boolean>(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const infoBannerRef = useRef<HTMLDivElement>(null);

    // Cooldown timer for resending verification
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Close info banner when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (infoBannerRef.current && !infoBannerRef.current.contains(event.target as Node)) {
                setShowInfoBanner(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch both templates and user flows on initial load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([fetchFlowTemplates(), fetchUserFlows()]);
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isAuthLoading && user && user.plan === 'PLUS' && user.emailVerified) {
            loadData();
        }
    }, [isAuthLoading, user]);

    // Refresh data when tab changes (without loading spinner)
    useEffect(() => {
        if (!isAuthLoading && user && user.plan === 'PLUS' && user.emailVerified) {
            if (activeTab === 'available') {
                fetchFlowTemplates();
            } else {
                fetchUserFlows();
            }
        }
    }, [activeTab, isAuthLoading, user]);

    const fetchFlowTemplates = async (): Promise<void> => {
        try {
            const response = await getFlowTemplates() as ApiResponse<FlowTemplatesResponse>;
            if (response.status === 'success') {
                setFlowTemplates(response.data.flows || []);
            }
        } catch (error) {
            console.error('Failed to fetch flow templates:', error);
            toast.error('Failed to load flow templates');
            throw error;
        }
    };

    const fetchUserFlows = async (): Promise<void> => {
        try {
            // Fetch all flows for the specific template to show both active and paused states
            const params: Record<string, string> = {
                templateId: 'linkedin-outreach-flow'
            };

            const response = await getUserFlows(params) as ApiResponse<FlowsResponse>;
            if (response.status === 'success') {
                setFlows(response.data.flows || []);
            }
        } catch (error) {
            console.error('Failed to fetch user flows:', error);
            toast.error('Failed to load your flows');
            // Don't throw to prevent unhandled rejection crashing the app, just log
        }
    };

    const handlePauseFlow = async (flowId: string): Promise<void> => {
        try {
            await pauseFlow(flowId);
            toast.success('Flow paused successfully');
            fetchUserFlows(); // Refresh the list
        } catch (error) {
            toast.error('Failed to pause flow');
        }
    };

    const handleResumeFlow = async (flowId: string): Promise<void> => {
        try {
            await resumeFlow(flowId);
            toast.success('Flow resumed successfully');
            fetchUserFlows(); // Refresh the list
        } catch (error) {
            toast.error('Failed to resume flow');
        }
    };

    const handleStopFlow = async (flowId: string): Promise<void> => {
        toast((t) => (
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-4 min-w-[320px]">
                <div className="flex items-start gap-3">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Delete Flow?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Are you sure you want to delete this flow? This action cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end mt-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await deleteFlow(flowId);
                                // Optimistic UI update: Remove the flow from state immediately
                                setFlows(prev => prev.filter(f => f.id !== flowId));
                                toast.success('Flow deleted successfully');
                                // fetchUserFlows(); // Re-fetch to sync with server just in case
                            } catch (error) {
                                toast.error('Failed to delete flow');
                            }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                        Delete Flow
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
            style: {
                background: 'none',
                boxShadow: 'none',
                padding: 0,
            },
        });
    };

    const handleRefreshTemplates = async (): Promise<void> => {
        try {
            await fetchFlowTemplates();
            toast.success('Templates refreshed');
        } catch (error) {
            // Error already handled in fetchFlowTemplates
        }
    };

    const handleRefreshFlows = async (): Promise<void> => {
        try {
            await fetchUserFlows();
            toast.success('Flows refreshed');
        } catch (error) {
            // Error already handled in fetchUserFlows
        }
    };

    // Filter templates based on search and platform
    const filteredTemplates = flowTemplates.filter(template => {
        const matchesSearch = template.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPlatform = platformFilter === 'all' || template.platform === platformFilter;
        return matchesSearch && matchesPlatform;
    });

    // Filter user flows based on search and status (Exclude STOPPED flows)
    const filteredFlows = flows.filter(flow => {
        const matchesSearch = flow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flow.template?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

        // Keep only ACTIVE, PAUSED, and COMPLETED flows in the running tab
        const isRunning = ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(flow.status);

        return matchesSearch && isRunning;
    });

    const handleResendVerification = async () => {
        if (!user?.email || resendCooldown > 0) return;

        setIsResending(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';
            const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });

            if (response.ok) {
                setResendCooldown(30);
                setResendSuccess(true);
                toast.success("Verification email resent!");
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to resend email");
            }
        } catch (err) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    // Get platform icon
    const getPlatformIcon = (platform: Platform): LucideIcon => {
        switch (platform?.toLowerCase()) {
            case 'linkedin': return Linkedin;
            case 'twitter': return Twitter;
            case 'x': return Twitter;
            case 'instagram': return Instagram;
            default: return Globe;
        }
    };

    // Get available platforms from templates
    const availablePlatforms = [...new Set(flowTemplates.map(t => t.platform))].filter(Boolean) as Platform[];

    // Final Access Check
    if (user && (user.plan !== 'PLUS' || !user.emailVerified)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-500">
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden text-center">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 -mr-16 -mt-16 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-500/5 -ml-16 -mb-16 rounded-full blur-3xl"></div>

                    {resendSuccess ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Check your email!</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">
                                We've sent a new verification link to <strong>{user.email}</strong>.<br />
                                Please verify your account to unlock Smart Flows.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Flowbtn onClick={() => setResendSuccess(false)} className="w-full py-3">
                                    Back to Requirements
                                </Flowbtn>
                                <button
                                    onClick={handleResendVerification}
                                    disabled={resendCooldown > 0 || isResending}
                                    className={`text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors ${resendCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {resendCooldown > 0 ? `Resend again in ${resendCooldown}s` : "Didn't receive it? Resend"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="relative mb-8">
                                <div className="w-20 h-20 bg-brand-500/10 dark:bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform transition-transform hover:scale-110">
                                    <Workflow className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div className="absolute -top-2 right-[35%] w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shadow-sm border border-amber-200 dark:border-amber-800">
                                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                                </div>
                            </div>

                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                Unlock AI Smart Flows
                            </h2>

                            <div className="space-y-4 mb-8">
                                {user.plan !== 'PLUS' && (
                                    <div className="flex items-start gap-3 text-left p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Upgrade to PLUS Plan</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Smart Flows are high-tier automation sequences reserved for our Plus members.</p>
                                        </div>
                                    </div>
                                )}

                                {!user.emailVerified && (
                                    <div className="flex items-start gap-3 text-left p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Verify Your Email</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">To maintain security, please verify your email address before accessing advanced automation.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {user.plan !== 'PLUS' ? (
                                    <Flowbtn
                                        onClick={() => navigate('/pricing')}
                                        className="w-full py-3 shadow-lg shadow-brand-500/20"
                                    >
                                        Upgrade to PLUS
                                    </Flowbtn>
                                ) : (
                                    <Flowbtn
                                        onClick={handleResendVerification}
                                        disabled={isResending || resendCooldown > 0}
                                        className="w-full py-3 shadow-lg shadow-brand-500/20"
                                    >
                                        {isResending ? "Sending..." : "Send Verification Email"}
                                    </Flowbtn>
                                )}
                                <Flowbtn
                                    variant="outline"
                                    onClick={() => navigate('/')}
                                    className="w-full py-3"
                                >
                                    Return to Dashboard
                                </Flowbtn>
                            </div>
                        </>
                    )}

                    <p className="mt-8 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                        Trobyx AI Automations
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-2 px-4 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-500/10 dark:bg-brand-500/20 rounded-xl flex items-center justify-center border border-brand-500/20">
                            <Workflow className="w-6 h-6 text-brand-500 dark:text-brand-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flows</h1>
                                <div className="relative" ref={infoBannerRef}>
                                    <button
                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors"
                                        onClick={() => setShowInfoBanner(!showInfoBanner)}
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>
                                    {showInfoBanner && (
                                        <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-20">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">About Flows</h4>
                                                </div>
                                                <button
                                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                    onClick={() => setShowInfoBanner(false)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                                Flows are continuous automation processes that run on schedules. Unlike Trobs (one-time data extraction),
                                                Flows maintain state across multiple runs and can execute up to 4 times daily for ongoing engagement and outreach.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Continuous automation workflows that run on schedules
                            </p>
                        </div>
                    </div>


                    {/* Search Bar */}
                    <div className="w-full sm:w-auto flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search flows..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="-mb-px flex gap-8">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === 'available'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Available Flows
                        {filteredTemplates.length > 0 && (
                            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'available' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {filteredTemplates.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${activeTab === 'active'
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Running Flows
                        {filteredFlows.length > 0 && (
                            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'active' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {filteredFlows.length}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Filters */}
            {activeTab === 'available' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
                        </div>

                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value as PlatformFilterType)}
                            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                        >
                            <option value="all">All Platforms</option>
                            {availablePlatforms.map(platform => (
                                <option key={platform} value={platform} className="capitalize">
                                    {platform}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Flowbtn
                        onClick={handleRefreshTemplates}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </Flowbtn>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm animate-pulse">
                            <div className="flex items-start gap-5">
                                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                    </div>
                                    <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                    <div className="flex gap-4 pt-2">
                                        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                                        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Available Flow Templates */}
            {activeTab === 'available' && !isLoading && (
                <div className="animate-in fade-in duration-500">
                    {filteredTemplates.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                            <Workflow className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flow templates found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                {searchTerm || platformFilter !== 'all'
                                    ? 'Try adjusting your search or filters to see more results.'
                                    : 'Flow templates are being added. Check back soon!'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredTemplates.map(template => {
                                const PlatformIcon = getPlatformIcon(template.platform);
                                return (
                                    <div key={template.id} className="group block">
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:border-brand-500/30 flex flex-col h-full">
                                            <div className="flex items-start gap-5 flex-1">
                                                {/* Template Icon Box */}
                                                <div className="relative w-20 h-20 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/10 dark:border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0 p-3 transition-transform duration-300 group-hover:scale-105">
                                                    <Workflow className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2 mb-2">
                                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${template.platform === 'linkedin' ? 'bg-[#0077b5]/10 text-[#0077b5]' :
                                                            template.platform === 'twitter' || template.platform === 'x' ? 'bg-black/10 text-black dark:bg-white/10 dark:text-white' :
                                                                'bg-brand-500/10 text-brand-500'
                                                            }`}>
                                                            <span className="flex items-center gap-1">
                                                                <PlatformIcon size={12} />
                                                                {template.platform}
                                                            </span>
                                                        </div>
                                                        <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                                            <span className="flex items-center gap-1">
                                                                <Zap size={10} />
                                                                Flow
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            <span>{template.category}</span>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand-500 transition-colors truncate">
                                                        {template.displayName}
                                                    </h3>

                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                                                        {template.summary}
                                                    </p>

                                                    <div className="flex items-center gap-6 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Activity size={14} className="text-gray-400" />
                                                            <span>{template.stages?.length || 0} STAGES</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={14} className="text-gray-400" />
                                                            <span>{template.estimatedTime || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons with increased height */}
                                            <div className="flex gap-3 mt-6">
                                                <Link to={`/flows/template/${template.id}`} className="flex-1">
                                                    <Flowbtn
                                                        variant="outline"
                                                        size="md"
                                                        className="w-full py-2"
                                                    >
                                                        Details
                                                    </Flowbtn>
                                                </Link>
                                                <Link to={`/flows/setup/${template.id}`} className="flex-1">
                                                    <Flowbtn
                                                        size="md"
                                                        className="w-full flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 py-2"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Start Flow
                                                    </Flowbtn>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}


            {/* User's Active Flows */}
            {activeTab === 'active' && !isLoading && (
                <div className="animate-in fade-in duration-500">
                    {filteredFlows.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed">
                            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flows found</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                                {flows.length === 0
                                    ? "You haven't started any flows yet. Go to 'Available Flows' to get started."
                                    : 'No flows match your current filters.'}
                            </p>
                            {flows.length === 0 && (
                                <Flowbtn
                                    onClick={() => setActiveTab('available')}
                                    className="flex items-center gap-2 mx-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    Browse Available Flows
                                </Flowbtn>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredFlows.map(flow => (
                                <FlowCard
                                    key={flow.id}
                                    flow={flow}
                                    onPause={handlePauseFlow}
                                    onResume={handleResumeFlow}
                                    onStop={handleStopFlow}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Flows;