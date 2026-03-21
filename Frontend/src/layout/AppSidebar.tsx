import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { Workflow, Zap, MessageSquare, Layers, HelpCircle, LogOut, Link2, DollarSign } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";
import useAuthStore from "../stores/useAuthStore";
import toast from "react-hot-toast";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  onClick?: () => void;
  isExternal?: boolean;
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSignOut = () => {
    toast.custom((t) => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <LogOut className="h-10 w-10 text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-full" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Sign Out Confirmation
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to end your session?
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              logout();
              toast.dismiss(t.id);
              toast.success("Signed out successfully");
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-semibold text-red-600 hover:text-red-500 focus:outline-none"
          >
            Sign Out
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const navItems: NavItem[] = [
    {
      icon: <GridIcon />,
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <Workflow className="w-[24px] h-[24px]" />,
      name: "Flows",
      path: "/flows",
    },
    {
      icon: <Zap className="w-[24px] h-[24px]" />,
      name: "Trobs",
      path: "/trobs",
    },
    {
      icon: <Layers className="size-6" />,
      name: "Automation",
      subItems: [
        { name: "Active Jobs", path: "/automations/active", pro: false },
        { name: "Completed Jobs", path: "/automations/completed", pro: false },
      ],
    },
    {
      icon: <MessageSquare className="w-[24px] h-[24px]" />,
      name: "Messages",
      path: "/messages",
    },
    {
      icon: <Link2 className="w-[24px] h-[24px]" />,
      name: "Connections",
      path: "/connections",
    },
    {
      icon: <DollarSign className="w-[24px] h-[24px]" />,
      name: "Pricing",
      path: "/pricing",
    },
  ];

  const othersItems: NavItem[] = [
    {
      icon: <HelpCircle className="size-6" />,
      name: "Help and Support",
      path: "https://trobyx.com/help",
      isExternal: true,
    },
    {
      icon: <LogOut className="size-6" />,
      name: "Sign Out",
      onClick: handleSignOut,
    },
  ];

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : nav.path ? (
            nav.isExternal ? (
              <a
                href={nav.path}
                target="_blank"
                rel="noopener noreferrer"
                className="menu-item group menu-item-inactive"
              >
                <span className="menu-item-icon-size menu-item-icon-inactive">
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </a>
            ) : (
              <div
                className={`relative ${(nav.name === "Connections" && Number(user?.onboardingStep) === 1) || (nav.name === "Dashboard" && Number(user?.onboardingStep) === 2) ? "z-50" : ""}`}
              >
                {nav.name === "Connections" && Number(user?.onboardingStep) === 1 && createPortal(
                  <div
                    className="fixed z-[99999] whitespace-nowrap pointer-events-none animate-fade-in-right"
                    style={{
                      left: `calc(${(document.querySelector(`[data-nav-name="Connections"]`)?.getBoundingClientRect().right || 90)}px + 16px)`,
                      top: `calc(${document.querySelector(`[data-nav-name="Connections"]`)?.getBoundingClientRect().top || 0}px + 23px)`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="bg-brand-500 dark:bg-gray-800 text-white dark:text-gray-200 text-[11.5px] font-bold py-2 px-4 rounded-xl shadow-2xl border border-brand-600/20 dark:border-gray-700 flex items-center relative">
                      Connect your social media account from here
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-brand-500 dark:bg-gray-800 border-l border-b border-brand-600/20 dark:border-gray-700 rotate-45"></div>
                    </div>
                  </div>,
                  document.body
                )}

                {nav.name === "Dashboard" && Number(user?.onboardingStep) === 2 && createPortal(
                  <div
                    className="fixed z-[99999] whitespace-nowrap pointer-events-none animate-fade-in-right"
                    style={{
                      left: `calc(${(document.querySelector(`[data-nav-name="Dashboard"]`)?.getBoundingClientRect().right || 90)}px + 16px)`,
                      top: `calc(${document.querySelector(`[data-nav-name="Dashboard"]`)?.getBoundingClientRect().top || 0}px + 23px)`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="bg-brand-500 dark:bg-gray-800 text-white dark:text-gray-200 text-[11.5px] font-bold py-2 px-4 rounded-xl shadow-2xl border border-brand-600/20 dark:border-gray-700 flex items-center relative">
                      Check your connection status on Dashboard
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-brand-500 dark:bg-gray-800 border-l border-b border-brand-600/20 dark:border-gray-700 rotate-45"></div>
                    </div>
                  </div>,
                  document.body
                )}

                {nav.name === "Flows" && Number(user?.onboardingStep) === 4 && createPortal(
                  <div
                    className="fixed z-[99999] whitespace-nowrap pointer-events-none animate-fade-in-right"
                    style={{
                      left: `calc(${(document.querySelector(`[data-nav-name="Flows"]`)?.getBoundingClientRect().right || 90)}px + 16px)`,
                      top: `calc(${document.querySelector(`[data-nav-name="Flows"]`)?.getBoundingClientRect().top || 0}px + 23px)`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="bg-brand-500 dark:bg-gray-800 text-white dark:text-gray-200 text-[11.5px] font-bold py-2 px-4 rounded-xl shadow-2xl border border-brand-600/20 dark:border-gray-700 flex items-center relative">
                      Explore your automation flows
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-brand-500 dark:bg-gray-800 border-l border-b border-brand-600/20 dark:border-gray-700 rotate-45"></div>
                    </div>
                  </div>,
                  document.body
                )}

                {nav.name === "Trobs" && Number(user?.onboardingStep) === 5 && createPortal(
                  <div
                    className="fixed z-[99999] whitespace-nowrap pointer-events-none animate-fade-in-right"
                    style={{
                      left: `calc(${(document.querySelector(`[data-nav-name="Trobs"]`)?.getBoundingClientRect().right || 90)}px + 16px)`,
                      top: `calc(${document.querySelector(`[data-nav-name="Trobs"]`)?.getBoundingClientRect().top || 0}px + 23px)`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="bg-brand-500 dark:bg-gray-800 text-white dark:text-gray-200 text-[11.5px] font-bold py-2 px-4 rounded-xl shadow-2xl border border-brand-600/20 dark:border-gray-700 flex items-center relative">
                      Check out your Trobs
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-brand-500 dark:bg-gray-800 border-l border-b border-brand-600/20 dark:border-gray-700 rotate-45"></div>
                    </div>
                  </div>,
                  document.body
                )}

                <Link
                  to={nav.path}
                  data-nav-name={nav.name}
                  onClick={() => {
                    if (nav.name === "Connections" && Number(user?.onboardingStep) === 1) {
                      useAuthStore.getState().updateOnboarding(2);
                    }
                    if (nav.name === "Dashboard" && Number(user?.onboardingStep) === 2) {
                      useAuthStore.getState().updateOnboarding(3);
                    }
                    if (nav.name === "Flows" && Number(user?.onboardingStep) === 4) {
                      useAuthStore.getState().updateOnboarding(5);
                    }
                    if (nav.name === "Trobs" && Number(user?.onboardingStep) === 5) {
                      useAuthStore.getState().updateOnboarding(6);
                    }
                  }}
                  className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${((nav.name === "Connections" && Number(user?.onboardingStep) === 1) || (nav.name === "Dashboard" && Number(user?.onboardingStep) === 2) || (nav.name === "Flows" && Number(user?.onboardingStep) === 4) || (nav.name === "Trobs" && Number(user?.onboardingStep) === 5))
                    ? "ring-2 ring-inset ring-brand-500 bg-brand-50/30 dark:bg-brand-500/10 rounded-lg shadow-sm"
                    : ""
                    }`}
                >
                  <span
                    className={`menu-item-icon-size ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              </div>
            )
          ) : (
            <button
              onClick={nav.onClick}
              className="menu-item group menu-item-inactive w-full text-left"
            >
              <span className="menu-item-icon-size menu-item-icon-inactive">
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </button>
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/trobyx.svg"
                alt="Logo"
                width={80}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/trobyx.svg"
                alt="Logo"
                width={80}
                height={40}
              />
            </>
          ) : (
            <img
              src="/trobyx.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar !overflow-x-visible">
        <nav className="mb-6 !overflow-visible">
          <div className="flex flex-col gap-4 !overflow-visible">
            <div className="!overflow-visible">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>

        <div className="mt-auto pb-6 2xl:pb-24">
          <nav className="mb-6 !overflow-visible">
            {renderMenuItems(
              othersItems.filter(item => item.name !== "Sign Out" || isMobileOpen),
              "others"
            )}
          </nav>
          {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
