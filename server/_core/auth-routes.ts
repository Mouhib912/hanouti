import type { Express, Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import * as db from "../db";
import { authenticateRequest, hashPassword, signSession, verifyPassword } from "./auth";
import { getSessionCookieOptions } from "./cookies";

// Tunisian mobile: 8 digits, leading digit 2-9. Accepts optional +216/216 prefix
// plus spaces/hyphens/dots which are stripped before validation.
const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s\-.]/g, "").replace(/^\+?216/, ""))
  .refine((s) => /^[2-9]\d{7}$/.test(s), {
    message: "Numéro tunisien (8 chiffres, ex: 55 123 456)",
  });
const passwordSchema = z.string().min(8).max(128);

const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(120),
  userType: z.enum(["provider", "buyer"]),
  businessName: z.string().trim().min(1).max(255),
  location: z.string().trim().max(2000).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

async function publicUserWithProfile(userId: number) {
  const u = await db.getUserWithProfile(userId);
  if (!u) throw new Error("User not found");
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    lastSignedIn: u.lastSignedIn.toISOString(),
    userType: u.profile?.userType ?? null,
    businessName: u.profile?.businessName ?? null,
    avatarUrl: u.profile?.avatarUrl ?? null,
  };
}

async function setSessionCookie(req: Request, res: Response, token: string) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { phone, password, name, userType, businessName, location, avatarUrl } = parsed.data;

    try {
      const existing = await db.getUserByPhone(phone);
      if (existing) {
        res.status(409).json({ error: "Phone already registered" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const userId = await db.createUser({ phone, passwordHash, name });
      await db.createUserProfile({ userId, userType, businessName, location, avatarUrl });

      const token = await signSession(userId);
      await setSessionCookie(req, res, token);

      res.json({ sessionToken: token, user: await publicUserWithProfile(userId) });
    } catch (error) {
      console.error("[Auth] register failed:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { phone, password } = parsed.data;

    try {
      const user = await db.getUserByPhone(phone);
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        res.status(401).json({ error: "Invalid phone or password" });
        return;
      }

      await db.touchLastSignedIn(user.id);
      const token = await signSession(user.id);
      await setSessionCookie(req, res, token);
      res.json({ sessionToken: token, user: await publicUserWithProfile(user.id) });
    } catch (error) {
      console.error("[Auth] login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.post("/api/auth/delete-account", async (req: Request, res: Response) => {
    const schema = z.object({ password: passwordSchema });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    try {
      const user = await authenticateRequest(req);
      const ok = await verifyPassword(user.passwordHash, parsed.data.password);
      if (!ok) {
        res.status(401).json({ error: "Password is incorrect" });
        return;
      }
      await db.softDeleteUser(user.id);

      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] delete-account failed:", error);
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    const schema = z.object({
      currentPassword: passwordSchema,
      newPassword: passwordSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    try {
      const user = await authenticateRequest(req);
      const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
      if (!ok) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
      if (parsed.data.currentPassword === parsed.data.newPassword) {
        res.status(400).json({ error: "New password must be different from the current one" });
        return;
      }
      const newHash = await hashPassword(parsed.data.newPassword);
      await db.setUserPassword(user.id, newHash);
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] change-password failed:", error);
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      res.json({ user: await publicUserWithProfile(user.id) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
}
