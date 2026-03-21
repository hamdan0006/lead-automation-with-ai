import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import useAuthStore from "../../stores/useAuthStore";
import toast from "react-hot-toast";
import SearchableMultiSelect from "../ui/SearchableMultiSelect";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const industryOptions = [
  { label: "CEO", value: "CEO" },
  { label: "Chief Executive Officer", value: "Chief Executive Officer" },
  { label: "Founder", value: "Founder" },
  { label: "Co-Founder", value: "Co-Founder" },
  { label: "President", value: "President" },
  { label: "Vice President", value: "Vice President" },
  { label: "VP Sales", value: "VP Sales" },
  { label: "VP Marketing", value: "VP Marketing" },
  { label: "VP Business Development", value: "VP Business Development" },
  { label: "Chief Technology Officer", value: "Chief Technology Officer" },
  { label: "CTO", value: "CTO" },
  { label: "Chief Marketing Officer", value: "Chief Marketing Officer" },
  { label: "CMO", value: "CMO" },
  { label: "Chief Revenue Officer", value: "Chief Revenue Officer" },
  { label: "CRO", value: "CRO" },
  { label: "Chief Financial Officer", value: "Chief Financial Officer" },
  { label: "CFO", value: "CFO" },
  { label: "Director of Sales", value: "Director of Sales" },
  { label: "Sales Director", value: "Sales Director" },
  { label: "Marketing Director", value: "Marketing Director" },
  { label: "Sales Manager", value: "Sales Manager" },
  { label: "Business Development Manager", value: "Business Development Manager" },
  { label: "Account Manager", value: "Account Manager" },
  { label: "Product Manager", value: "Product Manager" },
  { label: "Head of Growth", value: "Head of Growth" },
  { label: "Head of Sales", value: "Head of Sales" },
  { label: "Head of Marketing", value: "Head of Marketing" },
  { label: "Head of Business Development", value: "Head of Business Development" },
  { label: "Business Owner", value: "Business Owner" },
  { label: "Managing Director", value: "Managing Director" },
  { label: "General Manager", value: "General Manager" },
  { label: "Operations Manager", value: "Operations Manager" },
  { label: "Senior Manager", value: "Senior Manager" },
  { label: "Director", value: "Director" },
  { label: "Senior Director", value: "Senior Director" },
  { label: "Executive Director", value: "Executive Director" },
];

export default function PreferencesOnboardingModal() {
  const { user, updateOnboarding } = useAuthStore();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [existingPreferences, setExistingPreferences] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  // Show modal only when onboardingStep is 7
  const isOpen = user?.onboardingStep === 7 && !user?.hasCompletedOnboarding;

  // Fetch existing preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      const token = localStorage.getItem("accessToken");
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch preferences");
        const data = await res.json();
        setExistingPreferences(data.preferences || {});
      } catch (error: any) {
        toast.error(error.message || "Could not load preferences");
      }
    };
    fetchPreferences();
  }, []);

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await updateOnboarding(8);
      toast.success("You are all set!");
    } catch (error) {
      toast.error("Failed to finish onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (industriesToSave: string[]) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        preferences: {
          ...existingPreferences,
          industries: industriesToSave,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to update preferences");
    }

    setExistingPreferences((prev: any) => ({ ...prev, industries: industriesToSave }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedIndustries.length === 0) {
      toast.error("Please select at least one industry or skip");
      return;
    }

    setIsLoading(true);
    try {
      await savePreferences(selectedIndustries);
      await updateOnboarding(8);
      toast.success("You are all set!");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => { }} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          <h4 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            Target Your Audience
          </h4>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            Select the industries you want to focus on to get better search results.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="mb-8 text-left">
            <SearchableMultiSelect
              label="Target Industries *"
              options={industryOptions}
              selectedValues={selectedIndustries.map((industry) => ({
                value: industry,
                label: industry,
              }))}
              onChange={(selectedOptions) => {
                const industryValues = selectedOptions.map((option) => option.value);
                setSelectedIndustries(industryValues);
                savePreferences(industryValues).catch((err) =>
                  console.error("Auto-save failed", err)
                );
              }}
              placeholder="Search job titles like CEO, Founder, Manager..."
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Finishing..." : "Complete Setup"}
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 text-sm font-semibold transition-colors py-2"
            >
              Skip and finish
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
