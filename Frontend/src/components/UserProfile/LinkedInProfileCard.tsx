import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiGet, apiCall, handleApiError } from '../../api/apiUtils';
import { Linkedin } from 'lucide-react';

export default function LinkedInProfileCard() {
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiGet('/auth/linkedin-profile');
      const url = response.data?.user?.linkedinProfileUrl || '';
      setProfileUrl(url);
      setEditValue(url);
    } catch (error) {
      console.error('Failed to fetch LinkedIn profile:', error);
      handleApiError(error, toast.error, 'Failed to load LinkedIn profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiCall('/auth/linkedin-profile', {
        method: 'PATCH',
        body: { linkedinProfileUrl: editValue.trim() },
      });

      toast.success('LinkedIn profile updated successfully');
      setProfileUrl(editValue.trim());
      setIsEditing(false);
      await fetchProfile();
    } catch (error) {
      handleApiError(error, toast.error, 'Failed to update LinkedIn profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 mb-4">
        <Linkedin className="w-5 h-5 text-blue-600" />
        <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
          LinkedIn Profile
        </h4>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <input
            type="url"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="https://www.linkedin.com/in/your-profile"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditValue(profileUrl);
              }}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {profileUrl ? (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {profileUrl}
              </a>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No LinkedIn profile URL set
              </p>
            )}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
