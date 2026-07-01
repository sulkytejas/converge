# Build Updates — plain-English log

> A running, email-ready summary of what's been built/changed, newest first.
> Written for a non-technical update (client / team). Ask for any section to drop into an email.

---

## 2026-06-30 — WhatsApp chat with students, inside the student profile (BUILT)

**What changed (in plain terms):** Every student profile now has a **Chat tab** that's a real **WhatsApp conversation** with that student — powered by **Periskope**. Counsellors type a message in the app and it goes out on WhatsApp; the student's replies come back and appear in the same thread, WhatsApp-style (their messages on the left, ours on the right, with timestamps and a "delivered" status).

**Why it matters:** Counsellors talk to students where students actually are — WhatsApp — without leaving the CRM, and the whole conversation is on record against the student.

**How it works under the hood:**
- Outgoing messages are sent through Periskope's API and saved to the conversation instantly.
- Incoming replies arrive via a secure webhook (`/api/v1/webhooks/whatsapp`) — every request is signature-verified before we trust it — and are matched to the right student by phone number.
- The thread auto-refreshes so replies show up without a reload.

**To go live (your side):**
- Add `PERISKOPE_PHONE=919867318381` to `.env` (the connected sender number "Suraj").
- The webhook is already at the URL you registered in Periskope. Once deployed, send a test message from a student profile and reply from the phone to confirm the round-trip.

**Status:** Fully built; the chat UI is verified in-browser with sample messages. The live send/receive round-trip needs your real keys on a deployed URL (webhooks can't reach localhost). Not yet deployed.

---

## 2026-06-30 — Applications list: "Quick look" drawer + clickable names (SHIPPED)

**What changed (in plain terms):** On the admin **Applications** page:
- Clicking a **student's name** now opens their **full profile** (as before).
- The old "View" button is now a **"Quick look"** that slides open a **side drawer** — a fast peek at one application *without leaving your filtered list*.

**Why it matters:** Ops can skim through a filtered list and glance at each student in place — contact details, university/programme, current stage, documents, and the stage timeline — then jump into the full profile only when needed. No more losing your place by navigating away.

**The drawer shows:** student contact + intake + assigned counsellor · university & programme · current stage (changeable right there) · uploaded documents with their review status · the application's stage-by-stage timeline · an "Open full profile →" button.

(We deliberately left out the mockup's "partner chat" section in that drawer — there's no messaging module in the app yet; that's a separate future build.)

**Status:** Built and tested in-browser. Not yet deployed.

---

## 2026-06-30 — Partner portal: Bank Details + Loyalty tabs in My Account (SHIPPED)

**What changed (in plain terms):** Two new tabs in the partner's **My Account**:
- **Bank Details** — the partner can now view and update the account CollegePond pays their commission into, right from their account page (previously only reachable buried inside the invoice wizard). The account number is masked (only the last 4 digits show) and stored encrypted.
- **Loyalty** — the partner's current tier, progress to the next tier, and the full tier ladder with benefits, all in one place (previously only a small banner on the Commission page).

**Why it matters:** Rounds out the partner's self-service portal — they can manage their payout account and see their loyalty standing without hunting for it.

**Also decided this round (not built, on purpose):**
- **MOU signature saving — dropped.** A drawn/typed signature stored in our database is **not legally binding** under Indian law; a valid e-signature needs a licensed provider (Leegality / Digio / eMudhra Aadhaar eSign) with identity verification and a tamper-evident audit trail. Real e-signature is a separate integration (later phase), so we did not build a "signature" that only *looks* official.
- **WhatsApp profile field — skipped** for now.
- **Pipeline "kanban" board — prototype first.** A kanban isn't literally in the original mockups, so we'll review a prototype before building it.

**Status:** Bank Details + Loyalty built and tested in-browser. Not yet deployed.

---

## 2026-06-30 — Admin settings now actually save (to the database) (SHIPPED)

**What changed (in plain terms):** The admin **Settings** page (company name, default currency, academic-year start month, date format, time zone, and the notification toggles) previously saved only inside that one browser — so the settings didn't really persist and weren't shared across devices or users. They now **save to the database**, properly and for everyone.

**Why it matters:** Settings are now real, durable configuration instead of a per-browser draft. Change them once and they stick — on any device, for the whole team. Every change is also written to the **audit log**.

**Details:**
- New database-backed store for system settings; the Settings page loads from and saves to it.
- Editing stays restricted to **Super Admins**; each save is audit-logged.
- Verified in-browser: changed the company name → saved → reloaded → the change was still there (loaded from the database, not the browser). Same for the notification toggles.

**Status:** Built and tested in-browser. Includes a small database addition (a settings table) that applies automatically on the next production deploy. Not yet deployed.

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

---

## 2026-07-02 — Admin polish batch: bugs, partner/user/student tools, FX reset

A batch of fixes and design-backed features across the admin portal.

**Bug fixes**
- **Universities:** programs are now **editable in place** (an Edit action re-opens the same form) instead of delete-and-recreate. Added the missing admission fields — **PTE / GRE / GMAT** minimum scores and an **application deadline** — and the expanded university view now shows each program's full requirements, application fee and deadline at a glance.
- **Uni-Assist:** the per-program **Shortlist** button is now greyed out with a tooltip until a student is selected, so it's clear up front that you must pick a student first (previously it looked active and only nagged after a click).

**Partners** — the Partner Management page now matches the design:
- **Tier** column + badge (Silver → Diamond) with an inline tier picker.
- **BDM reassignment** and **PAN** capture (for GST invoices) in a new **detail slide-over** ("View") that shows the partner's full contact/company/relationship info and documents.
- **Rejection / deactivation reasons are now saved** (previously chosen and thrown away) and shown in a Reason column + the slide-over; deactivation now asks for a reason.
- Account-lifecycle emails (approve / reject / deactivate / reactivate) are wired to the email provider (dormant until the templates are configured).

**Users**
- A **Department** field (Management / Finance / Operations / Business Development / Content) and column.
- **Delete** a staff account — blocked when they're still assigned to partners or students (reassign or deactivate first); you can't delete yourself.

**Students**
- **Bulk CSV import**: download a template, upload a CSV, see a per-row valid/invalid preview (with clear reasons), and import — duplicates (by email/phone) are skipped and reported.

**Counsellor Approvals**
- **Approve several pending counsellors at once** via row checkboxes + a select-all and an "Approve N Selected" bar.

**Settings → Exchange Rates**
- **Reset** a currency's manual override back to the live mid-market rate in one click (shown only when an override is set).

**Navigation**
- Removed the deprecated **Notes & Reminders** tab from the sidebar.

**Status:** Built and verified in-browser. Committed to the working branch; not yet pushed or deployed.
