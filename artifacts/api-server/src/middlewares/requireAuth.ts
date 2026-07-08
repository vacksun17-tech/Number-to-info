import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized. Please login at /api/auth/login" });
  }
}
