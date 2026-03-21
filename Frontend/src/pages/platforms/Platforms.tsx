import React, { useState, useEffect } from 'react';
import {
    Users,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Trash2,
    RefreshCw,
    Plus,
    Clock,
    Shield,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import ProgressBar from '../../components/ui/progressbar/ProgressBar';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import useAuthStore from '../../stores/useAuthStore';
import { apiCall } from '../../api/apiUtils';
import toast from 'react-hot-toast';

// Type definitions
interface PlatformConnection {
    id: string;
    platform: 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'INSTAGRAM' | string;
    isActive: boolean;
    accountUsername?: string;
    accountId?: string;
    lastValidated?: string;
    errorCount: number;
    lastError?: string;
    createdAt: string;
    profileUrl?: string;
}

interface ConnectionStatus {
    status: string;
    badgeColor: "success" | "warning" | "error" | "light" | "info";
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

interface PlatformsResponse {
    platforms: PlatformConnection[];
}

const Platforms = () => {
    const { user } = useAuthStore();
    const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [validatingPlatform, setValidatingPlatform] = useState<string | null>(null);

    useEffect(() => {
        loadPlatforms();
    }, []);

    const loadPlatforms = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const response = await apiCall<PlatformsResponse>('/users/platforms');
            setPlatforms(response.data.platforms);
        } catch (error) {
            console.error('Failed to load platforms:', error);
            toast.error('Failed to load platform connections');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async (platformId: string, platformName: string): Promise<void> => {
        if (!confirm(`Are you sure you want to disconnect your ${platformName} account?`)) {
            return;
        }

        try {
            await apiCall(`/users/platforms/${platformId}`, {
                method: 'DELETE',
            });

            toast.success(`${platformName} account disconnected`);
            await loadPlatforms();
        } catch (error) {
            console.error('Failed to disconnect platform:', error);
            toast.error('Failed to disconnect platform');
        }
    };

    const handleValidate = async (platformId: string, platformName: string): Promise<void> => {
        try {
            setValidatingPlatform(platformId);
            await apiCall(`/users/platforms/${platformId}/validate`, {
                method: 'PUT',
            });

            toast.success(`${platformName} connection validated`);
            await loadPlatforms();
        } catch (error) {
            console.error('Failed to validate platform:', error);
            toast.error('Failed to validate connection');
        } finally {
            setValidatingPlatform(null);
        }
    };

    const downloadExtension = (): void => {
        window.open('https://chrome.google.com/webstore/detail/eobglldlconkollfkeooenoacpnbjlol', '_blank');
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPlatformIcon = (platform: string): React.ReactNode => {
        const icons: Record<string, React.ReactNode> = {
            LINKEDIN: (
                <div className="w-10 h-10 bg-blue rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">in</span>
                </div>
            ),
            TWITTER: (
                <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">𝕏</span>
                </div>
            ),
            FACEBOOK: (
                <div className="w-10 h-10 bg-blue rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">f</span>
                </div>
            ),
            INSTAGRAM: (
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ig</span>
                </div>
            ),
        };
        return icons[platform] || <Users className="w-10 h-10 text-gray-400" />;
    };

    const getPlatformName = (platform: string): string => {
        const names: Record<string, string> = {
            LINKEDIN: 'LinkedIn',
            TWITTER: 'Twitter / X',
            FACEBOOK: 'Facebook',
            INSTAGRAM: 'Instagram',
        };
        return names[platform] || platform;
    };

    const getConnectionStatus = (connection: PlatformConnection): ConnectionStatus => {
        if (!connection.isActive) {
            return {
                status: 'Disconnected',
                badgeColor: 'light',
                icon: AlertCircle,
                color: 'text-gray-500',
            };
        }

        if (!connection.lastValidated) {
            return {
                status: 'Needs Validation',
                badgeColor: 'warning',
                icon: AlertCircle,
                color: 'text-orange-500',
            };
        }

        const lastValidated = new Date(connection.lastValidated);
        const daysSinceValidation = Math.floor((Date.now() - lastValidated.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceValidation > 7) {
            return {
                status: 'Needs Validation',
                badgeColor: 'warning',
                icon: AlertCircle,
                color: 'text-orange-500',
            };
        }

        if (connection.errorCount > 0) {
            return {
                status: 'Issues Detected',
                badgeColor: 'error',
                icon: AlertCircle,
                color: 'text-red-500',
            };
        }

        return {
            status: 'Connected',
            badgeColor: 'success',
            icon: CheckCircle,
            color: 'text-green-500',
        };
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Connections</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your social media account connections for automation.</p>
                </div>

                <Card>
                    <Card.Content className="text-center py-8">
                        <div className="w-80 mx-auto mb-4">
                            <ProgressBar size="md" variant="primary" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading platform connections...</p>
                    </Card.Content>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Connections</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your social media account connections for automation.</p>
                </div>

                <Button onClick={downloadExtension} className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Download Extension
                </Button>
            </div>

            {/* Extension Installation Card - Only show when platforms are connected */}
            {platforms.length > 0 && (
                <Card>
                    <Card.Content>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-brand-500 rounded-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Install Trobyx Browser Extension</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    To connect your social media accounts safely, install our browser extension.
                                    It captures your login session after you manually log in to each platform.
                                </p>
                                <Button variant="outline" size="sm" onClick={downloadExtension}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Download Extension
                                </Button>
                            </div>
                        </div>
                    </Card.Content>
                </Card>
            )}

            {/* Connected Platforms */}
            <div className="grid gap-4">
                {platforms.length === 0 ? (
                    <Card>
                        <Card.Content className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Platforms Connected</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Connect your LinkedIn and Twitter accounts to start automating your social media activities.
                            </p>
                            <Button onClick={downloadExtension}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Download Extension
                            </Button>
                        </Card.Content>
                    </Card>
                ) : (
                    platforms.map((connection) => {
                        const platformStatus = getConnectionStatus(connection);
                        const StatusIcon = platformStatus.icon;

                        return (
                            <Card key={connection.id}>
                                <Card.Content>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {getPlatformIcon(connection.platform)}

                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {getPlatformName(connection.platform)}
                                                    </h3>
                                                    <Badge color={platformStatus.badgeColor}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {platformStatus.status}
                                                    </Badge>
                                                </div>

                                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                    {connection.accountUsername && (
                                                        <p className="flex items-center gap-1">
                                                            <span className="font-medium">@{connection.accountUsername}</span>
                                                            {connection.accountId && (
                                                                <span>• {connection.accountId}</span>
                                                            )}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-4 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Connected: {formatDate(connection.createdAt)}
                                                        </span>
                                                        {connection.lastValidated && (
                                                            <span className="flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Validated: {formatDate(connection.lastValidated)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {connection.errorCount > 0 && connection.lastError && (
                                                        <p className="text-red-600 text-xs">
                                                            Last error: {connection.lastError}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {connection.profileUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(connection.profileUrl, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleValidate(connection.id, getPlatformName(connection.platform))}
                                                disabled={validatingPlatform === connection.id}
                                            >
                                                {validatingPlatform === connection.id ? (
                                                    <div className="w-4 h-1">
                                                        <ProgressBar size="sm" variant="primary" />
                                                    </div>
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnect(connection.id, getPlatformName(connection.platform))}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card.Content>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Platforms;