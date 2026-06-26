"use client";

import { Fragment, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import { Modal } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { FormTextarea } from "~/components/ui/form-input";
import { Toast } from "~/components/ui/toast";
import {
  DashboardCard,
  StatCard,
  SkeletonTable,
  EmptyState,
} from "~/components/dashboard/widgets";
import { formatINR, formatDate } from "~/components/dashboard/format";
import {
  PartnerInvoiceStatus,
  PartnerInvoiceStatusLabel,
  PayoutMethodLabel,
} from "~/server/db/enums";

type RO = inferRouterOutputs<AppRouter>;
type Invoice = RO["partnerPayouts"]["list"][number];

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-sm text-[#344054]";
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function StatusPill({ status }: { status: number }) {
  const tone =
    status === PartnerInvoiceStatus.PAID
      ? "bg-[#ECFDF3] text-[#067647]"
      : status === PartnerInvoiceStatus.REJECTED
        ? "bg-[#FEF3F2] text-[#B42318]"
        : status === PartnerInvoiceStatus.APPROVED
          ? "bg-[#EFF8FF] text-[#1570EF]"
          : "bg-[#FFF6ED] text-[#B54708]";
  return (
    <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {PartnerInvoiceStatusLabel[status as 0 | 1 | 2 | 3 | 4 | 5]}
    </span>
  );
}

export default function InvoicesPayoutsPage() {
  const [tab, setTab] = useState<"invoices" | "history">("invoices");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [rejectFor, setRejectFor] = useState<Invoice | null>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (m: string) => {
    setToastMsg(m);
    setToastOpen(true);
  };

  const utils = api.useUtils();
  const statsQ = api.partnerPayouts.stats.useQuery();
  const listQ = api.partnerPayouts.list.useQuery();
  const historyQ = api.partnerPayouts.paymentHistory.useQuery();
  const s = statsQ.data;

  const onOk = (msg: string) => () => {
    void utils.partnerPayouts.invalidate();
    showToast(msg);
  };
  const review = api.partnerPayouts.review.useMutation({ onSuccess: onOk("Moved to under review"), onError: (e) => showToast(e.message) });
  const approve = api.partnerPayouts.approve.useMutation({ onSuccess: onOk("Approved for payment"), onError: (e) => showToast(e.message) });
  const reject = api.partnerPayouts.reject.useMutation({
    onSuccess: () => { void utils.partnerPayouts.invalidate(); showToast("Invoice rejected"); setRejectFor(null); },
    onError: (e) => showToast(e.message),
  });

  const invoices = listQ.data ?? [];
  const toggle = (id: number) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#101828]">Invoices &amp; Payouts</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Review partner invoices, cross-reference against vendor payments, and approve for payout.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="applications" tone="blue" label="Total Invoices" value={s?.total ?? "—"} />
        <StatCard icon="clock" tone="orange" label="Pending Review" value={s?.pendingReview ?? "—"} />
        <StatCard icon="approvals" tone="cyan" label="Approved (awaiting pay)" value={s?.approved ?? "—"} />
        <StatCard icon="revenue" tone="purple" label="Amount Pending" value={s ? formatINR(s.amountPending) : "—"} />
      </div>

      <div className="mb-5 flex gap-2 border-b border-[#E4E7EC]">
        {([
          { id: "invoices", label: "Partner Invoices" },
          { id: "history", label: "Payment History" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id ? "border-[#1570EF] text-[#1570EF]" : "border-transparent text-[#667085] hover:text-[#344054]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "invoices" ? (
        <DashboardCard title="Partner Invoices" bodyClassName="p-0">
          {listQ.isLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : invoices.length === 0 ? (
            <EmptyState label="No partner invoices yet." />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-8`}></th>
                  <th className={TH}>Partner</th>
                  <th className={TH}>Invoice #</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>Students</th>
                  <th className={TH}>Net Payable</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const open = expanded.has(inv.id);
                  const actionable =
                    inv.status !== PartnerInvoiceStatus.PAID &&
                    inv.status !== PartnerInvoiceStatus.REJECTED &&
                    !inv.hasPayout;
                  return (
                    <Fragment key={inv.id}>
                      <tr className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                        <td className={`${TD} w-8`}>
                          <button onClick={() => toggle(inv.id)}>
                            <svg viewBox="0 0 24 24" className={`h-4 w-4 text-[#667085] transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                        </td>
                        <td className={`${TD} font-medium text-[#101828]`}>{inv.partner}</td>
                        <td className={TD}>{inv.invoiceNumber}</td>
                        <td className={TD}>{formatDate(inv.invoiceDate)}</td>
                        <td className={TD}>{inv.students}</td>
                        <td className={`${TD} font-semibold text-[#101828]`}>{inr(inv.netPayable)}</td>
                        <td className={TD}><StatusPill status={inv.status} /></td>
                        <td className={`${TD} text-right whitespace-nowrap`}>
                          {inv.status === PartnerInvoiceStatus.SUBMITTED && (
                            <button className="mr-3 text-[13px] font-semibold text-[#1570EF] hover:underline" onClick={() => review.mutate({ invoiceId: inv.id })}>Review</button>
                          )}
                          {actionable && (
                            <button
                              className={`mr-3 text-[13px] font-semibold ${inv.allVerified ? "text-[#067647] hover:underline" : "cursor-not-allowed text-[#98A2B3]"}`}
                              disabled={!inv.allVerified || approve.isPending}
                              title={inv.allVerified ? "Approve for payment" : "All students must be collected from the vendor first"}
                              onClick={() => approve.mutate({ invoiceId: inv.id })}
                            >
                              Approve
                            </button>
                          )}
                          {actionable && (
                            <button className="text-[13px] font-semibold text-[#B42318] hover:underline" onClick={() => setRejectFor(inv)}>Reject</button>
                          )}
                          {inv.hasPayout && inv.status === PartnerInvoiceStatus.APPROVED && (
                            <span className="text-xs text-[#98A2B3]">→ Reconciliation</span>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-[#F9FAFB]">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="mb-2 text-xs font-semibold text-[#475467]">
                              Partner claim vs vendor collection — {inv.verifiedCount} of {inv.students} verified
                              {inv.gstin && <span className="ml-2 font-normal text-[#98A2B3]">GSTIN {inv.gstin}</span>}
                            </div>
                            <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className={TH}>Student</th>
                                    <th className={TH}>University / Program</th>
                                    <th className={TH}>Claimed (₹)</th>
                                    <th className={TH}>Match</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((it, i) => (
                                    <tr key={i} className="border-b border-[#F2F4F7] last:border-0">
                                      <td className={`${TD} font-medium text-[#101828]`}>{it.student}</td>
                                      <td className={TD}>{it.university}<span className="block text-xs text-[#98A2B3]">{it.program}</span></td>
                                      <td className={TD}>{inr(it.claimed)}</td>
                                      <td className={TD}>
                                        {it.match === "verified" ? (
                                          <span className="rounded-[10px] bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#067647]">✓ Verified</span>
                                        ) : (
                                          <span className="rounded-[10px] bg-[#FEF3F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#B42318]">No vendor payment</span>
                                        )}
                                      </td>
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
      ) : (
        <DashboardCard title="Payment History" bodyClassName="p-0">
          {historyQ.isLoading ? (
            <SkeletonTable rows={3} cols={5} />
          ) : (historyQ.data ?? []).length === 0 ? (
            <EmptyState label="No payments released yet." />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Partner</th>
                  <th className={TH}>Invoice #</th>
                  <th className={TH}>Amount (₹)</th>
                  <th className={TH}>Method</th>
                  <th className={TH}>Reference</th>
                  <th className={TH}>Date</th>
                </tr>
              </thead>
              <tbody>
                {(historyQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-[#F2F4F7] last:border-0">
                    <td className={`${TD} font-medium text-[#101828]`}>{p.partner}</td>
                    <td className={TD}>{p.invoiceNumber}</td>
                    <td className={`${TD} font-semibold text-[#101828]`}>{inr(p.amountInr)}</td>
                    <td className={TD}>{p.method == null ? "—" : PayoutMethodLabel[p.method as 0 | 1 | 2 | 3 | 4]}</td>
                    <td className={TD}>{p.reference ?? "—"}</td>
                    <td className={TD}>{p.paymentDate ? formatDate(p.paymentDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>
      )}

      {rejectFor && (
        <RejectModal
          invoice={rejectFor}
          onClose={() => setRejectFor(null)}
          onReject={(reason) => reject.mutate({ invoiceId: rejectFor.id, reason })}
          saving={reject.isPending}
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

function RejectModal({
  invoice,
  onClose,
  onReject,
  saving,
}: {
  invoice: Invoice;
  onClose: () => void;
  onReject: (reason: string) => void;
  saving: boolean;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal
      open
      title={`Reject ${invoice.invoiceNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => (reason.trim() ? onReject(reason.trim()) : setErr("A reason is required"))} loading={saving}>
            Reject Invoice
          </Button>
        </>
      }
    >
      <FormTextarea label="Reason for rejection" required value={reason} onChange={(e) => setReason(e.target.value)} error={!!err} errorMessage={err} />
    </Modal>
  );
}
