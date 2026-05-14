import { hash, verify } from "@node-rs/argon2";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

type SessionPayload = { uid: number };

function getSessionSecret(): Uint8Array {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(uid: number, expiresInMs = ONE_YEAR_MS): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const uid = (payload as Record<string, unknown>).uid;
    if (typeof uid !== "number" || !Number.isInteger(uid) || uid <= 0) return null;
    return { uid };
  } catch {
    return null;
  }
}

function readToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  return parseCookieHeader(cookieHeader)[COOKIE_NAME];
}

export async function authenticateRequest(req: Request): Promise<User> {
  const token = readToken(req);
  const session = await verifySession(token);
  if (!session) throw ForbiddenError("Invalid session");

  const user = await db.getUserById(session.uid);
  if (!user) throw ForbiddenError("User not found");
  if (user.deletedAt) throw ForbiddenError("Account is deleted");

  await db.touchLastSignedIn(user.id);
  return user;
}
