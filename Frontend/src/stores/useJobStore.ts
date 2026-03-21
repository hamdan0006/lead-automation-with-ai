import { create } from 'zustand';
import { apiGet, apiPost, apiPut, handleApiError } from '../api/apiUtils';

// Types
export interface Job {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  platform: string;
  createdAt: string;
  updatedAt: string;
  // Add other job properties as needed
}

export interface Filters {
  status: string;
  platform: string;
  search: string;
}

interface JobStore {
  // State
  jobs: Job[];
  activeJobs: Job[];
  selectedJob: Job | null;
  isLoading: boolean;
  error: string | null;
  filters: Filters;

  // Actions
  setJobs: (jobs: Job[]) => void;
  setActiveJobs: (activeJobs: Job[]) => void;
  setSelectedJob: (job: Job | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  
  // Async Actions
  fetchJobs: () => Promise<void>;
  fetchActiveJobs: () => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job | undefined>;
  updateJobStatus: (jobId: string, status: Job['status']) => Promise<void>;
  clearError: () => void;
}

// Create the store with TypeScript
const useJobStore = create<JobStore>((set, get) => ({
  // State
  jobs: [],
  activeJobs: [],
  selectedJob: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    platform: 'all',
    search: '',
  },

  // Actions
  setJobs: (jobs) => set({ jobs }),

  setActiveJobs: (activeJobs) => set({ activeJobs }),

  setSelectedJob: (job) => set({ selectedJob: job }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  // Fetch jobs
  fetchJobs: async () => {
    console.log('Fetching jobs...'); // Debug log
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const endpoint = `/jobs?${params}`;
      console.log('Making request to:', endpoint); // Debug log

      const data = await apiGet(endpoint);
      console.log('API response:', data); // Debug log

      set({
        jobs: data.data?.jobs || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching jobs:', error); // Debug log
      set({ error: (error as Error).message, isLoading: false });
      // The API utility already handles 401 redirects
    }
  },

  // Fetch active jobs
  fetchActiveJobs: async () => {
    try {
      const data = await apiGet('/jobs?status=running');
      set({ activeJobs: data.data?.jobs || [] });
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      // The API utility already handles 401 redirects
    }
  },

  // Create new job
  createJob: async (jobData) => {
    set({ isLoading: true, error: null });
    try {
      const newJob = await apiPost('/jobs', jobData);
      set((state) => ({
        jobs: [newJob.data?.job, ...state.jobs],
        isLoading: false,
      }));

      return newJob.data?.job;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Update job status
  updateJobStatus: async (jobId, status) => {
    try {
      await apiPut(`/jobs/${jobId}`, { status });

      // Update local state
      set((state) => ({
        jobs: state.jobs.map(job =>
          job.id === jobId ? { ...job, status } : job,
        ),
        activeJobs: state.activeJobs.map(job =>
          job.id === jobId ? { ...job, status } : job,
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useJobStore;