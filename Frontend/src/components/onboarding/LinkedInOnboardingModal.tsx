import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import useAuthStore from "../../stores/useAuthStore";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LinkedInOnboardingModal() {
    const { user, updateOnboarding } = useAuthStore();
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Show only when onboardingStep is 6
    const isOpen = user?.onboardingStep === 6 && !user?.hasCompletedOnboarding;

    const handleSkip = async () => {
        setIsLoading(true);
        try {
            await updateOnboarding(7);
        } catch (error) {
            toast.error("Failed to update onboarding");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!linkedinUrl) {
            toast.error("Please enter your LinkedIn URL or skip");
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('accessToken');

        try {
            // 1. Send LinkedIn URL to backend
            const response = await fetch(`${API_BASE_URL}/api/auth/linkedin-profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ linkedinProfileUrl: linkedinUrl }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to update LinkedIn profile");
            }

            // 2. Increment onboarding step
            await updateOnboarding(7);
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => { }} className="max-w-[500px] m-4">
            <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-brand-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                        </div>
                    </div>
                    <h4 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                        Maximize Your Outreach
                    </h4>
                    <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                        Add your LinkedIn profile URL to help Trobyx personalize your experience. You can skip this for now.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="mb-6 text-left">
                        <Label>LinkedIn Profile URL</Label>
                        <Input
                            type="url"
                            placeholder="https://www.linkedin.com/in/username"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            className="mt-2"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full"
                        >
                            {isLoading ? "Saving..." : "Save and Continue"}
                        </Button>
                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-600 text-sm font-semibold transition-colors py-2"
                        >
                            Skip for now
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
