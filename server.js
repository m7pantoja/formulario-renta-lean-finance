import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "lf-secret-key-2026";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "leanfinance2026";
const DATA_DIR = join(__dirname, "data");
const DATA_FILE = join(DATA_DIR, "submissions.json");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");

// ── Helpers ─────────────────────────────────────────────────────
function readSubmissions() {
    try {
        return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function writeSubmissions(data) {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token requerido" });
    }
    try {
        const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

// ── Express App ─────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// --- API routes ---

// Public: save a submission
app.post("/api/submissions", (req, res) => {
    const { name, email, phone, answers, plan } = req.body;
    if (!name || !email || !answers || !plan) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    const submission = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        email,
        phone: phone || "",
        answers,
        plan,
        date: new Date().toISOString(),
    };
    const subs = readSubmissions();
    subs.unshift(submission);
    writeSubmissions(subs);
    res.json({ ok: true, id: submission.id });
});

// Admin: login
app.post("/api/login", (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
    }
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
});

// Admin: get all submissions (protected)
app.get("/api/submissions", authMiddleware, (_req, res) => {
    const subs = readSubmissions();
    res.json(subs);
});

// --- Serve React build in production ---
const distPath = join(__dirname, "dist");
if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
        res.sendFile(join(distPath, "index.html"));
    });
}

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   Admin password: ${ADMIN_PASSWORD}`);
});
