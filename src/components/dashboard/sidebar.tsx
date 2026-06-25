"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import {
  CollegepondLogoIcon,
  LogoutIcon,
} from "./nav-icons";
import { type NavItem, type NavSection } from "./nav-config";

interface SidebarProps {
  collapsed: boolean;
  sections: NavSection[];
  logoSubtitle: string;
  badges?: Record<string, number | string | undefined>;
  /** Optional render slot above the logout button (e.g. admin role switcher). */
  footer?: ReactNode;
  onLogout?: () => void;
}

export function Sidebar({
  collapsed,
  sections,
  logoSubtitle,
  badges = {},
  footer,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-[#E4E7EC] bg-white transition-[width] duration-250 ${
        collapsed ? "w-16 overflow-visible" : "w-60 overflow-hidden"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 border-b border-[#E4E7EC] ${
          collapsed ? "justify-center px-2.5 py-4" : "px-5 pt-5 pb-4"
        }`}
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#1570EF]">
          <CollegepondLogoIcon className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-[17px] font-bold whitespace-nowrap text-[#101828]">
              Collegepond
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-[#1570EF] uppercase">
              {logoSubtitle}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        {sections.map((section, sectionIdx) => (
          <div key={section.label}>
            {!collapsed && (
              <div
                className={`px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider whitespace-nowrap text-[#98A2B3] uppercase ${
                  sectionIdx === 0 ? "" : "mt-1"
                }`}
              >
                {section.label}
              </div>
            )}
            {section.items.filter((item) => !item.hidden).map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(pathname, item.href)}
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Optional footer slot (e.g. admin role switcher) */}
      {!collapsed && footer && (
        <div className="border-t border-[#E4E7EC] px-3 py-2">{footer}</div>
      )}

      {/* Footer / Logout */}
      <div className="border-t border-[#E4E7EC] px-2.5 py-3">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent text-sm font-medium whitespace-nowrap text-[#F04438] transition-colors hover:bg-[#FEF3F2] ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
          }`}
        >
          <LogoutIcon className="h-5 w-5 shrink-0 stroke-[#F04438]" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </nav>
  );
}

function NavLink({
  item,
  collapsed,
  active,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  badge?: number | string;
}) {
  const baseClasses =
    "group/nav relative mb-0.5 flex items-center gap-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors";
  const sizing = collapsed ? "justify-center p-2.5" : "px-3 py-2.5";

  const stateClasses = item.disabled
    ? "cursor-not-allowed text-[#D0D5DD] opacity-60"
    : active
      ? "bg-[#1570EF] text-white"
      : "text-[#344054] hover:bg-[#F0F7FF] hover:text-[#1570EF]";

  const iconStateClasses = item.disabled
    ? "stroke-[#D0D5DD]"
    : active
      ? "stroke-white"
      : "stroke-[#667085] group-hover/nav:stroke-[#1570EF]";

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5 [&_svg]:fill-none ${iconStateClasses}`}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && badge !== undefined && (
        <span
          className={`ml-auto min-w-[20px] rounded-[10px] px-1.5 py-px text-center text-[11px] font-semibold ${
            active ? "bg-white/25 text-white" : "bg-[#F04438] text-white"
          }`}
        >
          {badge}
        </span>
      )}
      {collapsed && <Tooltip label={item.label} />}
    </>
  );

  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${baseClasses} ${sizing} ${stateClasses}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${baseClasses} ${sizing} ${stateClasses}`}
    >
      {content}
    </Link>
  );
}

function Tooltip({ label }: { label: string }): ReactNode {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute top-1/2 left-[calc(100%+12px)] z-[9999] hidden -translate-y-1/2 rounded-md bg-[#1D2939] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover/nav:block"
    >
      {label}
    </span>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}
