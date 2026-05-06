import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env";

const SESSION_TTL = "8h";

// Distinct cookie names so admin and partner sessions can coexist on the
// same browser without colliding (e.g. devs logged into both at once).
export const SESSION_COOKIE_NAME = "cp_session";
export const PARTNER_SESSION_COOKIE_NAME = "cp_partner_session";

function secret(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

// =============================================================================
// Admin session (collegepond_user)
// =============================================================================

export async function signSessionJwt(claims: {
  id: number;
  role: number;
}): Promise<string> {
  return new SignJWT({ kind: "admin", role: claims.role })
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
    if (payload.kind !== "admin") return null;
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.role !== "number") return null;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, role: payload.role };
  } catch {
    return null;
  }
}

// =============================================================================
// Partner session (user table — agency owner / independent counsellor)
// =============================================================================

export async function signPartnerSessionJwt(claims: {
  id: number;
}): Promise<string> {
  return new SignJWT({ kind: "partner" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.id))
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifyPartnerSessionJwt(
  token: string,
): Promise<{ id: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "partner") return null;
    if (typeof payload.sub !== "string") return null;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id };
  } catch {
    return null;
  }
}
