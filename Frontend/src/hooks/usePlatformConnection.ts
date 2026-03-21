import { useState, useEffect } from 'react';
import { apiGet } from '../api/apiUtils';

// Types
export type PlatformType = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | string;

export interface PlatformConnection {
    connected: boolean;
    platform: string;
    username?: string;
    lastConnected?: string;
    expiresAt?: string;
    status?: string;
    // Add other connection properties as needed
}

export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    success?: boolean;
}

export interface ConnectionResponse {
    data?: PlatformConnection;
}

export interface AllConnectionsResponse {
    data?: {
        connections: Record<string, PlatformConnection>;
    };
}

export interface UsePlatformConnectionReturn {
    connection: PlatformConnection | null;
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export interface UseAllPlatformConnectionsReturn {
    connections: Record<string, PlatformConnection>;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isConnected: (platform?: PlatformType) => boolean;
    getConnection: (platform?: PlatformType) => PlatformConnection;
}

/**
 * Custom hook for managing platform connection status
 * @param platform - Platform to check (linkedin, twitter, etc.)
 * @returns Connection status and methods
 */
// Update types to match API response structure better if needed,
// but assuming apiGet returns the body which matches ApiResponse<T>

export const usePlatformConnection = (platform?: PlatformType): UsePlatformConnectionReturn => {
    const [connection, setConnection] = useState<PlatformConnection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkConnection = async (): Promise<void> => {
        if (!platform) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // apiGet returns the parsed JSON. Assuming it matches ApiResponse structure.
            // We pass ConnectionResponse as the T for ApiResponse data? Or is ConnectionResponse the whole data object?
            // Let's assume apiGet<T> returns T.
            // If the API returns { status: 'success', data: { ... } }, then T should be { status: ..., data: ... }
            // But usually apiGet<T> means the response *data* is T, or the whole response is T?
            // Based on previous usage in stores:
            // const data = await apiGet('/templates?...'); set({ templates: data.data?.templates ... })
            // So apiGet likely returns the full response object.

            console.log(`Checking connection for ${platform}...`);
            const response = await apiGet<ApiResponse<PlatformConnection>>(
                `/users/platform-connections/${platform.toLowerCase()}`
            );
            console.log(`API Response for ${platform}:`, response);

            if (response.status === 'success') {
                // API returns { status: 'success', data: { connected: true, platform: 'LINKEDIN', ... } }
                setConnection(response.data || {
                    connected: false,
                    platform: platform.toUpperCase()
                });
            } else {
                throw new Error(response.message || 'Failed to check connection');
            }
        } catch (err) {
            console.error(`Failed to check ${platform} connection:`, err);
            setError((err as Error).message);
            setConnection({
                connected: false,
                platform: platform.toUpperCase()
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, [platform]);

    return {
        connection,
        isConnected: connection?.connected || false,
        isLoading,
        error,
        refresh: checkConnection,
    };
};

export const useAllPlatformConnections = (): UseAllPlatformConnectionsReturn => {
    const [connections, setConnections] = useState<Record<string, PlatformConnection>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkAllConnections = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiGet<AllConnectionsResponse>('/users/platform-connections');

            if (response.status === 'success') {
                // response.data is AllConnectionsResponse { data?: { connections: ... } }
                // We want response.data.data.connections
                setConnections(response.data?.data?.connections || {});
            } else {
                throw new Error(response.message || 'Failed to check connections');
            }
        } catch (err) {
            console.error('Failed to check platform connections:', err);
            setError((err as Error).message);
            setConnections({});
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAllConnections();
    }, []);

    const isConnected = (platform?: PlatformType): boolean => {
        if (!platform) return false;
        return connections[platform.toUpperCase()]?.connected || false;
    };

    const getConnection = (platform?: PlatformType): PlatformConnection => {
        if (!platform) return { connected: false, platform: 'unknown' };
        return connections[platform.toUpperCase()] || { connected: false, platform: platform.toUpperCase() };
    };

    return {
        connections,
        isLoading,
        error,
        refresh: checkAllConnections,
        isConnected,
        getConnection,
    };
};

// Alternative with more strict platform types if you only support specific platforms
export type StrictPlatformType = 'linkedin' | 'twitter' | 'facebook' | 'instagram';

export const useStrictPlatformConnection = (
    platform: StrictPlatformType
): UsePlatformConnectionReturn => {
    const [connection, setConnection] = useState<PlatformConnection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkConnection = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiGet<ApiResponse<PlatformConnection>>(
                `/users/platform-connections/${platform.toLowerCase()}`
            );

            if (response.status === 'success') {
                setConnection(response.data || {
                    connected: false,
                    platform: platform.toUpperCase()
                });
            } else {
                throw new Error(response.message || 'Failed to check connection');
            }
        } catch (err) {
            console.error(`Failed to check ${platform} connection:`, err);
            setError((err as Error).message);
            setConnection({
                connected: false,
                platform: platform.toUpperCase()
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, [platform]);

    return {
        connection,
        isConnected: connection?.connected || false,
        isLoading,
        error,
        refresh: checkConnection,
    };
};
