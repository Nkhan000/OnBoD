import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

interface AccessClaims extends JWTPayload {
  tid: string;
}

export function signAccessToken(c: {
  userId: string;
  tenantId: string;
}): Promise<string> {
  return new SignJWT({ tid: c.tenantId })
    .setProtectedHeader({ alg: ALG })
    .setSubject(c.userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; tenantId: string }> {
  const { payload } = await jwtVerify<AccessClaims>(token, secret, {
    algorithms: [ALG],
  });
  if (!payload.sub || !payload.tid) throw new Error("Malformed Access Token");
  return { userId: payload.sub, tenantId: payload.tid };
}
