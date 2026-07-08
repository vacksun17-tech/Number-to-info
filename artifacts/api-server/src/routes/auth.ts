import { Router } from "express";

const router = Router();

const ADMIN_USERNAME = "kasak";
const ADMIN_PASSWORD = "rohan";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.authenticated = true;
  req.session.username = username;
  res.json({ success: true, username });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/auth/me", (req, res) => {
  if (req.session.authenticated) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
