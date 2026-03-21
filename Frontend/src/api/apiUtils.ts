// API utility functions for making authenticated requests
import useAuthStore from '../stores/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Type Definitions
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data: T;
  message?: string;
  errors?: Array<{
    msg: string;
    message: string;
    path: string;
    location: string;
  }>;
}

export interface ApiCallOptions extends RequestInit {
  headers?: Record<string, string>;
  body?: any;
}

export interface AuthStore {
  token: string | null;
  logout: () => Promise<void>;
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an authenticated API call
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {ApiCallOptions} options - Fetch options
 * @returns {Promise<ApiResponse>} API response
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  // Get auth token from store
  const authStore = useAuthStore.getState();
  const token = authStore.token;

  // Prepare request URL
  const url = `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Prepare final options
  const requestOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Include cookies if needed
  };

  // If there's a body and it's an object, stringify it
  if (requestOptions.body && typeof requestOptions.body === 'object') {
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  try {
    const response = await fetch(url, requestOptions);

    // Handle 401 Unauthorized responses immediately
    if (response.status === 401) {
      // Clear auth state and redirect to login
      await authStore.logout();

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new ApiError('Your session has expired. Please log in again.', 401, null);
    }

    // Parse JSON response
    const data = await response.json();

    // Handle other non-200 responses
    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError(
        'Network error. Please check your connection and try again.',
        0,
        null,
      );
    }

    // Re-throw unknown errors
    throw error;
  }
};

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @param {ApiCallOptions} options - Additional options
 * @returns {Promise<ApiResponse>} API response
 */
export const apiGet = <T = any>(endpoint: string, options: ApiCallOptions = {}): Promise<ApiResponse<T>> => {
  return apiCall<T>(endpoint, { method: 'GET', ...options });
};

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {ApiCallOptions} options - Additional options
 * @returns {Promise<ApiResponse>} API response
 */
export const apiPost = <T = any>(
  endpoint: string,
  data?: any,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: data,
    ...options,
  });
};

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {ApiCallOptions} options - Additional options
 * @returns {Promise<ApiResponse>} API response
 */
export const apiPut = <T = any>(
  endpoint: string,
  data?: any,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    body: data,
    ...options,
  });
};

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @param {ApiCallOptions} options - Additional options
 * @returns {Promise<ApiResponse>} API response
 */
export const apiDelete = <T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  return apiCall<T>(endpoint, { method: 'DELETE', ...options });
};

// Toast function type
export type ToastFunction = (message: string, options?: any) => void;

/**
 * Handle API errors consistently
 * @param {Error | ApiError} error - The error to handle
 * @param {ToastFunction} toast - Toast notification function
 * @param {string} defaultMessage - Default error message
 */
export const handleApiError = (
  error: unknown,
  toast: ToastFunction,
  defaultMessage: string = 'Something went wrong'
): void => {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Handle unauthorized - redirect to login
      useAuthStore.getState().logout();
      toast('Your session has expired. Please log in again.');
      return;
    }

    if (error.status === 403) {
      toast('You do not have permission to perform this action.');
      return;
    }

    if (error.status === 422) {
      // Handle validation errors
      if (error.data && error.data.errors) {
        const firstError = error.data.errors[0];
        toast(firstError.msg || firstError.message || defaultMessage);
        return;
      }
    }

    toast(error.message || defaultMessage);
  } else if (error instanceof Error) {
    toast(error.message || defaultMessage);
  } else {
    toast(defaultMessage);
  }
};