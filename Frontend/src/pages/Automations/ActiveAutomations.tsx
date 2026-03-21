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
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import toast from 'react-hot-toast';
import socketClient from '../../../src/utils/activeautomation';

// Type definitions
interface Automation {
    id: string;
    jobId?: string;
    templateId: string;
    platform: string;
    status: 'active' | 'running' | 'pending' | 'paused' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    message?: string;
    current?: number;
    total?: number;
    interval?: string;
    createdAt: string;
    lastRunAt?: string;
    nextRunAt?: string;
}

interface SocketProgressData {
    automationId?: string;
    jobId?: string;
    progress: number;
    status?: string;
    message?: string;
    current?: number;
    total?: number;
}

const ActiveAutomations: React.FC = () => {
    const navigate = useNavigate();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [socketConnected, setSocketConnected] = useState<boolean>(false);

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

    // Setup Socket.IO connection for real-time progress updates
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('No access token, skipping socket connection');
            return;
        }

        // Get user ID from token (decode JWT)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id || payload.userId;

            if (!userId) {
                console.warn('No user ID found in token');
                return;
            }

            console.log('Setting up Socket.IO connection for user:', userId);

            // Connect to Socket.IO server
            const socket = socketClient.connect();

            // Track connection status
            socket.on('connect', () => {
                console.log('✅ Socket connected, joining user room');
                setSocketConnected(true);
                socketClient.joinUserRoom(userId);
            });

            socket.on('disconnect', () => {
                console.log('❌ Socket disconnected');
                setSocketConnected(false);
            });

            // Subscribe to automation progress updates
            const unsubscribe = socketClient.onAutomationProgress((data: SocketProgressData) => {
                console.log('📊 Received automation progress update:', data);

                // Update the specific automation in state
                setAutomations(prevAutomations => {
                    const updated = prevAutomations.map(automation => {
                        // Check if this progress update is for this automation
                        // Match by: automation.id, automation.jobId, data.automationId, or data.jobId
                        const isMatch =
                            automation.id === data.automationId ||
                            automation.id === data.jobId ||
                            automation.jobId === data.automationId ||
                            automation.jobId === data.jobId;

                        if (isMatch) {
                            console.log(
                                '✅ Updating automation:',
                                automation.id,
                                'with progress:',
                                data.progress
                            );
                            return {
                                ...automation,
                                progress: data.progress,
                                status: (data.status as Automation['status']) || automation.status,
                                message: data.message || automation.message,
                                current: data.current,
                                total: data.total,
                            };
                        }
                        return automation;
                    });
                    return updated;
                });
            });

            // Cleanup on unmount
            return () => {
                console.log('Cleaning up Socket.IO connection');
                if (unsubscribe) unsubscribe();
                socket.off('connect');
                socket.off('disconnect');
                // Don't disconnect the socket as it may be used by other components
            };
        } catch (error) {
            console.error('Failed to setup Socket.IO connection:', error);
        }
    }, []);

    const fetchAutomations = async (): Promise<void> => {
        console.log('Fetching automations...'); // Debug log
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Token found:', !!token); // Debug log

            if (!token) {
                console.error('No access token found');
                setError('Authentication required');
                setIsLoading(false);
                navigate('/login');
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            console.log('Making request to:', `${apiUrl}/api/automation`); // Debug log

            const response = await fetch(`${apiUrl}/api/automation`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('Response status:', response.status); // Debug log

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Authentication failed - redirecting to login');
                    navigate('/login');
                    return;
                }
                throw new Error(`Failed to fetch automations: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Response data:', data); // Debug log

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

    const pauseAutomation = async (automationId: string): Promise<void> => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(
                `${apiUrl}/api/automation/${automationId}/pause`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to pause automation');
            }

            const data = await response.json();
            toast.success(data.message || 'Automation paused successfully');
            fetchAutomations(); // Refresh the list
        } catch (error: any) {
            console.error('Error pausing automation:', error);
            toast.error('Failed to pause automation');
        }
    };

    const resumeAutomation = async (automationId: string): Promise<void> => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(
                `${apiUrl}/api/automation/${automationId}/resume`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to resume automation');
            }

            const data = await response.json();
            toast.success(data.message || 'Automation resumed successfully');
            fetchAutomations(); // Refresh the list
        } catch (error: any) {
            console.error('Error resuming automation:', error);
            toast.error('Failed to resume automation');
        }
    };

    const deleteAutomation = async (automationId: string): Promise<void> => {
        if (
            !window.confirm(
                'Are you sure you want to delete this automation? This action cannot be undone.'
            )
        ) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

            const response = await fetch(`${apiUrl}/api/automation/${automationId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
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

    const getStatusColor = (status: Automation['status']): "success" | "warning" | "info" | "error" | "light" => {
        switch (status) {
            case 'active':
            case 'running':
                return 'success';
            case 'paused':
                return 'warning';
            case 'completed':
                return 'info';
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
            case 'active':
            case 'running':
                return <Play className='w-4 h-4' />;
            case 'paused':
                return <Pause className='w-4 h-4' />;
            case 'completed':
                return <CheckCircle className='w-4 h-4' />;
            case 'failed':
            case 'cancelled':
                return <AlertCircle className='w-4 h-4' />;
            default:
                return <Clock className='w-4 h-4' />;
        }
    };

    if (isLoading) {
        return (
            <div className='space-y-6'>
                <div className='animate-pulse'>
                    <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4'></div>
                    <div className='overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800'>
                        <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-800'>
                            <thead className='bg-gray-50 dark:bg-gray-900/50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                        Automation
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                        Status
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                        Schedule
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800'>
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4'></div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2'></div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4'></div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3'></div>
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
            <div className='space-y-6'>
                <Card>
                    <Card.Header>
                        <Card.Title className='text-red-600'>
                            Error Loading Automations
                        </Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <p className='text-gray-600 mb-4'>{error}</p>
                        <Button onClick={fetchAutomations}>Try Again</Button>
                    </Card.Content>
                </Card>
            </div>
        );
    }

    // Filter for active automations only
    const activeAutomations = automations.filter(automation =>
        ['active', 'running', 'pending'].includes(automation.status)
    );

    return (
        <div className='space-y-6'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                        Active Automations
                    </h1>
                    <p className='text-gray-600 dark:text-gray-400'>
                        Monitor and manage your active automations (
                        {activeAutomations.length} running).
                    </p>
                </div>

                <div className='flex items-center gap-3'>
                    {/* Socket connection status indicator */}
                    <div className='flex items-center gap-2 text-xs'>
                        {socketConnected ? (
                            <>
                                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                                <span className='text-green-600 font-medium'>Live updates</span>
                            </>
                        ) : (
                            <>
                                <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                                <span className='text-gray-500 dark:text-gray-400'>Offline</span>
                            </>
                        )}
                    </div>
                    <Button variant='outline' onClick={fetchAutomations}>
                        Refresh
                    </Button>
                </div>
            </div>

            {activeAutomations.length === 0 ? (
                <Card>
                    <Card.Content className='text-center py-12'>
                        <Settings className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                        <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                            No active automations
                        </h3>
                        <p className='text-gray-600 dark:text-gray-400 mb-4'>
                            Create your first automation to get started.
                        </p>
                        <Link to='/trobs'>
                            <Button>Browse Templates</Button>
                        </Link>
                    </Card.Content>
                </Card>
            ) : (
                <div className='overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'>
                    <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-800'>
                        <thead className='bg-gray-50 dark:bg-gray-900/50'>
                            <tr>
                                <th
                                    scope='col'
                                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                                >
                                    Automation
                                </th>
                                <th
                                    scope='col'
                                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                                >
                                    Status
                                </th>
                                <th
                                    scope='col'
                                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                                >
                                    Schedule
                                </th>
                                <th
                                    scope='col'
                                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                                >
                                    Progress
                                </th>
                                <th
                                    scope='col'
                                    className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
                                >
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200 dark:divide-gray-800'>
                            {activeAutomations.map(automation => (
                                <tr key={automation.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='flex items-center'>
                                            <div className='flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                                                <Badge color={getPlatformColor(automation.platform)}>
                                                    {automation.platform.charAt(0).toUpperCase()}
                                                </Badge>
                                            </div>
                                            <div className='ml-4'>
                                                <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                                    {automation.templateId}
                                                </div>
                                                <div className='text-sm text-gray-500 dark:text-gray-400'>
                                                    Created{' '}
                                                    {new Date(automation.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <Badge color={getStatusColor(automation.status)}>
                                            <span className="flex items-center gap-1.5">
                                                {getStatusIcon(automation.status)}
                                                {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                                            </span>
                                        </Badge>
                                        {automation.lastRunAt && (
                                            <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                                                Last run{' '}
                                                {new Date(automation.lastRunAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        <div className='text-sm text-gray-900 dark:text-white'>
                                            {automation.interval &&
                                                `Every ${formatInterval(automation.interval)}`}
                                        </div>
                                        {automation.nextRunAt && (
                                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                                                Next:{' '}
                                                {new Date(automation.nextRunAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap'>
                                        {automation.progress !== undefined ? (
                                            <div className="max-w-[150px]">
                                                <div className='flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1'>
                                                    <span>
                                                        {automation.progress !== undefined
                                                            ? `${Math.round(automation.progress)}%`
                                                            : 'No data'}
                                                    </span>
                                                </div>
                                                <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
                                                    <div
                                                        className='h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300'
                                                        style={{
                                                            width: `${Math.min(automation.progress || 0, 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                                {automation.message && (
                                                    <div className='text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate'>
                                                        {automation.message}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                                                No progress data
                                            </div>
                                        )}
                                    </td>
                                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                                        <div className='flex items-center justify-end gap-2'>
                                            <button
                                                onClick={() =>
                                                    navigate(`/automations/${automation.id}`)
                                                }
                                                className='text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors'
                                                title='View Details'
                                            >
                                                <Eye className='w-4 h-4' /> <span className="hidden sm:inline">View details</span>
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

export default ActiveAutomations;