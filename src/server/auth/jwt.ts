import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env";

const SESSION_COOKIE = "cp_session";
const SESSION_TTL = "8h";

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export interface SessionClaims {
  sub: string;
  role: number;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function signSessionJwt(claims: {
  id: number;
  role: number;
}): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.id))
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifySessionJwt(
  token: string,
): Promise<{ id: number; role: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.role !== "number") return null;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, role: payload.role };
  } catch {
    return null;
  }
}
