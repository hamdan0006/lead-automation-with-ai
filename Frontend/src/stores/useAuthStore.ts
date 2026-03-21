import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface User {
    [key: string]: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    setUser: (user: User | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    login: (credentials: any) => Promise<any>;
    logout: () => Promise<void>;
    register: (userData: any) => Promise<any>;
    clearError: () => void;
    refreshUser: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateOnboarding: (step: number) => Promise<any>;
}

const useAuthStore = create<AuthState>((set, get) => ({
    // State
    user: null,
    token: localStorage.getItem('accessToken'),
    isAuthenticated: false,
    isLoading: !!localStorage.getItem('accessToken'),
    error: null,

    // Actions
    setUser: (user) => set({ user, isAuthenticated: !!user }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            // Check if response is OK before parsing JSON
            if (!response.ok) {
                // Try to parse error message from JSON response
                let errorMessage = 'Login failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    // If JSON parsing fails, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Store tokens
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);

            set({
                user: data.data.user,
                token: data.data.accessToken,
                isAuthenticated: true,
                isLoading: false,
            });

            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear tokens and state
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },

    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            // Check if response is OK before parsing JSON
            if (!response.ok) {
                // Try to parse error message from JSON response
                let errorMessage = 'Registration failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    // If JSON parsing fails, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Auto-login after register
            if (data.data?.accessToken) {
                localStorage.setItem('accessToken', data.data.accessToken);
                localStorage.setItem('refreshToken', data.data.refreshToken);
                set({
                    user: data.data.user,
                    token: data.data.accessToken,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
            return data;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),

    refreshUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                set({ user: data.data.user });
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    },

    checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        const { isAuthenticated, user } = get();

        if (!token) {
            if (isAuthenticated || user !== null) {
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    isLoading: false,
                });
            }
            return;
        }

        try {
            set(state => state.isLoading ? state : { isLoading: true });

            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Invalid token');

            const data = await response.json();

            // 🔑 GUARD AGAINST SAME DATA
            if (
                get().isAuthenticated &&
                get().user?.id === data.data.user.id
            ) {
                set({ isLoading: false });
                return;
            }

            set({
                user: data.data.user,
                isAuthenticated: true,
                token,
                isLoading: false,
            });
        } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            if (get().isAuthenticated || get().user !== null) {
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    isLoading: false,
                });
            }
        }
    },

    updateOnboarding: async (step: number) => {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No access token found');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/onboarding`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ onboardingStep: step }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update onboarding');
            }

            const data = await response.json();

            // Update local user state if successful - MERGE with existing data
            if (data.status === "success" || data.data) {
                const updatedFields = data.data.user || data.data;
                const currentUser = get().user;
                set({
                    user: currentUser ? { ...currentUser, ...updatedFields } : updatedFields
                });
            }

            return data;
        } catch (error: any) {
            console.error('Onboarding update error:', error);
            throw error;
        }
    }

}));

export default useAuthStore;
