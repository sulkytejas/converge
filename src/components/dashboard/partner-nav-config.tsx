import {
  CalendarIcon,
  CommissionIcon,
  DashboardIcon,
  ResourcesIcon,
  SearchIcon,
  StudentsIcon,
  UsersIcon,
} from "./nav-icons";
import { type NavSection } from "./nav-config";

export const PARTNER_NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/partner/dashboard", icon: <DashboardIcon /> },
      {
        label: "Students",
        href: "/partner/students",
        icon: <StudentsIcon />,
        badgeKey: "students",
      },
      { label: "Uni Assist", href: "/partner/uni-assist", icon: <SearchIcon /> },
      { label: "Counsellors", href: "/partner/counsellors", icon: <UsersIcon /> },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Commission",
        href: "/partner/commission",
        icon: <CommissionIcon />,
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        label: "Resources",
        href: "/partner/resources",
        icon: <ResourcesIcon />,
      },
      {
        label: "Upcoming Events",
        href: "/partner/events",
        icon: <CalendarIcon />,
      },
    ],
  },
];
