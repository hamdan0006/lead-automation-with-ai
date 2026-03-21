import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Users,
    Search,
    Filter,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Heart,
    MessageSquare,
    UserPlus,
    UserCheck,
    Calendar,
    Clock,
    Star,
    MapPin,
    Building,
    Award,
    TrendingUp,
    BarChart3,
    Eye,
    ThumbsUp,
    MessageCircle,
    RefreshCw,
    Loader2,
    AlertCircle,
    Sparkles,
    UserX
} from 'lucide-react';
import { getFlow, getFlowProspects } from '../../api/flows';
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

interface Activity {
    message?: string;
    description?: string;
    timestamp: string;
    [key: string]: any;
}

interface Engagement {
    type: 'POST_LIKED' | 'POST_COMMENTED' | string;
    timestamp: string;
    postText?: string;
    comment?: string;
    postUrl?: string;
    [key: string]: any;
}

interface Connection {
    sentAt: string;
    message?: string;
    acceptedAt?: string;
    declinedAt?: string;
    [key: string]: any;
}

interface Post {
    type?: string;
    timestamp: string;
    content?: string;
    postText?: string;
    url?: string;
    engagement?: {
        liked?: boolean;
        commented?: boolean;
    };
    metrics?: {
        likesCount?: number;
        commentsCount?: number;
    };
    [key: string]: any;
}

interface Prospect {
    id: string;
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    profileImage?: string;
    aiScore?: number;
    matchQuality?: string;
    matchReason?: string;
    relevanceFactors?: string[] | Record<string, any>;
    connection?: Connection;
    engagements?: Engagement[];
    recentPosts?: Post[];
    profileUrl?: string;
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
        prospects?: T[];
        pagination?: Pagination;
    };
    [key: string]: any;
}

interface Filters {
    page: number;
    limit: number;
    status: string;
    search: string;
    aiScore?: string;
}

const FlowProspects: React.FC = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const [flow, setFlow] = useState<Flow | null>(null);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [filters, setFilters] = useState<Filters>({
        page: 1,
        limit: 20,
        status: '',
        search: ''
    });
    const [expandedProspect, setExpandedProspect] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        fetchFlow();
        fetchProspects();
    }, [flowId]);

    const fetchFlow = async () => {
        if (!flowId) return;

        try {
            const response = await getFlow(flowId);

            if (response && response.status === 'success') {
                const flowData = (response.data as any).flow || null;
                setFlow(flowData);
            }
        } catch (error) {
            console.error('Failed to fetch flow:', error);
            toast.error('Failed to load flow details');
        }
    };

    const fetchProspects = async (newFilters: Filters = filters) => {
        if (!flowId) return;

        try {
            if (newFilters.page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await getFlowProspects(flowId, newFilters);

            if (response && response.status === 'success') {
                // Cast via unknown to ensure type safety matching the state
                const responseData = response.data as any;
                const newProspects = (responseData.prospects || []) as Prospect[];

                if (newFilters.page === 1) {
                    setProspects(newProspects);
                } else {
                    setProspects(prev => [...prev, ...newProspects]);
                }
                setPagination(responseData.pagination || null);
            }
        } catch (error) {
            console.error('Failed to fetch prospects:', error);
            toast.error('Failed to load prospects');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchProspects();
        setRefreshing(false);
        toast.success('Prospects refreshed');
    };

    const loadMore = () => {
        if (pagination?.hasNext && !loadingMore) {
            const newFilters: Filters = {
                ...filters,
                page: filters.page + 1
            };
            setFilters(newFilters);
            fetchProspects(newFilters);
        }
    };

    const toggleTopPicks = () => {
        const isTopPicks = filters.aiScore === 'top_picks';
        const newFilters: Filters = {
            ...filters,
            aiScore: isTopPicks ? '' : 'top_picks',
            page: 1
        };
        setFilters(newFilters);
        fetchProspects(newFilters);
    };

    const applyFilters = () => {
        const newFilters: Filters = {
            ...filters,
            page: 1
        };
        setFilters(newFilters);
        fetchProspects(newFilters);
    };

    const clearFilters = () => {
        const newFilters: Filters = {
            page: 1,
            limit: 20,
            status: '',
            search: '',
            aiScore: ''
        };
        setFilters(newFilters);
        fetchProspects(newFilters);
    };

    const toggleProspectExpansion = (prospectId: string) => {
        setExpandedProspect(expandedProspect === prospectId ? null : prospectId);
    };

    const getMatchQualityColor = (quality?: string) => {
        if (!quality) return 'text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600';

        switch (quality.toLowerCase()) {
            case 'hot':
                return 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50';
            case 'warm':
                return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800/50';
            case 'cold':
                return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50';
            default:
                return 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    const getAIScoreColor = (score?: number) => {
        if (score === undefined) return 'text-gray-500 border-gray-200 dark:border-gray-700';
        if (score >= 90) return 'text-green-600 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800/50';
        if (score >= 70) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50';
        if (score >= 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50';
        return 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderActivitiesTimeline = (activities?: Record<string, Activity[]>) => {
        if (!activities || Object.keys(activities).length === 0) {
            return (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No activities recorded
                </div>
            );
        }

        return Object.entries(activities).map(([activityType, activityList]) => (
            <div key={activityType} className="mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">
                    {activityType.replace(/_/g, ' ').toLowerCase()}
                </h4>
                <div className="space-y-2">
                    {activityList.map((activity: Activity, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-700 dark:text-gray-300">{activity.message || activity.description}</span>
                            <span className="text-gray-500 dark:text-gray-500 text-xs">{formatDate(activity.timestamp)}</span>
                        </div>
                    ))}
                </div>
            </div>
        ));
    };

    const renderEngagements = (engagements?: Engagement[]) => {
        if (!engagements || engagements.length === 0) {
            return (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No engagements recorded
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {engagements.map((engagement: Engagement, index: number) => (
                    <div key={index} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-purple-500/20 rounded-lg p-3 shadow-sm hover:border-purple-300 dark:hover:border-purple-500/40 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {engagement.type === 'POST_LIKED' ? (
                                    <Heart className="w-4 h-4 text-pink-500" />
                                ) : (
                                    <MessageSquare className="w-4 h-4 text-purple-500" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {engagement.type === 'POST_LIKED' ? 'Liked Post' : 'Commented on Post'}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(engagement.timestamp)}</span>
                        </div>

                        {engagement.postText && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2 italic border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                "{engagement.postText}"
                            </p>
                        )}

                        {engagement.comment && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-500/5 p-2 rounded border border-blue-100/50 dark:border-blue-500/10 mb-2">
                                <span className="font-medium text-blue-700 dark:text-blue-400">Your Comment:</span> "{engagement.comment}"
                            </div>
                        )}

                        {engagement.postUrl && (
                            <a
                                href={engagement.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
                            >
                                View Post <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (loading && prospects.length === 0) {
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
                            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flow Prospects</h1>
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
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search prospects..."
                                value={filters.search}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFilters({ ...filters, search: e.target.value })
                                }
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4">
                        <div className="w-full lg:w-48">
                            <select
                                value={filters.status}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setFilters({ ...filters, status: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                <option value="">All Status</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="ACCEPTED">Connected</option>
                                <option value="PENDING">Connection Pending</option>
                                <option value="DECLINED">Connection Declined</option>
                            </select>
                        </div>

                        <div className="w-full lg:w-48">
                            <select
                                value={filters.aiScore || ''}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setFilters({ ...filters, aiScore: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                <option value="">All AI Scores</option>
                                <option value="qualified">Qualified ({'>'} 50)</option>
                                <option value="unqualified">Unqualified ({'<='} 50)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Flowbtn
                            onClick={toggleTopPicks}
                            size="sm"
                            variant={filters.aiScore === 'top_picks' ? 'primary' : 'outline'}
                            className="flex items-center gap-2 whitespace-nowrap"
                        >
                            <Sparkles className="w-4 h-4" />
                            Top Prospects
                        </Flowbtn>
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
                        {Math.min(filters.page * filters.limit, pagination.totalItems)} of {pagination.totalItems} prospects
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                </div>
            )}

            {/* Prospects List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                {prospects.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No prospects found</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {filters.search || filters.status
                                ? 'No prospects match your current filters.'
                                : 'No prospects have been found for this flow yet.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {prospects.map((prospect: Prospect) => (
                            <div key={prospect.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {prospect.profileImage ? (
                                            <img
                                                src={prospect.profileImage}
                                                alt={prospect.name || 'Prospect'}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                                                {prospect.name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {prospect.name || 'Unknown Prospect'}
                                                    </h3>
                                                    {prospect.aiScore !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm ${getAIScoreColor(prospect.aiScore)}`}>
                                                            <Star className="w-3 h-3 fill-current" />
                                                            {prospect.aiScore}/100
                                                        </span>
                                                    )}
                                                    {prospect.matchQuality && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm ${getMatchQualityColor(prospect.matchQuality)}`}>
                                                            {prospect.matchQuality}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                    {prospect.title && (
                                                        <div className="flex items-center gap-1">
                                                            <Award className="w-3 h-3" />
                                                            <span>{prospect.title}</span>
                                                        </div>
                                                    )}
                                                    {prospect.company && (
                                                        <div className="flex items-center gap-1">
                                                            <Building className="w-3 h-3" />
                                                            <span>{prospect.company}</span>
                                                        </div>
                                                    )}
                                                    {prospect.location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            <span>{prospect.location}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                                    {prospect.connection?.sentAt && (
                                                        <div className="flex items-center gap-1">
                                                            <UserPlus className="w-3 h-3" />
                                                            <span>Connected {formatDate(prospect.connection.sentAt)}</span>
                                                        </div>
                                                    )}
                                                    {prospect.engagements && prospect.engagements.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Heart className="w-3 h-3" />
                                                            <span>{prospect.engagements.length} engagements</span>
                                                        </div>
                                                    )}
                                                    {prospect.recentPosts && prospect.recentPosts.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <TrendingUp className="w-3 h-3" />
                                                            <span>{prospect.recentPosts.length} recent posts</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => toggleProspectExpansion(prospect.id)}
                                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {expandedProspect === prospect.id ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedProspect === prospect.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                                                {/* Connection Details */}
                                                {prospect.connection && (
                                                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                                                        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                                                            <UserCheck className="w-4 h-4" />
                                                            Connection Details
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-sm text-blue-800 dark:text-blue-200"><strong>Sent:</strong> {formatDate(prospect.connection.sentAt)}</p>
                                                                <p className="text-sm text-blue-800 dark:text-blue-300/70 mt-2"><strong>Message:</strong></p>
                                                                <p className="text-sm text-blue-800 dark:text-blue-200 bg-white/50 dark:bg-gray-900/50 p-3 rounded-lg border border-blue-100/50 dark:border-blue-500/10 mt-1 whitespace-pre-wrap">
                                                                    {prospect.connection.message}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {prospect.connection.acceptedAt && (
                                                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                                                                        <UserCheck className="w-4 h-4" />
                                                                        <span>Connection Accepted: {formatDate(prospect.connection.acceptedAt)}</span>
                                                                    </div>
                                                                )}
                                                                {prospect.connection.declinedAt && (
                                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                                                                        <UserX className="w-4 h-4" />
                                                                        <span>Connection Declined: {formatDate(prospect.connection.declinedAt)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Engagements */}
                                                {prospect.engagements && prospect.engagements.length > 0 && (
                                                    <div className="bg-purple-50 dark:bg-purple-500/10 rounded-lg p-4 border border-purple-100 dark:border-purple-500/20 shadow-sm">
                                                        <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                                                            <Heart className="w-4 h-4" />
                                                            Engagement Activities ({prospect.engagements.length})
                                                        </h4>
                                                        {renderEngagements(prospect.engagements)}
                                                    </div>
                                                )}

                                                {/* Recent Posts */}
                                                {prospect.recentPosts && prospect.recentPosts.length > 0 && (
                                                    <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-100 dark:border-green-500/20 shadow-sm">
                                                        <h4 className="font-medium text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4" />
                                                            Recent Posts ({prospect.recentPosts.length})
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {prospect.recentPosts.slice(0, 3).map((post: Post, index: number) => (
                                                                <div key={index} className="border border-green-200 dark:border-green-800/50 rounded-xl p-4 bg-white/50 dark:bg-gray-900/50 shadow-sm hover:border-green-300 dark:hover:border-green-600 transition-colors">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <span className="text-xs text-green-700 dark:text-green-400 font-bold uppercase tracking-wider">
                                                                            {post.type?.replace(/_/g, ' ').toLowerCase() || 'Post'}
                                                                        </span>
                                                                        <span className="text-xs text-green-600 dark:text-green-500">{formatDate(post.timestamp)}</span>
                                                                    </div>
                                                                    <p className="text-sm text-green-800 dark:text-green-200 mb-3 line-clamp-3">
                                                                        {post.content || post.postText}
                                                                    </p>
                                                                    <div className="flex items-center gap-6 text-xs text-green-700 dark:text-green-400">
                                                                        {post.engagement?.liked && (
                                                                            <span className="flex items-center gap-1 font-medium">
                                                                                <Heart className="w-3 h-3 fill-current" />
                                                                                Liked
                                                                            </span>
                                                                        )}
                                                                        {post.engagement?.commented && (
                                                                            <span className="flex items-center gap-1 font-medium">
                                                                                <MessageSquare className="w-3 h-3" />
                                                                                Commented
                                                                            </span>
                                                                        )}
                                                                        {post.metrics?.likesCount && post.metrics.likesCount > 0 && (
                                                                            <span className="flex items-center gap-1">
                                                                                <ThumbsUp className="w-3 h-3" />
                                                                                {post.metrics.likesCount}
                                                                            </span>
                                                                        )}
                                                                        {post.metrics?.commentsCount && post.metrics.commentsCount > 0 && (
                                                                            <span className="flex items-center gap-1">
                                                                                <MessageCircle className="w-3 h-3" />
                                                                                {post.metrics.commentsCount}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {post.url && (
                                                                        <a
                                                                            href={post.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 text-sm font-semibold mt-3 pt-3 border-t border-green-100 dark:border-green-800/50 w-full"
                                                                        >
                                                                            View Post <ExternalLink className="w-3 h-3" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Match Information */}
                                                {prospect.matchReason && (
                                                    <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-4 border border-yellow-100 dark:border-yellow-500/20 shadow-sm">
                                                        <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Match Information</h4>
                                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">{prospect.matchReason}</p>
                                                        {prospect.relevanceFactors && (
                                                            <div className="mt-4">
                                                                <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-widest mb-2">Relevance Factors:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Array.isArray(prospect.relevanceFactors) ? (
                                                                        prospect.relevanceFactors.map((factor: string, index: number) => (
                                                                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-800/50">
                                                                                {factor}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-xs text-yellow-800 dark:text-yellow-300">{JSON.stringify(prospect.relevanceFactors)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Profile Link */}
                                                {prospect.profileUrl && (
                                                    <div className="text-center pt-2">
                                                        <a
                                                            href={prospect.profileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-all font-medium border border-gray-200 dark:border-gray-600 shadow-sm"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            View LinkedIn Profile
                                                        </a>
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
                                Load More Prospects
                            </>
                        )}
                    </Flowbtn>
                </div>
            )}

            {/* End of Results */}
            {pagination && !pagination.hasNext && prospects.length > 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    You've reached the end of the prospect list.
                </div>
            )}
        </div>
    );
};

export default FlowProspects;