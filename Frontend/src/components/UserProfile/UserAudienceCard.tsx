import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { apiGet, apiCall, handleApiError } from '../../api/apiUtils';
import useAuthStore from '../../stores/useAuthStore';
import SearchableMultiSelect from '../ui/SearchableMultiSelect';

const ALL_JOB_TITLES = [
  'CEO', 'Chief Executive Officer', 'Founder', 'Co-Founder', 'President',
  'Vice President', 'VP Sales', 'VP Marketing', 'VP Business Development',
  'Chief Technology Officer', 'CTO', 'Chief Marketing Officer', 'CMO',
  'Chief Revenue Officer', 'CRO', 'Chief Financial Officer', 'CFO',
  'Director of Sales', 'Sales Director', 'Marketing Director', 'Sales Manager',
  'Business Development Manager', 'Account Manager', 'Product Manager',
  'Head of Growth', 'Head of Sales', 'Head of Marketing', 'Head of Business Development',
  'Business Owner', 'Managing Director', 'General Manager', 'Operations Manager',
  'Senior Manager', 'Director', 'Senior Director', 'Executive Director',
];

export default function UserAudienceCard() {
  const { refreshUser } = useAuthStore();

  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  // 🔒 Normalize anything backend sends
  const normalizeIndustries = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return [...new Set(raw.flat().filter(Boolean))];
    }

    if (typeof raw === 'string') {
      return [...new Set(raw.split(',').map(v => v.trim()).filter(Boolean))];
    }

    return [];
  };

  const fetchPreferences = async () => {
    try {
      const response = await apiGet('/auth/preferences');
      const rawIndustries = response.data?.user?.preferences?.industries;
      setSelectedAudiences(normalizeIndustries(rawIndustries));
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      handleApiError(error, toast.error, 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const newValues = selectedOptions.map(opt => opt.value);
    const added = newValues.filter(v => !selectedAudiences.includes(v));
    const removed = selectedAudiences.filter(v => !newValues.includes(v));

    // Deletion confirmation
    if (removed.length > 0) {
      setDeleteConfirm(removed[0]);
      return;
    }

    // Add new audience
    if (added.length > 0) {
      setIsSaving(true);
      try {
        await apiCall('/auth/preferences', {
          method: 'POST',
          body: {
            preferences: {
              industries: added[0], // ✅ send STRING
            },
          },
        });

        const updated = [...new Set([...selectedAudiences, added[0]])];
        setSelectedAudiences(updated);
        toast.success('Audience added successfully');
        await refreshUser();
      } catch (error) {
        handleApiError(error, toast.error, 'Failed to add audience');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsSaving(true);
    try {
      const updated = selectedAudiences.filter(
        audience => audience !== deleteConfirm
      );

      await apiCall('/auth/preferences', {
        method: 'DELETE',
        body: {
          preferences: {
            industries: updated, // full replacement
          },
        },
      });

      setSelectedAudiences(updated);
      setDeleteConfirm(null);
      toast.success('Audience removed successfully');
      await refreshUser();
    } catch (error) {
      handleApiError(error, toast.error, 'Failed to remove audience');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading audiences...
        </p>
      </div>
    );
  }

  const safeSelectedAudiences = [...new Set(selectedAudiences)];

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <SearchableMultiSelect
          label="Target Audiences"
          options={ALL_JOB_TITLES.map(title => ({
            value: title,
            label: title,
          }))}
          selectedValues={safeSelectedAudiences.map(title => ({
            value: title,
            label: title,
          }))}
          onChange={handleChange}
          placeholder="Search and select target audiences..."
          disabled={isSaving}
        />
      </div>

      {deleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Remove Audience?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to remove "{deleteConfirm}" from your target
                audiences?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
