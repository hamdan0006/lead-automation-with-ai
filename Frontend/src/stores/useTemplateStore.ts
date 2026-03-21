import { create } from 'zustand';
import { apiGet } from '../api/apiUtils';

// Types
export interface Template {
  id: string;
  displayName: string;
  description?: string;
  platform: string;
  category: string;
  content: string;
  // Template usage properties (if included)
  usageCount?: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Add other template properties as needed
}

export interface TemplateFilters {
  platform: string;
  category: string;
  search: string;
}

interface TemplateStore {
  // State
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  filters: TemplateFilters;

  // Actions
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<TemplateFilters>) => void;
  
  // Async Actions
  fetchTemplates: (includeUsage?: boolean) => Promise<void>;
  fetchTemplate: (templateId: string, includeUsage?: boolean) => Promise<Template | undefined>;
  
  // Computed/Filter Actions
  getFilteredTemplates: () => Template[];
  clearError: () => void;
}

// Create the store with TypeScript
const useTemplateStore = create<TemplateStore>((set, get) => ({
  // State
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,
  filters: {
    platform: 'all',
    category: 'all',
    search: '',
  },

  // Actions
  setTemplates: (templates) => set({ templates }),

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  // Fetch templates
  fetchTemplates: async (includeUsage = true) => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      // Include usage counts
      if (includeUsage) {
        params.append('includeUsage', 'true');
      }

      const data = await apiGet(`/templates?${params}`);
      set({
        templates: data.data?.templates || [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch single template
  fetchTemplate: async (templateId, includeUsage = true) => {
    set({ isLoading: true, error: null });
    try {
      const params = includeUsage ? '?includeUsage=true' : '';
      const data = await apiGet(`/templates/${templateId}${params}`);
      set({
        selectedTemplate: data.data?.template,
        isLoading: false,
      });

      return data.data?.template;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Get filtered templates
  getFilteredTemplates: () => {
    const { templates, filters } = get();
    return templates.filter(template => {
      const matchesPlatform = filters.platform === 'all' || template.platform === filters.platform;
      const matchesCategory = filters.category === 'all' || template.category === filters.category;
      const matchesSearch = !filters.search ||
        template.displayName.toLowerCase().includes(filters.search.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(filters.search.toLowerCase()));

      return matchesPlatform && matchesCategory && matchesSearch;
    });
  },

  clearError: () => set({ error: null }),
}));

export default useTemplateStore;