"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { FormInput, FormTextarea } from "~/components/ui/form-input";
import { FormSelect } from "~/components/ui/form-select";
import { NotePriority, NotePriorityLabel } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { timeAgo, type AdminStudentFull } from "../lib";

type Note = AdminStudentFull["notes"][number];

const PRIORITY_OPTIONS = [
  { value: String(NotePriority.HIGH), label: "High" },
  { value: String(NotePriority.MEDIUM), label: "Medium" },
  { value: String(NotePriority.LOW), label: "Low" },
];

const PRIORITY_COLOR: Record<number, string> = {
  [NotePriority.HIGH]: "#F04438",
  [NotePriority.MEDIUM]: "#F79009",
  [NotePriority.LOW]: "#12B76A",
};

function isOverdue(n: Note): boolean {
  if (!n.dueDate || n.isDone) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${n.dueDate}T00:00:00`) < today;
}

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TasksNotesTab({
  student,
  onToast,
}: {
  student: AdminStudentFull;
  onToast: (msg: string) => void;
}) {
  const utils = api.useUtils();
  const invalidate = () =>
    void utils.students.adminGet.invalidate({ id: student.id });

  const [draft, setDraft] = useState("");
  const [makeTask, setMakeTask] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(String(NotePriority.MEDIUM));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const addMut = api.students.addNote.useMutation({
    onSuccess: (_res, vars) => {
      invalidate();
      setDraft("");
      setMakeTask(false);
      setDueDate("");
      setPriority(String(NotePriority.MEDIUM));
      onToast(vars.isTask ? "Task added" : "Note added");
    },
    onError: (err) => onToast(err.message),
  });
  const updateMut = api.students.updateNote.useMutation({
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
    onError: (err) => onToast(err.message),
  });
  const deleteMut = api.students.deleteNote.useMutation({
    onSuccess: () => {
      invalidate();
      onToast("Deleted");
    },
    onError: (err) => onToast(err.message),
  });

  const tasks = student.notes.filter((n) => n.isTask);
  const notes = student.notes.filter((n) => !n.isTask);

  const save = () => {
    if (!draft.trim()) {
      onToast(makeTask ? "Please enter a task" : "Please enter a note");
      return;
    }
    addMut.mutate({
      studentId: student.id,
      body: draft.trim(),
      isTask: makeTask,
      dueDate: makeTask && dueDate ? dueDate : null,
      priority: makeTask ? Number(priority) : null,
    });
  };

  return (
    <>
      <h3 className="mb-4 text-base font-bold text-[#101828]">Tasks & Notes</h3>

      {/* Tasks */}
      <div className="mb-5 rounded-[14px] border border-[#E4E7EC] bg-white px-6 py-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-bold text-[#101828]">Student Tasks</span>
          <span className="rounded-xl bg-[#EFF8FF] px-2 py-0.5 text-xs font-semibold text-[#1570EF]">
            {tasks.filter((t) => !t.isDone).length} open
          </span>
        </div>
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D0D5DD] px-4 py-6 text-center text-[13px] text-[#98A2B3]">
            No tasks yet — add one below with “Make this a task”.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const overdue = isOverdue(t);
              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 rounded-[10px] border px-4 py-3 ${
                    overdue
                      ? "border-[#FDA29B] bg-[#FEF3F2]"
                      : "border-[#E4E7EC] bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={t.isDone}
                    onChange={() =>
                      updateMut.mutate({ id: t.id, isDone: !t.isDone })
                    }
                    aria-label={`Mark ${t.isDone ? "open" : "done"}`}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[#12B76A]"
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-medium break-words ${
                        t.isDone
                          ? "text-[#98A2B3] line-through"
                          : "text-[#344054]"
                      }`}
                    >
                      {t.body}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-[#667085]">
                      {t.dueDate && (
                        <span
                          className={
                            overdue ? "font-semibold text-[#B42318]" : ""
                          }
                        >
                          Due {formatDue(t.dueDate)}
                          {overdue ? " — overdue" : ""}
                        </span>
                      )}
                      {t.priority !== null && (
                        <span className="flex items-center gap-1">
                          <span
                            className="h-[7px] w-[7px] rounded-full"
                            style={{
                              background: PRIORITY_COLOR[t.priority] ?? "#667085",
                            }}
                          />
                          {NotePriorityLabel[t.priority as NotePriority] ??
                            t.priority}
                        </span>
                      )}
                      {t.author && <span>by {t.author}</span>}
                      <span>{timeAgo(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        updateMut.mutate({
                          id: t.id,
                          isTask: false,
                          dueDate: null,
                          priority: null,
                          isDone: false,
                        })
                      }
                      className="cursor-pointer text-[#1570EF] hover:underline"
                    >
                      Convert to Note
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate({ id: t.id })}
                      className="cursor-pointer text-[#F04438] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mb-5 rounded-[14px] border border-[#E4E7EC] bg-white px-6 py-5">
        <FormTextarea
          placeholder="Add a note..."
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs font-medium text-[#344054]">
              <input
                type="checkbox"
                checked={makeTask}
                onChange={(e) => setMakeTask(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#1570EF]"
              />
              Make this a task
            </label>
            {makeTask && (
              <>
                <div className="w-[170px]">
                  <FormInput
                    label="Due date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="w-[140px]">
                  <FormSelect
                    label="Priority"
                    options={PRIORITY_OPTIONS}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <Button
            onClick={save}
            loading={addMut.isPending}
            className="!h-[38px] !px-5 !text-[13px]"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Notes timeline */}
      <div className="rounded-[14px] border border-[#E4E7EC] bg-white px-6 py-5">
        <div className="mb-3 text-sm font-bold text-[#101828]">Notes</div>
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D0D5DD] px-4 py-6 text-center text-[13px] text-[#98A2B3]">
            No notes yet.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((n) => (
              <div
                key={n.id}
                className="border-b border-[#F2F4F7] pb-4 last:border-b-0 last:pb-0"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[#98A2B3]">
                  <span>
                    {new Date(n.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {n.author && <span>· {n.author}</span>}
                </div>
                {editingId === n.id ? (
                  <div>
                    <FormTextarea
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="mt-2 flex gap-3 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editText.trim()) return;
                          updateMut.mutate({ id: n.id, body: editText.trim() });
                        }}
                        className="cursor-pointer text-[#1570EF] hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer text-[#667085] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] break-words text-[#344054]">
                      {n.body}
                    </div>
                    <div className="mt-1.5 flex gap-3 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(n.id);
                          setEditText(n.body);
                        }}
                        className="cursor-pointer text-[#667085] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateMut.mutate({
                            id: n.id,
                            isTask: true,
                            priority: NotePriority.MEDIUM,
                          })
                        }
                        className="cursor-pointer text-[#1570EF] hover:underline"
                      >
                        Convert to Task
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMut.mutate({ id: n.id })}
                        className="cursor-pointer text-[#F04438] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
