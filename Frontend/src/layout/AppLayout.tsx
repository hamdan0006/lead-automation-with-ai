import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import LinkedInOnboardingModal from "../components/onboarding/LinkedInOnboardingModal";
import PreferencesOnboardingModal from "../components/onboarding/PreferencesOnboardingModal";
import useAuthStore from "../stores/useAuthStore";
import { CheckCircle } from "lucide-react";
import Button from "../components/ui/button/Button";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user } = useAuthStore();
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    // Show congrats modal only when onboarding is just completed
    if (user?.hasCompletedOnboarding && !localStorage.getItem('congratsShown')) {
      setShowCongrats(true);
      const timer = setTimeout(() => {
        setShowCongrats(false);
        localStorage.setItem('congratsShown', 'true');
      }, 5000); // Show for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [user?.hasCompletedOnboarding]);

  const location = useLocation();
  const isMessagesPage = location.pathname === "/messages";

  const isAutomationPage = location.pathname.includes("/automations/");
  const containerMaxWidth = isAutomationPage ? "max-w-[1600px]" : "max-w-(--breakpoint-2xl)";

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""} ${isMessagesPage ? "h-screen overflow-hidden" : ""}`}
      >
        <AppHeader />
        <div
          className={`flex-1 min-h-0 flex flex-col ${isMessagesPage ? "p-0" : `p-4 mx-auto ${containerMaxWidth} w-full md:p-6`
            }`}
        >
          <Outlet />
        </div>
        <LinkedInOnboardingModal />
        <PreferencesOnboardingModal />
      </div>

      {showCongrats && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-dark rounded-[32px] shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden border border-white/20 dark:border-gray-800 animate-scale-in">
            {/* Background Decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

            {/* Success Icon */}
            <div className="relative mx-auto w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-ping"></div>
              <CheckCircle className="w-10 h-10 text-brand-500 relative z-10" />
            </div>

            <h2 className="text-2xl font-black text-black dark:text-white mb-3">Congratulations!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
              You've successfully completed the onboarding. Your workspace is ready for growth!
            </p>

            <Button
              className="w-full"
              onClick={() => {
                setShowCongrats(false);
                localStorage.setItem('congratsShown', 'true');
              }}
            >
              Get Started
            </Button>

            <button
              onClick={() => setShowCongrats(false)}
              className="mt-4 text-gray-400 hover:text-gray-600 text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
