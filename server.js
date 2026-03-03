import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "lf-secret-key-2026";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "leanfinance2026";

// ── Supabase client ─────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ── Helpers ─────────────────────────────────────────────────────
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
app.post("/api/submissions", async (req, res) => {
    const { name, email, phone, answers, plan } = req.body;
    if (!name || !email || !answers || !plan) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const { data, error } = await supabase
        .from("submissions")
        .insert({
            name,
            email,
            phone: phone || "",
            answers,
            plan,
        })
        .select()
        .single();

    if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: "Error al guardar" });
    }

    res.json({ ok: true, id: data.id });
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
app.get("/api/submissions", authMiddleware, async (_req, res) => {
    const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase select error:", error);
        return res.status(500).json({ error: "Error al obtener datos" });
    }

    // Map to match the format the frontend expects
    const submissions = data.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        answers: s.answers,
        plan: s.plan,
        date: s.created_at,
    }));

    res.json(submissions);
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
});
