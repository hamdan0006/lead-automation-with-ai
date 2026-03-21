import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Play,
    Pause,
    Trash2,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Calendar,
    Settings,
    Eye,
    RotateCcw,
    Download,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import toast from 'react-hot-toast';

// Type definitions
interface Automation {
    id: string;
    templateId: string;
    platform: string;
    status: 'active' | 'running' | 'pending' | 'paused' | 'completed' | 'failed' | 'cancelled';
    displayName?: string;
    interval?: string;
    createdAt: string;
    lastRunAt?: string;
    nextRunAt?: string;
    totalRuns?: number;
    errorMessage?: string;
}

const CompletedAutomations: React.FC = () => {
    const navigate = useNavigate();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Format interval for display
    const formatInterval = (interval?: string): string => {
        if (!interval) return 'No schedule';

        const intervalMap: Record<string, string> = {
            '2_minutes': '2 minutes',
            '5_minutes': '5 minutes',
            '10_minutes': '10 minutes',
            '30_minutes': '30 minutes',
            'hourly': '1 hour',
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly',
        };
        return intervalMap[interval] || interval.replace('_', ' ');
    };

    useEffect(() => {
        fetchAutomations();
    }, []);

    const fetchAutomations = async (): Promise<void> => {
        try {
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setError('Authentication required');
                setIsLoading(false);
                navigate('/login');
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/automation`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    navigate('/login');
                    return;
                }
                throw new Error(`Failed to fetch automations: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                setAutomations(data.data.automations || []);
                setError(null);
            } else {
                throw new Error(data.message || 'Failed to fetch automations');
            }
        } catch (error: any) {
            console.error('Error fetching automations:', error);
            setError(error.message);
            toast.error('Failed to load automations');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteAutomation = async (automationId: string): Promise<void> => {
        if (!window.confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/automation/${automationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete automation');
            }

            const data = await response.json();
            toast.success(data.message || 'Automation deleted successfully');
            fetchAutomations(); // Refresh the list
        } catch (error: any) {
            console.error('Error deleting automation:', error);
            toast.error('Failed to delete automation');
        }
    };

    const downloadResults = async (automationId: string): Promise<void> => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/automation/${automationId}/results/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to download results');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `automation-${automationId}-results.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success('Results downloaded successfully');
        } catch (error: any) {
            console.error('Error downloading results:', error);
            toast.error('Failed to download results');
        }
    };

    const getStatusColor = (status: Automation['status']): "success" | "error" | "light" => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'failed':
            case 'cancelled':
                return 'error';
            default:
                return 'light';
        }
    };

    const getPlatformColor = (platform: string): "info" | "primary" | "warning" | "light" => {
        switch (platform.toLowerCase()) {
            case 'linkedin':
            case 'facebook':
                return 'info';
            case 'twitter':
                return 'primary';
            case 'instagram':
                return 'warning';
            default:
                return 'light';
        }
    };

    const getStatusIcon = (status: Automation['status']): React.ReactNode => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4" />;
            case 'failed':
            case 'cancelled':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Automation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <Card.Header>
                        <Card.Title className="text-red-600">Error Loading Automations</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={fetchAutomations}>Try Again</Button>
                    </Card.Content>
                </Card>
            </div>
        );
    }

    // Filter for completed automations only
    const completedAutomations = automations.filter(automation =>
        ['completed', 'failed', 'cancelled'].includes(automation.status)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Completed Automations</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        View and download results from your completed automations ({completedAutomations.length} total).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchAutomations}>
                        Refresh
                    </Button>
                </div>
            </div>

            {completedAutomations.length === 0 ? (
                <Card>
                    <Card.Content className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No completed automations
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            No completed automations yet. Start some automations to see their results here.
                        </p>
                        <Link to='/trobs'>
                            <Button>
                                Browse Templates
                            </Button>
                        </Link>
                    </Card.Content>
                </Card>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Automation
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Results
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {completedAutomations.map((automation) => (
                                <tr key={automation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <Badge color={getPlatformColor(automation.platform)}>
                                                    {automation.platform.charAt(0).toUpperCase()}
                                                </Badge>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{automation.displayName || automation.templateId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={getStatusColor(automation.status)}>
                                            <span className="flex items-center gap-1.5">
                                                {getStatusIcon(automation.status)}
                                                {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                                            </span>
                                        </Badge>

                                        {automation.status === 'failed' && automation.errorMessage && (
                                            <div className="text-xs text-red-600 dark:text-red-400 mt-1 truncate max-w-xs">
                                                {automation.errorMessage}
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {automation.totalRuns !== undefined ? `${automation.totalRuns} runs` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/automations/${automation.id}`)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1 p-2 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" /> <span className="hidden sm:inline">View Details</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CompletedAutomations;