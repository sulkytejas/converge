import { randomUUID } from "node:crypto";
import { saveLocal, type StoredFile } from "./local";

export type { StoredFile };

function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function sanitizeFolder(folder: string): string {
  return folder
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .filter((seg) => seg.length > 0 && seg !== "." && seg !== "..")
    .join("/");
}

export async function saveUpload(
  file: File,
  opts: { folder?: string } = {},
): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const folder = opts.folder ? sanitizeFolder(opts.folder) || yyyyMm : yyyyMm;
  const key = `${folder}/${randomUUID()}-${sanitizeFilename(file.name)}`;

  return saveLocal(buffer, key);
}
