# Build Updates — plain-English log

> A running, email-ready summary of what's been built/changed, newest first.
> Written for a non-technical update (client / team). Ask for any section to drop into an email.

---

## 2026-06-30 — Partners get notified when CP decides on their counsellor (SHIPPED)

**What changed (in plain terms):** When CollegePond **approves or rejects a counsellor** a partner submitted, the partner now gets an **in-app notification** in their portal — a bell alert like *"Nisha Iyer was approved as a counsellor"* (or, if declined, with the reason). No more wondering whether their counsellor got the go-ahead.

**Why it matters:** Closes the loop on counsellor approvals — the partner finds out the moment CP decides, right inside the portal. Per your guidance, this is **in-app only** (email is reserved for genuinely important events).

**Details:**
- Built a proper **notification system** for partners (a real, stored feed — not a guess), so notifications persist and can be marked read. This is the reusable foundation for future in-app alerts (invoices, payouts, etc.).
- The partner's **bell icon** now shows unread alerts with a red dot; opening it lists them (green dot = good news, red = declined), and **"Mark all as read"** clears them.
- Wired into the existing **Counselor Approvals** screen — approving/rejecting a counsellor automatically notifies the partner's owner.
- Verified in-browser end-to-end: approved a counsellor as admin → the partner's bell showed the alert as unread → "Mark all as read" cleared it.

**Status:** Built and tested in-browser. Includes a small database addition (a notifications table) that will apply automatically on the next production deploy. Not yet deployed.

---

## 2026-06-30 — Change an application's stage from the Applications list (SHIPPED)

**What changed (in plain terms):** On the admin **Applications** page, you can now **change a student's application stage right from the list** — pick the new stage from a dropdown on the row. Previously the list was read-only and you had to open each student's profile to move their stage.

**Why it matters:** Ops can move applications forward (or mark an outcome) in a couple of clicks across the whole pipeline, without hopping into individual profiles. The stat cards at the top (Active / In Progress / Offers / Deposits / Enrolled) update live as stages change.

**Details:**
- Each row's **Stage** is now a dropdown, split into **"Move to stage"** (the happy-path steps: Begin Application → … → Enrolled) and **"Mark as outcome"** (the closing states: Rejected, Withdrawn, Declined, Visa Rejected, Deferred, Course Closed).
- Changing a stage uses the **same engine as the student profile**, so it keeps the full stage history, the submitted/decision dates, the student's overall status, and the audit trail — nothing is a shortcut.
- Verified in-browser: advancing a student updated the row + the summary counts instantly, and reverting put everything back.

**Status:** Built and tested in-browser. Not yet deployed to production.

---

## 2026-06-28 — Commission tranches: "pay-as-collected" (SHIPPED)

**What changed (in plain terms):** Previously a partner had to wait until a student's *entire* commission was collected from the university before they could claim any of it. Now, **as each instalment (tranche) is collected, the partner can claim their share of that instalment right away** — they don't wait for the whole thing.

**Why it matters:** Partners get paid their share sooner, instalment by instalment, instead of waiting for the final payment. This is how commission instalments are supposed to work, and it's now correct in the system.

**What a partner now sees** (Commission & Payments page):
- Each student's row shows a small **"2/3 tranches collected"** progress bar.
- Opening a student shows a **tranche-by-tranche breakdown** — e.g. *Tranche 1: Paid ₹1,47,600 · Tranche 2: Available to Claim ₹88,560 · Tranche 3: Upcoming*.
- Generating an invoice automatically claims only the instalments that have actually been collected.

**What CP/admin now sees** (University Billing page): each student shows **"n/m tranches collected"** so finance can see collection progress at a glance.

**Status:** Built, tested in-browser, and pushed to the working branch (not yet deployed to production).

---

## 2026-06-28 — Admin Commission Ledger (IN PROGRESS)

**What it is (in plain terms):** A single new page for CP finance that lists **every commission across every partner** in one place, showing exactly where each one is in its journey: *Not Invoiced → Invoiced → Received (money in) → Ready to Disburse → Disbursed (money out)*. Today that information is split across three separate screens; this becomes the single source of truth.

**Why it matters:** Finance can answer "show me every commission and exactly where it's stuck" in one view — the reconciliation/audit view a commission business needs. It's a page that was already in the original design (`cp-commissions.html`).

**Important correctness fix vs. the original mockup:** The mockup's one-click "Mark Received" and "Mark Disbursed" buttons just flipped a status label — they **never recorded the exchange rate or the bank payment reference**, which would put wrong numbers in the books. In our build, those two money-moving steps instead **route into the existing screens that capture the real exchange rate and payment reference**, so the books stay correct. Only the safe internal step (approve-for-disbursement) is a one-click action.

**What got built:**
- A new **Commission Ledger** page (Finance menu) listing every commission across all partners.
- **Pipeline summary cards** at the top — a live count + ₹ total for each of the 5 stages (Not Invoiced / Invoiced / Received / Ready to Disburse / Disbursed), each clickable to filter.
- **Filters**: partner, intake, country, status, financial year, and free-text search.
- **Commissions table**: student, partner, university, country, tuition, rate, commission, ₹ value, a colour-coded **status** badge, a **tranche progress** bar (e.g. "2/3 collected · 1 paid"), and a **Next Step** column that tells finance exactly what to do next and links straight to the right screen.
- A **"By Partner"** view that groups the same commissions per partner with status counts + total ₹, expandable to the underlying list.
- A **detail pop-up** per commission: amounts, partner share, a tranche-by-tranche breakdown, and the linked vendor/partner invoice references and key dates.
- **Export to CSV** and a **bulk "Approve for Disbursement"** action (the one safe one-click step).
- Visible to Finance Managers / Admins only.

**The "Next Step" is honest about who holds the ball:**
- *Not Invoiced / Invoiced* → "Bill the vendor" / "Record collection" → opens **University Billing** (captures the real exchange rate).
- *Received, partner hasn't claimed yet* → shows **"⏳ Awaiting partner claim"** (no action — it's the partner's move).
- *Received, partner invoice waiting* → "Approve payout" → opens **Invoices & Payouts**.
- *Ready to Disburse* → "Release payment" → opens **Reconciliation** (captures the payment reference + bank-verification check).
- *Disbursed* → "✓ Done".

**Status:** Built and tested in-browser (the seeded GEC partner shows Priya = Disbursed, Rahul = Received with the live tranche progress + "Awaiting partner claim"). Not yet deployed to production.
