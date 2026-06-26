"use client";

import { Fragment, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import { Modal } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { FormInput, FormTextarea } from "~/components/ui/form-input";
import { FormSelect } from "~/components/ui/form-select";
import { Toast } from "~/components/ui/toast";
import { DashboardCard, SkeletonTable, EmptyState } from "~/components/dashboard/widgets";
import { formatDate, countryFlag } from "~/components/dashboard/format";
import {
  VendorType,
  CommissionType,
  CommissionTypeLabel,
} from "~/server/db/enums";

type RO = inferRouterOutputs<AppRouter>;
type ContractRow = RO["commissionRates"]["listContracts"][number];
type VendorRow = RO["commissionRates"]["listVendors"][number];
type RateRow = ContractRow["rates"][number];
type BonusRow = ContractRow["bonusTiers"][number];
type TrancheRow = ContractRow["tranches"][number];

type ModalState =
  | { kind: "vendor"; vendor?: VendorRow }
  | { kind: "contract"; presetVendorId: number | null; contract?: ContractRow }
  | { kind: "rate"; contractId: number; universityId: number; rate?: RateRow }
  | { kind: "bonus"; contractId: number; tier?: BonusRow }
  | { kind: "tranche"; contractId: number; nextSeq: number; tranche?: TrancheRow }
  | null;

// ---- small helpers ----------------------------------------------------------
const toDateInput = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const t = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
};
const rateLabel = (r: { commissionType: number; rate: number | null }): string => {
  if (r.rate == null) return "—";
  return r.commissionType === CommissionType.FLAT
    ? `$${r.rate.toLocaleString()}`
    : `${r.rate}%`;
};

function Pill({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "green" | "orange" | "purple";
}) {
  const tones = {
    gray: "bg-[#F2F4F7] text-[#667085]",
    blue: "bg-[#EFF8FF] text-[#1570EF]",
    green: "bg-[#ECFDF3] text-[#067647]",
    orange: "bg-[#FFF6ED] text-[#B54708]",
    purple: "bg-[#F9F5FF] text-[#7F56D9]",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-[#667085] transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-sm text-[#344054]";
const TEXT_BTN = "text-[13px] font-semibold text-[#1570EF] hover:underline";
const DEL_BTN = "text-[13px] font-semibold text-[#B42318] hover:underline";

// =============================================================================
export default function CommissionRatesPage() {
  const [tab, setTab] = useState<"entry" | "summary">("entry");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (m: string) => {
    setToastMsg(m);
    setToastOpen(true);
  };

  const utils = api.useUtils();
  const vendorsQ = api.commissionRates.listVendors.useQuery();
  const contractsQ = api.commissionRates.listContracts.useQuery();

  const setDefault = api.commissionRates.setDefault.useMutation({
    onSuccess: () => {
      void utils.commissionRates.invalidate();
      showToast("Default updated");
    },
    onError: (e) => showToast(e.message),
  });
  const removeContract = api.commissionRates.removeContract.useMutation({
    onSuccess: () => {
      void utils.commissionRates.invalidate();
      showToast("Contract removed");
    },
    onError: (e) => showToast(e.message),
  });
  const removeRate = api.commissionRates.removeRate.useMutation({
    onSuccess: () => void utils.commissionRates.invalidate(),
    onError: (e) => showToast(e.message),
  });
  const removeBonus = api.commissionRates.removeBonusTier.useMutation({
    onSuccess: () => void utils.commissionRates.invalidate(),
    onError: (e) => showToast(e.message),
  });
  const removeTranche = api.commissionRates.removeTranche.useMutation({
    onSuccess: () => void utils.commissionRates.invalidate(),
    onError: (e) => showToast(e.message),
  });

  const contracts = useMemo(() => contractsQ.data ?? [], [contractsQ.data]);
  const vendors = useMemo(() => vendorsQ.data ?? [], [vendorsQ.data]);
  const directContracts = useMemo(
    () => contracts.filter((c) => c.vendorId === null),
    [contracts],
  );
  const byVendor = useMemo(() => {
    const m = new Map<number, ContractRow[]>();
    for (const c of contracts) {
      if (c.vendorId === null) continue;
      const list = m.get(c.vendorId) ?? [];
      list.push(c);
      m.set(c.vendorId, list);
    }
    return m;
  }, [contracts]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const loading = contractsQ.isLoading || vendorsQ.isLoading;

  // ---- nested sub-tables for an expanded contract --------------------------
  const RatesSubTable = ({ c }: { c: ContractRow }) => (
    <div className="rounded-lg border border-[#E4E7EC]">
      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="text-xs font-semibold text-[#475467]">Program-Specific Rates</span>
        <button
          className={TEXT_BTN}
          onClick={() =>
            setModal({ kind: "rate", contractId: c.id, universityId: c.universityId })
          }
        >
          + Add Program
        </button>
      </div>
      {c.rates.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-[#98A2B3]">
          No program rates — the university-wide rate applies.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Program</th>
              <th className={TH}>Type</th>
              <th className={TH}>Rate</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {c.rates.map((r) => (
              <tr key={r.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={TD}>{r.courseName ?? "All programs (university-wide)"}</td>
                <td className={TD}>{CommissionTypeLabel[r.commissionType as 0 | 1]}</td>
                <td className={TD}>{rateLabel(r)}</td>
                <td className={`${TD} text-right`}>
                  <button
                    className={`${TEXT_BTN} mr-3`}
                    onClick={() =>
                      setModal({ kind: "rate", contractId: c.id, universityId: c.universityId, rate: r })
                    }
                  >
                    Edit
                  </button>
                  <button className={DEL_BTN} onClick={() => removeRate.mutate({ id: r.id })}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const BonusSubTable = ({ c }: { c: ContractRow }) => (
    <div className="rounded-lg border border-[#E4E7EC]">
      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="text-xs font-semibold text-[#475467]">Volume Bonus Tiers</span>
        <button className={TEXT_BTN} onClick={() => setModal({ kind: "bonus", contractId: c.id })}>
          + Add Tier
        </button>
      </div>
      {c.bonusTiers.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-[#98A2B3]">No bonus tiers.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Student Range</th>
              <th className={TH}>Amount / Student</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {c.bonusTiers.map((b) => (
              <tr key={b.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={TD}>
                  {b.minStudents}
                  {b.maxStudents ? `–${b.maxStudents}` : "+"}
                </td>
                <td className={TD}>${(b.amountPerStudent ?? 0).toLocaleString()}</td>
                <td className={`${TD} text-right`}>
                  <button
                    className={`${TEXT_BTN} mr-3`}
                    onClick={() => setModal({ kind: "bonus", contractId: c.id, tier: b })}
                  >
                    Edit
                  </button>
                  <button className={DEL_BTN} onClick={() => removeBonus.mutate({ id: b.id })}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const TrancheSubTable = ({ c }: { c: ContractRow }) => (
    <div className="rounded-lg border border-[#E4E7EC]">
      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="text-xs font-semibold text-[#475467]">Tranche Payments</span>
        <button
          className={`${TEXT_BTN} ${c.tranches.length >= 4 ? "pointer-events-none opacity-40" : ""}`}
          onClick={() =>
            setModal({ kind: "tranche", contractId: c.id, nextSeq: c.tranches.length + 1 })
          }
        >
          + Add Tranche
        </button>
      </div>
      {c.tranches.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-[#98A2B3]">Single payment (no tranches).</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Tranche</th>
              <th className={TH}>Amount</th>
              <th className={TH}>%</th>
              <th className={TH}>Timing</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {c.tranches.map((t) => (
              <tr key={t.id} className="border-b border-[#F2F4F7] last:border-0">
                <td className={TD}>{t.name}</td>
                <td className={TD}>{t.amount == null ? "—" : `$${t.amount.toLocaleString()}`}</td>
                <td className={TD}>{t.pct == null ? "—" : `${t.pct}%`}</td>
                <td className={TD}>{t.timing ?? "—"}</td>
                <td className={`${TD} text-right`}>
                  <button
                    className={`${TEXT_BTN} mr-3`}
                    onClick={() =>
                      setModal({ kind: "tranche", contractId: c.id, nextSeq: t.seq, tranche: t })
                    }
                  >
                    Edit
                  </button>
                  <button className={DEL_BTN} onClick={() => removeTranche.mutate({ id: t.id })}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // ---- one contract row (+ its expanded detail) ----------------------------
  const ContractRowEl = ({
    c,
    isVendor,
    cols,
  }: {
    c: ContractRow;
    isVendor: boolean;
    cols: number;
  }) => {
    const open = expanded.has(c.id);
    const headline = c.rates.find((r) => r.courseId === null) ?? c.rates[0] ?? null;
    return (
      <>
        <tr className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
          <td className={`${TD} w-8`}>
            <button onClick={() => toggle(c.id)} aria-label="Expand">
              <Chevron open={open} />
            </button>
          </td>
          <td className={`${TD} font-medium text-[#101828]`}>{c.universityName}</td>
          <td className={TD}>
            {countryFlag(c.country)} {c.country}
          </td>
          <td className={TD}>{headline ? rateLabel(headline) : <span className="text-[#98A2B3]">—</span>}</td>
          {isVendor && (
            <td className={TD}>{c.cpSharePct == null ? "—" : `${c.cpSharePct}%`}</td>
          )}
          {!isVendor && (
            <td className={TD}>
              {c.bonusTiers.length > 0 ? <Pill tone="purple">🎁 Bonus</Pill> : <span className="text-[#98A2B3]">—</span>}
            </td>
          )}
          {!isVendor && (
            <td className={TD}>
              {c.tranches.length > 0 ? <Pill tone="blue">💳 {c.tranches.length}</Pill> : <span className="text-[#98A2B3]">—</span>}
            </td>
          )}
          <td className={TD}>{c.effectiveDate ? formatDate(c.effectiveDate) : "—"}</td>
          <td className={TD}>
            <button
              onClick={() => setDefault.mutate({ universityId: c.universityId, contractId: c.id })}
              title="Set as default for this university"
              className={`text-lg leading-none ${c.isDefault ? "text-[#F79009]" : "text-[#D0D5DD] hover:text-[#F79009]"}`}
            >
              {c.isDefault ? "★" : "☆"}
            </button>
          </td>
          <td className={`${TD} text-right whitespace-nowrap`}>
            <button
              className={`${TEXT_BTN} mr-3`}
              onClick={() => setModal({ kind: "contract", presetVendorId: c.vendorId, contract: c })}
            >
              Edit
            </button>
            <button
              className={DEL_BTN}
              onClick={() => {
                if (confirm(`Remove the ${c.universityName} contract and its rates?`))
                  removeContract.mutate({ id: c.id });
              }}
            >
              Delete
            </button>
          </td>
        </tr>
        {open && (
          <tr className="bg-[#F9FAFB]">
            <td colSpan={cols} className="px-4 py-3">
              <div className="space-y-3">
                <RatesSubTable c={c} />
                {!isVendor && <BonusSubTable c={c} />}
                {!isVendor && <TrancheSubTable c={c} />}
                {c.notes && (
                  <p className="text-xs text-[#667085]">
                    <span className="font-semibold">Notes:</span> {c.notes}
                  </p>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Commission Rates</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Manage commission structures for direct university contracts and third-party vendors.
          </p>
        </div>
        {tab === "entry" && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModal({ kind: "vendor" })}>
              Add Vendor
            </Button>
            <Button onClick={() => setModal({ kind: "contract", presetVendorId: null })}>
              Add Direct Contract
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-[#E4E7EC]">
        {([
          { id: "entry", label: "Commission Entry" },
          { id: "summary", label: "Commission Summary" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "border-[#1570EF] text-[#1570EF]"
                : "border-transparent text-[#667085] hover:text-[#344054]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "entry" ? (
        loading ? (
          <DashboardCard title="Direct University Contracts" bodyClassName="p-0">
            <SkeletonTable rows={5} cols={7} />
          </DashboardCard>
        ) : (
          <div className="space-y-6">
            {/* Direct contracts */}
            <DashboardCard
              title={`Direct University Contracts (${directContracts.length})`}
              bodyClassName="p-0"
            >
              {directContracts.length === 0 ? (
                <EmptyState label="No direct contracts yet. Add one to set university commission rates." />
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TH} w-8`}></th>
                      <th className={TH}>University</th>
                      <th className={TH}>Country</th>
                      <th className={TH}>Rate</th>
                      <th className={TH}>Bonus</th>
                      <th className={TH}>Tranches</th>
                      <th className={TH}>Effective</th>
                      <th className={TH}>Default</th>
                      <th className={`${TH} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directContracts.map((c) => (
                      <ContractRowEl key={c.id} c={c} isVendor={false} cols={9} />
                    ))}
                  </tbody>
                </table>
              )}
            </DashboardCard>

            {/* Third-party vendors */}
            <div>
              <h2 className="mb-3 text-base font-bold text-[#101828]">Third-Party Vendors</h2>
              {vendors.length === 0 ? (
                <EmptyState label="No vendors yet. Add a vendor (e.g. KC, IDP) to record their commission structures." />
              ) : (
                <div className="space-y-4">
                  {vendors.map((v) => {
                    const list = byVendor.get(v.id) ?? [];
                    return (
                      <DashboardCard
                        key={v.id}
                        title={v.name}
                        bodyClassName="p-0"
                        headerRight={
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#98A2B3]">
                              {list.length} {list.length === 1 ? "university" : "universities"}
                            </span>
                            <button
                              className={TEXT_BTN}
                              onClick={() => setModal({ kind: "contract", presetVendorId: v.id })}
                            >
                              + Add University
                            </button>
                            <button className={TEXT_BTN} onClick={() => setModal({ kind: "vendor", vendor: v })}>
                              Edit
                            </button>
                          </div>
                        }
                      >
                        {list.length === 0 ? (
                          <p className="px-5 py-5 text-sm text-[#98A2B3]">
                            No universities for {v.name} yet.
                          </p>
                        ) : (
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className={`${TH} w-8`}></th>
                                <th className={TH}>University</th>
                                <th className={TH}>Country</th>
                                <th className={TH}>Rate</th>
                                <th className={TH}>CP Share %</th>
                                <th className={TH}>Effective</th>
                                <th className={TH}>Default</th>
                                <th className={`${TH} text-right`}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((c) => (
                                <ContractRowEl key={c.id} c={c} isVendor cols={8} />
                              ))}
                            </tbody>
                          </table>
                        )}
                      </DashboardCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <SummaryTab onToast={showToast} />
      )}

      {/* Modals */}
      {modal?.kind === "vendor" && (
        <VendorModal vendor={modal.vendor} onClose={() => setModal(null)} onToast={showToast} />
      )}
      {modal?.kind === "contract" && (
        <ContractModal
          presetVendorId={modal.presetVendorId}
          contract={modal.contract}
          vendors={vendors}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}
      {modal?.kind === "rate" && (
        <RateModal
          contractId={modal.contractId}
          universityId={modal.universityId}
          rate={modal.rate}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}
      {modal?.kind === "bonus" && (
        <BonusModal
          contractId={modal.contractId}
          tier={modal.tier}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}
      {modal?.kind === "tranche" && (
        <TrancheModal
          contractId={modal.contractId}
          nextSeq={modal.nextSeq}
          tranche={modal.tranche}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

// =============================================================================
// Summary tab
// =============================================================================
function SummaryTab({ onToast }: { onToast: (m: string) => void }) {
  const [uniId, setUniId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const utils = api.useUtils();
  const unisQ = api.commissionRates.universitiesForPicker.useQuery();
  const summaryQ = api.commissionRates.summary.useQuery(
    uniId ? { universityId: uniId } : undefined,
  );
  const setDefault = api.commissionRates.setDefault.useMutation({
    onSuccess: () => {
      void utils.commissionRates.invalidate();
      onToast("Default updated");
    },
    onError: (e) => onToast(e.message),
  });

  const rows = summaryQ.data ?? [];
  const toggle = (id: number) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <FormSelect
          label="Search by University"
          placeholder="All universities"
          options={(unisQ.data ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
          value={uniId ? String(uniId) : ""}
          onChange={(e) => setUniId(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <DashboardCard title="Commission Structure by University" bodyClassName="p-0">
        {summaryQ.isLoading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState label="No commission sources configured yet." />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${TH} w-8`}></th>
                <th className={TH}>University</th>
                <th className={TH}>Country</th>
                <th className={TH}>Sources</th>
                <th className={TH}>Default Vendor</th>
                <th className={TH}>Default Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const open = expanded.has(u.universityId);
                const def = u.sources.find((s) => s.isDefault) ?? null;
                return (
                  <Fragment key={u.universityId}>
                    <tr className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                      <td className={`${TD} w-8`}>
                        <button onClick={() => toggle(u.universityId)} aria-label="Expand">
                          <Chevron open={open} />
                        </button>
                      </td>
                      <td className={`${TD} font-medium text-[#101828]`}>{u.universityName}</td>
                      <td className={TD}>
                        {countryFlag(u.country)} {u.country}
                      </td>
                      <td className={TD}>{u.sources.length}</td>
                      <td className={TD}>
                        {def ? <Pill tone="orange">★ {def.vendorName}</Pill> : <span className="text-[#98A2B3]">None set</span>}
                      </td>
                      <td className={TD}>
                        {def?.defaultRate == null
                          ? "—"
                          : def.commissionType === CommissionType.FLAT
                            ? `$${def.defaultRate.toLocaleString()}`
                            : `${def.defaultRate}%`}
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="rounded-lg border border-[#E4E7EC]">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className={TH}>Default</th>
                                  <th className={TH}>Vendor</th>
                                  <th className={TH}>Rate</th>
                                  <th className={TH}>CP Share %</th>
                                  <th className={TH}>Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {u.sources.map((s) => (
                                  <tr key={s.contractId} className="border-b border-[#F2F4F7] last:border-0">
                                    <td className={TD}>
                                      <button
                                        onClick={() =>
                                          setDefault.mutate({
                                            universityId: u.universityId,
                                            contractId: s.contractId,
                                          })
                                        }
                                        className={`text-lg leading-none ${s.isDefault ? "text-[#F79009]" : "text-[#D0D5DD] hover:text-[#F79009]"}`}
                                      >
                                        {s.isDefault ? "★" : "☆"}
                                      </button>
                                    </td>
                                    <td className={`${TD} font-medium text-[#101828]`}>{s.vendorName}</td>
                                    <td className={TD}>
                                      {s.defaultRate == null
                                        ? "—"
                                        : s.commissionType === CommissionType.FLAT
                                          ? `$${s.defaultRate.toLocaleString()}`
                                          : `${s.defaultRate}%`}
                                    </td>
                                    <td className={TD}>{s.cpSharePct == null ? "—" : `${s.cpSharePct}%`}</td>
                                    <td className={TD}>{s.notes ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
}

// =============================================================================
// Modals
// =============================================================================
function ModalFooter({
  onClose,
  onSave,
  saving,
  saveLabel = "Save",
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSave} loading={saving}>
        {saveLabel}
      </Button>
    </>
  );
}

function VendorModal({
  vendor,
  onClose,
  onToast,
}: {
  vendor?: VendorRow;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const [name, setName] = useState(vendor?.name ?? "");
  const [contactName, setContactName] = useState(vendor?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(vendor?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(vendor?.contactPhone ?? "");
  const [address, setAddress] = useState(vendor?.address ?? "");
  const [err, setErr] = useState("");

  const done = () => {
    void utils.commissionRates.invalidate();
    onToast(vendor ? "Vendor updated" : "Vendor added");
    onClose();
  };
  const create = api.commissionRates.createVendor.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });
  const update = api.commissionRates.updateVendor.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });
  const saving = create.isPending || update.isPending;

  const save = () => {
    if (!name.trim()) return setErr("Vendor name is required");
    const payload = {
      name: name.trim(),
      type: VendorType.THIRD_PARTY,
      contactName: contactName || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      address: address || undefined,
    };
    if (vendor) update.mutate({ id: vendor.id, ...payload });
    else create.mutate(payload);
  };

  return (
    <Modal
      open
      title={vendor ? "Edit Vendor" : "Add Vendor"}
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} onSave={save} saving={saving} />}
    >
      <FormInput label="Vendor Name" required value={name} onChange={(e) => setName(e.target.value)} error={!!err} errorMessage={err} placeholder="e.g. KC Overseas, IDP" />
      <p className="text-xs font-semibold tracking-wide text-[#98A2B3] uppercase">Contact details</p>
      <FormInput label="Contact Person" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      <div className="flex gap-3">
        <FormInput label="Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        <FormInput label="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      </div>
      <FormTextarea label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
    </Modal>
  );
}

function ContractModal({
  presetVendorId,
  contract,
  vendors,
  onClose,
  onToast,
}: {
  presetVendorId: number | null;
  contract?: ContractRow;
  vendors: VendorRow[];
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const editing = !!contract;
  const unisQ = api.commissionRates.universitiesForPicker.useQuery(undefined, { enabled: !editing });

  const [universityId, setUniversityId] = useState<string>(
    contract ? String(contract.universityId) : "",
  );
  const [vendorId, setVendorId] = useState<string>(
    contract
      ? contract.vendorId == null
        ? ""
        : String(contract.vendorId)
      : presetVendorId == null
        ? ""
        : String(presetVendorId),
  );
  const [cpShare, setCpShare] = useState<string>(
    contract?.cpSharePct != null ? String(contract.cpSharePct) : "",
  );
  const [effectiveDate, setEffectiveDate] = useState(toDateInput(contract?.effectiveDate));
  const [notes, setNotes] = useState(contract?.notes ?? "");
  const [isDefault, setIsDefault] = useState(contract?.isDefault ?? false);
  const [err, setErr] = useState("");

  const done = () => {
    void utils.commissionRates.invalidate();
    onToast(editing ? "Contract updated" : "Contract added");
    onClose();
  };
  const create = api.commissionRates.createContract.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });
  const update = api.commissionRates.updateContract.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });
  const saving = create.isPending || update.isPending;

  const isVendor = vendorId !== "";

  const save = () => {
    const cp = cpShare.trim() === "" ? null : Number(cpShare);
    if (cp != null && (Number.isNaN(cp) || cp < 0 || cp > 100)) return setErr("CP share must be 0–100");
    if (editing && contract) {
      update.mutate({
        id: contract.id,
        cpSharePct: cp,
        effectiveDate: effectiveDate || null,
        notes,
      });
      return;
    }
    if (!universityId) return setErr("Pick a university");
    create.mutate({
      universityId: Number(universityId),
      vendorId: vendorId === "" ? null : Number(vendorId),
      cpSharePct: cp,
      effectiveDate: effectiveDate || undefined,
      notes: notes || undefined,
      isDefault,
    });
  };

  const vendorOptions = [
    { value: "", label: "Direct (university contract)" },
    ...vendors.map((v) => ({ value: String(v.id), label: v.name })),
  ];

  return (
    <Modal
      open
      title={editing ? "Edit Commission Source" : "Add Commission Source"}
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} onSave={save} saving={saving} />}
    >
      {editing && contract ? (
        <div className="rounded-lg bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#344054]">
          <span className="font-semibold text-[#101828]">{contract.universityName}</span>
          {" · "}
          {contract.vendorName ?? "Direct"}
        </div>
      ) : (
        <>
          <FormSelect
            label="University"
            required
            placeholder="Select a university"
            options={(unisQ.data ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
          />
          <FormSelect
            label="Vendor"
            options={vendorOptions}
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          />
        </>
      )}
      {isVendor && (
        <FormInput
          label="CP Share (%)"
          type="number"
          step="0.1"
          value={cpShare}
          onChange={(e) => setCpShare(e.target.value)}
          placeholder="e.g. 80"
        />
      )}
      <FormInput
        label="Effective Date"
        type="date"
        value={effectiveDate}
        onChange={(e) => setEffectiveDate(e.target.value)}
      />
      {!editing && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Set as the default source for this university
        </label>
      )}
      <FormTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p className="text-xs font-medium text-[#F04438]">{err}</p>}
    </Modal>
  );
}

function RateModal({
  contractId,
  universityId,
  rate,
  onClose,
  onToast,
}: {
  contractId: number;
  universityId: number;
  rate?: RateRow;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const coursesQ = api.commissionRates.coursesForUniversity.useQuery({ universityId });
  const [courseId, setCourseId] = useState<string>(rate?.courseId != null ? String(rate.courseId) : "");
  const [commissionType, setCommissionType] = useState<string>(String(rate?.commissionType ?? CommissionType.PERCENTAGE));
  const [rateVal, setRateVal] = useState<string>(rate?.rate != null ? String(rate.rate) : "");
  const [err, setErr] = useState("");

  const done = () => {
    void utils.commissionRates.invalidate();
    onToast(rate ? "Rate updated" : "Rate added");
    onClose();
  };
  const upsert = api.commissionRates.upsertRate.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });

  const save = () => {
    const r = Number(rateVal);
    if (rateVal.trim() === "" || Number.isNaN(r) || r < 0) return setErr("Enter a valid rate");
    upsert.mutate({
      id: rate?.id,
      contractId,
      courseId: courseId === "" ? null : Number(courseId),
      commissionType: Number(commissionType),
      rate: r,
    });
  };

  const isFlat = Number(commissionType) === CommissionType.FLAT;

  return (
    <Modal
      open
      title={rate ? "Edit Program Rate" : "Add Program Rate"}
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} onSave={save} saving={upsert.isPending} />}
    >
      <FormSelect
        label="Program"
        placeholder="All programs (university-wide)"
        options={(coursesQ.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      />
      <FormSelect
        label="Commission Type"
        options={[
          { value: String(CommissionType.PERCENTAGE), label: "Percentage (%)" },
          { value: String(CommissionType.FLAT), label: "Flat Amount ($)" },
        ]}
        value={commissionType}
        onChange={(e) => setCommissionType(e.target.value)}
      />
      <FormInput
        label={isFlat ? "Commission Amount ($)" : "Commission Rate (%)"}
        required
        type="number"
        step="0.1"
        value={rateVal}
        onChange={(e) => setRateVal(e.target.value)}
        error={!!err}
        errorMessage={err}
      />
    </Modal>
  );
}

function BonusModal({
  contractId,
  tier,
  onClose,
  onToast,
}: {
  contractId: number;
  tier?: BonusRow;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const [minS, setMinS] = useState(tier ? String(tier.minStudents) : "");
  const [maxS, setMaxS] = useState(tier?.maxStudents != null ? String(tier.maxStudents) : "");
  const [amt, setAmt] = useState(tier?.amountPerStudent != null ? String(tier.amountPerStudent) : "");
  const [err, setErr] = useState("");

  const done = () => {
    void utils.commissionRates.invalidate();
    onToast(tier ? "Bonus tier updated" : "Bonus tier added");
    onClose();
  };
  const upsert = api.commissionRates.upsertBonusTier.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });

  const save = () => {
    const min = Number(minS);
    const a = Number(amt);
    if (!minS || Number.isNaN(min) || min < 1) return setErr("Min students must be ≥ 1");
    if (amt.trim() === "" || Number.isNaN(a) || a < 0) return setErr("Enter a valid amount");
    upsert.mutate({
      id: tier?.id,
      contractId,
      minStudents: min,
      maxStudents: maxS.trim() === "" ? null : Number(maxS),
      amountPerStudent: a,
    });
  };

  return (
    <Modal
      open
      title={tier ? "Edit Bonus Tier" : "Add Bonus Tier"}
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} onSave={save} saving={upsert.isPending} />}
    >
      <div className="flex gap-3">
        <FormInput label="Min Students" required type="number" value={minS} onChange={(e) => setMinS(e.target.value)} />
        <FormInput label="Max Students" type="number" value={maxS} onChange={(e) => setMaxS(e.target.value)} placeholder="(no cap)" />
      </div>
      <FormInput
        label="Amount Per Student ($)"
        required
        type="number"
        step="1"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        error={!!err}
        errorMessage={err}
      />
    </Modal>
  );
}

function TrancheModal({
  contractId,
  nextSeq,
  tranche,
  onClose,
  onToast,
}: {
  contractId: number;
  nextSeq: number;
  tranche?: TrancheRow;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const seq = tranche?.seq ?? nextSeq;
  const [name, setName] = useState(tranche?.name ?? `Tranche ${seq}`);
  const [amount, setAmount] = useState(tranche?.amount != null ? String(tranche.amount) : "");
  const [pct, setPct] = useState(tranche?.pct != null ? String(tranche.pct) : "");
  const [timing, setTiming] = useState(tranche?.timing ?? "");
  const [err, setErr] = useState("");

  const done = () => {
    void utils.commissionRates.invalidate();
    onToast(tranche ? "Tranche updated" : "Tranche added");
    onClose();
  };
  const upsert = api.commissionRates.upsertTranche.useMutation({ onSuccess: done, onError: (e) => setErr(e.message) });

  const save = () => {
    if (!name.trim()) return setErr("Tranche name is required");
    upsert.mutate({
      id: tranche?.id,
      contractId,
      seq,
      name: name.trim(),
      amount: amount.trim() === "" ? null : Number(amount),
      pct: pct.trim() === "" ? null : Number(pct),
      timing: timing || undefined,
    });
  };

  return (
    <Modal
      open
      title={`${tranche ? "Edit" : "Add"} Tranche Payment (${seq} of 4 max)`}
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} onSave={save} saving={upsert.isPending} />}
    >
      <FormInput label="Tranche Name" required value={name} onChange={(e) => setName(e.target.value)} error={!!err} errorMessage={err} />
      <div className="flex gap-3">
        <FormInput label="Amount ($)" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <FormInput label="% of Total" type="number" step="0.1" value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <FormInput
        label="Timing / Trigger"
        value={timing}
        onChange={(e) => setTiming(e.target.value)}
        placeholder="e.g. On enrollment, After semester 1, On completion"
      />
    </Modal>
  );
}
