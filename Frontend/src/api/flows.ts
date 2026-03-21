import {
  apiGet,
  apiPost,
  type ApiResponse
} from './apiUtils';

/**
 * Flow API service - handles all Flow-related API calls
 */

// Type Definitions (you can also import these from a shared types file)
export interface Industry {
  id: string;
  name: string;
  code?: string;
}

export interface IndustriesResponse {
  industries: Industry[];
}

export interface FlowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: string;
}

export interface FlowTemplate {
  id: string;
  displayName: string;
  description: string;
  summary: string;
  platform: string;
  category: string;
  estimatedTime: string;
  stages?: FlowStage[];
  defaultConfig?: any;
  maxRunsPerDay?: number;
}

export interface FlowTemplatesResponse {
  flows: FlowTemplate[];
}

export interface UserFlow {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED' | 'PENDING';
  template: FlowTemplate;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  config: Record<string, any>;
  state?: {
    prospectTracking?: {
      totalEngagements?: number;
      totalProspectsFound?: number;
      connectionsAccepted?: number;
    };
  };
}

export interface UserFlowsResponse {
  flows: UserFlow[];
}

// Query parameter interfaces
export interface GetUserFlowsParams {
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  templateId?: string;
}

export interface GetFlowActivitiesParams {
  page?: number;
  limit?: number;
  type?: string | string[];
  status?: string;
}

export interface GetFlowProspectsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  aiScore?: number | string;
}

/**
 * Get all available LinkedIn industries
 * @returns {Promise<ApiResponse<IndustriesResponse>>} Industries response
 */
export const getIndustries = (): Promise<ApiResponse<IndustriesResponse>> => {
  return apiGet<IndustriesResponse>('/industries');
};

/**
 * Search LinkedIn industries by query
 * @param {string} query - Search query
 * @param {number} limit - Maximum results to return
 * @returns {Promise<ApiResponse<IndustriesResponse>>} Industries search response
 */
export const searchIndustries = (
  query: string,
  limit: number = 50
): Promise<ApiResponse<IndustriesResponse>> => {
  return apiGet<IndustriesResponse>(`/industries/search?q=${encodeURIComponent(query)}&limit=${limit}`);
};

/**
 * Get available flow templates
 * @returns {Promise<ApiResponse<FlowTemplatesResponse>>} Flow templates response
 */
export const getFlowTemplates = (): Promise<ApiResponse<FlowTemplatesResponse>> => {
  return apiGet<FlowTemplatesResponse>('/flows/templates');
};

/**
 * Get specific flow template by ID
 * @param {string} templateId - Flow template ID
 * @returns {Promise<ApiResponse<{ flow: FlowTemplate }>>} Flow template response
 */
export const getFlowTemplate = (templateId: string): Promise<ApiResponse<{ flow: FlowTemplate }>> => {
  return apiGet<{ flow: FlowTemplate }>(`/flows/templates/${templateId}`);
};

/**
 * Start a new flow
 * @param {string} templateId - Flow template ID
 * @param {object} config - Flow configuration
 * @param {string} name - Optional flow name
 * @returns {Promise<ApiResponse<{ flow: UserFlow }>>} Started flow response
 */
export const startFlow = async (
  templateId: string,
  config: Record<string, any>,
  name: string | null = null
): Promise<ApiResponse<{ flow: UserFlow }>> => {
  const FLOW_API_URL = 'http://192.168.1.23:3000/api/flows';
  const token = localStorage.getItem('accessToken');

  const response = await fetch(FLOW_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      templateId,
      name,
      config
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to start flow');
  }

  return data;
};

/**
 * Get user's flows
 * @param {GetUserFlowsParams} params - Query parameters
 * @returns {Promise<ApiResponse<UserFlowsResponse>>} User flows response
 */
export const getUserFlows = async (
  params: GetUserFlowsParams = {}
): Promise<ApiResponse<UserFlowsResponse>> => {
  const token = localStorage.getItem('accessToken');
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append('status', params.status);
  if (params.templateId) queryParams.append('templateId', params.templateId);

  const queryString = queryParams.toString();
  // Use specific endpoint for fetching flows
  const url = `http://192.168.1.23:3000/api/flows${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch flows');
  }

  return data;
};

/**
 * Get specific flow details
 * @param {string} flowId - Flow instance ID
 * @returns {Promise<ApiResponse<{ flow: UserFlow }>>} Flow details response
 */
export const getFlow = (flowId: string): Promise<ApiResponse<{ flow: UserFlow }>> => {
  return apiGet<{ flow: UserFlow }>(`/flows/${flowId}`);
};

/**
 * Pause a flow
 * @param {string} flowId - Flow instance ID
 * @returns {Promise<ApiResponse<{ flow: UserFlow }>>} Pause response
 */
export const pauseFlow = async (flowId: string): Promise<ApiResponse<{ flow: UserFlow }>> => {
  const token = localStorage.getItem('accessToken');
  const url = `http://192.168.1.23:3000/api/flows/${flowId}/pause`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to pause flow');
  }

  return data;
};

/**
 * Resume a paused flow
 * @param {string} flowId - Flow instance ID
 * @returns {Promise<ApiResponse<{ flow: UserFlow }>>} Resume response
 */
export const resumeFlow = async (flowId: string): Promise<ApiResponse<{ flow: UserFlow }>> => {
  const token = localStorage.getItem('accessToken');
  const url = `http://192.168.1.23:3000/api/flows/${flowId}/resume`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to resume flow');
  }

  return data;
};

/**
 * Stop and delete a flow
 * @param {string} flowId - Flow instance ID
 * @returns {Promise<ApiResponse>} Delete response
 */
export const deleteFlow = async (flowId: string): Promise<ApiResponse> => {
  const token = localStorage.getItem('accessToken');
  // Use specific endpoint for flow deletion
  const url = `http://192.168.1.23:3000/api/flows/${flowId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Handle 204 No Content if applicable, or parse JSON
  if (response.status === 204) {
    return { status: 'success', data: null, message: 'Flow deleted successfully' };
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete flow');
  }

  return data;
};

/**
 * Get flow analytics
 * @param {string} flowId - Flow instance ID
 * @param {string} period - Analytics period (7d, 30d, 90d)
 * @returns {Promise<ApiResponse<any>>} Flow analytics response
 */
export const getFlowAnalytics = (
  flowId: string,
  period: string = '7d'
): Promise<ApiResponse<any>> => {
  return apiGet<any>(`/flows/${flowId}/analytics?period=${period}`);
};

/**
 * Manually execute a flow (for testing)
 * @param {string} flowId - Flow instance ID
 * @returns {Promise<ApiResponse>} Execution response
 */
export const executeFlow = (flowId: string): Promise<ApiResponse> => {
  return apiPost(`/flows/${flowId}/execute`);
};

/**
 * Get flow activities with pagination
 * @param {string} flowId - Flow instance ID
 * @param {GetFlowActivitiesParams} params - Pagination and filter parameters
 * @returns {Promise<ApiResponse<any>>} Flow activities response
 */
export const getFlowActivities = (
  flowId: string,
  params: GetFlowActivitiesParams = {}
): Promise<ApiResponse<any>> => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page?.toString() || '1');
  if (params.limit) queryParams.append('limit', params.limit?.toString() || '50');
  if (params.type) {
    const types = Array.isArray(params.type) ? params.type : [params.type];
    types.forEach(type => queryParams.append('type', type));
  }
  if (params.status) queryParams.append('status', params.status);

  const queryString = queryParams.toString();
  return apiGet<any>(`/flows/${flowId}/activities${queryString ? `?${queryString}` : ''}`);
};

/**
 * Get flow prospects with pagination
 * @param {string} flowId - Flow instance ID
 * @param {GetFlowProspectsParams} params - Pagination and filter parameters
 * @returns {Promise<ApiResponse<any>>} Flow prospects response
 */
export const getFlowProspects = (
  flowId: string,
  params: GetFlowProspectsParams = {}
): Promise<ApiResponse<any>> => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page?.toString() || '1');
  if (params.limit) queryParams.append('limit', params.limit?.toString() || '20');
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.aiScore) queryParams.append('aiScore', params.aiScore.toString());

  const queryString = queryParams.toString();
  return apiGet<any>(`/flows/${flowId}/prospects${queryString ? `?${queryString}` : ''}`);
};

/**
 * Get detailed prospect information
 * @param {string} flowId - Flow instance ID
 * @param {string} prospectId - Prospect ID
 * @returns {Promise<ApiResponse<{ prospect: any }>>} Prospect details response
 */
export const getFlowProspectDetails = (
  flowId: string,
  prospectId: string
): Promise<ApiResponse<{ prospect: any }>> => {
  return apiGet<{ prospect: any }>(`/flows/${flowId}/prospects/${prospectId}`);
};