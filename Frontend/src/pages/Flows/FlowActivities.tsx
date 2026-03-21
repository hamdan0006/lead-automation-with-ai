import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Activity,
    Users,
    MessageCircle,
    Heart,
    MessageSquare,
    Clock,
    Calendar,
    Filter,
    Search,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    UserCheck,
    UserPlus,
    UserX,
    AlertCircle,
    CheckCircle,
    Loader2,
    RefreshCw,
    Eye
} from 'lucide-react';
import { getFlow, getFlowActivities } from '../../api/flows';
import Flowbtn from '../../components/ui/flowbtns/Flowbtn';

import { toast } from 'react-hot-toast';

// Type definitions
interface Flow {
    _id?: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | string;
    nextScheduledRun?: string;
    [key: string]: any;
}

interface Prospect {
    name?: string;
    company?: string;
    title?: string;
    [key: string]: any;
}

interface ConnectionDetails {
    message?: string;
    requestId?: string;
    [key: string]: any;
}

interface EngagementDetails {
    postText?: string;
    postUrl?: string;
    comment?: string;
    [key: string]: any;
}

interface ActivityItem {
    id: string;
    type: string;
    wasSuccessful: boolean;
    prospect?: Prospect;
    timestamp: string;
    stage?: string;
    connection?: ConnectionDetails;
    engagement?: EngagementDetails;
    details?: Record<string, any>;
    errorMessage?: string;
    [key: string]: any;
}

interface Pagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    [key: string]: any;
}

interface ApiResponse<T> {
    status: 'success' | 'error';
    data: {
        flow?: T;
        activities?: ActivityItem[];
        pagination?: Pagination;
    };
    [key: string]: any;
}

interface Filters {
    page: number;
    limit: number;
    type: string;
    search: string;
}

const FlowActivities: React.FC = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const [flow, setFlow] = useState<Flow | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [filters, setFilters] = useState<Filters>({
        page: 1,
        limit: 20,
        type: '',
        search: ''
    });
    const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        fetchFlow();
        fetchActivities();
    }, [flowId]);

    const fetchFlow = async () => {
        if (!flowId) return;

        try {
            const response = await getFlow(flowId);

            if (response && response.status === 'success') {
                // Force cast to any then to local Flow type since API return type differs slightly
                const flowData = (response.data as any).flow || null;
                setFlow(flowData);
            }
        } catch (error) {
            console.error('Failed to fetch flow:', error);
            toast.error('Failed to load flow details');
        }
    };

    const fetchActivities = async (newFilters: Filters = filters) => {
        if (!flowId) return;

        try {
            if (newFilters.page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await getFlowActivities(flowId, newFilters);

            if (response && response.status === 'success') {
                // Handle response data structure which might be flexible (any)
                const responseData = response.data as any;
                const newActivities = responseData.activities || [];

                if (newFilters.page === 1) {
                    setActivities(newActivities);
                } else {
                    setActivities(prev => [...prev, ...newActivities]);
                }
                setPagination(responseData.pagination || null);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
            toast.error('Failed to load activities');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchActivities();
        setRefreshing(false);
        toast.success('Activities refreshed');
    };

    const loadMore = () => {
        if (pagination?.hasNext && !loadingMore) {
            const newFilters: Filters = {
                ...filters,
                page: filters.page + 1
            };
            setFilters(newFilters);
            fetchActivities(newFilters);
        }
    };

    const applyFilters = () => {
        const newFilters: Filters = {
            ...filters,
            page: 1
        };
        setFilters(newFilters);
        fetchActivities(newFilters);
    };

    const clearFilters = () => {
        const newFilters: Filters = {
            page: 1,
            limit: 20,
            type: '',
            search: ''
        };
        setFilters(newFilters);
        fetchActivities(newFilters);
    };

    const toggleActivityExpansion = (activityId: string) => {
        setExpandedActivity(expandedActivity === activityId ? null : activityId);
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'CONNECTION_SENT':
                return <UserPlus className="w-4 h-4" />;
            case 'CONNECTION_ACCEPTED':
                return <UserCheck className="w-4 h-4" />;
            case 'CONNECTION_DECLINED':
                return <UserX className="w-4 h-4" />;
            case 'POST_LIKED':
                return <Heart className="w-4 h-4" />;
            case 'POST_COMMENTED':
                return <MessageSquare className="w-4 h-4" />;
            case 'MESSAGE_SENT':
                return <MessageCircle className="w-4 h-4" />;
            case 'PROFILE_VIEWED':
                return <Eye className="w-4 h-4" />;
            default:
                return <Activity className="w-4 h-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'CONNECTION_SENT':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
            case 'CONNECTION_ACCEPTED':
                return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
            case 'CONNECTION_DECLINED':
                return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
            case 'POST_LIKED':
                return 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50';
            case 'POST_COMMENTED':
                return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50';
            case 'MESSAGE_SENT':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50';
            case 'PROFILE_VIEWED':
                return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'CONNECTION_SENT':
                return 'Connection Request Sent';
            case 'CONNECTION_ACCEPTED':
                return 'Connection Accepted';
            case 'CONNECTION_DECLINED':
                return 'Connection Declined';
            case 'POST_LIKED':
                return 'Post Liked';
            case 'POST_COMMENTED':
                return 'Post Commented';
            case 'MESSAGE_SENT':
                return 'Message Sent';
            case 'PROFILE_VIEWED':
                return 'Profile Viewed';
            default:
                return type.replace(/_/g, ' ').toLowerCase();
        }
    };

    if (loading && activities.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!flow) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Flow not found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">The requested flow could not be found.</p>
                <Link to="/flows">
                    <Flowbtn>Back to Flows</Flowbtn>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-2 px-4 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                    <Link to={`/flows/${flowId}/analytics`}>
                        <Flowbtn variant="outline" size="sm" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Analytics
                        </Flowbtn>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flow Activities</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{flow.name}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Flowbtn
                        onClick={handleRefresh}
                        variant="outline"
                        size="sm"
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Flowbtn>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                value={filters.search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFilters({ ...filters, search: e.target.value })
                                }
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-48">
                        <select
                            value={filters.type}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFilters({ ...filters, type: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                            <option value="">All Types</option>
                            <option value="CONNECTION_SENT">Connection Requests</option>
                            <option value="CONNECTION_ACCEPTED">Connections Accepted</option>
                            <option value="POST_LIKED">Post Likes</option>
                            <option value="POST_COMMENTED">Post Comments</option>
                            <option value="MESSAGE_SENT">Messages Sent</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <Flowbtn onClick={applyFilters} size="sm" className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Apply
                        </Flowbtn>
                        <Flowbtn onClick={clearFilters} variant="outline" size="sm">
                            Clear
                        </Flowbtn>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            {pagination && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {Math.min((filters.page - 1) * filters.limit + 1, pagination.totalItems)}-
                        {Math.min(filters.page * filters.limit, pagination.totalItems)} of {pagination.totalItems} activities
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                </div>
            )}

            {/* Activities List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                {activities.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activities found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {filters.search || filters.type
                                ? 'No activities match your current filters.'
                                : 'No activities have been recorded for this flow yet.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {activities.map((activity) => (
                            <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${getActivityColor(activity.type)}`}>
                                        {getActivityIcon(activity.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                                        {getTypeLabel(activity.type)}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm ${getActivityColor(activity.type)}`}>
                                                        {activity.wasSuccessful ? (
                                                            <CheckCircle className="w-3 h-3" />
                                                        ) : (
                                                            <AlertCircle className="w-3 h-3" />
                                                        )}
                                                        {activity.wasSuccessful ? 'Success' : 'Failed'}
                                                    </span>
                                                </div>

                                                {activity.prospect && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                        <span className="truncate">{activity.prospect.name}</span>
                                                        {activity.prospect.company && (
                                                            <span>• {activity.prospect.company}</span>
                                                        )}
                                                        {activity.prospect.title && (
                                                            <span>• {activity.prospect.title}</span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{formatDate(activity.timestamp)}</span>
                                                    </div>
                                                    {activity.stage && (
                                                        <span className="capitalize">{activity.stage.replace(/_/g, ' ')}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => toggleActivityExpansion(activity.id)}
                                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {expandedActivity === activity.id ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedActivity === activity.id && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                                {/* Connection Details */}
                                                {activity.connection && (
                                                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 border border-transparent dark:border-blue-500/20">
                                                        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Connection Details</h4>
                                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                                            <p className="mb-1 text-blue-900/70 dark:text-blue-300/70"><strong>Message:</strong></p>
                                                            <p className="whitespace-pre-wrap">{activity.connection.message}</p>
                                                            {activity.connection.requestId && (
                                                                <p className="mt-1"><strong className="text-blue-900/70 dark:text-blue-300/70">Request ID:</strong> {activity.connection.requestId}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Engagement Details */}
                                                {activity.engagement && (
                                                    <div className="bg-purple-50 dark:bg-purple-500/10 rounded-lg p-3 border border-transparent dark:border-purple-500/20">
                                                        <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Engagement Details</h4>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="text-sm text-purple-800 dark:text-purple-300/70"><strong>Post:</strong></p>
                                                                <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                                                                    {activity.engagement.postText || activity.engagement.postUrl}
                                                                </p>
                                                                {activity.engagement.postUrl && (
                                                                    <a
                                                                        href={activity.engagement.postUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 text-sm mt-1"
                                                                    >
                                                                        View Post <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {activity.engagement.comment && (
                                                                <div>
                                                                    <p className="text-sm text-purple-800 dark:text-purple-300/70"><strong>Comment:</strong></p>
                                                                    <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{activity.engagement.comment}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* General Details */}
                                                {activity.details && Object.keys(activity.details).length > 0 && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Additional Details</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {Object.entries(activity.details).map(([key, value]) => (
                                                                <div key={key} className="text-sm">
                                                                    <span className="font-medium text-gray-700 dark:text-gray-400 capitalize">
                                                                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                                    </span>{' '}
                                                                    <span className="text-gray-600 dark:text-gray-300">
                                                                        {typeof value === 'string' && value.length > 100
                                                                            ? `${value.substring(0, 100)}...`
                                                                            : String(value)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {activity.errorMessage && (
                                                    <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-3 border border-transparent dark:border-red-500/20">
                                                        <h4 className="font-medium text-red-900 dark:text-red-300 mb-1">Error Details</h4>
                                                        <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">{activity.errorMessage}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Load More Button */}
            {pagination?.hasNext && (
                <div className="flex justify-center">
                    <Flowbtn
                        onClick={loadMore}
                        disabled={loadingMore}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Load More Activities
                            </>
                        )}
                    </Flowbtn>
                </div>
            )}

            {/* End of Results */}
            {pagination && !pagination.hasNext && activities.length > 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    You've reached the end of the activity feed.
                </div>
            )}
        </div>
    );
};

export default FlowActivities;