"use client";

import { Fragment, useState } from "react";
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
  PayoutStatus,
  PayoutStatusLabel,
  PayoutMethod,
  PAYOUT_METHOD_CODES,
  PayoutMethodLabel,
} from "~/server/db/enums";

type RO = inferRouterOutputs<AppRouter>;
type Payout = RO["reconciliation"]["listPending"][number];

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-sm text-[#344054]";
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const todayInput = () => new Date().toISOString().slice(0, 10);

function StatusPill({ status }: { status: number }) {
  const map: Record<number, string> = {
    [PayoutStatus.APPROVED]: "bg-[#FFF6ED] text-[#B54708]",
    [PayoutStatus.READY_TO_PAY]: "bg-[#EFF8FF] text-[#1570EF]",
    [PayoutStatus.RELEASED]: "bg-[#ECFDF3] text-[#067647]",
    [PayoutStatus.ON_HOLD]: "bg-[#FEF3F2] text-[#B42318]",
    [PayoutStatus.SENT_BACK]: "bg-[#F2F4F7] text-[#667085]",
  };
  return (
    <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-[#F2F4F7] text-[#667085]"}`}>
      {PayoutStatusLabel[status as 0 | 1 | 2 | 3 | 4]}
    </span>
  );
}

export default function ReconciliationPage() {
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [reasonFor, setReasonFor] = useState<{ payout: Payout; kind: "hold" | "sendBack" } | null>(null);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (m: string) => { setToastMsg(m); setToastOpen(true); };

  const utils = api.useUtils();
  const statsQ = api.reconciliation.stats.useQuery();
  const pendingQ = api.reconciliation.listPending.useQuery();
  const completedQ = api.reconciliation.completed.useQuery();
  const s = statsQ.data;

  const refetch = () => void utils.reconciliation.invalidate();
  const verify = api.reconciliation.verify.useMutation({
    onSuccess: (r) => { refetch(); showToast(r.readyToPay ? "Verified — ready to pay" : "Checklist saved"); },
    onError: (e) => showToast(e.message),
  });
  const release = api.reconciliation.release.useMutation({
    onSuccess: () => { refetch(); showToast("Payment released — commission disbursed"); },
    onError: (e) => showToast(e.message),
  });
  const hold = api.reconciliation.hold.useMutation({
    onSuccess: () => { refetch(); showToast("Put on hold"); setReasonFor(null); },
    onError: (e) => showToast(e.message),
  });
  const sendBack = api.reconciliation.sendBack.useMutation({
    onSuccess: () => { refetch(); showToast("Sent back"); setReasonFor(null); },
    onError: (e) => showToast(e.message),
  });

  const pending = pendingQ.data ?? [];
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
        <h1 className="text-2xl font-bold text-[#101828]">Reconciliation &amp; Payment Release</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Verify approved payouts against the checklist, then release payment to partners.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="clock" tone="orange" label="Pending Verification" value={s?.pendingVerification ?? "—"} />
        <StatCard icon="approvals" tone="blue" label="Ready to Pay" value={s?.readyToPay ?? "—"} />
        <StatCard icon="revenue" tone="purple" label="Amount Pending" value={s ? formatINR(s.amountPending) : "—"} />
        <StatCard icon="check" tone="green" label="Released" value={s?.released ?? "—"} />
      </div>

      <div className="mb-5 flex gap-2 border-b border-[#E4E7EC]">
        {([
          { id: "pending", label: "Pending Reconciliation" },
          { id: "completed", label: "Completed Payments" },
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

      {tab === "pending" ? (
        <DashboardCard title="Pending Reconciliation" bodyClassName="p-0">
          {pendingQ.isLoading ? (
            <SkeletonTable rows={4} cols={5} />
          ) : pending.length === 0 ? (
            <EmptyState label="Nothing awaiting reconciliation." />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-8`}></th>
                  <th className={TH}>Partner</th>
                  <th className={TH}>Invoice #</th>
                  <th className={TH}>Amount (₹)</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                      <td className={`${TD} w-8`}>
                        <button onClick={() => toggle(p.id)}>
                          <svg viewBox="0 0 24 24" className={`h-4 w-4 text-[#667085] transition-transform ${expanded.has(p.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </td>
                      <td className={`${TD} font-medium text-[#101828]`}>{p.partner}</td>
                      <td className={TD}>{p.invoiceNumber}</td>
                      <td className={`${TD} font-semibold text-[#101828]`}>{inr(p.amountInr)}</td>
                      <td className={TD}><StatusPill status={p.status} /></td>
                    </tr>
                    {expanded.has(p.id) && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={5} className="px-4 py-4">
                          <ReconPanel
                            payout={p}
                            verifying={verify.isPending}
                            releasing={release.isPending}
                            onVerify={(checks) => verify.mutate({ payoutId: p.id, ...checks })}
                            onRelease={(payment) => release.mutate({ payoutId: p.id, ...payment })}
                            onHold={() => setReasonFor({ payout: p, kind: "hold" })}
                            onSendBack={() => setReasonFor({ payout: p, kind: "sendBack" })}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>
      ) : (
        <DashboardCard title="Completed Payments" bodyClassName="p-0">
          {completedQ.isLoading ? (
            <SkeletonTable rows={3} cols={5} />
          ) : (completedQ.data ?? []).length === 0 ? (
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
                  <th className={TH}>Released</th>
                </tr>
              </thead>
              <tbody>
                {(completedQ.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-[#F2F4F7] last:border-0">
                    <td className={`${TD} font-medium text-[#101828]`}>{p.partner}</td>
                    <td className={TD}>{p.invoiceNumber}</td>
                    <td className={`${TD} font-semibold text-[#101828]`}>{inr(p.amountInr)}</td>
                    <td className={TD}>{p.method == null ? "—" : PayoutMethodLabel[p.method as 0 | 1 | 2 | 3 | 4]}</td>
                    <td className={TD}>{p.reference ?? "—"}</td>
                    <td className={TD}>{p.releasedAt ? formatDate(p.releasedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>
      )}

      {reasonFor && (
        <ReasonModal
          title={`${reasonFor.kind === "hold" ? "Hold" : "Send back"} — ${reasonFor.payout.invoiceNumber}`}
          saving={hold.isPending || sendBack.isPending}
          onClose={() => setReasonFor(null)}
          onSubmit={(reason) =>
            reasonFor.kind === "hold"
              ? hold.mutate({ payoutId: reasonFor.payout.id, reason })
              : sendBack.mutate({ payoutId: reasonFor.payout.id, reason })
          }
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

function ReconPanel({
  payout,
  verifying,
  releasing,
  onVerify,
  onRelease,
  onHold,
  onSendBack,
}: {
  payout: Payout;
  verifying: boolean;
  releasing: boolean;
  onVerify: (checks: { bankConfirmed: boolean; invoiceVerified: boolean; commissionVerified: boolean; duplicateCheck: boolean }) => void;
  onRelease: (payment: { method: number; bankName?: string; ifsc?: string; swift?: string; referenceNumber: string; paymentDate: string }) => void;
  onHold: () => void;
  onSendBack: () => void;
}) {
  const [bankConfirmed, setBankConfirmed] = useState(payout.checks.bankConfirmed);
  const [invoiceVerified, setInvoiceVerified] = useState(payout.checks.invoiceVerified);
  const [commissionVerified, setCommissionVerified] = useState(payout.checks.commissionVerified);
  const [duplicateCheck, setDuplicateCheck] = useState(payout.checks.duplicateCheck);

  const [method, setMethod] = useState(String(PayoutMethod.NEFT));
  const [bankName, setBankName] = useState(payout.bank?.bankName ?? "");
  const [ifsc, setIfsc] = useState(payout.bank?.ifsc ?? "");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(todayInput());
  const [err, setErr] = useState("");

  const readyToPay = payout.status === PayoutStatus.READY_TO_PAY;
  const isWire = Number(method) === PayoutMethod.INTERNATIONAL_WIRE;

  const CHECKS: { key: string; label: string; v: boolean; set: (b: boolean) => void }[] = [
    { key: "bank", label: "University payment confirmed in bank statement", v: bankConfirmed, set: setBankConfirmed },
    { key: "inv", label: "Partner invoice details verified (GST / PAN / bank)", v: invoiceVerified, set: setInvoiceVerified },
    { key: "comm", label: "Commission calculation verified", v: commissionVerified, set: setCommissionVerified },
    { key: "dup", label: "No-duplicate-payment check passed", v: duplicateCheck, set: setDuplicateCheck },
  ];

  const release = () => {
    if (!reference.trim()) return setErr("A payment reference is required");
    onRelease({
      method: Number(method),
      bankName: bankName || undefined,
      ifsc: isWire ? undefined : ifsc || undefined,
      swift: isWire ? ifsc || undefined : undefined,
      referenceNumber: reference.trim(),
      paymentDate: date,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Verification checklist */}
      <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
        <div className="mb-3 text-xs font-semibold tracking-wide text-[#667085] uppercase">Verification Checklist</div>
        <div className="space-y-2.5">
          {CHECKS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-start gap-2 text-sm text-[#344054]">
              <input type="checkbox" className="mt-0.5" checked={c.v} disabled={readyToPay} onChange={(e) => c.set(e.target.checked)} />
              {c.label}
            </label>
          ))}
        </div>
        <div className="mt-3 border-t border-[#F2F4F7] pt-3 text-xs text-[#667085]">
          <div>GSTIN: <span className="font-medium text-[#344054]">{payout.gstin ?? "—"}</span> · PAN: <span className="font-medium text-[#344054]">{payout.pan ?? "—"}</span></div>
          {payout.bank && (
            <div className="mt-1">{payout.bank.accountHolder} · {payout.bank.bankName ?? ""} {payout.bank.ifsc ?? ""} · ••••{payout.bank.last4 ?? "----"}</div>
          )}
        </div>
        {!readyToPay && (
          <Button className="!mt-3 !h-9 w-full !text-[13px]" loading={verifying} onClick={() => onVerify({ bankConfirmed, invoiceVerified, commissionVerified, duplicateCheck })}>
            Verify &amp; Mark Ready to Pay
          </Button>
        )}
        {readyToPay && <div className="mt-3 rounded-md bg-[#ECFDF3] px-3 py-2 text-xs font-semibold text-[#067647]">✓ Verified — ready to release</div>}
      </div>

      {/* Payment instructions */}
      <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
        <div className="mb-3 text-xs font-semibold tracking-wide text-[#667085] uppercase">Payment Instructions</div>
        <div className="space-y-3">
          <FormSelect
            label="Method"
            options={PAYOUT_METHOD_CODES.map((m) => ({ value: String(m), label: PayoutMethodLabel[m] }))}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
          <div className="flex gap-3">
            <FormInput label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <FormInput label={isWire ? "SWIFT" : "IFSC"} value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <FormInput label="Payment Reference #" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="NEFT/UTR ref" />
            <FormInput label="Payment Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <Button className="!mt-3 !h-9 w-full !text-[13px]" disabled={!readyToPay || releasing} loading={releasing} onClick={release}>
          Release Payment
        </Button>
        {err && <p className="mt-2 text-xs font-medium text-[#F04438]">{err}</p>}
        <div className="mt-2 flex gap-3">
          <button className="text-[12px] font-semibold text-[#B54708] hover:underline" onClick={onHold}>Hold</button>
          <button className="text-[12px] font-semibold text-[#667085] hover:underline" onClick={onSendBack}>Send back to ops</button>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({
  title,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => (reason.trim() ? onSubmit(reason.trim()) : setErr("A reason is required"))} loading={saving}>Confirm</Button>
        </>
      }
    >
      <FormTextarea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} error={!!err} errorMessage={err} />
    </Modal>
  );
}
