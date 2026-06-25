"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { UserStatus } from "~/server/db/enums";
import { formatDate } from "~/components/dashboard/format";
import { EmptyState, SkeletonTable } from "~/components/dashboard/widgets";

const STATUS: Record<number, { label: string; cls: string }> = {
  [UserStatus.UNDER_REVIEW]: {
    label: "Pending Approval",
    cls: "bg-[#FFF6ED] text-[#B93815]",
  },
  [UserStatus.APPROVED]: { label: "Active", cls: "bg-[#ECFDF3] text-[#027A48]" },
  [UserStatus.REJECTED]: { label: "Rejected", cls: "bg-[#FEF3F2] text-[#B42318]" },
  [UserStatus.INACTIVE]: { label: "Inactive", cls: "bg-[#F2F4F7] text-[#344054]" },
};

const EMPTY = { firstName: "", lastName: "", email: "", phone: "" };

const inputCls =
  "h-[38px] w-full rounded-lg border border-[#D0D5DD] px-3 text-[13px] text-[#101828] outline-none focus:border-[#1570EF]";
const labelCls = "mb-1.5 block text-[13px] font-medium text-[#344054]";

export default function PartnerCounsellorsPage() {
  const { data, isLoading } = api.counsellors.myCounsellors.useQuery();
  const utils = api.useUtils();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const add = api.counsellors.addCounsellor.useMutation({
    onSuccess: () => {
      setForm(EMPTY);
      setError("");
      void utils.counsellors.myCounsellors.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === UserStatus.UNDER_REVIEW).length;
  const canSubmit =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    !add.isPending;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Counsellors</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Add the counsellors in your agency. New counsellors are reviewed by
          Collegepond before they go active.
        </p>
      </div>

      {/* Add form */}
      <div className="mb-6 rounded-xl border border-[#E4E7EC] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#101828]">Add a counsellor</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>First name</label>
            <input
              className={inputCls}
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="Priya"
            />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input
              className={inputCls}
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Mehta"
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="priya@agency.com"
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98XXXXXXXX"
            />
          </div>
        </div>
        {error !== "" && <p className="mt-3 text-[13px] text-[#F04438]">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              add.mutate({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
              })
            }
            className="h-9 rounded-lg bg-[#1570EF] px-4 text-[13px] font-semibold text-white hover:bg-[#1260d4] disabled:opacity-50"
          >
            {add.isPending ? "Adding…" : "Add Counsellor"}
          </button>
          <span className="text-[12px] text-[#98A2B3]">
            New counsellors show as Pending Approval until Collegepond reviews them.
          </span>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#101828]">Your Counsellors</h2>
          <span className="text-[13px] text-[#667085]">
            {rows.length} total{pending > 0 ? ` · ${pending} pending` : ""}
          </span>
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState label="No counsellors yet — add your first above." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB] text-left text-[11px] font-semibold tracking-wide text-[#667085] uppercase">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Added</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const st = STATUS[c.status] ?? {
                    label: "Unknown",
                    cls: "bg-[#F2F4F7] text-[#344054]",
                  };
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[#F2F4F7] text-[13px] last:border-0 hover:bg-[#FAFBFC]"
                    >
                      <td className="px-4 py-3 font-medium text-[#101828]">{c.name}</td>
                      <td className="px-4 py-3 text-[#475467]">{c.email}</td>
                      <td className="px-4 py-3 text-[#475467]">{c.phone}</td>
                      <td className="px-4 py-3 text-[#475467]">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
