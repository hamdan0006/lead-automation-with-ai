import React from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

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
      </div>
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
