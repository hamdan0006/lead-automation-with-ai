import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    Workflow,
    Clock,
    Target,
    MessageCircle,
    Activity,
    Settings,
    CheckCircle,
    Star,
    Linkedin,
    Users,
    TrendingUp,
    AlertTriangle,
    Info,
    Zap,
    Globe,
    LucideIcon
} from 'lucide-react';
import Flowbtn from '../../components/ui/flowbtns/Flowbtn';
import PremiumRequired from '../../components/PremiumRequired/PremiumRequired';
import { getFlowTemplate } from '../../api/flows';
import { toast } from 'react-hot-toast';

// Type definitions
interface FlowStage {
    id: string;
    name: string;
    description: string;
    estimatedDuration?: string;
}

interface FlowTemplate {
    id: string;
    displayName: string;
    summary: string;
    detailedDescription: string;
    platform: string;
    category: string;
    difficulty?: string;
    estimatedTime: string;
    successRate?: number | string;
    usageCount?: number;
    stages?: FlowStage[];
    features?: string[];
    tags?: string[];
    requirements?: string[];
    limitations?: string[];
    examples?: Array<{
        title: string;
        description: string;
        config?: {
            targetingSettings?: {
                industries?: string[];
                jobTitles?: string[];
            };
        };
    }>;
}

interface ApiResponse<T> {
    status: 'success' | 'error';
    data: T;
    message?: string;
}

interface FlowTemplateResponse {
    flow: FlowTemplate;
}

type TabType = 'overview' | 'process' | 'features' | 'requirements';

const FlowTemplateDetail: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();

    const [template, setTemplate] = useState<FlowTemplate | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    useEffect(() => {
        fetchTemplate();
    }, [templateId]);

    const fetchTemplate = async (): Promise<void> => {
        if (!templateId) {
            toast.error('Invalid template ID');
            navigate('/flows');
            return;
        }

        try {
            const response = await getFlowTemplate(templateId) as unknown as ApiResponse<FlowTemplateResponse>;
            if (response.status === 'success') {
                setTemplate(response.data.flow);
            }
        } catch (error) {
            console.error('Failed to fetch template:', error);
            toast.error('Failed to load flow template');
            navigate('/flows');
        } finally {
            setIsLoading(false);
        }
    };

    const getPlatformIcon = (platform: string | undefined): LucideIcon => {
        switch (platform?.toLowerCase()) {
            case 'linkedin': return Linkedin;
            default: return Globe;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Template Not Found</h2>
                <p className="text-gray-600 mb-4">The requested flow template could not be found.</p>
                <Link to="/flows">
                    <Flowbtn>Back to Flows</Flowbtn>
                </Link>
            </div>
        );
    }

    const PlatformIcon = getPlatformIcon(template.platform);

    const tabs: Array<{ id: TabType; name: string; icon: LucideIcon }> = [
        { id: 'overview', name: 'Overview', icon: Info },
        { id: 'process', name: 'Process', icon: Workflow },
        { id: 'features', name: 'Features', icon: Star },
        { id: 'requirements', name: 'Requirements', icon: Settings }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/flows">
                        <Flowbtn
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 py-3.5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Flows
                        </Flowbtn>
                    </Link>


                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Workflow className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{template.displayName}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <PlatformIcon className="w-4 h-4" />
                                    <span className="capitalize">{template.platform}</span>
                                </div>
                                <span>•</span>
                                <span className="capitalize">{template.category}</span>
                                <span>•</span>
                                <span className="capitalize">{template.difficulty || 'intermediate'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <Link to={`/flows/setup/${templateId}`}>
                    <Flowbtn className="flex items-center gap-2 py-3.5 px-6">
                        <Play className="w-4 h-4" />
                        Start This Flow
                    </Flowbtn>
                </Link>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-gray-700 text-lg leading-relaxed">
                    {template.summary}
                </p>

                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Activity className="w-4 h-4" />
                        <span>{template.stages?.length || 0} stages</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{template.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>{template.successRate || 'N/A'}% success rate</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{template.usageCount || 0} users</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-8">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.name}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="p-6">
                        <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: template.detailedDescription }}
                        />
                    </div>
                )}

                {/* Process Tab */}
                {activeTab === 'process' && (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow Process</h3>
                        <div className="space-y-4">
                            {template.stages?.map((stage, index) => (
                                <div key={stage.id} className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{stage.name}</h4>
                                        <p className="text-gray-600 text-sm mt-1">{stage.description}</p>
                                        {stage.estimatedDuration && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                <span>{stage.estimatedDuration}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Features Tab */}
                {activeTab === 'features' && (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {template.features?.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {(template.tags && template.tags.length > 0) && (
                            <div className="mt-6">
                                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {template.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                    <div className="p-6 space-y-6">
                        {/* Requirements */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
                            <div className="space-y-3">
                                {template.requirements?.map((requirement, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700">{requirement}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Limitations */}
                        {(template.limitations && template.limitations.length > 0) && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Limitations</h3>
                                <div className="space-y-3">
                                    {template.limitations.map((limitation, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{limitation}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Configuration Preview */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Options</h3>
                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-medium text-gray-900">Target Audience</h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Define industries, job titles, company sizes, and geographic locations for prospect targeting.
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageCircle className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-medium text-gray-900">Messaging & Tone</h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Configure AI-powered message generation with your company description and preferred tone.
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-medium text-gray-900">Execution Schedule</h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Set execution frequency (up to 4 times daily), working hours, and weekend preferences.
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-medium text-gray-900">Engagement Settings</h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Control engagement types (likes, comments, profile views) and timing delays between actions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Examples */}
            {(template.examples && template.examples.length > 0) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Example Configurations</h3>
                    <div className="space-y-4">
                        {template.examples.map((example, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">{example.title}</h4>
                                <p className="text-sm text-gray-600 mb-3">{example.description}</p>
                                <div className="text-xs text-gray-500">
                                    <span className="font-medium">Target:</span> {example.config?.targetingSettings?.industries?.join(', ')} • {example.config?.targetingSettings?.jobTitles?.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTA Footer */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to get started?</h3>
                        <p className="text-gray-600">
                            Configure and launch your {template.displayName} in just a few minutes.
                        </p>
                    </div>
                    <Link to={`/flows/setup/${templateId}`}>
                        <Flowbtn
                            size="lg"
                            className="flex items-center gap-2 py-4 px-8"
                        >
                            <Zap className="w-4 h-4" />
                            Start Flow Setup
                        </Flowbtn>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FlowTemplateDetail;