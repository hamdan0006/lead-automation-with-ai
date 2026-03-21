import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Settings,
    Target,
    MessageCircle,
    Clock,
    Activity,
    CheckCircle,
    AlertCircle,
    Info,
    Workflow,
    Play,
    Linkedin,
    LucideIcon
} from 'lucide-react';

import Flowbtn from '../../components/ui/flowbtns/Flowbtn';
import PremiumRequired from '../../components/PremiumRequired/PremiumRequired';
import { getFlowTemplate, startFlow, getIndustries, searchIndustries } from '../../api/flows';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';
import useUsageTracking from '../../hooks/useUsageTracking';
import SearchableMultiSelect from '../../components/ui/SearchableMultiSelect'; // Assuming you have this component

// Type definitions
interface Industry {
    label: string;
    value: string;
    [key: string]: any;
}

interface JobTitle {
    label: string;
    value: string;
}

interface Location {
    label: string;
    value: string;
}

interface FlowTemplate {
    id: string;
    displayName: string;
    summary: string;
    platform: string;
    stages?: any[];
    maxRunsPerDay?: number;
    defaultConfig?: any;
    [key: string]: any;
}

interface TargetingSettings {
    industries?: string[];
    jobTitles?: string[];
    locations?: string[];
    keywords?: string;
    companySize?: string[];
}

interface MessagingSettings {
    companyDescription?: string;
    messageTone?: string;
    connectionRequestStyle?: string;
    commentStyle?: string;
}

interface WorkingHours {
    start?: string;
    end?: string;
    timezone?: string;
}

interface ExecutionSettings {
    runsPerDay?: number;
    prospectsPerRun?: number;
    workingHours?: WorkingHours;
    enableWeekends?: boolean;
}

interface FlowConfig {
    targetingSettings?: TargetingSettings;
    messagingSettings?: MessagingSettings;
    executionSettings?: ExecutionSettings;
    [key: string]: any;
}

interface ValidationErrors {
    [key: string]: string;
}

interface Step {
    id: number;
    name: string;
    icon: LucideIcon;
    description: string;
}

const FlowSetup: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasReachedLimit, trackExecution } = useUsageTracking();

    const [template, setTemplate] = useState<FlowTemplate | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isStarting, setIsStarting] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [config, setConfig] = useState<FlowConfig>({});
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loadingIndustries, setLoadingIndustries] = useState<boolean>(false);

    // Job titles data
    const jobTitles: JobTitle[] = [
        { label: 'CEO', value: 'CEO' },
        { label: 'Chief Executive Officer', value: 'Chief Executive Officer' },
        { label: 'Founder', value: 'Founder' },
        { label: 'Co-Founder', value: 'Co-Founder' },
        { label: 'President', value: 'President' },
        { label: 'Vice President', value: 'Vice President' },
        { label: 'VP Sales', value: 'VP Sales' },
        { label: 'VP Marketing', value: 'VP Marketing' },
        { label: 'VP Business Development', value: 'VP Business Development' },
        { label: 'Chief Technology Officer', value: 'Chief Technology Officer' },
        { label: 'CTO', value: 'CTO' },
        { label: 'Chief Marketing Officer', value: 'Chief Marketing Officer' },
        { label: 'CMO', value: 'CMO' },
        { label: 'Chief Revenue Officer', value: 'Chief Revenue Officer' },
        { label: 'CRO', value: 'CRO' },
        { label: 'Chief Financial Officer', value: 'Chief Financial Officer' },
        { label: 'CFO', value: 'CFO' },
        { label: 'Director of Sales', value: 'Director of Sales' },
        { label: 'Sales Director', value: 'Sales Director' },
        { label: 'Marketing Director', value: 'Marketing Director' },
        { label: 'Sales Manager', value: 'Sales Manager' },
        { label: 'Business Development Manager', value: 'Business Development Manager' },
        { label: 'Account Manager', value: 'Account Manager' },
        { label: 'Product Manager', value: 'Product Manager' },
        { label: 'Head of Growth', value: 'Head of Growth' },
        { label: 'Head of Sales', value: 'Head of Sales' },
        { label: 'Head of Marketing', value: 'Head of Marketing' },
        { label: 'Head of Business Development', value: 'Head of Business Development' },
        { label: 'Business Owner', value: 'Business Owner' },
        { label: 'Managing Director', value: 'Managing Director' },
        { label: 'General Manager', value: 'General Manager' },
        { label: 'Operations Manager', value: 'Operations Manager' },
        { label: 'Senior Manager', value: 'Senior Manager' },
        { label: 'Director', value: 'Director' },
        { label: 'Senior Director', value: 'Senior Director' },
        { label: 'Executive Director', value: 'Executive Director' }
    ];

    // Locations data - popular for B2B sales
    const locations: Location[] = [
        { label: 'United States', value: 'United States' },
        { label: 'United Kingdom', value: 'United Kingdom' },
        { label: 'Canada', value: 'Canada' },
        { label: 'Australia', value: 'Australia' },
        { label: 'Germany', value: 'Germany' },
        { label: 'France', value: 'France' },
        { label: 'Netherlands', value: 'Netherlands' },
        { label: 'Switzerland', value: 'Switzerland' },
        { label: 'Sweden', value: 'Sweden' },
        { label: 'Norway', value: 'Norway' },
        { label: 'Denmark', value: 'Denmark' },
        { label: 'Finland', value: 'Finland' },
        { label: 'Ireland', value: 'Ireland' },
        { label: 'Belgium', value: 'Belgium' },
        { label: 'Austria', value: 'Austria' },
        { label: 'Italy', value: 'Italy' },
        { label: 'Spain', value: 'Spain' },
        { label: 'Singapore', value: 'Singapore' },
        { label: 'Hong Kong', value: 'Hong Kong' },
        { label: 'Japan', value: 'Japan' },
        { label: 'South Korea', value: 'South Korea' },
        { label: 'Israel', value: 'Israel' },
        { label: 'United Arab Emirates', value: 'United Arab Emirates' },
        { label: 'New Zealand', value: 'New Zealand' },
        { label: 'Luxembourg', value: 'Luxembourg' }
    ];

    console.log('FlowSetup mounted with templateId:', templateId);

    useEffect(() => {
        fetchTemplate();
        loadIndustries();
    }, [templateId]);

    const fetchTemplate = async (): Promise<void> => {
        try {
            const response = await getFlowTemplate(templateId!);
            console.log('Flow template response:', response); // Debug log

            if (response.status === 'success') {
                // Handle both possible response structures
                const responseData = response.data as any;
                const flowData = (responseData.flow || responseData.template || {}) as FlowTemplate;
                setTemplate(flowData);
                setConfig(flowData.defaultConfig || {});
                console.log('Template loaded:', flowData); // Debug log
            } else {
                console.error('API response not successful:', response);
                toast.error('Failed to load flow template');
                navigate('/flows');
            }
        } catch (error: any) {
            console.error('Failed to fetch template:', error);
            toast.error(`Failed to load flow template: ${error.message}`);
            navigate('/flows');
        } finally {
            setIsLoading(false);
        }
    };

    const loadIndustries = async (): Promise<void> => {
        try {
            setLoadingIndustries(true);
            const response = await getIndustries();

            if (response.status === 'success') {
                const apiIndustries = response.data.industries || [];
                // Map API industries to local Industry interface (needs label and value)
                const mappedIndustries: Industry[] = apiIndustries.map((ind: any) => ({
                    label: ind.name,
                    value: ind.name, // Using name as value per existing convention
                    id: ind.id,
                    ...ind
                }));

                setIndustries(mappedIndustries);

                // Auto-select first 2 industries if no industries are currently selected
                if (mappedIndustries.length >= 2 && (!config.targetingSettings?.industries || config.targetingSettings.industries.length === 0)) {
                    const firstTwoIndustries = mappedIndustries.slice(0, 2).map((industry) => industry.label);
                    updateConfig('targetingSettings', 'industries', firstTwoIndustries);
                }
            } else {
                console.error('Failed to load industries:', response);
                toast.error('Failed to load industry options');
                // Fallback to hardcoded list
                const fallbackIndustries: Industry[] = [
                    { label: 'Technology', value: 'Technology' },
                    { label: 'SaaS', value: 'SaaS' },
                    { label: 'Healthcare', value: 'Healthcare' },
                    { label: 'Finance', value: 'Finance' },
                    { label: 'E-commerce', value: 'E-commerce' }
                ];
                setIndustries(fallbackIndustries);

                // Auto-select first 2 from fallback if no selection exists
                if (!config.targetingSettings?.industries || config.targetingSettings.industries.length === 0) {
                    updateConfig('targetingSettings', 'industries', ['Technology', 'SaaS']);
                }
            }
        } catch (error: any) {
            console.error('Failed to load industries:', error);
            toast.error('Failed to load industry options');
            // Minimal fallback
            const minimalFallback: Industry[] = [
                { label: 'Technology', value: 'Technology' },
                { label: 'SaaS', value: 'SaaS' }
            ];
            setIndustries(minimalFallback);

            // Auto-select first 2 from minimal fallback if no selection exists
            if (!config.targetingSettings?.industries || config.targetingSettings.industries.length === 0) {
                updateConfig('targetingSettings', 'industries', ['Technology', 'SaaS']);
            }
        } finally {
            setLoadingIndustries(false);
        }
    };

    const handleIndustrySearch = async (query: string): Promise<void> => {
        if (!query || query.trim().length < 2) return;

        try {
            const response = await searchIndustries(query);
            if (response.status === 'success') {
                const apiIndustries = response.data.industries || [];
                const mappedIndustries: Industry[] = apiIndustries.map((ind: any) => ({
                    label: ind.name,
                    value: ind.name,
                    id: ind.id,
                    ...ind
                }));
                setIndustries(mappedIndustries);
            }
        } catch (error) {
            console.error('Failed to search industries:', error);
        }
    };

    const updateConfig = <T extends keyof FlowConfig>(
        section: T,
        field: keyof NonNullable<FlowConfig[T]> & string,
        value: any
    ): void => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as any),
                [field]: value
            }
        }));

        // Clear validation error for this field
        const errorKey = `${section}.${field}`;
        if (validationErrors[errorKey]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const validateStep = (step: number): boolean => {
        const errors: ValidationErrors = {};

        if (step === 1) {
            // Validate targeting settings
            if (!config.targetingSettings?.industries?.length) {
                errors['targetingSettings.industries'] = 'At least one industry is required';
            }
            if (!config.targetingSettings?.keywords) {
                errors['targetingSettings.keywords'] = 'Keyword is required';
            }
            if (!config.targetingSettings?.locations?.length) {
                errors['targetingSettings.locations'] = 'At least one location is required';
            }
        }

        if (step === 2) {
            // Validate messaging settings
            const companyDescription = config.messagingSettings?.companyDescription?.trim() || '';
            if (!companyDescription) {
                errors['messagingSettings.companyDescription'] = 'Company description is required';
            } else if (companyDescription.length < 50) {
                errors['messagingSettings.companyDescription'] = 'Description must be at least 50 characters';
            }
        }

        if (step === 3) {
            // Validate execution settings
            const runsPerDay = config.executionSettings?.runsPerDay || 0;
            if (!runsPerDay || runsPerDay < 1 || runsPerDay > 4) {
                errors['executionSettings.runsPerDay'] = 'Runs per day must be between 1 and 4';
            }
            if (!config.executionSettings?.workingHours?.start || !config.executionSettings?.workingHours?.end) {
                errors['executionSettings.workingHours'] = 'Working hours are required';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = (): void => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handlePrevious = (): void => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleStartFlow = async (): Promise<void> => {
        // Validate all steps
        let hasErrors = false;
        for (let step = 1; step <= 3; step++) {
            if (!validateStep(step)) {
                hasErrors = true;
            }
        }

        if (hasErrors) {
            toast.error('Please fix the validation errors before starting the flow');
            return;
        }

        // Check execution limits and track execution for TRIAL users
        if (user?.plan === 'TRIAL') {
            if (hasReachedLimit) {
                toast.error('You have reached your trial limit of 3 executions. Please upgrade to continue.');
                navigate('/pricing');
                return;
            }

            // Track the execution
            const result = trackExecution();

            if (result.hasReachedLimit) {
                toast.error('You have reached your trial limit of 3 executions. Please upgrade to continue.');
                navigate('/pricing');
                return;
            }
        }

        setIsStarting(true);
        try {
            const flowName = `${template?.displayName} - ${new Date().toLocaleDateString()}`;
            const response = await startFlow(templateId!, config, flowName);

            if (response.status === 'success') {
                toast.success('Flow started successfully!');
                navigate('/flows', { state: { tab: 'active' } });
            }
        } catch (error: any) {
            console.error('Failed to start flow:', error);
            toast.error('Failed to start flow');
        } finally {
            setIsStarting(false);
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
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Template Not Found</h2>
                <p className="text-gray-600 mb-4">
                    The requested flow template could not be found. Template ID: {templateId}
                </p>
                <Link to="/flows">
                    <Flowbtn>Back to Flows</Flowbtn>
                </Link>
            </div>
        );
    }

    const steps: Step[] = [
        { id: 1, name: 'Target Audience', icon: Target, description: 'Define your ideal prospects' },
        { id: 2, name: 'Messaging', icon: MessageCircle, description: 'Configure your outreach tone' },
        { id: 3, name: 'Execution', icon: Clock, description: 'Set schedule and limits' },
        { id: 4, name: 'Review', icon: CheckCircle, description: 'Review and start flow' }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/flows">
                    <Flowbtn
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Flows
                    </Flowbtn>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Setup Flow</h1>
                    <p className="text-gray-600 dark:text-gray-400">{template.displayName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Steps Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Setup Steps</h3>
                        <div className="space-y-3">
                            {steps.map((step) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;

                                return (
                                    <div
                                        key={step.id}
                                        className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                                            isCompleted ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isActive ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' :
                                            isCompleted ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                            }`}>
                                            {isCompleted ? (
                                                <CheckCircle className="w-4 h-4" />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{step.name}</p>
                                            <p className="text-xs opacity-75 truncate">{step.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Template Info */}
                    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <Workflow className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{template.displayName}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Linkedin className="w-3 h-3" />
                                    <span>{template.platform}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{template.summary}</p>

                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Activity className="w-3 h-3" />
                                <span>{template.stages?.length || 0} stages</span>
                                <span>•</span>
                                <span>Up to {template.maxRunsPerDay || 4} runs/day</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                        {/* Step Content */}
                        <div className="p-6">
                            {/* Step 1: Target Audience */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Target Audience</h2>
                                    </div>

                                    {/* Keywords */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Keywords
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., B2B, startup, growth, digital transformation"
                                            value={config.targetingSettings?.keywords || ''}
                                            onChange={(e) => updateConfig('targetingSettings', 'keywords', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        />
                                        {validationErrors['targetingSettings.keywords'] && (
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['targetingSettings.keywords']}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Industries */}
                                        <div>
                                            <SearchableMultiSelect
                                                label="Target Industries *"
                                                options={industries}
                                                selectedValues={
                                                    (config.targetingSettings?.industries || []).map(industry => ({
                                                        value: industry,
                                                        label: industry
                                                    }))
                                                }
                                                onChange={(selectedOptions) => {
                                                    const industryValues = selectedOptions.map(option => option.value);
                                                    updateConfig('targetingSettings', 'industries', industryValues);
                                                }}
                                                onSearch={handleIndustrySearch}
                                                loading={loadingIndustries}
                                                placeholder="Search industries like Technology, SaaS, Healthcare..."
                                            />
                                            {validationErrors['targetingSettings.industries'] && (
                                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['targetingSettings.industries']}</p>
                                            )}
                                        </div>

                                        {/* Job Titles */}
                                        <div>
                                            <SearchableMultiSelect
                                                label="Target Job Titles (Optional)"
                                                options={jobTitles}
                                                selectedValues={
                                                    (config.targetingSettings?.jobTitles || []).map(title => ({
                                                        value: title,
                                                        label: title
                                                    }))
                                                }
                                                onChange={(selectedOptions) => {
                                                    const titleValues = selectedOptions.map(option => option.value);
                                                    updateConfig('targetingSettings', 'jobTitles', titleValues);
                                                }}
                                                placeholder="CEO, CTO... (or leave blank for broader targeting)"
                                            />
                                            {validationErrors['targetingSettings.jobTitles'] && (
                                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['targetingSettings.jobTitles']}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Locations */}
                                    <div>
                                        <SearchableMultiSelect
                                            label="Geographic Locations *"
                                            options={locations}
                                            selectedValues={
                                                (config.targetingSettings?.locations || []).map(location => ({
                                                    value: location,
                                                    label: location
                                                }))
                                            }
                                            onChange={(selectedOptions) => {
                                                const locationValues = selectedOptions.map(option => option.value);
                                                updateConfig('targetingSettings', 'locations', locationValues);
                                            }}
                                            placeholder="Search locations like United States, United Kingdom, Canada..."
                                        />
                                        {validationErrors['targetingSettings.locations'] && (
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['targetingSettings.locations']}</p>
                                        )}
                                    </div>

                                </div>
                            )}

                            {/* Step 2: Messaging */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messaging & Tone</h2>
                                    </div>

                                    {/* Company Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Your Company/Service Description *
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Describe what your company offers so AI can generate personalized messages..."
                                            value={config.messagingSettings?.companyDescription || ''}
                                            onChange={(e) => updateConfig('messagingSettings', 'companyDescription', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        />
                                        <div className="flex justify-between mt-1">
                                            {validationErrors['messagingSettings.companyDescription'] && (
                                                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors['messagingSettings.companyDescription']}</p>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                                {(config.messagingSettings?.companyDescription?.length || 0)}/500 characters (min 50)
                                            </p>
                                        </div>
                                    </div>

                                    {/* Message Tone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Message Tone
                                        </label>
                                        <select
                                            value={config.messagingSettings?.messageTone || 'Professional'}
                                            onChange={(e) => updateConfig('messagingSettings', 'messageTone', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="Professional">Professional</option>
                                            <option value="Casual">Casual</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Consultative">Consultative</option>
                                            <option value="Direct">Direct</option>
                                            <option value="Conversational">Conversational</option>
                                        </select>
                                    </div>

                                    {/* Connection Request Style */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Connection Request Approach
                                        </label>
                                        <select
                                            value={config.messagingSettings?.connectionRequestStyle || 'Value-First'}
                                            onChange={(e) => updateConfig('messagingSettings', 'connectionRequestStyle', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="Value-First">Value-First</option>
                                            <option value="Common Interest">Common Interest</option>
                                            <option value="Mutual Connection">Mutual Connection</option>
                                            <option value="Industry Focus">Industry Focus</option>
                                            <option value="Direct Introduction">Direct Introduction</option>
                                        </select>
                                    </div>

                                    {/* Comment Style */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Comment Strategy
                                        </label>
                                        <select
                                            value={config.messagingSettings?.commentStyle || 'Add Insights'}
                                            onChange={(e) => updateConfig('messagingSettings', 'commentStyle', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="Add Insights">Add Insights</option>
                                            <option value="Ask Questions">Ask Questions</option>
                                            <option value="Share Experience">Share Experience</option>
                                            <option value="Show Support">Show Support</option>
                                            <option value="Provide Value">Provide Value</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Execution Settings */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Execution & Scheduling</h2>
                                    </div>

                                    {/* Runs Per Day */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Daily Execution Frequency *
                                        </label>
                                        <select
                                            value={config.executionSettings?.runsPerDay || 2}
                                            onChange={(e) => updateConfig('executionSettings', 'runsPerDay', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        >
                                            <option value={1}>1 time per day</option>
                                            <option value={2}>2 times per day</option>
                                            <option value={3}>3 times per day</option>
                                            <option value={4}>4 times per day</option>
                                        </select>
                                        {validationErrors['executionSettings.runsPerDay'] && (
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['executionSettings.runsPerDay']}</p>
                                        )}
                                    </div>

                                    {/* Prospects Per Run */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Prospects per Run
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="15"
                                            value={config.executionSettings?.prospectsPerRun || 10}
                                            onChange={(e) => updateConfig('executionSettings', 'prospectsPerRun', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Between 5-15 prospects per execution</p>
                                    </div>

                                    {/* Working Hours */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Working Hours *
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={config.executionSettings?.workingHours?.start || '09:00'}
                                                    onChange={(e) => updateConfig('executionSettings', 'workingHours', {
                                                        ...config.executionSettings?.workingHours,
                                                        start: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</label>
                                                <input
                                                    type="time"
                                                    value={config.executionSettings?.workingHours?.end || '17:00'}
                                                    onChange={(e) => updateConfig('executionSettings', 'workingHours', {
                                                        ...config.executionSettings?.workingHours,
                                                        end: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                        {validationErrors['executionSettings.workingHours'] && (
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors['executionSettings.workingHours']}</p>
                                        )}
                                    </div>

                                    {/* Timezone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Timezone
                                        </label>
                                        <select
                                            value={config.executionSettings?.workingHours?.timezone || 'America/New_York'}
                                            onChange={(e) => updateConfig('executionSettings', 'workingHours', {
                                                ...config.executionSettings?.workingHours,
                                                timezone: e.target.value
                                            })}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                                        >
                                            <option value="America/New_York">Eastern Time (ET)</option>
                                            <option value="America/Chicago">Central Time (CT)</option>
                                            <option value="America/Denver">Mountain Time (MT)</option>
                                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                            <option value="Europe/London">London (GMT)</option>
                                            <option value="Europe/Paris">Paris (CET)</option>
                                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                                        </select>
                                    </div>

                                    {/* Weekend Execution */}
                                    <div>
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={config.executionSettings?.enableWeekends || false}
                                                onChange={(e) => updateConfig('executionSettings', 'enableWeekends', e.target.checked)}
                                                className="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 dark:bg-gray-700"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Run on Weekends</span>
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">Allow flow execution during weekends</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Configuration</h2>
                                    </div>

                                    {/* Configuration Summary */}
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Target Audience</h3>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                                <p><strong className="text-gray-900 dark:text-gray-200">Industries:</strong> {config.targetingSettings?.industries?.join(', ') || 'None selected'}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Job Titles:</strong> {config.targetingSettings?.jobTitles?.join(', ') || 'None selected'}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Locations:</strong> {config.targetingSettings?.locations?.join(', ') || 'None selected'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Messaging Settings</h3>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                                <p><strong className="text-gray-900 dark:text-gray-200">Tone:</strong> {config.messagingSettings?.messageTone || 'Professional'}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Connection Style:</strong> {config.messagingSettings?.connectionRequestStyle || 'Value-First'}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Comment Style:</strong> {config.messagingSettings?.commentStyle || 'Add Insights'}</p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
                                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Execution Settings</h3>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                                <p><strong className="text-gray-900 dark:text-gray-200">Frequency:</strong> {config.executionSettings?.runsPerDay || 2} times per day</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Prospects per Run:</strong> {config.executionSettings?.prospectsPerRun || 10}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Working Hours:</strong> {config.executionSettings?.workingHours?.start || '09:00'} - {config.executionSettings?.workingHours?.end || '17:00'}</p>
                                                <p><strong className="text-gray-900 dark:text-gray-200">Weekends:</strong> {config.executionSettings?.enableWeekends ? 'Enabled' : 'Disabled'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Important Notice */}
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                            <div className="flex-1">
                                                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Ready to Start</h4>
                                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                                    Your flow will begin executing within 5 minutes. You can pause, resume, or stop the flow at any time from the Flows dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between bg-gray-50/[0.3] dark:bg-gray-800 rounded-b-lg">
                            <Flowbtn
                                onClick={handlePrevious}
                                variant="outline"
                                disabled={currentStep === 1}
                                className="dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Previous
                            </Flowbtn>

                            <div className="flex gap-3">
                                {currentStep < 4 ? (
                                    <Flowbtn onClick={handleNext}>
                                        Next
                                    </Flowbtn>
                                ) : (
                                    <Flowbtn
                                        onClick={handleStartFlow}
                                        disabled={isStarting}
                                        className="flex items-center gap-2"
                                    >
                                        {isStarting ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        {isStarting ? 'Starting...' : 'Start Flow'}
                                    </Flowbtn>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowSetup;