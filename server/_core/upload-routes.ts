import crypto from "crypto";
import path from "path";
import { mkdirSync } from "fs";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import multer from "multer";

import * as db from "../db";
import { authenticateRequest } from "./auth";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const PRODUCT_IMAGES_DIR = path.join(UPLOADS_ROOT, "products");
const AVATAR_IMAGES_DIR = path.join(UPLOADS_ROOT, "avatars");
const MAX_BYTES = 20 * 1024 * 1024;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
mkdirSync(AVATAR_IMAGES_DIR, { recursive: true });

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRODUCT_IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.originalname) ?? "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const avatarImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.originalname) ?? "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export function registerUploadRoutes(app: Express) {
  app.use(
    "/uploads",
    express.static(UPLOADS_ROOT, {
      fallthrough: false,
      maxAge: "7d",
      index: false,
    }),
  );

  app.post(
    "/api/uploads/product-image",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authenticateRequest(req);
        const profile = await db.getUserProfile(user.id);
        if (profile?.userType !== "provider") {
          res.status(403).json({ error: "Only providers can upload product images" });
          return;
        }
        (req as Request & { _authUserId?: number })._authUserId = user.id;
        next();
      } catch (err) {
        res.status(401).json({ error: "Not authenticated" });
      }
    },
    (req: Request, res: Response, next: NextFunction) => {
      productImageUpload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({ error: "Image must be 20 MB or smaller" });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        if (err) {
          res.status(400).json({ error: err.message ?? "Upload failed" });
          return;
        }
        next();
      });
    },
    (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({ error: "No file provided (expected field 'file')" });
        return;
      }
      const relativePath = `/uploads/products/${req.file.filename}`;
      res.json({ url: relativePath });
    },
  );

  // Avatar upload — open endpoint (used during signup before a session exists).
  // 5MB limit, image MIME only. Server stores under /uploads/avatars/.
  app.post(
    "/api/uploads/avatar",
    (req: Request, res: Response, next: NextFunction) => {
      avatarImageUpload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({ error: "Avatar must be 5 MB or smaller" });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        if (err) {
          res.status(400).json({ error: err.message ?? "Upload failed" });
          return;
        }
        next();
      });
    },
    (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({ error: "No file provided (expected field 'file')" });
        return;
      }
      const relativePath = `/uploads/avatars/${req.file.filename}`;
      res.json({ url: relativePath });
    },
  );
}
