"use client";

import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import { Modal } from "~/components/ui/modal";
import { Button } from "~/components/ui/button";
import { FormInput, FormTextarea } from "~/components/ui/form-input";
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
} from "~/server/db/enums";

type RO = inferRouterOutputs<AppRouter>;
type Claim = RO["partnerCommission"]["listClaimable"][number];

const TH = "border-b border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#667085]";
const TD = "px-3.5 py-3 text-sm text-[#344054]";
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const todayInput = () => new Date().toISOString().slice(0, 10);

function ClaimStatusPill({ status }: { status: Claim["status"] }) {
  const map = {
    pending: { c: "bg-[#F2F4F7] text-[#667085]", t: "Awaiting CP Payment" },
    claimable: { c: "bg-[#ECFDF3] text-[#067647]", t: "Available to Claim" },
    invoiced: { c: "bg-[#FFF6ED] text-[#B54708]", t: "Invoiced — under review" },
    paid: { c: "bg-[#EFF8FF] text-[#1570EF]", t: "Paid to You" },
  };
  const { c, t } = map[status];
  return <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-semibold ${c}`}>{t}</span>;
}

function InvoiceStatusPill({ status }: { status: number }) {
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

// =============================================================================
export default function PartnerCommissionPage() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [wizard, setWizard] = useState(false);

  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const showToast = (m: string) => {
    setToastMsg(m);
    setToastOpen(true);
  };

  const claimsQ = api.partnerCommission.listClaimable.useQuery();
  const historyQ = api.partnerCommission.invoiceHistory.useQuery();
  const claims = useMemo(() => claimsQ.data ?? [], [claimsQ.data]);

  const kpis = useMemo(() => {
    let receivable = 0, available = 0, invoiced = 0, paid = 0;
    for (const c of claims) {
      if (c.status === "claimable") { available += c.claimableInr; receivable += c.claimableInr; }
      else if (c.status === "invoiced") { invoiced += c.claimableInr; receivable += c.claimableInr; }
      else if (c.status === "paid") paid += c.claimableInr;
    }
    return { receivable, available, invoiced, paid };
  }, [claims]);

  const selectedClaims = claims.filter((c) => selected.has(c.commissionId));
  const toggle = (id: number) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Commission &amp; Payments</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Track your commissions, raise tax invoices, and follow your payouts.
          </p>
        </div>
        {selectedClaims.length > 0 && (
          <Button onClick={() => setWizard(true)}>Generate Invoice ({selectedClaims.length})</Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="revenue" tone="blue" label="Total Receivable" value={claimsQ.data ? formatINR(kpis.receivable) : "—"} />
        <StatCard icon="deposit" tone="green" label="Available to Claim" value={claimsQ.data ? formatINR(kpis.available) : "—"} />
        <StatCard icon="applications" tone="orange" label="Invoiced (in review)" value={claimsQ.data ? formatINR(kpis.invoiced) : "—"} />
        <StatCard icon="check" tone="purple" label="Paid to You" value={claimsQ.data ? formatINR(kpis.paid) : "—"} />
      </div>

      <DashboardCard title="Your Commissions" bodyClassName="p-0" className="mb-6">
        {claimsQ.isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : claims.length === 0 ? (
          <EmptyState label="No commissions yet. They appear here once a placed student's commission is processed." />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${TH} w-10`}></th>
                <th className={TH}>Student</th>
                <th className={TH}>University / Program</th>
                <th className={TH}>Commission</th>
                <th className={TH}>% Share</th>
                <th className={TH}>Claimable (₹)</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.commissionId} className="border-b border-[#F2F4F7] last:border-0 hover:bg-[#FCFCFD]">
                  <td className={`${TD} w-10`}>
                    <input
                      type="checkbox"
                      disabled={!c.selectable}
                      checked={selected.has(c.commissionId)}
                      onChange={() => toggle(c.commissionId)}
                    />
                  </td>
                  <td className={`${TD} font-medium text-[#101828]`}>
                    {c.studentName}
                    <span className="block text-xs font-normal text-[#98A2B3]">{c.studentCode}</span>
                  </td>
                  <td className={TD}>
                    {c.university}
                    <span className="block text-xs text-[#98A2B3]">{c.program}</span>
                  </td>
                  <td className={TD}>{c.currency} {c.commissionAmount.toLocaleString()}</td>
                  <td className={TD}>{c.partnerSharePct}%</td>
                  <td className={`${TD} font-semibold text-[#101828]`}>{inr(c.claimableInr)}</td>
                  <td className={TD}><ClaimStatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>

      <DashboardCard title="Invoice History" bodyClassName="p-0">
        {historyQ.isLoading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : (historyQ.data ?? []).length === 0 ? (
          <EmptyState label="No invoices raised yet." />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Invoice #</th>
                <th className={TH}>Date</th>
                <th className={TH}>Students</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Net Payable</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(historyQ.data ?? []).map((h) => (
                <tr key={h.id} className="border-b border-[#F2F4F7] last:border-0">
                  <td className={`${TD} font-medium text-[#101828]`}>{h.invoiceNumber}</td>
                  <td className={TD}>{formatDate(h.invoiceDate)}</td>
                  <td className={TD}>{h.students}</td>
                  <td className={TD}>{inr(h.totalAmount)}</td>
                  <td className={`${TD} font-semibold text-[#101828]`}>{inr(h.netPayable)}</td>
                  <td className={TD}>
                    <InvoiceStatusPill status={h.status} />
                    {h.status === PartnerInvoiceStatus.REJECTED && h.rejectionReason && (
                      <span className="block text-[11px] text-[#B42318]">{h.rejectionReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>

      {wizard && (
        <InvoiceWizard
          claims={selectedClaims}
          onClose={() => setWizard(false)}
          onDone={() => {
            setWizard(false);
            setSelected(new Set());
            showToast("Invoice submitted to CollegePond");
          }}
        />
      )}

      <Toast message={toastMsg} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}

// =============================================================================
// Invoice wizard (3 steps: review → details → preview & submit)
// =============================================================================
function InvoiceWizard({
  claims,
  onClose,
  onDone,
}: {
  claims: Claim[];
  onClose: () => void;
  onDone: () => void;
}) {
  const utils = api.useUtils();
  const bankQ = api.partnerCommission.bankAccount.useQuery();
  const bank = bankQ.data;

  const [step, setStep] = useState(1);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayInput());
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [signatory, setSignatory] = useState("");
  const [designation, setDesignation] = useState("Authorized Signatory");
  const [signed, setSigned] = useState(false);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  // Prefill non-sensitive fields from the saved account/org once it loads
  // (functional updates so the partner's own edits aren't clobbered on refetch).
  useEffect(() => {
    if (!bank) return;
    setGstin((v) => v || (bank.gstin ?? ""));
    setAccountHolder((v) => v || (bank.accountHolder ?? ""));
    setIfsc((v) => v || (bank.ifsc ?? ""));
    setBankName((v) => v || (bank.bankName ?? ""));
  }, [bank]);

  const commissionIds = claims.map((c) => c.commissionId);
  const previewQ = api.partnerCommission.taxPreview.useQuery(
    { commissionIds, gstin: gstin || undefined },
    { enabled: step === 3 },
  );

  const save = api.partnerCommission.saveBankAccount.useMutation();
  const generate = api.partnerCommission.generateInvoice.useMutation();
  const busy = save.isPending || generate.isPending;

  const next = () => {
    setErr("");
    if (step === 2) {
      if (!invoiceNumber.trim()) return setErr("Invoice number is required");
      if (!signatory.trim()) return setErr("Signatory name is required");
      if (!signed) return setErr("Please apply your digital signature");
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = async () => {
    setErr("");
    try {
      // Persist bank details (encrypted at rest) if the partner entered a number.
      if (accountNumber.trim()) {
        await save.mutateAsync({
          accountHolder: accountHolder.trim() || signatory.trim() || "Account Holder",
          accountNumber: accountNumber.trim(),
          ifsc: ifsc || undefined,
          bankName: bankName || undefined,
          gstin: gstin || undefined,
          pan: pan || undefined,
        });
      }
      await generate.mutateAsync({
        commissionIds,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        gstin: gstin || undefined,
        pan: pan || undefined,
        signatoryName: signatory.trim(),
        signatoryDesignation: designation || undefined,
        notes: notes || undefined,
      });
      void utils.partnerCommission.invalidate();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit invoice");
    }
  };

  const total = claims.reduce((s, c) => s + c.claimableInr, 0);
  const STEPS = ["Review", "Details", "Preview"];

  return (
    <Modal
      open
      title="Generate Tax Invoice"
      width="w-[760px]"
      onClose={onClose}
      footer={
        <>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Back</Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button onClick={next}>Next</Button>
          ) : (
            <Button onClick={submit} loading={busy}>Submit Invoice</Button>
          )}
        </>
      }
    >
      {/* Step indicator */}
      <div className="mb-2 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step >= i + 1 ? "bg-[#1570EF] text-white" : "bg-[#F2F4F7] text-[#98A2B3]"
            }`}>{i + 1}</span>
            <span className={`text-sm font-semibold ${step >= i + 1 ? "text-[#101828]" : "text-[#98A2B3]"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-[#E4E7EC]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="overflow-hidden rounded-lg border border-[#E4E7EC]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Student</th>
                <th className={TH}>University</th>
                <th className={TH}>% Share</th>
                <th className={`${TH} text-right`}>Claimable (₹)</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.commissionId} className="border-b border-[#F2F4F7] last:border-0">
                  <td className={`${TD} font-medium text-[#101828]`}>{c.studentName}<span className="block text-xs font-normal text-[#98A2B3]">{c.studentCode}</span></td>
                  <td className={TD}>{c.university}</td>
                  <td className={TD}>{c.partnerSharePct}%</td>
                  <td className={`${TD} text-right font-semibold`}>{inr(c.claimableInr)}</td>
                </tr>
              ))}
              <tr className="bg-[#F9FAFB]">
                <td className={`${TD} font-bold`} colSpan={3}>Total</td>
                <td className={`${TD} text-right font-bold text-[#101828]`}>{inr(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <FormInput label="Tax Invoice #" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV/CP/2026/012" />
            <FormInput label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <FormInput label="Your GSTIN (blank if unregistered → TDS applies)" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="27ABCDE1234F1Z5" />
            <FormInput label="PAN" value={pan} onChange={(e) => setPan(e.target.value)} placeholder="ABCDE1234F" />
          </div>
          <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-[#667085] uppercase">Bank details (for payout)</span>
              {bank?.hasAccount && bank.accountNumberLast4 && !accountNumber && (
                <span className="text-xs text-[#98A2B3]">On file: ••••{bank.accountNumberLast4}</span>
              )}
            </div>
            <div className="flex gap-3">
              <FormInput label="Account Holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
              <FormInput
                label={bank?.hasAccount ? "Account Number (re-enter to update)" : "Account Number"}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={bank?.accountNumberLast4 ? `••••${bank.accountNumberLast4}` : ""}
              />
            </div>
            <div className="mt-3 flex gap-3">
              <FormInput label="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
              <FormInput label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <p className="mt-2 text-[11px] text-[#98A2B3]">🔒 Stored encrypted (AES-256-GCM). Only the last 4 digits are shown back.</p>
          </div>
          <div className="flex gap-3">
            <FormInput label="Authorized Signatory" required value={signatory} onChange={(e) => setSignatory(e.target.value)} />
            <FormInput label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => setSigned((v) => !v)}
            className={`w-full rounded-lg border-2 border-dashed py-3 text-sm font-semibold transition ${
              signed ? "border-[#12B76A] bg-[#ECFDF3] text-[#067647]" : "border-[#D0D5DD] text-[#667085] hover:border-[#1570EF]"
            }`}
          >
            {signed ? `✓ Digitally signed by ${signatory || "you"}` : "Click to apply your digital signature"}
          </button>
          <FormTextarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {err && <p className="text-xs font-medium text-[#F04438]">{err}</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          {previewQ.isLoading || !previewQ.data ? (
            <SkeletonTable rows={4} cols={2} />
          ) : (
            <div className="rounded-lg border border-[#E4E7EC] p-5">
              <div className="mb-3 text-center">
                <div className="text-base font-bold text-[#101828]">TAX INVOICE</div>
                <div className="text-xs text-[#98A2B3]">{invoiceNumber} · {formatDate(invoiceDate)}</div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-[#667085]">From (Supplier)</div>
                  <div className="text-[#101828]">{bank?.orgName ?? "Your Agency"}</div>
                  <div className="text-[#667085]">{gstin ? `GSTIN: ${gstin}` : pan ? `PAN: ${pan}` : "Unregistered"}</div>
                </div>
                <div>
                  <div className="font-semibold text-[#667085]">Bill To (Recipient)</div>
                  <div className="text-[#101828]">{previewQ.data.cpName}</div>
                  <div className="text-[#667085]">GSTIN: {previewQ.data.cpGstin} · SAC: {previewQ.data.sac}</div>
                </div>
              </div>
              <table className="mb-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Student</th>
                    <th className={`${TH} text-right`}>Claimable (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.commissionId} className="border-b border-[#F2F4F7]">
                      <td className={TD}>{c.studentName}</td>
                      <td className={`${TD} text-right`}>{inr(c.claimableInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ml-auto w-64 space-y-1 text-sm">
                <Row label="Subtotal" value={inr(previewQ.data.subtotal)} />
                {previewQ.data.isInterstate === false && (
                  <>
                    <Row label="CGST @9%" value={inr(previewQ.data.cgst)} />
                    <Row label="SGST @9%" value={inr(previewQ.data.sgst)} />
                  </>
                )}
                {previewQ.data.isInterstate === true && <Row label="IGST @18%" value={inr(previewQ.data.igst)} />}
                {previewQ.data.isInterstate === null && (
                  <Row label="Less: TDS @2% (194J)" value={`− ${inr(previewQ.data.tds)}`} />
                )}
                <div className="border-t border-[#E4E7EC] pt-1">
                  <Row label="Net Payable" value={inr(previewQ.data.netPayable)} bold />
                </div>
              </div>
              <p className="mt-4 text-[11px] text-[#98A2B3]">Authorized signatory: {signatory} ({designation}) · signed {formatDate(invoiceDate)}</p>
            </div>
          )}
          {err && <p className="mt-2 text-xs font-medium text-[#F04438]">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-[#101828]" : "text-[#344054]"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
