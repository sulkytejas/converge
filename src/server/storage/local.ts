import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const URL_PREFIX = "/uploads";

export interface StoredFile {
  path: string;
  url: string;
}

export async function saveLocal(
  buffer: Buffer,
  keyPath: string,
): Promise<StoredFile> {
  const absPath = path.join(UPLOAD_DIR, keyPath);
  const dir = path.dirname(absPath);

  const resolvedUploadDir = path.resolve(UPLOAD_DIR);
  const resolvedDir = path.resolve(dir);
  if (!resolvedDir.startsWith(resolvedUploadDir + path.sep) && resolvedDir !== resolvedUploadDir) {
    throw new Error("Invalid upload path");
  }

  await mkdir(dir, { recursive: true });
  await writeFile(absPath, buffer);

  return {
    path: absPath,
    url: `${URL_PREFIX}/${keyPath.split(path.sep).join("/")}`,
  };
}
