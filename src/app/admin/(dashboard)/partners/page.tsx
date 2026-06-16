"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { FormSelect } from "~/components/ui/form-select";
import { Toast } from "~/components/ui/toast";
import { AdminRole } from "~/server/db/enums";
import { api } from "~/trpc/react";

type Tab = "all" | "pending" | "deactivated";

type DocStatus = "pending" | "approved" | "rejected";

type PartnerDocument = {
  id: number;
  type: string;
  url: string;
  fileName: string;
  status: DocStatus;
};

type Partner = {
  applicationId: string;
  email: string;
  role: "agency" | "independent";
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  companyName?: string;
  city?: string;
  status: "under_review" | "approved" | "rejected" | "inactive";
  submittedAt: string;
  updatedAt: string;
  documents: PartnerDocument[];
};

const REJECT_REASONS = [
  { value: "incomplete_docs", label: "Incomplete Documents" },
  { value: "verification_failed", label: "Verification Failed" },
  { value: "duplicate", label: "Duplicate Account" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Partners" },
  { id: "pending", label: "Pending Approvals" },
  { id: "deactivated", label: "Deactivated" },
];

type NamedPerson = {
  role: "agency" | "independent";
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
};

function displayName(p: NamedPerson): string {
  if (p.role === "agency" && p.companyName) return p.companyName;
  return `${p.firstName} ${p.lastName}`.trim() || p.email;
}

function initials(p: Partner): string {
  const name = displayName(p);
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Items the admin can request from a partner. Required signup docs are
// excluded — they're enforced at signup and shouldn't show up here.
const REQUEST_INFO_ITEMS: { label: string; category: string }[] = [
  { label: "GST Certificate", category: "Optional Documents" },
  { label: "Company Logo", category: "Optional Documents" },
  { label: "Company Website URL", category: "Additional Information" },
  { label: "Updated Company Address", category: "Additional Information" },
  { label: "Number of Counselors", category: "Additional Information" },
  { label: "Annual Student Volume", category: "Additional Information" },
];

const REQUEST_INFO_SUBJECT =
  "Additional information required for your Collegepond application";

interface InfoModalState {
  partner: Partner | null;
  selectedItems: string[];
  otherChecked: boolean;
  otherText: string;
  additionalMessage: string;
  showPreview: boolean;
}

const emptyInfoModal: InfoModalState = {
  partner: null,
  selectedItems: [],
  otherChecked: false,
  otherText: "",
  additionalMessage: "",
  showPreview: false,
};

function buildEmailPreview(state: InfoModalState): string {
  const p = state.partner;
  if (!p) return "";
  const name = p.firstName || displayName(p);
  const bullets: string[] = state.selectedItems.map((i) => `• ${i}`);
  if (state.otherChecked && state.otherText.trim()) {
    bullets.push(`• Other: ${state.otherText.trim()}`);
  }
  const items = bullets.length ? bullets.join("\n") : "• (none selected)";
  const note = state.additionalMessage.trim()
    ? `\n\n${state.additionalMessage.trim()}`
    : "";
  return `Hello ${name},

We're reviewing your Collegepond partner application and need a bit more information before we can finalise it. Could you please share:

${items}${note}

Reply to this email or upload the requested information from your account.

Thanks,
Collegepond Admin Team`;
}

export default function PartnersPage() {
  const utils = api.useUtils();
  const partnersQuery = api.partners.list.useQuery();

  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [rejectReasonByEmail, setRejectReasonByEmail] = useState<Record<string, string>>({});
  const [infoModal, setInfoModal] = useState<InfoModalState>(emptyInfoModal);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const [assignModal, setAssignModal] = useState<{
    email: string;
    name: string;
  } | null>(null);

  const setStatus = api.partners.setStatus.useMutation({
    onSuccess: (data, vars) => {
      void utils.partners.list.invalidate();
      const action =
        vars.status === "approved"
          ? "approved"
          : vars.status === "rejected"
            ? "rejected"
            : vars.status === "inactive"
              ? "deactivated"
              : "updated";
      showToast(`${displayName(data)} ${action}`);
      if (vars.status === "approved") {
        setAssignModal({ email: data.email, name: displayName(data) });
      }
    },
    onError: (err) => showToast(err.message),
  });

  const assignCounsellorsMut = api.partners.assignCounsellors.useMutation({
    onSuccess: () => {
      void utils.partners.list.invalidate();
      setAssignModal(null);
      showToast("Counsellors assigned");
    },
    onError: (err) => showToast(err.message),
  });

  const setDocStatus = api.partners.setDocumentStatus.useMutation({
    onSuccess: (_, vars) => {
      void utils.partners.list.invalidate();
      showToast(
        vars.status === "approved"
          ? "Document verified"
          : vars.status === "rejected"
            ? "Document rejected"
            : "Document reset",
      );
    },
    onError: (err) => showToast(err.message),
  });

  const requestMoreInfoMut = api.partners.requestMoreInfo.useMutation({
    onSuccess: () => {
      const partner = infoModal.partner;
      setInfoModal(emptyInfoModal);
      showToast(
        partner ? `Request sent to ${partner.email}` : "Request sent",
      );
    },
    onError: (err) => showToast(err.message),
  });

  const partners = (partnersQuery.data ?? []) as Partner[];

  const counts = useMemo(() => {
    let all = 0,
      pending = 0,
      deactivated = 0;
    for (const p of partners) {
      all++;
      if (p.status === "under_review") pending++;
      else if (p.status === "inactive") deactivated++;
    }
    return { all, pending, deactivated };
  }, [partners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (tab === "pending" && p.status !== "under_review") return false;
      if (tab === "deactivated" && p.status !== "inactive") return false;

      if (q) {
        const haystack = [
          p.firstName,
          p.lastName,
          p.email,
          p.companyName ?? "",
          p.city ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [partners, tab, search]);

  function openInfoModal(p: Partner) {
    setInfoModal({ ...emptyInfoModal, partner: p });
  }

  function closeInfoModal() {
    setInfoModal(emptyInfoModal);
  }

  function toggleItem(label: string) {
    setInfoModal((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(label)
        ? prev.selectedItems.filter((l) => l !== label)
        : [...prev.selectedItems, label],
    }));
  }

  function sendInfoRequest() {
    const partner = infoModal.partner;
    if (!partner) return;
    const otherText =
      infoModal.otherChecked && infoModal.otherText.trim()
        ? infoModal.otherText.trim()
        : undefined;
    const additionalMessage = infoModal.additionalMessage.trim() || undefined;
    if (
      infoModal.selectedItems.length === 0 &&
      !otherText &&
      !additionalMessage
    ) {
      showToast("Pick at least one item or add a message");
      return;
    }
    requestMoreInfoMut.mutate({
      email: partner.email,
      items: infoModal.selectedItems,
      otherText,
      additionalMessage,
    });
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Partner Management</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Review pending sign-ups, approve partners, and manage active accounts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-[#E4E7EC]">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? counts.all
              : t.id === "pending"
                ? counts.pending
                : counts.deactivated;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-[#1570EF] text-[#1570EF]"
                  : "border-transparent text-[#667085] hover:text-[#344054]"
              }`}
            >
              {t.label}
              <span
                className={`rounded-xl px-2 py-0.5 text-xs font-semibold ${
                  active ? "bg-[#EFF8FF] text-[#1570EF]" : "bg-[#F2F4F7] text-[#667085]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex h-[38px] flex-1 max-w-sm items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-3">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-[#98A2B3]">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, email, city…"
            className="w-full border-none bg-transparent text-sm text-[#344054] outline-none"
          />
        </div>
        <span className="ml-auto text-xs font-medium text-[#98A2B3]">
          Showing {filtered.length} of{" "}
          {tab === "all" ? counts.all : tab === "pending" ? counts.pending : counts.deactivated}
        </span>
      </div>

      {/* Tab content */}
      {partnersQuery.isLoading ? (
        <Card>
          <div className="px-5 py-10 text-center text-sm text-[#98A2B3]">Loading…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="px-5 py-10 text-center text-sm text-[#98A2B3]">
            {tab === "pending"
              ? "No pending approvals at this time."
              : tab === "deactivated"
                ? "No deactivated partners."
                : "No partners yet."}
          </div>
        </Card>
      ) : tab === "pending" ? (
        <div className="space-y-4">
          {filtered.map((p) => (
            <PendingCard
              key={p.email}
              partner={p}
              reason={rejectReasonByEmail[p.email] ?? ""}
              onReasonChange={(value) =>
                setRejectReasonByEmail((prev) => ({ ...prev, [p.email]: value }))
              }
              onApprove={() =>
                setStatus.mutate({ email: p.email, status: "approved" })
              }
              onReject={() => {
                if (!rejectReasonByEmail[p.email]) {
                  showToast("Please select a rejection reason");
                  return;
                }
                setStatus.mutate({ email: p.email, status: "rejected" });
              }}
              onRequestMoreInfo={() => openInfoModal(p)}
              onSetDocStatus={(documentId, status) =>
                setDocStatus.mutate({ documentId, status })
              }
              busy={
                setStatus.isPending ||
                setDocStatus.isPending ||
                requestMoreInfoMut.isPending
              }
            />
          ))}
        </div>
      ) : tab === "deactivated" ? (
        <PartnerTable
          partners={filtered}
          actionsHeader="Actions"
          renderActions={(p) => (
            <button
              onClick={() => setStatus.mutate({ email: p.email, status: "approved" })}
              disabled={setStatus.isPending}
              className="cursor-pointer rounded-md bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#067647] hover:bg-[#D1FADF] disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          showDeactivationDate
        />
      ) : (
        <PartnerTable
          partners={filtered}
          actionsHeader="Actions"
          renderActions={(p) =>
            p.status === "approved" ? (
              <button
                onClick={() => setStatus.mutate({ email: p.email, status: "inactive" })}
                disabled={setStatus.isPending}
                className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold text-[#F04438] hover:bg-[#FEF3F2] disabled:opacity-50"
              >
                Deactivate
              </button>
            ) : (
              <span className="text-xs text-[#98A2B3]">—</span>
            )
          }
        />
      )}

      {/* Request More Info modal */}
      {infoModal.partner && (
        <RequestInfoModal
          state={infoModal}
          onClose={closeInfoModal}
          onToggleItem={toggleItem}
          onChangeOther={(checked, text) =>
            setInfoModal((prev) => ({
              ...prev,
              otherChecked: checked,
              otherText: checked ? prev.otherText : "",
              ...(text !== undefined ? { otherText: text } : {}),
            }))
          }
          onChangeAdditionalMessage={(value) =>
            setInfoModal((prev) => ({ ...prev, additionalMessage: value }))
          }
          onTogglePreview={() =>
            setInfoModal((prev) => ({ ...prev, showPreview: !prev.showPreview }))
          }
          onSend={sendInfoRequest}
          sending={requestMoreInfoMut.isPending}
        />
      )}

      {assignModal && (
        <AssignCounsellorsModal
          partnerEmail={assignModal.email}
          partnerName={assignModal.name}
          onSave={(leadCounsellorId, counsellorId) =>
            assignCounsellorsMut.mutate({
              email: assignModal.email,
              leadCounsellorId,
              counsellorId,
            })
          }
          saving={assignCounsellorsMut.isPending}
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </>
  );
}

function AssignCounsellorsModal({
  partnerEmail: _partnerEmail,
  partnerName,
  onSave,
  saving,
}: {
  partnerEmail: string;
  partnerName: string;
  onSave: (leadCounsellorId: number | null, counsellorId: number | null) => void;
  saving: boolean;
}) {
  const leadsQuery = api.users.listByRole.useQuery({ role: AdminRole.COUNSELLOR_LEAD });
  const counsellorsQuery = api.users.listByRole.useQuery({ role: AdminRole.COUNSELLOR });

  const [leadId, setLeadId] = useState<string>("");
  const [counsellorId, setCounsellorId] = useState<string>("");

  const leadOptions = [
    { value: "", label: "— Select counsellor lead —" },
    ...(leadsQuery.data ?? []).map((u) => ({
      value: String(u.id),
      label: `${u.firstName} ${u.lastName}`.trim() || u.email,
    })),
  ];
  const counsellorOptions = [
    { value: "", label: "— Select counsellor (optional) —" },
    ...(counsellorsQuery.data ?? []).map((u) => ({
      value: String(u.id),
      label: `${u.firstName} ${u.lastName}`.trim() || u.email,
    })),
  ];

  const handleSave = () => {
    if (!leadId) return;
    onSave(Number(leadId), counsellorId ? Number(counsellorId) : null);
  };

  // Required step: no close X, no overlay-dismiss, no Skip button. The
  // partner is already approved by this point and must have a lead.
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[rgba(16,24,40,0.55)]">
      <div className="max-h-[90vh] w-[480px] overflow-y-auto rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="border-b border-[#E4E7EC] px-6 py-5">
          <h3 className="text-base font-bold text-[#101828]">Assign Counsellors</h3>
          <p className="mt-0.5 text-sm text-[#667085]">{partnerName}</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <FormSelect
            label="Counsellor Lead"
            required
            options={leadOptions}
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          />
          <FormSelect
            label="Counsellor"
            options={counsellorOptions}
            value={counsellorId}
            onChange={(e) => setCounsellorId(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E4E7EC] px-6 py-4">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!leadId}
            className="!h-[38px] !px-4"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
      {children}
    </div>
  );
}

function RequestInfoModal({
  state,
  onClose,
  onToggleItem,
  onChangeOther,
  onChangeAdditionalMessage,
  onTogglePreview,
  onSend,
  sending,
}: {
  state: InfoModalState;
  onClose: () => void;
  onToggleItem: (label: string) => void;
  onChangeOther: (checked: boolean, text?: string) => void;
  onChangeAdditionalMessage: (value: string) => void;
  onTogglePreview: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const partner = state.partner;
  if (!partner) return null;

  // Group items by category in the order they first appear.
  const grouped: { category: string; items: { label: string }[] }[] = [];
  for (const item of REQUEST_INFO_ITEMS) {
    let bucket = grouped.find((g) => g.category === item.category);
    if (!bucket) {
      bucket = { category: item.category, items: [] };
      grouped.push(bucket);
    }
    bucket.items.push({ label: item.label });
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-[rgba(16,24,40,0.55)] p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-[600px] overflow-y-auto rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-5">
          <h3 className="text-base font-bold text-[#101828]">
            Request More Information
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#E4E7EC] bg-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4 text-sm">
            <div className="font-semibold text-[#344054]">
              {displayName(partner)}
              {partner.applicationId ? ` (${partner.applicationId})` : ""}
            </div>
            <div className="mt-0.5 text-xs text-[#667085]">{partner.email}</div>
          </div>

          <div className="mb-2 text-[13px] font-semibold text-[#344054]">
            Select items to request
          </div>

          {grouped.map((group) => (
            <div key={group.category} className="mb-4">
              <div className="mb-2 border-b border-[#F2F4F7] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                {group.category}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const checked = state.selectedItems.includes(item.label);
                  return (
                    <label
                      key={item.label}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E4E7EC] px-3 py-2 hover:bg-[#F9FAFB]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleItem(item.label)}
                        className="h-4 w-4 cursor-pointer accent-[#1570EF]"
                      />
                      <span className="text-sm text-[#344054]">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mb-4">
            <div className="mb-2 border-b border-[#F2F4F7] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Other
            </div>
            <div className="space-y-2 rounded-lg border border-[#E4E7EC] px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={state.otherChecked}
                  onChange={(e) => onChangeOther(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[#1570EF]"
                />
                <span className="text-sm text-[#344054]">Other (specify below)</span>
              </label>
              {state.otherChecked && (
                <textarea
                  value={state.otherText}
                  onChange={(e) => onChangeOther(true, e.target.value)}
                  rows={3}
                  placeholder="Describe what additional information is needed…"
                  className="w-full resize-y rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 font-[family-name:var(--font-inter)] text-sm leading-relaxed text-[#344054] outline-none focus:border-[#1570EF]"
                />
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-[#344054]">
              Additional message (optional)
            </label>
            <textarea
              value={state.additionalMessage}
              onChange={(e) => onChangeAdditionalMessage(e.target.value)}
              rows={3}
              placeholder="Add a note to the partner…"
              className="w-full resize-y rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 font-[family-name:var(--font-inter)] text-sm leading-relaxed text-[#344054] outline-none focus:border-[#1570EF]"
            />
          </div>

          <button
            onClick={onTogglePreview}
            className="cursor-pointer rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
          >
            {state.showPreview ? "Hide Email Preview" : "Toggle Email Preview"}
          </button>
          {state.showPreview && (
            <div className="mt-3 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-xs text-[#344054]">
              <div className="mb-2 border-b border-[#E4E7EC] pb-2">
                <div>
                  <span className="font-semibold text-[#667085]">Subject:</span>{" "}
                  {REQUEST_INFO_SUBJECT}
                </div>
                <div>
                  <span className="font-semibold text-[#667085]">To:</span>{" "}
                  {partner.email}
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-[family-name:var(--font-inter)] text-xs leading-relaxed">
                {buildEmailPreview(state)}
              </pre>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2 text-xs text-[#B54708]">
            Email delivery isn&apos;t wired up yet — this will log the request
            server-side until the provider lands.
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E4E7EC] px-6 py-4">
          <Button variant="secondary" onClick={onClose} className="!h-[38px] !px-4">
            Cancel
          </Button>
          <Button
            onClick={onSend}
            loading={sending}
            className="!h-[38px] !px-4"
          >
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Partner["status"] }) {
  const map: Record<Partner["status"], { bg: string; fg: string; label: string }> = {
    under_review: { bg: "bg-[#FFFAEB]", fg: "text-[#B54708]", label: "Pending" },
    approved: { bg: "bg-[#ECFDF3]", fg: "text-[#067647]", label: "Active" },
    rejected: { bg: "bg-[#FEF3F2]", fg: "text-[#B42318]", label: "Rejected" },
    inactive: { bg: "bg-[#F2F4F7]", fg: "text-[#667085]", label: "Deactivated" },
  };
  const { bg, fg, label } = map[status];
  return (
    <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-semibold ${bg} ${fg}`}>
      {label}
    </span>
  );
}

function DocStatusBadge({ status }: { status: DocStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2 py-0.5 text-[11px] font-semibold text-[#067647]">
        ✓ Verified
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3F2] px-2 py-0.5 text-[11px] font-semibold text-[#B42318]">
        ✗ Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#FFFAEB] px-2 py-0.5 text-[11px] font-semibold text-[#B54708]">
      Pending
    </span>
  );
}

function Avatar({ partner }: { partner: Partner }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1570EF] to-[#0B4EA2] text-sm font-semibold text-white">
      {initials(partner)}
    </div>
  );
}

function PendingCard({
  partner: p,
  reason,
  onReasonChange,
  onApprove,
  onReject,
  onRequestMoreInfo,
  onSetDocStatus,
  busy,
}: {
  partner: Partner;
  reason: string;
  onReasonChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestMoreInfo: () => void;
  onSetDocStatus: (documentId: number, status: DocStatus) => void;
  busy: boolean;
}) {
  const docs = p.documents;
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar partner={p} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[#101828]">
                {displayName(p)}
              </span>
              <span className="text-xs text-[#98A2B3]">
                Signed up {daysSince(p.submittedAt)} day{daysSince(p.submittedAt) === 1 ? "" : "s"} ago
              </span>
            </div>
            <div className="mt-0.5 text-xs text-[#667085]">
              {p.applicationId || "—"} · {p.role === "agency" ? "Agency" : "Independent"}
              {p.city ? ` · ${p.city}` : ""}
            </div>
          </div>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg bg-[#F9FAFB] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem label="Contact Email" value={p.email} />
        <DetailItem
          label="Phone"
          value={p.phone ? `${p.countryCode} ${p.phone}` : "—"}
        />
        <DetailItem label="Signup Date" value={formatDate(p.submittedAt)} />
        <DetailItem label="Documents" value={`${docs.length} uploaded`} />
      </div>

      {docs.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
            Uploaded Documents
          </div>
          <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#667085]">
                    Document
                  </th>
                  <th className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#667085]">
                    File
                  </th>
                  <th className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#667085]">
                    Status
                  </th>
                  <th className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[#667085]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-[#F2F4F7] last:border-b-0">
                    <td className="px-3 py-2 text-[#344054]">{d.type}</td>
                    <td className="px-3 py-2 text-[#667085]">{d.fileName}</td>
                    <td className="px-3 py-2">
                      <DocStatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer rounded px-2 py-1 text-xs font-semibold text-[#1570EF] hover:bg-[#F0F7FF]"
                      >
                        View
                      </a>
                      {d.status !== "approved" && (
                        <button
                          onClick={() => onSetDocStatus(d.id, "approved")}
                          disabled={busy}
                          className="ml-1 cursor-pointer rounded px-2 py-1 text-xs font-semibold text-[#067647] hover:bg-[#ECFDF3] disabled:opacity-50"
                        >
                          Verify
                        </button>
                      )}
                      {d.status !== "rejected" && (
                        <button
                          onClick={() => onSetDocStatus(d.id, "rejected")}
                          disabled={busy}
                          className="ml-1 cursor-pointer rounded px-2 py-1 text-xs font-semibold text-[#F04438] hover:bg-[#FEF3F2] disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onApprove}
          disabled={busy}
          className="cursor-pointer rounded-lg bg-[#12B76A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d9956] disabled:opacity-50"
        >
          Approve
        </button>
        <select
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="h-[38px] cursor-pointer rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#1570EF]"
        >
          <option value="">Select rejection reason…</option>
          {REJECT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={onReject}
          disabled={busy}
          className="cursor-pointer rounded-lg bg-[#F04438] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d63a2f] disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={onRequestMoreInfo}
          disabled={busy}
          className="cursor-pointer rounded-lg border border-[#1570EF] bg-white px-4 py-2 text-sm font-semibold text-[#1570EF] hover:bg-[#F0F7FF] disabled:opacity-50"
        >
          Request More Info
        </button>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3]">
        {label}
      </div>
      <div className="mt-1 text-sm text-[#344054] break-words">{value}</div>
    </div>
  );
}

function PartnerTable({
  partners,
  renderActions,
  actionsHeader,
  showDeactivationDate,
}: {
  partners: Partner[];
  renderActions: (p: Partner) => ReactNode;
  actionsHeader: string;
  showDeactivationDate?: boolean;
}) {
  const headers = [
    "Partner",
    "Role",
    "Email",
    "City",
    showDeactivationDate ? "Deactivation Date" : "Signup Date",
    "Status",
    actionsHeader,
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#667085]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.email} className="border-b border-[#F2F4F7] last:border-b-0">
                <td className="px-3.5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar partner={p} />
                    <div>
                      <div className="font-semibold text-[#101828]">{displayName(p)}</div>
                      <div className="text-xs text-[#98A2B3]">{p.applicationId || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-3 text-sm text-[#344054]">
                  {p.role === "agency" ? "Agency" : "Independent"}
                </td>
                <td className="px-3.5 py-3 text-sm text-[#344054]">{p.email}</td>
                <td className="px-3.5 py-3 text-sm text-[#344054]">{p.city ?? "—"}</td>
                <td className="px-3.5 py-3 text-sm text-[#344054]">
                  {formatDate(showDeactivationDate ? p.updatedAt : p.submittedAt)}
                </td>
                <td className="px-3.5 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3.5 py-3 text-sm">{renderActions(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
