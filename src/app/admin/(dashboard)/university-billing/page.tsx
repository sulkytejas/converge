"use client";

import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import { Modal } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { FormInput, FormTextarea } from "~/components/ui/form-input";
import { FormSelect } from "~/components/ui/form-select";
import { Toast } from "~/components/ui/toast";
import {
  DashboardCard,
  StatCard,
  SkeletonTable,
  EmptyState,
} from "~/components/dashboard/widgets";
import { formatINR, formatDate } from "~/components/dashboard/format";
import {
  VendorInvoiceStatus,
  VendorInvoiceStatusLabel,
  VarianceReason,
  VarianceReasonLabel,
  VARIANCE_REASON_CODES,
  financialYearLabel,
} from "~/server/db/enums";

type RO = inferRouterOutputs<AppRouter>;
type BillingStudent = RO["universityBilling"]["vendorBillingStudents"][number];
type Invoice = RO["universityBilling"]["listVendorInvoices"][number];

const BILLING_CURRENCIES = ["USD", "GBP", "AUD", "CAD", "EUR", "INR", "NZD", "SGD"];

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-sm text-[#344054]";
const money = (n: number, ccy?: string) =>
  `${ccy ? ccy + " " : ""}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayInput = () => new Date().toISOString().slice(0, 10);
const plusDaysInput = (d: number) =>
  new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

function InvoiceStatusPill({ status }: { status: number }) {
  const tone =
    status === VendorInvoiceStatus.FULLY_PAID
      ? "bg-[#ECFDF3] text-[#067647]"
      : status === VendorInvoiceStatus.PARTIAL_PAYMENT
        ? "bg-[#FFF6ED] text-[#B54708]"
        : status === VendorInvoiceStatus.SENT
          ? "bg-[#EFF8FF] text-[#1570EF]"
          : "bg-[#F2F4F7] text-[#667085]";
  return (
    <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {VendorInvoiceStatusLabel[status as 0 | 1 | 2 | 3]}
    </span>
  );
}

type ModalState =
  | { kind: "createInvoice"; vendorId: number | null; vendorName: string; students: BillingStudent[] }
  | { kind: "recordPayment"; invoice: Invoice }
  | null;

// =============================================================================
export default function UniversityBillingPage() {
  const [tab, setTab] = useState<"confirmed" | "billing" | "ageing">("confirmed");
  const [fy, setFy] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (m: string) => {
    setToastMsg(m);
    setToastOpen(true);
  };

  const statsQ = api.universityBilling.stats.useQuery(fy ? { fy } : undefined);
  const fysQ = api.universityBilling.financialYears.useQuery();
  const s = statsQ.data;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#101828]">University Billing</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Confirm attended students, bill the vendor, and record payments received.
        </p>
      </div>

      {/* Stat cards + FY filter */}
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="applications" tone="blue" label="Invoices Sent" value={s?.invoicesSent ?? "—"} />
          <StatCard icon="revenue" tone="green" label="Received (₹)" value={s ? formatINR(s.receivedInr) : "—"} />
          <StatCard icon="clock" tone="orange" label="Outstanding Invoices" value={s?.outstanding ?? "—"} />
          <StatCard icon="trophy" tone="purple" label="Collection Rate" value={s ? `${s.collectionRate}%` : "—"} />
        </div>
        <div className="w-44">
          <FormSelect
            label="Financial Year"
            placeholder="All years"
            options={(fysQ.data ?? []).map((y) => ({ value: String(y), label: financialYearLabel(y) }))}
            value={fy ? String(fy) : ""}
            onChange={(e) => setFy(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-[#E4E7EC]">
        {([
          { id: "confirmed", label: "Confirmed Students" },
          { id: "billing", label: "Vendor Billing" },
          { id: "ageing", label: "Ageing Report" },
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

      {tab === "confirmed" && <ConfirmedStudentsTab onToast={showToast} />}
      {tab === "billing" && (
        <VendorBillingTab
          onOpenCreateInvoice={(vendorId, vendorName, students) =>
            setModal({ kind: "createInvoice", vendorId, vendorName, students })
          }
          onOpenRecordPayment={(invoice) => setModal({ kind: "recordPayment", invoice })}
        />
      )}
      {tab === "ageing" && <AgeingTab />}

      {modal?.kind === "createInvoice" && (
        <CreateInvoiceModal
          vendorId={modal.vendorId}
          vendorName={modal.vendorName}
          students={modal.students}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}
      {modal?.kind === "recordPayment" && (
        <RecordPaymentModal
          invoice={modal.invoice}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

// =============================================================================
// Tab 1 — Confirmed Students
// =============================================================================
function ConfirmedStudentsTab({ onToast }: { onToast: (m: string) => void }) {
  const utils = api.useUtils();
  const q = api.universityBilling.confirmedStudents.useQuery();
  const confirm = api.universityBilling.confirmBilling.useMutation({
    onSuccess: () => {
      void utils.universityBilling.invalidate();
      onToast("Confirmed for billing");
    },
    onError: (e) => onToast(e.message),
  });
  const rows = q.data ?? [];

  return (
    <DashboardCard
      title={`Confirmed (Attended) Students (${rows.length})`}
      bodyClassName="p-0"
    >
      {q.isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState label="No enrolled students awaiting billing. Confirm enrollment in Student Placements first." />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Student</th>
              <th className={TH}>University Student ID</th>
              <th className={TH}>Program</th>
              <th className={TH}>Intake</th>
              <th className={TH}>Default Rate</th>
              <th className={`${TH} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.applicationId} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                <td className={`${TD} font-medium text-[#101828]`}>{r.studentName}</td>
                <td className={TD}>{r.universityStudentId ?? <span className="text-[#98A2B3]">—</span>}</td>
                <td className={TD}>
                  {r.program}
                  <span className="block text-xs text-[#98A2B3]">{r.university}</span>
                </td>
                <td className={TD}>{r.intake ?? "—"}</td>
                <td className={TD}>
                  {r.hasDefaultRate ? (
                    <span>
                      {r.rate}% <span className="text-xs text-[#98A2B3]">· {r.vendorName}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#B42318]">No default rate set</span>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  <Button
                    variant={r.hasDefaultRate ? "primary" : "secondary"}
                    className="!h-9 !px-4 !text-[13px]"
                    disabled={!r.hasDefaultRate || confirm.isPending}
                    onClick={() => confirm.mutate({ applicationId: r.applicationId })}
                  >
                    Confirm
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardCard>
  );
}

// =============================================================================
// Tab 2 — Vendor Billing (Students / Invoices sub-views)
// =============================================================================
function VendorBillingTab({
  onOpenCreateInvoice,
  onOpenRecordPayment,
}: {
  onOpenCreateInvoice: (vendorId: number | null, vendorName: string, students: BillingStudent[]) => void;
  onOpenRecordPayment: (invoice: Invoice) => void;
}) {
  const [view, setView] = useState<"students" | "invoices">("students");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-0.5">
        {([
          { id: "students", label: "Students" },
          { id: "invoices", label: "Invoices" },
        ] as const).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition ${
              view === v.id ? "bg-white text-[#1570EF] shadow-sm" : "text-[#667085]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "students" ? (
        <BillingStudentsView onOpenCreateInvoice={onOpenCreateInvoice} />
      ) : (
        <InvoicesView onOpenRecordPayment={onOpenRecordPayment} />
      )}
    </div>
  );
}

function BillingStudentsView({
  onOpenCreateInvoice,
}: {
  onOpenCreateInvoice: (vendorId: number | null, vendorName: string, students: BillingStudent[]) => void;
}) {
  const q = api.universityBilling.vendorBillingStudents.useQuery();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const groups = useMemo(() => {
    const m = new Map<string, { vendorId: number | null; vendorName: string; students: BillingStudent[] }>();
    for (const r of rows) {
      const key = r.vendorId === null ? "direct" : String(r.vendorId);
      const g = m.get(key) ?? { vendorId: r.vendorId, vendorName: r.vendorName, students: [] };
      g.students.push(r);
      m.set(key, g);
    }
    return Array.from(m.values());
  }, [rows]);

  const toggle = (id: number) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (q.isLoading)
    return (
      <DashboardCard title="Vendor Billing" bodyClassName="p-0">
        <SkeletonTable rows={5} cols={6} />
      </DashboardCard>
    );
  if (rows.length === 0)
    return (
      <DashboardCard title="Vendor Billing" bodyClassName="p-0">
        <EmptyState label="No students ready to bill. Confirm attended students first." />
      </DashboardCard>
    );

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const groupSelected = g.students.filter((st) => selected.has(st.commissionId));
        return (
          <DashboardCard
            key={g.vendorId ?? "direct"}
            title={g.vendorName}
            bodyClassName="p-0"
            headerRight={
              groupSelected.length > 0 ? (
                <Button
                  className="!h-9 !px-4 !text-[13px]"
                  onClick={() => onOpenCreateInvoice(g.vendorId, g.vendorName, groupSelected)}
                >
                  Create Invoice ({groupSelected.length})
                </Button>
              ) : (
                <span className="text-xs text-[#98A2B3]">{g.students.length} to bill</span>
              )
            }
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-10`}></th>
                  <th className={TH}>University Student ID</th>
                  <th className={TH}>University / Program</th>
                  <th className={TH}>Tuition</th>
                  <th className={TH}>Rate</th>
                  <th className={TH}>Calc. Commission</th>
                </tr>
              </thead>
              <tbody>
                {g.students.map((st) => (
                  <tr key={st.commissionId} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                    <td className={`${TD} w-10`}>
                      <input
                        type="checkbox"
                        checked={selected.has(st.commissionId)}
                        onChange={() => toggle(st.commissionId)}
                      />
                    </td>
                    <td className={`${TD} font-medium text-[#101828]`}>
                      {st.universityStudentId ?? <span className="text-[#98A2B3]">—</span>}
                      <span className="block text-xs font-normal text-[#98A2B3]">{st.partner}</span>
                    </td>
                    <td className={TD}>
                      {st.university}
                      <span className="block text-xs text-[#98A2B3]">{st.program}</span>
                    </td>
                    <td className={TD}>{money(st.tuition, st.currency)}</td>
                    <td className={TD}>{st.rate > 0 ? `${st.rate}%` : "Flat"}</td>
                    <td className={`${TD} font-semibold text-[#101828]`}>{money(st.calcAmount, st.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>
        );
      })}
    </div>
  );
}

function InvoicesView({
  onOpenRecordPayment,
}: {
  onOpenRecordPayment: (invoice: Invoice) => void;
}) {
  const q = api.universityBilling.listVendorInvoices.useQuery();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const invoices = q.data ?? [];
  const toggle = (id: number) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (q.isLoading)
    return (
      <DashboardCard title="Vendor Invoices" bodyClassName="p-0">
        <SkeletonTable rows={4} cols={5} />
      </DashboardCard>
    );
  if (invoices.length === 0)
    return (
      <DashboardCard title="Vendor Invoices" bodyClassName="p-0">
        <EmptyState label="No invoices yet. Select students and create one." />
      </DashboardCard>
    );

  return (
    <div className="space-y-4">
      {invoices.map((inv) => {
        const isOpen = open.has(inv.id);
        return (
          <div key={inv.id} className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] px-5 py-4">
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(inv.id)} className="text-[#667085]">
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
                <div>
                  <div className="font-semibold text-[#101828]">{inv.invoiceNumber}</div>
                  <div className="text-xs text-[#98A2B3]">
                    {inv.vendorName} · {inv.items.length} student{inv.items.length === 1 ? "" : "s"} · {formatDate(inv.invoiceDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-[#101828]">{money(inv.totalExpected, inv.currency)}</div>
                  <div className="text-xs text-[#98A2B3]">received ₹{inv.paidInr.toLocaleString()}</div>
                </div>
                <InvoiceStatusPill status={inv.status} />
                {inv.status !== VendorInvoiceStatus.FULLY_PAID && (
                  <Button className="!h-9 !px-4 !text-[13px]" onClick={() => onOpenRecordPayment(inv)}>
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
            {isOpen && (
              <div className="space-y-4 px-5 py-4">
                <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={TH}>Student</th>
                        <th className={TH}>Program</th>
                        <th className={TH}>Tuition</th>
                        <th className={TH}>Calculated</th>
                        <th className={TH}>Expected</th>
                        <th className={TH}>Variance</th>
                        <th className={TH}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((it) => (
                        <tr key={it.id} className="border-b border-[#F2F4F7] last:border-0">
                          <td className={`${TD} font-medium text-[#101828]`}>{it.student}</td>
                          <td className={TD}>{it.program}</td>
                          <td className={TD}>{money(it.tuition, inv.currency)}</td>
                          <td className={TD}>{money(it.calculated, inv.currency)}</td>
                          <td className={TD}>{money(it.expected, inv.currency)}</td>
                          <td className={`${TD} ${it.variance < 0 ? "text-[#B42318]" : it.variance > 0 ? "text-[#067647]" : ""}`}>
                            {it.variance > 0 ? "+" : ""}{money(it.variance, inv.currency)}
                          </td>
                          <td className={TD}>
                            {it.varianceReason === VarianceReason.NONE ? "—" : VarianceReasonLabel[it.varianceReason as 0 | 1 | 2 | 3 | 4]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold tracking-wide text-[#98A2B3] uppercase">Payments</div>
                  {inv.payments.length === 0 ? (
                    <p className="text-sm text-[#98A2B3]">No payments recorded.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className={TH}>Date</th>
                            <th className={TH}>Amount (₹)</th>
                            <th className={TH}>FX Rate</th>
                            <th className={TH}>= {inv.currency}</th>
                            <th className={TH}>Reference</th>
                            <th className={TH}>Tranche</th>
                            <th className={TH}>Final?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.payments.map((p) => (
                            <tr key={p.id} className="border-b border-[#F2F4F7] last:border-0">
                              <td className={TD}>{formatDate(p.date)}</td>
                              <td className={`${TD} font-semibold text-[#101828]`}>₹{p.amountInr.toLocaleString()}</td>
                              <td className={TD}>{p.exchangeRate}</td>
                              <td className={TD}>{money(p.amountForeign, inv.currency)}</td>
                              <td className={TD}>{p.reference ?? "—"}</td>
                              <td className={TD}>{p.isTranche ? `${p.trancheNumber}/${p.totalTranches}` : "—"}</td>
                              <td className={TD}>{p.isFinal ? "✓" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {inv.notes && <p className="text-xs text-[#667085]"><span className="font-semibold">Notes:</span> {inv.notes}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Tab 3 — Ageing Report
// =============================================================================
const AGEING_BUCKETS = ["Current (0–30 days)", "31–60 days", "61–90 days", "90+ days"];

function AgeingTab() {
  const q = api.universityBilling.ageing.useQuery();
  const data = q.data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {AGEING_BUCKETS.map((label, i) => {
          const b = data?.buckets.find((x) => x.bucket === i);
          return (
            <div key={i} className="rounded-xl border border-[#E4E7EC] bg-white p-4">
              <div className={`text-[26px] font-extrabold ${i >= 2 ? "text-[#B42318]" : "text-[#101828]"}`}>{b?.count ?? 0}</div>
              <div className="mt-1 text-[13px] font-medium text-[#667085]">{label}</div>
            </div>
          );
        })}
      </div>
      <DashboardCard title="Outstanding Invoices" bodyClassName="p-0">
        {q.isLoading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState label="No outstanding invoices — everything's collected." />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Vendor</th>
                <th className={TH}>Invoice #</th>
                <th className={TH}>Students</th>
                <th className={TH}>Outstanding</th>
                <th className={TH}>Due Date</th>
                <th className={TH}>Days Overdue</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-[#F2F4F7] last:border-0">
                  <td className={`${TD} font-medium text-[#101828]`}>{r.vendorName}</td>
                  <td className={TD}>{r.invoiceNumber}</td>
                  <td className={TD}>{r.students}</td>
                  <td className={TD}>{money(r.outstanding, r.currency)}</td>
                  <td className={TD}>{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                  <td className={`${TD} ${r.daysOverdue > 0 ? "font-semibold text-[#B42318]" : ""}`}>
                    {r.daysOverdue > 0 ? `${r.daysOverdue}d` : "—"}
                  </td>
                  <td className={TD}><InvoiceStatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
}

// =============================================================================
// Create Invoice modal
// =============================================================================
type Line = {
  commissionId: number;
  student: string;
  program: string;
  rate: number;
  storedCalc: number;
  tuition: string;
  expected: string;
  reason: number;
  note: string;
};

function CreateInvoiceModal({
  vendorId,
  vendorName,
  students,
  onClose,
  onToast,
}: {
  vendorId: number | null;
  vendorName: string;
  students: BillingStudent[];
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const [lines, setLines] = useState<Line[]>(
    students.map((st) => ({
      commissionId: st.commissionId,
      student: st.universityStudentId ?? st.partner,
      program: st.program,
      rate: st.rate,
      storedCalc: st.calcAmount,
      tuition: String(st.tuition),
      expected: String(st.calcAmount),
      reason: VarianceReason.NONE,
      note: "",
    })),
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState(students[0]?.currency ?? "USD");
  const [invoiceDate, setInvoiceDate] = useState(todayInput());
  const [dueDate, setDueDate] = useState(plusDaysInput(30));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const create = api.universityBilling.createVendorInvoice.useMutation({
    onSuccess: () => {
      void utils.universityBilling.invalidate();
      onToast("Invoice created");
      onClose();
    },
    onError: (e) => setErr(e.message),
  });

  const calcFor = (l: Line) => {
    const t = Number(l.tuition);
    if (l.rate > 0) return Math.round(((t * l.rate) / 100) * 100) / 100;
    return l.storedCalc; // flat
  };
  const varianceFor = (l: Line) => Math.round((Number(l.expected) - calcFor(l)) * 100) / 100;
  const totalExpected = lines.reduce((sum, l) => sum + (Number(l.expected) || 0), 0);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = () => {
    if (!invoiceNumber.trim()) return setErr("Invoice number is required");
    for (const l of lines) {
      if (l.tuition.trim() === "" || Number.isNaN(Number(l.tuition)))
        return setErr(`Enter tuition for ${l.student}`);
      if (varianceFor(l) !== 0 && l.reason === VarianceReason.NONE)
        return setErr(`Pick a variance reason for ${l.student}`);
    }
    create.mutate({
      vendorId,
      invoiceNumber: invoiceNumber.trim(),
      currency: currency as "USD",
      invoiceDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        commissionId: l.commissionId,
        tuitionAmount: Number(l.tuition),
        expectedAmount: Number(l.expected),
        varianceReason: l.reason,
        varianceNote: l.note || undefined,
      })),
    });
  };

  return (
    <Modal
      open
      title={`Create Invoice — ${vendorName}`}
      width="w-[860px]"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={create.isPending}>Create Invoice</Button>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Student</th>
              <th className={TH}>Comm %</th>
              <th className={TH}>Tuition</th>
              <th className={TH}>Calc.</th>
              <th className={TH}>Expected</th>
              <th className={TH}>Variance</th>
              <th className={TH}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const v = varianceFor(l);
              return (
                <tr key={l.commissionId} className="border-b border-[#F2F4F7] last:border-0">
                  <td className={`${TD} font-medium text-[#101828]`}>
                    {l.student}
                    <span className="block text-xs font-normal text-[#98A2B3]">{l.program}</span>
                  </td>
                  <td className={TD}>{l.rate > 0 ? `${l.rate}%` : "Flat"}</td>
                  <td className={TD}>
                    <input
                      type="number"
                      value={l.tuition}
                      onChange={(e) => setLine(i, { tuition: e.target.value })}
                      className="h-9 w-24 rounded-md border border-[#D0D5DD] px-2 text-sm outline-none focus:border-[#1570EF]"
                    />
                  </td>
                  <td className={TD}>{money(calcFor(l))}</td>
                  <td className={TD}>
                    <input
                      type="number"
                      value={l.expected}
                      onChange={(e) => setLine(i, { expected: e.target.value })}
                      className="h-9 w-24 rounded-md border border-[#D0D5DD] px-2 text-sm outline-none focus:border-[#1570EF]"
                    />
                  </td>
                  <td className={`${TD} ${v < 0 ? "text-[#B42318]" : v > 0 ? "text-[#067647]" : ""}`}>
                    {v > 0 ? "+" : ""}{money(v)}
                  </td>
                  <td className={TD}>
                    {v === 0 ? (
                      <span className="text-[#98A2B3]">—</span>
                    ) : (
                      <select
                        value={String(l.reason)}
                        onChange={(e) => setLine(i, { reason: Number(e.target.value) })}
                        className="h-9 rounded-md border border-[#D0D5DD] px-2 text-sm outline-none focus:border-[#1570EF]"
                      >
                        {VARIANCE_REASON_CODES.map((code) => (
                          <option key={code} value={code}>{VarianceReasonLabel[code]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-right text-sm font-semibold text-[#101828]">
        Total Expected: {money(totalExpected, currency)}
      </div>

      <div className="flex gap-3">
        <FormInput label="Invoice Number" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001" />
        <FormSelect
          label="Currency"
          options={BILLING_CURRENCIES.map((c) => ({ value: c, label: c }))}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <FormInput label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        <FormInput label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <FormTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p className="text-xs font-medium text-[#F04438]">{err}</p>}
    </Modal>
  );
}

// =============================================================================
// Record Payment modal (FX)
// =============================================================================
function RecordPaymentModal({
  invoice,
  onClose,
  onToast,
}: {
  invoice: Invoice;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const utils = api.useUtils();
  const [amountInr, setAmountInr] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(todayInput());
  const [reference, setReference] = useState("");
  const [isTranche, setIsTranche] = useState(false);
  const [trancheNumber, setTrancheNumber] = useState("");
  const [totalTranches, setTotalTranches] = useState("");
  const [isFinal, setIsFinal] = useState(true);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const record = api.universityBilling.recordVendorPayment.useMutation({
    onSuccess: () => {
      void utils.universityBilling.invalidate();
      onToast(isFinal ? "Payment recorded — students now claimable" : "Partial payment recorded");
      onClose();
    },
    onError: (e) => setErr(e.message),
  });

  const equivalent =
    amountInr && rate && Number(rate) > 0
      ? Math.round((Number(amountInr) / Number(rate)) * 100) / 100
      : null;

  const save = () => {
    if (!amountInr || Number(amountInr) <= 0) return setErr("Enter the rupee amount received");
    if (!rate || Number(rate) <= 0) return setErr("Enter the exchange rate");
    record.mutate({
      vendorInvoiceId: invoice.id,
      amountInr: Number(amountInr),
      exchangeRate: Number(rate),
      paymentDate: date,
      reference: reference || undefined,
      isTranche,
      trancheNumber: isTranche && trancheNumber ? Number(trancheNumber) : undefined,
      totalTranches: isTranche && totalTranches ? Number(totalTranches) : undefined,
      isFinal,
      notes: notes || undefined,
    });
  };

  return (
    <Modal
      open
      title={`Record Payment — ${invoice.invoiceNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={record.isPending}>Record Payment</Button>
        </>
      }
    >
      <div className="rounded-lg bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#344054]">
        Total expected <span className="font-semibold text-[#101828]">{money(invoice.totalExpected, invoice.currency)}</span>
        {" · "}received so far <span className="font-semibold text-[#101828]">₹{invoice.paidInr.toLocaleString()}</span>
      </div>
      <FormInput
        label="Payment Amount (₹) — actual rupees deposited"
        required
        type="number"
        value={amountInr}
        onChange={(e) => setAmountInr(e.target.value)}
        placeholder="e.g. 500000"
      />
      <div className="flex gap-3">
        <FormInput
          label={`Exchange Rate (1 ${invoice.currency} = ? ₹)`}
          required
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 83.50"
        />
        <FormInput label={`Equivalent in ${invoice.currency}`} value={equivalent != null ? String(equivalent) : ""} readOnly disabled />
      </div>
      <div className="flex gap-3">
        <FormInput label="Payment Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FormInput label="Payment Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="WIRE / NEFT ref" />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]">
        <input type="checkbox" checked={isTranche} onChange={(e) => setIsTranche(e.target.checked)} />
        This is a tranche payment
      </label>
      {isTranche && (
        <div className="flex gap-3">
          <FormInput label="Tranche Number" type="number" value={trancheNumber} onChange={(e) => setTrancheNumber(e.target.value)} />
          <FormInput label="Total Tranches" type="number" value={totalTranches} onChange={(e) => setTotalTranches(e.target.value)} />
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#344054]">
        <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
        This is the final payment (marks the invoice fully paid → unlocks the partner claim)
      </label>
      <FormTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p className="text-xs font-medium text-[#F04438]">{err}</p>}
    </Modal>
  );
}
