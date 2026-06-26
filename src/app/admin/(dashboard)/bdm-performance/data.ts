// Seed + helpers for the BDM Performance dashboard.
// The mock is anchored to an implied "now" of early March 2026; we freeze it so the
// date-sensitive surface (overdue, days-in-stage, agenda, alerts) reads as intended.
export const FROZEN = new Date("2026-03-06T09:00:00");
const MS = 86_400_000;
export const dnum = (s: string) => new Date(`${s}T00:00:00`);
export const daysAgo = (s: string) => Math.floor((FROZEN.getTime() - dnum(s).getTime()) / MS);
export const daysUntil = (s: string) => Math.ceil((dnum(s).getTime() - FROZEN.getTime()) / MS);
export const relDays = (d: number) => (d <= 0 ? "Today" : d === 1 ? "1d ago" : `${d}d ago`);
export const fmtMoney = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}K` : `₹${n}`;
export const initials = (name: string) => name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

export type Tier = "Diamond" | "Titanium" | "Platinum" | "Gold" | "Silver";
export type Temp = "Cold" | "Lukewarm" | "Warm" | "Hot" | "Signing Up";
export type Status = "Active" | "Pending" | "Deactivated";
export type Stage = "Lead" | "Contacted" | "Meeting Done" | "Proposal Sent" | "Negotiation" | "Onboarding" | "Converted" | "Lost";
export type ActType = "call" | "meeting" | "email" | "note" | "stage-change";

export const BDMS = ["Aarav Kulkarni", "Priya Mehta", "Raj Sharma"];
export const TEMPS: Temp[] = ["Cold", "Lukewarm", "Warm", "Hot", "Signing Up"];
export const STAGES: Stage[] = ["Lead", "Contacted", "Meeting Done", "Proposal Sent", "Negotiation", "Onboarding", "Converted", "Lost"];

export type Partner = {
  name: string; city: string; tier: Tier; temp: Temp; status: Status;
  students: number; apps: number; deposits: number; revenue: number; bdm: string; lastActDays: number;
  pipe: { leads: number; preapp: number; submitted: number; offer: number; deposit: number } | null;
};

export const PARTNERS: Partner[] = [
  { name: "Global Education Consultants", city: "Mumbai", tier: "Diamond", temp: "Hot", status: "Active", students: 82, apps: 156, deposits: 48, revenue: 4_250_000, bdm: "Aarav Kulkarni", lastActDays: 2, pipe: { leads: 12, preapp: 18, submitted: 24, offer: 14, deposit: 14 } },
  { name: "Pacific Study Abroad", city: "Delhi", tier: "Titanium", temp: "Hot", status: "Active", students: 65, apps: 124, deposits: 38, revenue: 3_180_000, bdm: "Raj Sharma", lastActDays: 2, pipe: { leads: 10, preapp: 14, submitted: 20, offer: 10, deposit: 11 } },
  { name: "EduBridge International", city: "Bangalore", tier: "Platinum", temp: "Hot", status: "Active", students: 54, apps: 98, deposits: 31, revenue: 2_640_000, bdm: "Priya Mehta", lastActDays: 3, pipe: { leads: 8, preapp: 12, submitted: 16, offer: 10, deposit: 8 } },
  { name: "CareerPath Advisors", city: "Pune", tier: "Gold", temp: "Warm", status: "Active", students: 38, apps: 72, deposits: 22, revenue: 1_850_000, bdm: "Aarav Kulkarni", lastActDays: 6, pipe: { leads: 6, preapp: 8, submitted: 12, offer: 6, deposit: 6 } },
  { name: "Vistas Education", city: "Hyderabad", tier: "Gold", temp: "Warm", status: "Active", students: 34, apps: 65, deposits: 19, revenue: 1_620_000, bdm: "Priya Mehta", lastActDays: 4, pipe: { leads: 5, preapp: 7, submitted: 10, offer: 5, deposit: 7 } },
  { name: "Prestige Overseas Education", city: "Nagpur", tier: "Gold", temp: "Cold", status: "Deactivated", students: 28, apps: 52, deposits: 15, revenue: 1_240_000, bdm: "Aarav Kulkarni", lastActDays: 35, pipe: null },
  { name: "StudyLink Hub", city: "Chennai", tier: "Silver", temp: "Warm", status: "Active", students: 18, apps: 42, deposits: 10, revenue: 820_000, bdm: "Aarav Kulkarni", lastActDays: 9, pipe: { leads: 3, preapp: 5, submitted: 6, offer: 2, deposit: 2 } },
  { name: "Horizon Overseas", city: "Ahmedabad", tier: "Silver", temp: "Lukewarm", status: "Active", students: 14, apps: 30, deposits: 7, revenue: 580_000, bdm: "Raj Sharma", lastActDays: 12, pipe: { leads: 2, preapp: 4, submitted: 4, offer: 2, deposit: 2 } },
  { name: "Aspire International", city: "Surat", tier: "Silver", temp: "Cold", status: "Deactivated", students: 11, apps: 24, deposits: 5, revenue: 420_000, bdm: "Priya Mehta", lastActDays: 40, pipe: null },
  { name: "Apex Global Education", city: "Kolkata", tier: "Silver", temp: "Lukewarm", status: "Active", students: 9, apps: 18, deposits: 4, revenue: 340_000, bdm: "Priya Mehta", lastActDays: 15, pipe: { leads: 2, preapp: 3, submitted: 2, offer: 1, deposit: 1 } },
  { name: "Meridian Study Group", city: "Chandigarh", tier: "Silver", temp: "Cold", status: "Deactivated", students: 6, apps: 15, deposits: 3, revenue: 210_000, bdm: "Raj Sharma", lastActDays: 50, pipe: null },
  { name: "Pinnacle Education Services", city: "Jaipur", tier: "Silver", temp: "Cold", status: "Pending", students: 0, apps: 0, deposits: 0, revenue: 0, bdm: "Aarav Kulkarni", lastActDays: 60, pipe: null },
  { name: "NexGen Edu Partners", city: "Lucknow", tier: "Silver", temp: "Cold", status: "Pending", students: 0, apps: 0, deposits: 0, revenue: 0, bdm: "Priya Mehta", lastActDays: 55, pipe: null },
  { name: "EduWorld Consulting", city: "Indore", tier: "Silver", temp: "Lukewarm", status: "Pending", students: 0, apps: 0, deposits: 0, revenue: 0, bdm: "Raj Sharma", lastActDays: 45, pipe: null },
  { name: "Bright Future Academy", city: "Kochi", tier: "Silver", temp: "Cold", status: "Pending", students: 0, apps: 0, deposits: 0, revenue: 0, bdm: "Raj Sharma", lastActDays: 48, pipe: null },
];

export type Prospect = {
  id: string; agency: string; contact: string; city: string; temp: Temp; stage: Stage;
  source: string; bdm: string; nextFollowup: string | null; lastActDays: number; daysInStage: number;
};
export const PROSPECTS: Prospect[] = [
  { id: "PRSP-004", agency: "Nova Overseas Education", contact: "Preeti Kapoor", city: "Chandigarh", temp: "Cold", stage: "Lead", source: "LinkedIn", bdm: "Priya Mehta", nextFollowup: "2026-03-07", lastActDays: 25, daysInStage: 10 },
  { id: "PRSP-003", agency: "Pathfinder Consulting", contact: "Amit Jha", city: "Patna", temp: "Lukewarm", stage: "Contacted", source: "Cold Call", bdm: "Aarav Kulkarni", nextFollowup: "2026-03-08", lastActDays: 20, daysInStage: 18 },
  { id: "PRSP-008", agency: "Unity Overseas Consultants", contact: "Deepak Saxena", city: "Lucknow", temp: "Cold", stage: "Contacted", source: "Event", bdm: "Raj Sharma", nextFollowup: "2026-03-04", lastActDays: 18, daysInStage: 12 },
  { id: "PRSP-002", agency: "Vishwa International", contact: "Rekha Deshpande", city: "Pune", temp: "Warm", stage: "Meeting Done", source: "Event", bdm: "Aarav Kulkarni", nextFollowup: "2026-03-10", lastActDays: 6, daysInStage: 6 },
  { id: "PRSP-005", agency: "Sigma Study Abroad", contact: "Rahul Tiwari", city: "Varanasi", temp: "Warm", stage: "Proposal Sent", source: "Inbound", bdm: "Priya Mehta", nextFollowup: "2026-03-05", lastActDays: 12, daysInStage: 8 },
  { id: "PRSP-001", agency: "Sunrise Education Hub", contact: "Vikash Mehra", city: "Bhopal", temp: "Hot", stage: "Negotiation", source: "Referral", bdm: "Aarav Kulkarni", nextFollowup: "2026-03-06", lastActDays: 4, daysInStage: 5 },
  { id: "PRSP-006", agency: "EduVenture Partners", contact: "Sanjay Reddy", city: "Visakhapatnam", temp: "Signing Up", stage: "Onboarding", source: "Referral", bdm: "Raj Sharma", nextFollowup: "2026-03-07", lastActDays: 3, daysInStage: 4 },
  { id: "PRSP-007", agency: "GreenLeaf Education", contact: "Meena Verma", city: "Raipur", temp: "Cold", stage: "Lost", source: "Cold Call", bdm: "Raj Sharma", nextFollowup: null, lastActDays: 19, daysInStage: 0 },
];

export type Activity = { id: string; type: ActType; related: string; bdm: string; date: string; durationMin: number | null; followup: string | null; summary: string };
export const ACTIVITIES: Activity[] = [
  { id: "ACT-001", type: "meeting", related: "Global Education Consultants", bdm: "Aarav Kulkarni", date: "2026-03-04 09:30", durationMin: 45, followup: "2026-03-11", summary: "Quarterly review meeting. Discussed Q2 targets — partner aiming for 100+ students by June. Agreed to assign dedicated UK counselor." },
  { id: "ACT-007", type: "meeting", related: "Pacific Study Abroad", bdm: "Raj Sharma", date: "2026-03-04 08:00", durationMin: 30, followup: "2026-03-10", summary: "Onboarding sync on new counselor training and intake forecasting for Fall 2026." },
  { id: "ACT-008", type: "call", related: "EduVenture Partners", bdm: "Raj Sharma", date: "2026-03-03 09:00", durationMin: 25, followup: "2026-03-07", summary: "Walked through MOU terms; collecting signed docs this week to complete onboarding." },
  { id: "ACT-004", type: "meeting", related: "EduBridge International", bdm: "Priya Mehta", date: "2026-03-03 10:00", durationMin: 60, followup: "2026-03-10", summary: "Expansion discussion — planning a Mysore branch. Reviewed resource and headcount plan." },
  { id: "ACT-002", type: "call", related: "Sunrise Education Hub", bdm: "Aarav Kulkarni", date: "2026-03-02 10:00", durationMin: 20, followup: "2026-03-06", summary: "Negotiation on commission slab. Revised proposal to be shared before next follow-up." },
  { id: "ACT-005", type: "call", related: "Vistas Education", bdm: "Priya Mehta", date: "2026-03-02 14:00", durationMin: 15, followup: "2026-03-09", summary: "Visa remediation check-in. Partner flagged 3 stuck applications; escalation requested." },
  { id: "ACT-003", type: "email", related: "Vishwa International", bdm: "Aarav Kulkarni", date: "2026-02-28 14:00", durationMin: null, followup: "2026-03-10", summary: "Shared partnership brochure and commission structure deck for internal review." },
  { id: "ACT-010", type: "call", related: "CareerPath Advisors", bdm: "Aarav Kulkarni", date: "2026-02-28 11:00", durationMin: 20, followup: "2026-03-08", summary: "Reviewed conversion funnel; deposit ratio healthy. Discussed a referral incentive." },
  { id: "ACT-006", type: "note", related: "Sigma Study Abroad", bdm: "Priya Mehta", date: "2026-02-22 16:00", durationMin: null, followup: "2026-03-05", summary: "Proposal sent; awaiting decision. Partner comparing two providers — price sensitive." },
  { id: "ACT-009", type: "stage-change", related: "GreenLeaf Education", bdm: "Raj Sharma", date: "2026-02-15 10:00", durationMin: null, followup: null, summary: "Moved to Lost — partner signed with a competitor for this cycle." },
];

export type Task = { id: string; title: string; related: string; bdm: string; priority: "Urgent" | "Normal" | "Low"; category: string; due: string; status: "pending" | "completed"; notes: number; rescheduled?: number };
export const TASKS: Task[] = [
  { id: "TSK-001", title: "Send revised commission proposal to Sunrise Education", related: "Sunrise Education Hub", bdm: "Aarav Kulkarni", priority: "Urgent", category: "Proposal/Doc", due: "2026-03-05", status: "pending", notes: 2 },
  { id: "TSK-002", title: "Follow up with Vishwa International on partnership brochure", related: "Vishwa International", bdm: "Aarav Kulkarni", priority: "Normal", category: "Follow-up", due: "2026-03-10", status: "pending", notes: 1 },
  { id: "TSK-003", title: "Schedule meeting with Pathfinder Consulting", related: "Pathfinder Consulting", bdm: "Aarav Kulkarni", priority: "Normal", category: "Meeting/Call", due: "2026-03-08", status: "pending", notes: 0 },
  { id: "TSK-004", title: "Monthly check-in call with Global Education Consultants", related: "Global Education Consultants", bdm: "Aarav Kulkarni", priority: "Normal", category: "Review", due: "2026-03-10", status: "pending", notes: 0 },
  { id: "TSK-005", title: "Review CareerPath Advisors conversion funnel", related: "CareerPath Advisors", bdm: "Aarav Kulkarni", priority: "Low", category: "Review", due: "2026-03-12", status: "pending", notes: 0 },
  { id: "TSK-006", title: "Contact Nova Overseas Education on LinkedIn", related: "Nova Overseas Education", bdm: "Priya Mehta", priority: "Urgent", category: "Follow-up", due: "2026-03-07", status: "pending", notes: 0 },
  { id: "TSK-007", title: "Check with Sigma Study Abroad on proposal decision", related: "Sigma Study Abroad", bdm: "Priya Mehta", priority: "Urgent", category: "Follow-up", due: "2026-03-05", status: "pending", notes: 2, rescheduled: 2 },
  { id: "TSK-008", title: "Partner follow-up with Vistas Education on visa remediation", related: "Vistas Education", bdm: "Priya Mehta", priority: "Normal", category: "Follow-up", due: "2026-03-09", status: "pending", notes: 0 },
  { id: "TSK-009", title: "EduBridge expansion to Mysore - resource plan", related: "EduBridge International", bdm: "Priya Mehta", priority: "Normal", category: "Proposal/Doc", due: "2026-03-10", status: "pending", notes: 0 },
  { id: "TSK-010", title: "Collect MOU docs from EduVenture Partners", related: "EduVenture Partners", bdm: "Raj Sharma", priority: "Urgent", category: "Onboarding", due: "2026-03-07", status: "pending", notes: 1 },
  { id: "TSK-011", title: "Training session for new counselor at Pacific Study Abroad", related: "Pacific Study Abroad", bdm: "Raj Sharma", priority: "Normal", category: "Meeting/Call", due: "2026-03-10", status: "pending", notes: 0 },
  { id: "TSK-012", title: "Follow up with Bright Future Academy on onboarding", related: "Bright Future Academy", bdm: "Raj Sharma", priority: "Low", category: "Onboarding", due: "2026-03-22", status: "pending", notes: 0 },
  { id: "TSK-013", title: "Quarterly review meeting with Global Education Consultants", related: "Global Education Consultants", bdm: "Aarav Kulkarni", priority: "Normal", category: "Meeting/Call", due: "2026-03-04", status: "completed", notes: 0 },
  { id: "TSK-014", title: "Send partnership brochure to Vishwa International", related: "Vishwa International", bdm: "Aarav Kulkarni", priority: "Normal", category: "Proposal/Doc", due: "2026-02-28", status: "completed", notes: 0 },
  { id: "TSK-015", title: "Morning sync with Pacific Study Abroad", related: "Pacific Study Abroad", bdm: "Raj Sharma", priority: "Normal", category: "Meeting/Call", due: "2026-03-04", status: "completed", notes: 0 },
];

export const TIER_BADGE: Record<Tier, string> = {
  Diamond: "bg-[#EFF8FF] text-[#1570EF]",
  Titanium: "bg-[#F9F5FF] text-[#6941C6]",
  Platinum: "bg-[#FFFAEB] text-[#B54708]",
  Gold: "bg-[#ECFDF3] text-[#027A48]",
  Silver: "bg-[#F2F4F7] text-[#344054]",
};
export const STATUS_BADGE: Record<Status, { wrap: string; dot: string }> = {
  Active: { wrap: "bg-[#ECFDF3] text-[#027A48]", dot: "bg-[#12B76A]" },
  Pending: { wrap: "bg-[#FFF6ED] text-[#B54708]", dot: "bg-[#F79009]" },
  Deactivated: { wrap: "bg-[#FEF3F2] text-[#B42318]", dot: "bg-[#F04438]" },
};
export const TEMP_BADGE: Record<Temp, string> = {
  Cold: "bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]",
  Lukewarm: "bg-[#F0F9FF] text-[#0BA5EC] border border-[#B9E6FE]",
  Warm: "bg-[#FFF6ED] text-[#F79009] border border-[#FED7AA]",
  Hot: "bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]",
  "Signing Up": "bg-[#F9F5FF] text-[#7F56D9] border border-[#E9D7FE]",
};
export const STAGE_BADGE: Record<Stage, string> = {
  Lead: "bg-[#F2F4F7] text-[#667085]",
  Contacted: "bg-[#EFF8FF] text-[#1570EF]",
  "Meeting Done": "bg-[#F9F5FF] text-[#6941C6]",
  "Proposal Sent": "bg-[#FFFAEB] text-[#B54708]",
  Negotiation: "bg-[#FFF6ED] text-[#C4320A]",
  Onboarding: "bg-[#ECFDF3] text-[#027A48]",
  Converted: "bg-[#ECFDF3] text-[#027A48]",
  Lost: "bg-[#FEF3F2] text-[#B42318]",
};
export const PRIORITY_BADGE: Record<string, string> = {
  Urgent: "bg-[#FEF3F2] text-[#B42318]",
  Normal: "bg-[#EFF8FF] text-[#1570EF]",
  Low: "bg-[#F2F4F7] text-[#667085]",
};

export const conversion = (p: Partner) => (p.apps === 0 ? 0 : Math.round((p.deposits / p.apps) * 100));
export const PIPE_SEGMENTS = [
  { key: "leads", label: "Leads", color: "#1570EF" },
  { key: "preapp", label: "Pre-App", color: "#F79009" },
  { key: "submitted", label: "Submitted", color: "#7F56D9" },
  { key: "offer", label: "Offer", color: "#0BA5EC" },
  { key: "deposit", label: "Deposit", color: "#12B76A" },
] as const;
export const ACT_TYPE_LABEL: Record<ActType, string> = { call: "Phone Call", meeting: "Meeting", email: "Email", note: "Note", "stage-change": "Stage Change" };
