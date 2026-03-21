import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    Settings,
    CheckCircle,
    Lock,
    Video,
    Star,
    Users,
    Clock,
    AlertTriangle,
    Check,
    X,
    Zap,
    Linkedin,
    Twitter,
    Instagram,
    Globe,
    LucideIcon,
    Info,
    TrendingUp,
    RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import Input from '../../components/ui/Input';
import ConnectionRequiredModal from '../../components/ui/ConnectionRequiredModal';
import useTemplateStore from '../../stores/useTemplateStore';
import { usePlatformConnection } from '../../hooks/usePlatformConnection';
import usePlanLimits from '../../hooks/usePlanLimits';
import useAuthStore from '../../stores/useAuthStore';
import toast from 'react-hot-toast';
import TrobLeadsTable, { Lead } from '../../components/trobs/TrobLeadsTable';

import { MOCK_LEADS } from '../../data/mockLeads';


// Type definitions
interface Template {
    id: string;
    displayName: string;
    platform: string;
    description: string;
    detailedDescription?: string;
    summary?: string;
    difficulty?: string;
    difficultyLevel?: number;
    successRate?: number;
    estimatedTime?: string;
    usageCount?: number;
    isFlow?: boolean;
    isSmartFlow?: boolean;
    videoUrl?: string;
    features?: string[];
    requirements?: string[];
    limitations?: string[];
    examples?: Array<{
        title: string;
        description: string;
        config: Record<string, any>;
    }>;
    defaultConfig?: Record<string, any>;
    configSchema?: {
        type?: string;
        properties?: Record<string, ConfigField>;
        [key: string]: any;
    };
}

interface ConfigField {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
    title?: string;
    description?: string;
    default?: any;
    example?: string;
    examples?: string[];
    placeholder?: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    properties?: Record<string, ConfigField>;
    items?: {
        type?: string;
        enum?: string[];
    };
    ui?: {
        options?: Array<{ label: string; value: string }>;
    };
}

interface TemplateStore {
    selectedTemplate: Template | null;
    fetchTemplate: (id: string) => Promise<void>;
    isLoading: boolean;
}

interface PlatformConnection {
    connection: any;
    isConnected: boolean;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

interface AuthStore {
    user: any;
}

const TrobDetail = () => {
    const { trobId } = useParams<{ trobId: string }>();
    const navigate = useNavigate();
    const { selectedTemplate, fetchTemplate, isLoading } = useTemplateStore() as TemplateStore;
    const { user } = useAuthStore() as AuthStore;
    const { canUseFeature, checkAutomationLimit, isTrialExpired, getUpgradeMessage } = usePlanLimits();

    const [config, setConfig] = useState<Record<string, any>>({});
    const [isStarting, setIsStarting] = useState(false);
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showConfigSidebar, setShowConfigSidebar] = useState(false);
    const [currentStep, setCurrentStep] = useState<'overview' | 'configure' | 'review' | 'results'>('overview');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [linkedinCookies, setLinkedinCookies] = useState<{ JSESSIONID: string; li_at: string; profile_urn: string }>({
        JSESSIONID: '',
        li_at: '',
        profile_urn: 'urn:li:fsd_profile:ACoAAEpWar4B_9DNsjLkDzGYCy8N5AChqrcrDq0'
    });

    // Check platform connection status
    const {
        connection,
        isConnected,
        isLoading: connectionLoading,
        refresh: refreshConnection,
    } = usePlatformConnection(selectedTemplate?.platform) as PlatformConnection;

    useEffect(() => {
        if (trobId) {
            fetchTemplate(trobId);
        }
    }, [trobId, fetchTemplate]);

    useEffect(() => {
        if (selectedTemplate?.defaultConfig) {
            setConfig(selectedTemplate.defaultConfig);
        }
    }, [selectedTemplate]);

    // Fetch LinkedIn cookies on page load for specialized trobs
    useEffect(() => {
        if (trobId === 'linkedin-follower-extractor' || trobId === 'linkedin-connections-export') {
            const fetchCookies = async () => {
                try {
                    console.log('🔍 Fetching LinkedIn cookies for trob:', trobId);
                    const response = await fetch('http://192.168.1.23:3000/api/platform-connections');

                    if (response.ok) {
                        const data = await response.json();
                        console.log('📦 Platform connections response:', data);

                        if (data.success && data.data && data.data.length > 0) {
                            // Find all active LinkedIn connections and sort by updatedAt descending
                            const linkedinConnections = data.data
                                .filter((conn: any) => conn.platform === 'LINKEDIN' && conn.isActive)
                                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                            console.log('🔗 LinkedIn connections found:', linkedinConnections.length);

                            const linkedinConnection = linkedinConnections[0];

                            if (linkedinConnection && linkedinConnection.cookies) {
                                console.log('✅ Found active LinkedIn connection');
                                let cookieData = linkedinConnection.cookies;

                                if (typeof cookieData === 'string') {
                                    try {
                                        cookieData = JSON.parse(cookieData);
                                    } catch (e) {
                                        console.error('Failed to parse cookies string', e);
                                    }
                                }

                                let jsessionid: string | null = null;
                                let li_at: string | null = null;

                                if (Array.isArray(cookieData)) {
                                    const jsessionCookie = cookieData.find((c: any) => c.name === 'JSESSIONID');
                                    const liAtCookie = cookieData.find((c: any) => c.name === 'li_at');
                                    jsessionid = jsessionCookie?.value?.replace(/"/g, '') || null;
                                    li_at = liAtCookie?.value?.replace(/"/g, '') || null;
                                } else if (typeof cookieData === 'object' && cookieData !== null) {
                                    jsessionid = (cookieData.JSESSIONID || '').replace(/"/g, '').trim();
                                    li_at = (cookieData.li_at || '').replace(/"/g, '').trim();
                                }

                                if (jsessionid && li_at) {
                                    console.log('✅ Successfully extracted cookies');
                                    console.log('JSESSIONID:', jsessionid ? '✓ Found' : '✗ Missing');
                                    console.log('li_at:', li_at ? '✓ Found' : '✗ Missing');

                                    setLinkedinCookies({
                                        JSESSIONID: jsessionid,
                                        li_at: li_at,
                                        profile_urn: 'urn:li:fsd_profile:ACoAAEpWar4B_9DNsjLkDzGYCy8N5AChqrcrDq0'
                                    });
                                } else {
                                    console.warn('⚠️ Cookies incomplete:', {
                                        JSESSIONID: jsessionid ? 'Present' : 'Missing',
                                        li_at: li_at ? 'Present' : 'Missing'
                                    });
                                }
                            } else {
                                console.warn('⚠️ No cookies found in LinkedIn connection');
                            }
                        } else {
                            console.warn('⚠️ No platform connections data in response');
                        }
                    } else {
                        console.error('❌ Failed to fetch platform connections:', response.status);
                    }
                } catch (err) {
                    console.error('❌ Failed to pre-load LinkedIn cookies:', err);
                }
            };
            fetchCookies();
        }
    }, [trobId]);

    // Also try to get cookies from the connection object when it's available
    useEffect(() => {
        if (connection && connection.cookies && (trobId === 'linkedin-follower-extractor' || trobId === 'linkedin-connections-export')) {
            console.log('🔄 Attempting to load cookies from connection object');
            let cookieData = connection.cookies;

            if (typeof cookieData === 'string') {
                try {
                    cookieData = JSON.parse(cookieData);
                } catch (e) {
                    console.error('Failed to parse cookies from connection object', e);
                }
            }

            let extractedCookies = {
                JSESSIONID: '',
                li_at: '',
                profile_urn: 'urn:li:fsd_profile:ACoAAEpWar4B_9DNsjLkDzGYCy8N5AChqrcrDq0'
            };

            if (Array.isArray(cookieData)) {
                const jsession = cookieData.find((c: any) => c.name === 'JSESSIONID');
                const liAt = cookieData.find((c: any) => c.name === 'li_at');
                extractedCookies.JSESSIONID = jsession?.value?.replace(/"/g, '').trim() || '';
                extractedCookies.li_at = liAt?.value?.replace(/"/g, '').trim() || '';
            } else if (typeof cookieData === 'object' && cookieData !== null) {
                extractedCookies.JSESSIONID = (cookieData.JSESSIONID || '').replace(/"/g, '').trim();
                extractedCookies.li_at = (cookieData.li_at || '').replace(/"/g, '').trim();
            }

            if (extractedCookies.JSESSIONID && extractedCookies.li_at) {
                console.log('✅ Successfully loaded cookies from connection object');
                setLinkedinCookies(extractedCookies);
            }
        }
    }, [connection, trobId]);

    const handleConfigChange = (path: string, value: any) => {
        setConfig(prev => {
            const newConfig = { ...prev };
            const keys = path.split('.');
            let current: Record<string, any> = newConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };

    const handleStartAutomationClick = () => {
        if (!selectedTemplate) return;

        // Check if trial is expired
        if (isTrialExpired) {
            toast.error('Your free trial has expired. Please upgrade to continue using automations.');
            navigate('/pricing');
            return;
        }

        // Check automation limits (we'll get current count from API later, for now assume 0)
        const automationCheck = checkAutomationLimit(0);
        if (!automationCheck.canCreate) {
            toast.error(`You've reached your automation limit (${automationCheck.limit}). Upgrade your plan to create more automations.`);
            navigate('/pricing');
            return;
        }

        // Check if it's a Smart Flow and user has access
        if (selectedTemplate.isSmartFlow && !canUseFeature.smartFlows) {
            toast.error(`Smart Flows are not available in your current plan. ${getUpgradeMessage('smartFlows')}`);
            navigate('/pricing');
            return;
        }

        // Check if it's a Flow and user has access (new flow system)
        if (selectedTemplate.isFlow && !canUseFeature.flows) {
            toast.error(`AI Flows are available in PRO plans and above. ${getUpgradeMessage('flows')}`);
            navigate('/pricing');
            return;
        }

        // Check if platform is connected first
        if (!isConnected) {
            setShowConnectionModal(true);
            return;
        }

        // Show configuration step
        setCurrentStep('configure');
    };

    const handleStartAutomation = async () => {
        if (!selectedTemplate) return;

        setIsStarting(true);
        try {
            const token = localStorage.getItem('accessToken');

            // For the specialized endpoint, we might not need the main backend's token
            // but we definitely need it for the standard backend.
            if (!token && trobId !== 'linkedin-follower-extractor' && trobId !== 'linkedin-connections-export') {
                toast.error('Please log in to start automation');
                navigate('/login');
                return;
            }

            let url = `${import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000'}/api/jobs`;
            let requestBody: any;
            let headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Specialized endpoint for LinkedIn Follower Extractor & Connections Export
            if (trobId === 'linkedin-follower-extractor' || trobId === 'linkedin-connections-export') {
                url = trobId === 'linkedin-connections-export'
                    ? 'http://192.168.1.23:5000/api/connections'
                    : 'http://192.168.1.23:5000/api/followers';

                if (!linkedinCookies.li_at || !linkedinCookies.JSESSIONID) {
                    console.error('❌ LinkedIn cookies missing:', {
                        li_at: linkedinCookies.li_at ? 'Present' : 'Missing',
                        JSESSIONID: linkedinCookies.JSESSIONID ? 'Present' : 'Missing'
                    });
                    toast.error('LinkedIn session not found. Please connect your LinkedIn account from the Connections page.');
                    setIsStarting(false);
                    // Optionally navigate to connections page
                    setTimeout(() => {
                        if (window.confirm('Would you like to go to the Connections page to connect your LinkedIn account?')) {
                            navigate('/connections');
                        }
                    }, 1000);
                    return;
                }

                // EXACT structure requested by user, using 2-space indentation just in case the backend is picky
                const payload = {
                    "cookies": {
                        "JSESSIONID": linkedinCookies.JSESSIONID,
                        "li_at": linkedinCookies.li_at
                    },
                    "count": Number(config.count || 10),
                    "headers": {},
                    "start": Number(config.start || 0)
                };

                requestBody = payload;
                console.log('🚀 SENDING PAYLOAD:', JSON.stringify(payload, null, 2));
            } else {
                requestBody = {
                    templateId: selectedTemplate.id,
                    name: selectedTemplate.displayName,
                    config,
                    priority: 'normal',
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody, null, ((trobId === 'linkedin-follower-extractor' || trobId === 'linkedin-connections-export') ? 2 : 0)),
            });

            if (!response.ok) {
                let errorMsg = 'Failed to start automation';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${response.status}`;
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();

            toast.success(`${result.message || 'Automation started'}!`);

            // If the specialized endpoint returns leads directly, set them
            // If the specialized endpoint returns leads directly, set them
            if ((trobId === 'linkedin-follower-extractor' || trobId === 'linkedin-connections-export') && result.data) {
                let itemsData = [];
                if (trobId === 'linkedin-connections-export') {
                    // Assuming similar structure for connections
                    itemsData = result.data.connections || (result.data.data && result.data.data.connections) || (Array.isArray(result.data) ? result.data : []);
                } else {
                    itemsData = result.data.followers || (result.data.data && result.data.data.followers) || (Array.isArray(result.data) ? result.data : []);
                }

                if (Array.isArray(itemsData) && itemsData.length > 0) {
                    // Map items to Lead format
                    const mappedLeads: Lead[] = itemsData.map((f: any, idx: number) => ({
                        id: f.profile_id || f.member_urn || f.id || `item-${idx}`,
                        name: f.full_name || `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'LinkedIn Member',
                        title: f.headline || f.title || 'N/A',
                        company: f.company_name || f.company || '',
                        location: f.location || 'N/A',
                        profileImage: f.profile_picture?.medium_url || f.image_url || f.profile_image || '',
                        follower_count: Number(f.follower_count ?? f.followers ?? 0),
                        mutual_connection_count: Number(f.mutual_connection_count ?? 0),
                        is_following_back: Boolean(f.is_following_back ?? f.follows_you ?? false),
                        profile_url: f.profile_url || (f.public_identifier ? `https://www.linkedin.com/in/${f.public_identifier}` : '#'),
                        foundAt: new Date().toISOString(),
                    }));

                    setLeads(mappedLeads);
                } else if (Array.isArray(result.data)) {
                    setLeads(result.data);
                }
            }

            // Instead of navigating away, show the results step
            setCurrentStep('results');

            // Only fetch from main backend if it's not the specialized one or if no data returned
            if ((trobId !== 'linkedin-follower-extractor' && trobId !== 'linkedin-connections-export') || (!result.data)) {
                fetchLeads();
            }
            // navigate('/automations');
        } catch (error: any) {
            console.error('Failed to start automation:', error);
            toast.error(`Failed to start automation: ${error.message}`);
        } finally {
            setIsStarting(false);
        }
    };

    const fetchLeads = async () => {
        setIsLoadingLeads(true);
        try {
            const token = localStorage.getItem('accessToken');

            // For specialized endpoint, we might not have a "results" endpoint on the main backend
            // but we can try the main backend first as a fallback
            const baseUrl = import.meta.env.VITE_API_URL || 'http://192.168.1.56:3000';
            const response = await fetch(`${baseUrl}/api/jobs/${selectedTemplate?.id}/results`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                    setLeads(data.data);
                } else if (data.leads && Array.isArray(data.leads)) {
                    setLeads(data.leads);
                } else {
                    console.log('No leads found in API response, showing mock data');
                    setLeads(MOCK_LEADS);
                }
            } else {
                console.warn('API fetch failed, falling back to mock leads');
                setLeads(MOCK_LEADS);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
            setLeads(MOCK_LEADS);
        } finally {
            setIsLoadingLeads(false);
        }
    };

    const handleConnectPlatform = () => {
        setShowConnectionModal(false);
        // Navigate to platforms page or open extension guide
        navigate('/connections');
    };

    const renderConfigField = (key: string, field: ConfigField, value: any, path: string = key) => {
        const fullPath = path;

        if (field.type === 'object' && field.properties) {
            return (
                <div key={key} className="space-y-4">
                    <h4 className="font-medium text-black dark:text-white">{field.title}</h4>
                    <div className="pl-4 border-l-2 border-tea-black-200 dark:border-gray-800 space-y-4">
                        {Object.entries(field.properties).map(([subKey, subField]) =>
                            renderConfigField(subKey, subField, value?.[subKey], `${fullPath}.${subKey}`),
                        )}
                    </div>
                </div>
            );
        }

        if (field.type === 'string' && !field.enum) {
            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    <Input
                        value={value || field.default || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange(fullPath, e.target.value)}
                        placeholder={field.example || field.default}
                    />
                </div>
            );
        }

        if (field.enum) {
            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    <select
                        value={value || field.default || ''}
                        onChange={(e) => handleConfigChange(fullPath, e.target.value)}
                        className="w-full px-3 py-2 border border-tea-black-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent transition-colors"
                    >
                        {field.enum.map(option => (
                            <option key={option} value={option} className="dark:bg-gray-800">{option}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (field.type === 'array' && field.items?.enum) {
            // Handle array of enums as checkboxes
            const currentValue = value || field.default || [];
            const options = field.ui?.options || field.items.enum.map(item => ({ label: item, value: item }));

            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    <div className="space-y-2">
                        {options.map((option) => (
                            <div key={option.value} className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id={`${fullPath}-${option.value}`}
                                    checked={currentValue.includes(option.value)}
                                    onChange={(e) => {
                                        const newValue = e.target.checked
                                            ? [...currentValue, option.value]
                                            : currentValue.filter((v: string) => v !== option.value);
                                        handleConfigChange(fullPath, newValue);
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-denim-blue-100 border-tea-black-300 dark:border-gray-700 dark:bg-gray-800 rounded shadow-sm"
                                />
                                <label htmlFor={`${fullPath}-${option.value}`} className="text-sm text-black dark:text-gray-300">
                                    {option.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (field.type === 'boolean') {
            return (
                <div key={key} className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id={fullPath}
                        checked={value || field.default || false}
                        onChange={(e) => handleConfigChange(fullPath, e.target.checked)}
                        className="h-5 w-5 text-blue focus:ring-denim-blue-100 border-tea-black-300 dark:border-gray-700 dark:bg-gray-800 rounded-md shadow-sm transition-all duration-200 ease-in-out"
                    />
                    <div>
                        <label htmlFor={fullPath} className="text-sm font-medium text-black dark:text-white">
                            {field.title}
                        </label>
                        {field.description && (
                            <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                        )}
                    </div>
                </div>
            );
        }

        if (field.type === 'integer' || field.type === 'number') {
            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    <Input
                        type="number"
                        value={value !== undefined ? value : (field.default !== undefined ? field.default : '')}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const numValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                            handleConfigChange(fullPath, isNaN(numValue) ? 0 : numValue);
                        }}
                        min={field.minimum}
                        max={field.maximum}
                    />
                </div>
            );
        }

        // Handle array fields (like jobTitles, industries)
        if (field.type === 'array' && field.items?.type === 'string' && !field.items?.enum) {
            const currentValue = Array.isArray(value) ? value : (field.default || []);

            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    {field.examples && (
                        <p className="text-xs text-tea-black-500">
                            Examples: {field.examples.join(', ')}
                        </p>
                    )}
                    <div className="space-y-2">
                        {currentValue.map((item: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={item}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const newValue = [...currentValue];
                                        newValue[index] = e.target.value;
                                        handleConfigChange(fullPath, newValue);
                                    }}
                                    placeholder={field.examples?.[0] || 'Enter value...'}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newValue = currentValue.filter((_: any, i: number) => i !== index);
                                        handleConfigChange(fullPath, newValue);
                                    }}
                                    className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const newValue = [...currentValue, ''];
                                handleConfigChange(fullPath, newValue);
                            }}
                            className="px-3 py-1 text-sm text-blue hover:text-blue/80 dark:text-blue-400 dark:hover:text-blue-300 border border-blue dark:border-blue-400 hover:border-blue/80 rounded-md transition-colors"
                        >
                            + Add {field.title?.slice(0, -1) || 'Item'}
                        </button>
                    </div>
                </div>
            );
        }

        // Handle textarea for longer text fields
        if (field.type === 'string' && !field.enum && (field.title?.includes('Template') || field.title?.includes('Message') || field.title?.includes('Proposition'))) {
            return (
                <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-black dark:text-white">
                        {field.title}
                    </label>
                    {field.description && (
                        <p className="text-sm text-tea-black-600 dark:text-gray-400">{field.description}</p>
                    )}
                    <textarea
                        value={value || field.default || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleConfigChange(fullPath, e.target.value)}
                        placeholder={field.placeholder || field.default}
                        rows={3}
                        className="w-full px-3 py-2 border border-tea-black-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent resize-vertical"
                    />
                </div>
            );
        }

        return null;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                </div>
            </div>
        );
    }

    const getPlatformColor = (platform?: string) => {
        switch (platform?.toLowerCase()) {
            case 'linkedin': return 'bg-blue-100 text-blue-800';
            case 'twitter': return 'bg-cyan-100 text-cyan-800';
            case 'facebook': return 'bg-blue-100 text-blue-800';
            case 'instagram': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'easy': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            case 'expert': return 'bg-purple-100 text-purple-800';
            case 'hard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDifficultyIcon = (difficulty?: string, difficultyLevel?: number) => {
        if (difficultyLevel) {
            if (difficultyLevel <= 2) return '●';
            if (difficultyLevel <= 3) return '●●';
            if (difficultyLevel <= 4) return '●●●';
            return '●●●●';
        }

        switch (difficulty?.toLowerCase()) {
            case 'beginner': return '●';
            case 'easy': return '●';
            case 'intermediate': return '●●';
            case 'medium': return '●●';
            case 'advanced': return '●●●';
            case 'expert': return '●●●●';
            case 'hard': return '●●●';
            default: return '●';
        }
    };

    // Get platform icon
    const getPlatformIcon = (platform?: string): LucideIcon => {
        switch (platform?.toLowerCase()) {
            case 'linkedin': return Linkedin;
            case 'twitter': return Twitter;
            case 'x': return Twitter;
            case 'instagram': return Instagram;
            default: return Globe;
        }
    };

    if (!selectedTemplate) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-black mb-2">Trob not found</h3>
                <p className="text-tea-black-600 mb-6">The requested trob could not be found.</p>
                <Button onClick={() => navigate('/trobs')}>
                    Back to Trobs
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Navigation Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => {
                        if (currentStep === 'configure') {
                            setCurrentStep('overview');
                        } else {
                            navigate('/trobs');
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-tea-black-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-tea-black-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <ArrowLeft size={16} />
                    {currentStep === 'configure' ? 'Back to Overview' : 'Back to Templates'}
                </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'overview' ? 'bg-brand-500 text-white' : 'bg-tea-black-100 dark:bg-gray-800 text-tea-black-600 dark:text-gray-400'
                        }`}>
                        1
                    </div>
                    <span className={`text-sm font-medium ${currentStep === 'overview' ? 'text-black dark:text-gray-100' : 'text-tea-black-600 dark:text-gray-400'
                        }`}>
                        Overview
                    </span>
                </div>

                <div className="flex-1 h-px bg-tea-black-200 dark:bg-gray-800"></div>

                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'configure' ? 'bg-brand-500 text-white' : 'bg-tea-black-100 dark:bg-gray-800 text-tea-black-600 dark:text-gray-400'
                        }`}>
                        2
                    </div>
                    <span className={`text-sm font-medium ${currentStep === 'configure' ? 'text-black dark:text-gray-100' : 'text-tea-black-600 dark:text-gray-400'
                        }`}>
                        Configure
                    </span>
                </div>

                <div className="flex-1 h-px bg-tea-black-200 dark:bg-gray-800"></div>

                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'results' ? 'bg-brand-500 text-white' : 'bg-tea-black-100 dark:bg-gray-800 text-tea-black-600 dark:text-gray-400'
                        }`}>
                        3
                    </div>
                    <span className={`text-sm font-medium ${currentStep === 'results' ? 'text-black dark:text-gray-100' : 'text-tea-black-600 dark:text-gray-400'
                        }`}>
                        Results
                    </span>
                </div>
            </div>

            {currentStep === 'overview' && (
                <>
                    {/* Sticky Top Action Bar */}
                    <div className="sticky top-0 left-0 right-0 bg-gradient-to-r from-brand-400 to-brand-500/90 dark:bg-gray-900/90 dark:from-transparent dark:to-transparent border-b border-brand-500/20 dark:border-gray-800 p-4 mb-6 shadow-md z-20 rounded-lg backdrop-blur-sm">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 dark:bg-brand-500/20 rounded-lg flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-white dark:text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white dark:text-gray-100">Ready to automate?</p>
                                    <p className="text-xs text-white/80 dark:text-gray-400">Configure and launch this template</p>
                                </div>
                            </div>
                            <button
                                onClick={handleStartAutomationClick}
                                disabled={connectionLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 text-brand-500 dark:text-brand-400 font-semibold rounded-lg hover:bg-white/90 dark:hover:bg-gray-700 disabled:bg-white/50 dark:disabled:bg-gray-800/50 disabled:text-brand-500/50 transition-all shadow-sm hover:shadow-md border dark:border-gray-700"
                            >
                                <Settings size={16} />
                                {isConnected
                                    ? (selectedTemplate.isFlow ? 'Configure Flow' : 'Start Configuration')
                                    : 'Connect Platform First'}
                            </button>
                        </div>
                    </div>

                    {/* Template Header */}
                    <div className="border-b border-tea-black-200 dark:border-gray-800 pb-6">
                        <div className="flex items-start gap-6">
                            {/* Template Image */}
                            <div className="relative w-20 h-20 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/10 dark:border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0 p-3">
                                <img
                                    src={`/trobs/${selectedTemplate.id}.png`}
                                    alt={selectedTemplate.displayName}
                                    className="w-full h-full object-cover rounded-lg"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = `/trobs/${selectedTemplate.id}.svg`;
                                        target.onerror = () => {
                                            target.style.display = 'none';
                                            if (target.nextSibling) {
                                                (target.nextSibling as HTMLElement).style.display = 'flex';
                                            }
                                        };
                                    }}
                                />
                                <div className="absolute inset-0 bg-brand-500/5 dark:bg-brand-500/10 items-center justify-center hidden rounded-lg">
                                    <Zap className="w-8 h-8 text-brand-500 dark:text-brand-400" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <h1 className="text-3xl font-bold text-black dark:text-white">{selectedTemplate.displayName}</h1>

                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${selectedTemplate.platform === 'linkedin' ? 'bg-[#0077b5]/10 text-[#0077b5]' :
                                            selectedTemplate.platform === 'twitter' || selectedTemplate.platform === 'x' ? 'bg-black/10 text-black dark:bg-white/10 dark:text-white' :
                                                selectedTemplate.platform === 'instagram' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                                                    'bg-blue/10 text-blue'
                                            }`}>
                                            {React.createElement(getPlatformIcon(selectedTemplate.platform), { size: 12 })}
                                            {selectedTemplate.platform?.charAt(0).toUpperCase() + selectedTemplate.platform?.slice(1)}
                                        </div>

                                        {selectedTemplate.isFlow && (
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                                <Zap size={12} />
                                                AI Flow
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-tea-black-100 dark:bg-gray-800 text-tea-black-600 dark:text-gray-400">
                                            <span>{getDifficultyIcon(selectedTemplate.difficulty, selectedTemplate.difficultyLevel)}</span>
                                            <span>{selectedTemplate.difficulty || 'Easy'}</span>
                                        </div>

                                        {!connectionLoading && (
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${isConnected
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-white/80'}`}></div>
                                                {isConnected ? 'Connected' : 'Not Connected'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-tea-black-600 dark:text-gray-400 text-lg mb-4 max-w-2xl">{selectedTemplate.description}</p>

                                <div className="flex items-center gap-3">
                                    {selectedTemplate.videoUrl && (
                                        <button
                                            onClick={() => setShowVideoModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                                        >
                                            <Video size={16} />
                                            Watch Demo
                                        </button>
                                    )}
                                </div>

                                {!connectionLoading && !isConnected && (
                                    <div className="mt-4 p-4 bg-warning/5 dark:bg-warning/10 border border-warning/20 dark:border-warning/30 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Lock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-black dark:text-white mb-1">Platform connection required</p>
                                                <p className="text-sm text-tea-black-600 dark:text-gray-400">
                                                    Connect your {selectedTemplate.platform?.charAt(0).toUpperCase() + selectedTemplate.platform?.slice(1)} account to use this automation template.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Success Rate Card */}
                        <div className="bg-gradient-to-r from-brand-400 to-brand-500 dark:from-gray-800 dark:to-gray-800 rounded-xl p-[1px] shadow-md hover:shadow-lg transition-shadow">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 text-center h-full">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <Star className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-1">{selectedTemplate.successRate || 0}%</p>
                                <p className="text-sm font-medium text-tea-black-600 dark:text-gray-400">Success Rate</p>
                            </div>
                        </div>

                        {/* Setup Time Card */}
                        <div className="bg-gradient-to-r from-brand-400 to-brand-500 dark:from-gray-800 dark:to-gray-800 rounded-xl p-[1px] shadow-md hover:shadow-lg transition-shadow">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 text-center h-full">
                                <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-1">{selectedTemplate.estimatedTime || '5-10 min'}</p>
                                <p className="text-sm font-medium text-tea-black-600 dark:text-gray-400">Setup Time</p>
                            </div>
                        </div>

                        {/* Times Used Card */}
                        <div className="bg-gradient-to-r from-brand-400 to-brand-500 dark:from-gray-800 dark:to-gray-800 rounded-xl p-[1px] shadow-md hover:shadow-lg transition-shadow">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 text-center h-full">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-1">{selectedTemplate.usageCount?.toLocaleString() || 0}</p>
                                <p className="text-sm font-medium text-tea-black-600 dark:text-gray-400">Times Used</p>
                            </div>
                        </div>

                        {/* Difficulty Card */}
                        <div className="bg-gradient-to-r from-brand-400 to-brand-500 dark:from-gray-800 dark:to-gray-800 rounded-xl p-[1px] shadow-md hover:shadow-lg transition-shadow">
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 text-center h-full">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-1">
                                    {selectedTemplate.difficultyLevel ? `Level ${selectedTemplate.difficultyLevel}` : selectedTemplate.difficulty || 'Easy'}
                                </p>
                                <p className="text-sm font-medium text-tea-black-600 dark:text-gray-400">Difficulty</p>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    {selectedTemplate.features && selectedTemplate.features.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 border border-tea-black-200 dark:border-gray-800 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-brand-500" />
                                </div>
                                <h2 className="text-lg font-semibold text-black dark:text-white">What This Template Does</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedTemplate.features.map((feature, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 border border-tea-black-200 dark:border-gray-800 rounded-lg hover:bg-tea-black-50 dark:hover:bg-gray-800 transition-colors">
                                        <Check className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-black dark:text-gray-300">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Description */}
                    {(selectedTemplate.detailedDescription || selectedTemplate.description) && (
                        <div className="bg-white dark:bg-gray-900 border border-tea-black-200 dark:border-gray-800 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center">
                                    <Info className="w-4 h-4 text-brand-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-black dark:text-white">How This Works</h2>
                                    <p className="text-xs text-tea-black-600 dark:text-gray-400">Detailed overview and functionality</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(selectedTemplate.detailedDescription || selectedTemplate.description)
                                    .split(/<p>|<\/p>|<li>|<\/li>|<br\s*\/?>|\. |\n/)
                                    .map(item => item.replace(/<[^>]*>/g, '').trim())
                                    .filter(text => text.length > 5)
                                    .map((text, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm text-tea-black-700 dark:text-gray-300">
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 mt-2"></div>
                                            <span>{text}{!text.endsWith('.') && '.'}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Requirements & Limitations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedTemplate.requirements && selectedTemplate.requirements.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-tea-black-200 dark:border-gray-800 rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-warning" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-black dark:text-white">Requirements</h2>
                                    <Badge color="warning" variant="light" size="sm">Required</Badge>
                                </div>
                                <ul className="space-y-2">
                                    {selectedTemplate.requirements.map((req, index) => (
                                        <li key={index} className="flex items-start gap-3 text-sm text-tea-black-700 dark:text-gray-300">
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 mt-2"></div>
                                            <span>{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selectedTemplate.limitations && selectedTemplate.limitations.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border border-tea-black-200 dark:border-gray-800 rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-danger/10 rounded-lg flex items-center justify-center">
                                        <X className="w-4 h-4 text-danger" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-black dark:text-white">Limitations</h2>
                                    <Badge color="error" variant="light" size="sm">Limited</Badge>
                                </div>
                                <ul className="space-y-2">
                                    {selectedTemplate.limitations.map((limit, index) => (
                                        <li key={index} className="flex items-start gap-3 text-sm text-tea-black-700 dark:text-gray-300">
                                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 mt-2"></div>
                                            <span>{limit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>


                </>
            )}

            {currentStep === 'configure' && (
                <>
                    {/* Configuration Header */}
                    <div className="border-b border-tea-black-200 dark:border-gray-800 pb-6">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 bg-brand-500/10 dark:bg-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Settings className="w-8 h-8 text-brand-500 dark:text-brand-400" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Configure {selectedTemplate.displayName}</h1>
                                <p className="text-tea-black-600 dark:text-gray-400 mb-4">
                                    Customize the settings below to match your specific needs. All fields have intelligent defaults.
                                </p>

                                {selectedTemplate.isFlow && (
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            <span className="text-sm font-medium text-purple-800 dark:text-purple-300">AI Flow Configuration</span>
                                        </div>
                                        <p className="text-sm text-purple-700 dark:text-purple-400">
                                            This flow will run automatically based on your schedule and intelligently adapt its behavior using AI.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Configuration Form */}
                    <div className="bg-white dark:bg-gray-900 border border-tea-black-200 dark:border-gray-800 rounded-lg">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-black dark:text-white">Configuration Settings</h2>
                                    <p className="text-sm text-tea-black-600 dark:text-gray-400">Customize your automation parameters</p>
                                </div>
                                <button
                                    onClick={() => setConfig(selectedTemplate.defaultConfig || {})}
                                    className="px-3 py-1 text-sm text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 border border-brand-500 dark:border-brand-500/50 hover:border-brand-600 rounded-md transition-colors"
                                >
                                    Reset to Defaults
                                </button>
                            </div>

                            {/* Configuration Fields */}
                            <div className="space-y-8">
                                {selectedTemplate.configSchema ? (
                                    (() => {
                                        // Handle different configSchema structures
                                        if (selectedTemplate.configSchema.properties) {
                                            // Old style: configSchema has type: 'object' and properties at root
                                            return Object.entries(selectedTemplate.configSchema.properties).map(([key, field]) =>
                                                renderConfigField(key, field, config[key], key)
                                            );
                                        } else {
                                            // New style: configSchema has sections directly (like AI Flow)
                                            return Object.entries(selectedTemplate.configSchema).map(([key, field]) =>
                                                renderConfigField(key, field, config[key], key)
                                            );
                                        }
                                    })()
                                ) : (
                                    // Fallback for legacy trobs without configSchema
                                    <div className="space-y-6">
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Basic Configuration</span>
                                            </div>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-500/80">
                                                This template uses basic configuration. Click start to proceed with default settings.
                                            </p>
                                        </div>

                                        {/* Show default config as read-only if it exists */}
                                        {selectedTemplate.defaultConfig && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-black dark:text-white">Current Settings</h3>
                                                <div className="bg-tea-black-50 dark:bg-gray-800 rounded-lg p-4">
                                                    <pre className="text-sm text-tea-black-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {JSON.stringify(selectedTemplate.defaultConfig, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Configuration Footer */}
                        <div className="border-t border-tea-black-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-800/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-black dark:text-white">Ready to start?</p>
                                    <p className="text-xs text-tea-black-600 dark:text-gray-400">Review your settings and launch the automation</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setCurrentStep('overview')}
                                        className="px-4 py-2 text-sm font-medium text-tea-black-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-tea-black-300 dark:border-gray-700 hover:border-tea-black-400 dark:hover:border-gray-600 rounded-lg transition-colors"
                                    >
                                        Back to Overview
                                    </button>
                                    <button
                                        onClick={handleStartAutomation}
                                        disabled={isStarting}
                                        className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-500/90 disabled:bg-tea-black-300 disabled:text-tea-black-500 transition-colors"
                                    >
                                        <Play size={16} />
                                        {isStarting
                                            ? (selectedTemplate.isFlow ? 'Starting Flow...' : 'Starting Automation...')
                                            : (selectedTemplate.isFlow ? 'Start Flow' : 'Start Automation')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Configuration Sidebar Modal (Keep for backward compatibility) */}
            {showConfigSidebar && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                    <div className="w-[40%] h-full bg-white shadow-xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-tea-black-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <div>
                                <h2 className="text-lg font-semibold text-black dark:text-white">Configure & Start</h2>
                                <p className="text-sm text-tea-black-600 dark:text-gray-400">{selectedTemplate.displayName}</p>
                            </div>
                            <button
                                onClick={() => setShowConfigSidebar(false)}
                                className="p-2 text-tea-black-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-tea-black-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 dark:bg-gray-900">
                            {/* Quick Examples */}
                            {selectedTemplate.examples && selectedTemplate.examples.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Quick Templates</h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.examples.slice(0, 3).map((example, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setConfig(example.config)}
                                                className="w-full text-left p-3 border border-tea-black-200 dark:border-gray-800 rounded-lg hover:bg-tea-black-50 dark:hover:bg-gray-800 hover:border-brand-500/30 transition-colors"
                                            >
                                                <div className="font-medium text-sm text-black dark:text-white">{example.title}</div>
                                                <div className="text-xs text-tea-black-600 dark:text-gray-400 mt-1">{example.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Configuration Fields */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-black dark:text-white">Configuration</h3>
                                {selectedTemplate.configSchema?.properties &&
                                    Object.entries(selectedTemplate.configSchema.properties).map(([key, field]) =>
                                        renderConfigField(key, field, config[key]),
                                    )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-tea-black-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                            <button
                                onClick={handleStartAutomation}
                                disabled={isStarting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-500/90 disabled:bg-tea-black-300 disabled:text-tea-black-500 transition-colors"
                            >
                                <Play size={16} />
                                {isStarting
                                    ? (selectedTemplate.isFlow ? 'Starting Flow...' : 'Starting...')
                                    : (selectedTemplate.isFlow ? 'Start Flow' : 'Start Automation')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {showVideoModal && selectedTemplate.videoUrl && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
                        <div className="flex items-center justify-between p-4 border-b border-tea-black-200 dark:border-gray-800">
                            <h3 className="text-lg font-semibold text-black dark:text-white">
                                {selectedTemplate.displayName} Demo
                            </h3>
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="p-2 text-tea-black-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-tea-black-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="aspect-video">
                            <iframe
                                className="w-full h-full"
                                src={selectedTemplate.videoUrl.replace('watch?v=', 'embed/')}
                                title={`${selectedTemplate.displayName} Demo`}
                                style={{ border: 0 }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Required Modal */}
            <ConnectionRequiredModal
                isOpen={showConnectionModal}
                onClose={() => setShowConnectionModal(false)}
                platform={selectedTemplate?.platform}
                templateName={selectedTemplate?.displayName}
                onConnectClick={handleConnectPlatform}
            />
            {currentStep === 'results' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-success" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-black dark:text-white">Leads Found</h1>
                                <p className="text-sm text-tea-black-600 dark:text-gray-400">Profiles matching your automation criteria</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3 overflow-hidden">
                                {leads.slice(0, 3).map((lead, i) => (
                                    <img
                                        key={i}
                                        className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900"
                                        src={lead.profileImage || `/images/user/user-0${i + 1}.jpg`}
                                        alt=""
                                    />
                                ))}
                            </div>
                            <Badge color="success" variant="light">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                                    Running
                                </div>
                            </Badge>
                        </div>
                    </div>

                    <TrobLeadsTable leads={leads} isLoading={isLoadingLeads} />

                    <div className="bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/10 dark:border-brand-500/20 rounded-xl p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-white">Real-time Performance</h3>
                                    <p className="text-sm text-tea-black-600 dark:text-gray-400">Total leads found today: {leads.length}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Button variant="outline" onClick={() => fetchLeads()} className="flex-1 md:flex-none">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh Results
                                </Button>
                                <Button onClick={() => navigate('/automations')} className="flex-1 md:flex-none">
                                    Go to Dashboard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrobDetail;
