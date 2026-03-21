import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Building,
    MapPin,
    Award,
    Calendar,
    Star,
    Heart,
    MessageSquare,
    UserPlus,
    UserCheck,
    UserX,
    ExternalLink,
    TrendingUp,
    ThumbsUp,
    MessageCircle,
    Eye,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Activity
} from 'lucide-react';
import { getFlow, getFlowProspectDetails } from '../../api/flows';
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

interface ActivityItem {
    id: string;
    type: string;
    wasSuccessful: boolean;
    description?: string;
    timestamp: string;
    stage?: string;
    details?: Record<string, any>;
    [key: string]: any;
}

interface Engagement {
    type: 'POST_LIKED' | 'POST_COMMENTED' | string;
    timestamp: string;
    postUrl?: string;
    postText?: string;
    comment?: string;
    [key: string]: any;
}

interface Post {
    type?: string;
    timestamp: string;
    content?: string;
    id?: string;
    engagement?: {
        liked?: boolean;
        commented?: boolean;
    };
    metrics?: {
        likesCount?: number;
        commentsCount?: number;
        sharesCount?: number;
    };
    url?: string;
    [key: string]: any;
}

interface Company {
    name: string;
    industry?: string;
    website?: string;
    size?: string;
    location?: string;
    growthStage?: string;
    isHiring?: boolean;
    [key: string]: any;
}

interface Prospect {
    id: string;
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    industry?: string;
    profileImage?: string;
    profileUrl?: string;
    aiScore?: number;
    matchQuality?: string;
    matchReason?: string;
    timeline?: ActivityItem[];
    engagements?: Engagement[];
    recentPosts?: Post[];
    companies?: Company[];
    [key: string]: any;
}

type ExpandedSection = 'timeline' | 'engagements' | 'posts' | 'companies' | null;

const FlowProspectDetail: React.FC = () => {
    const { flowId, prospectId } = useParams<{ flowId: string; prospectId: string }>();
    const [flow, setFlow] = useState<Flow | null>(null);
    const [prospect, setProspect] = useState<Prospect | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedSection, setExpandedSection] = useState<ExpandedSection>('timeline');
    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        fetchFlow();
        fetchProspectDetails();
    }, [flowId, prospectId]);

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

    const fetchProspectDetails = async () => {
        if (!flowId || !prospectId) return;

        try {
            setLoading(true);
            const response = await getFlowProspectDetails(flowId, prospectId);

            if (response && response.status === 'success') {
                const prospectData = (response.data as any).prospect || null;
                setProspect(prospectData);
            }
        } catch (error) {
            console.error('Failed to fetch prospect details:', error);
            toast.error('Failed to load prospect details');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchProspectDetails();
        setRefreshing(false);
        toast.success('Prospect details refreshed');
    };

    const toggleSection = (section: ExpandedSection) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const getAIScoreColor = (score?: number) => {
        if (score === undefined) return 'text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
        if (score >= 90) return 'text-green-600 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800/50';
        if (score >= 70) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50';
        if (score >= 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50';
        return 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50';
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString();
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
            case 'PROFILE_VIEWED':
                return <Eye className="w-4 h-4" />;
            case 'MESSAGE_SENT':
                return <MessageCircle className="w-4 h-4" />;
            default:
                return <User className="w-4 h-4" />;
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
            case 'PROFILE_VIEWED':
                return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50';
            case 'MESSAGE_SENT':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'profile_discovered':
                return 'Profile Discovered';
            case 'profile_enriched':
                return 'Profile Enriched';
            case 'ai_scoring_completed':
                return 'AI Scoring Completed';
            case 'POST_LIKED':
                return 'Post Liked';
            case 'POST_COMMENTED':
                return 'Post Commented';
            case 'CONNECTION_SENT':
                return 'Connection Request Sent';
            case 'CONNECTION_ACCEPTED':
                return 'Connection Accepted';
            case 'CONNECTION_DECLINED':
                return 'Connection Declined';
            case 'MESSAGE_SENT':
                return 'Message Sent';
            case 'PROFILE_VIEWED':
                return 'Profile Viewed';
            default:
                return type.replace(/_/g, ' ').toLowerCase();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!flow || !prospect) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
                <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Prospect not found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">The requested prospect could not be found.</p>
                <Link to={`/flows/${flowId}/prospects`}>
                    <Flowbtn>Back to Prospects</Flowbtn>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-2 px-4 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                    <Link to={`/flows/${flowId}/prospects`}>
                        <Flowbtn variant="outline" size="sm" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Prospects
                        </Flowbtn>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospect Details</h1>
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

            {/* Prospect Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar and Basic Info */}
                    <div className="flex-shrink-0">
                        {prospect.profileImage ? (
                            <img
                                src={prospect.profileImage}
                                alt={prospect.name || 'Prospect'}
                                className="w-24 h-24 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 shadow-md"
                            />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-2xl shadow-md">
                                {prospect.name?.charAt(0) || '?'}
                            </div>
                        )}
                    </div>

                    {/* Prospect Details */}
                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{prospect.name || 'Unknown Prospect'}</h2>
                                    {prospect.aiScore !== undefined && (
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border shadow-sm ${getAIScoreColor(prospect.aiScore)}`}>
                                            <Star className="w-4 h-4 fill-current" />
                                            AI Score: {prospect.aiScore}/100
                                        </span>
                                    )}
                                    {prospect.matchQuality && (
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border shadow-sm ${getMatchQualityColor(prospect.matchQuality)}`}>
                                            {prospect.matchQuality} Match
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                                    {prospect.title && (
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                            <span>{prospect.title}</span>
                                        </div>
                                    )}
                                    {prospect.company && (
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                            <span>{prospect.company}</span>
                                        </div>
                                    )}
                                    {prospect.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-red-500 dark:text-red-400" />
                                            <span>{prospect.location}</span>
                                        </div>
                                    )}
                                    {prospect.industry && (
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
                                            <span>{prospect.industry}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {prospect.timeline?.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Activities</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {prospect.engagements?.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Engagements</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                        {prospect.recentPosts?.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
                                </div>
                            </div>
                        </div>

                        {/* Match Reason */}
                        {prospect.matchReason && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong className="text-blue-900 dark:text-blue-300">Match Reason:</strong> {prospect.matchReason}
                                </p>
                            </div>
                        )}

                        {/* Profile Link */}
                        {prospect.profileUrl && (
                            <div className="mt-4">
                                <a
                                    href={prospect.profileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-600"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View LinkedIn Profile
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => toggleSection('timeline')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${expandedSection === 'timeline'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Activity Timeline
                    </button>
                    <button
                        onClick={() => toggleSection('engagements')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${expandedSection === 'engagements'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Engagements
                    </button>
                    <button
                        onClick={() => toggleSection('posts')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${expandedSection === 'posts'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Recent Posts
                    </button>
                    <button
                        onClick={() => toggleSection('companies')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${expandedSection === 'companies'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                    >
                        Companies
                    </button>
                </nav>
            </div>

            {/* Activity Timeline */}
            {expandedSection === 'timeline' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete history of interactions with this prospect</p>
                    </div>

                    {prospect.timeline && prospect.timeline.length > 0 ? (
                        <div className="p-6">
                            <div className="relative">
                                {/* Vertical Timeline Line */}
                                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                                <div className="space-y-6">
                                    {prospect.timeline.map((activity: ActivityItem) => (
                                        <div key={activity.id} className="relative flex items-start gap-4">
                                            {/* Timeline Dot */}
                                            <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 border shadow-sm ${getActivityColor(activity.type)}`}>
                                                {getActivityIcon(activity.type)}
                                            </div>

                                            {/* Activity Content */}
                                            <div className="flex-1 min-w-0 pb-6">
                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">{getTypeLabel(activity.type)}</h4>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm ${activity.wasSuccessful
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                                            }`}>
                                                            {activity.wasSuccessful ? (
                                                                <CheckCircle className="w-3 h-3" />
                                                            ) : (
                                                                <AlertCircle className="w-3 h-3" />
                                                            )}
                                                            {activity.wasSuccessful ? 'Success' : 'Failed'}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{activity.description}</p>

                                                    {activity.details && Object.keys(activity.details).length > 0 && (
                                                        <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Details</h5>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {Object.entries(activity.details).map(([key, value]) => (
                                                                    <div key={key} className="text-sm">
                                                                        <span className="font-medium text-gray-700 dark:text-gray-400 capitalize">
                                                                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                                        </span>{' '}
                                                                        <span className="text-gray-600 dark:text-gray-300">
                                                                            {typeof value === 'object'
                                                                                ? JSON.stringify(value, null, 2)
                                                                                : String(value)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{formatDate(activity.timestamp)}</span>
                                                        </div>
                                                        {activity.stage && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="capitalize">{activity.stage.replace(/_/g, ' ')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activities found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No activities have been recorded for this prospect yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Engagements */}
            {expandedSection === 'engagements' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Engagement Activities</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All content engagement activities with this prospect</p>
                    </div>

                    {prospect.engagements && prospect.engagements.length > 0 ? (
                        <div className="p-6 space-y-6">
                            {prospect.engagements.map((engagement: Engagement, index: number) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {engagement.type === 'POST_LIKED' ? (
                                                <Heart className="w-5 h-5 text-red-500" />
                                            ) : (
                                                <MessageSquare className="w-5 h-5 text-blue-500" />
                                            )}
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {engagement.type === 'POST_LIKED' ? 'Liked Post' : 'Commented on Post'}
                                            </h4>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-gray-500">{formatDate(engagement.timestamp)}</span>
                                    </div>

                                    {engagement.postUrl && (
                                        <a
                                            href={engagement.postUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm mb-3 font-medium transition-colors"
                                        >
                                            View Original Post <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}

                                    {engagement.postText && (
                                        <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap italic">"{engagement.postText}"</p>
                                        </div>
                                    )}

                                    {engagement.comment && (
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded border-l-4 border-blue-500 border border-blue-100 dark:border-blue-800/50">
                                            <p className="text-sm text-blue-800 dark:text-blue-300 font-bold mb-1">Your Comment:</p>
                                            <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{engagement.comment}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Heart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No engagements found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No engagement activities have been recorded for this prospect yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Posts */}
            {expandedSection === 'posts' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Posts</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest posts from this prospect's LinkedIn feed</p>
                    </div>

                    {prospect.recentPosts && prospect.recentPosts.length > 0 ? (
                        <div className="p-6 space-y-6">
                            {prospect.recentPosts.map((post: Post, index: number) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                                                {post.type?.replace(/_/g, ' ').toLowerCase() || 'Post'}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(post.timestamp)}</p>
                                        </div>
                                        {post.id && (
                                            <span className="text-xs text-gray-500 dark:text-gray-500">{post.id}</span>
                                        )}
                                    </div>

                                    {post.content && (
                                        <div className="mb-4">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                    )}

                                    {post.engagement && (
                                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            {post.engagement.liked && (
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <Heart className="w-4 h-4 fill-current" />
                                                    Liked
                                                </span>
                                            )}
                                            {post.engagement.commented && (
                                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                    <MessageSquare className="w-4 h-4" />
                                                    Commented
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                        {post.metrics?.likesCount && post.metrics.likesCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <ThumbsUp className="w-4 h-4" />
                                                {post.metrics.likesCount} likes
                                            </span>
                                        )}
                                        {post.metrics?.commentsCount && post.metrics.commentsCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-4 h-4" />
                                                {post.metrics.commentsCount} comments
                                            </span>
                                        )}
                                        {post.metrics?.sharesCount && post.metrics.sharesCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <ExternalLink className="w-4 h-4" />
                                                {post.metrics.sharesCount} shares
                                            </span>
                                        )}
                                    </div>

                                    {post.url && (
                                        <div className="mt-3">
                                            <a
                                                href={post.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                                            >
                                                View Post <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No recent posts have been found for this prospect.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Companies */}
            {expandedSection === 'companies' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Associated Companies</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Companies associated with this prospect</p>
                    </div>

                    {prospect.companies && prospect.companies.length > 0 ? (
                        <div className="p-6 space-y-6">
                            {prospect.companies.map((company: Company, index: number) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">{company.name}</h4>
                                            {company.industry && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{company.industry}</p>
                                            )}
                                        </div>
                                        {company.website && (
                                            <a
                                                href={company.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                                            >
                                                Visit Website
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        {company.size && (
                                            <div>
                                                <strong className="text-gray-700 dark:text-gray-300">Size:</strong> {company.size}
                                            </div>
                                        )}
                                        {company.location && (
                                            <div>
                                                <strong className="text-gray-700 dark:text-gray-300">Location:</strong> {company.location}
                                            </div>
                                        )}
                                        {company.growthStage && (
                                            <div>
                                                <strong className="text-gray-700 dark:text-gray-300">Growth Stage:</strong> {company.growthStage}
                                            </div>
                                        )}
                                        {company.isHiring !== undefined && (
                                            <div>
                                                <strong className="text-gray-700 dark:text-gray-300">Hiring:</strong> {company.isHiring ? 'Yes' : 'No'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Building className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No companies found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No associated companies have been found for this prospect.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlowProspectDetail;