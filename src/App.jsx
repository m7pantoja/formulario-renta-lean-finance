import { useState, useCallback } from "react";

// ── Lean Finance brand palette ──────────────────────────────────
const theme = {
    bg: "#F7F8FA",
    card: "#FFFFFF",
    primary: "#00C9B7",
    primaryDark: "#00A89B",
    accent: "#1A2B4A",
    text: "#2D3748",
    textLight: "#718096",
    border: "#E2E8F0",
    success: "#48BB78",
    warning: "#ED8936",
    danger: "#FC8181",
    plan1: "#00C9B7",
    plan2: "#3B82F6",
    plan3: "#8B5CF6",
    plan4: "#F59E0B",
};

// ── Questions that drive the logic ──────────────────────────────
const questions = [
    {
        id: "nomina",
        text: "¿Tus ingresos provienen únicamente de nómina/s?",
        helpText: "Es decir, solo recibes ingresos como empleado por cuenta ajena o una nómina como autónomo societario",
    },
    {
        id: "facturas",
        text: "¿Emites facturas por actividad económica (autónomo/profesional)?",
        helpText: "Si realizas alguna actividad económica por la que facturas.",
    },
    {
        id: "segunda_vivienda",
        text: "¿Tienes alguna segunda vivienda en propiedad (además de tu vivienda habitual)?",
        helpText: "Cualquier inmueble adicional, esté o no alquilado.",
    },
    {
        id: "alquiler_una",
        text: "¿Tienes ingresos por alquiler de UNA vivienda?",
        helpText: "Recibes rentas de un único inmueble alquilado.",
    },
    {
        id: "alquiler_varias",
        text: "¿Tienes ingresos por alquiler de MÁS DE UNA vivienda?",
        helpText: "Recibes rentas de dos o más inmuebles alquilados.",
    },
    {
        id: "dividendos",
        text: "¿Percibes ingresos de dividendos, planes de pensiones y/o intereses financieros?",
        helpText:
            "Incluye cuentas remuneradas, fondos de inversión con distribución, etc.",
    },
    {
        id: "compraventa_inmuebles",
        text: "¿Has realizado compraventa de inmuebles en el ejercicio fiscal?",
        helpText: "Compra o venta de cualquier propiedad.",
    },
    {
        id: "compraventa_acciones",
        text: "¿Has realizado compraventa de acciones, fondos y/o participaciones?",
        helpText: "Operaciones en bolsa, ETFs, fondos de inversión, etc.",
    },
    {
        id: "premios",
        text: "¿Has obtenido ganancias por premios o liberalidades?",
        helpText: "Premios de lotería, concursos, donaciones recibidas, etc.",
    },
    {
        id: "cripto",
        text: "¿Percibes ingresos por criptomonedas o activos digitales similares?",
        helpText:
            "Trading, staking, airdrops, NFTs u otras operaciones con cripto.",
    },
];

// ── Plan determination logic ────────────────────────────────────
function determinePlan(answers) {
    const a = answers;
    if (a.cripto === true) return 4;
    if (
        a.alquiler_varias === true ||
        a.compraventa_inmuebles === true ||
        a.compraventa_acciones === true ||
        a.premios === true
    )
        return 3;
    if (
        a.facturas === true ||
        a.alquiler_una === true ||
        a.segunda_vivienda === true ||
        a.dividendos === true
    )
        return 2;
    return 1;
}

const planInfo = {
    1: {
        name: "Plan 1 – Rentas del trabajo",
        color: theme.plan1,
        icon: "💼",
        desc: "Ideal para quienes reciben ingresos únicamente por nómina y no poseen segundas viviendas.",
    },
    2: {
        name: "Plan 2 – Rentas del trabajo + Capital + Alquileres",
        color: theme.plan2,
        icon: "🏠",
        desc: "Para quienes, además de su nómina, tienen actividad económica, rendimientos de capital, imputación de rentas o alquiler de un inmueble.",
    },
    3: {
        name: "Plan 3 – Completo",
        color: theme.plan3,
        icon: "📊",
        desc: "Si tienes alquileres múltiples, compraventa de inmuebles o acciones, premios o liberalidades. El plan más completo.",
    },
    4: {
        name: "Plan 4 – Estudio personalizado",
        color: theme.plan4,
        icon: "🔍",
        desc: "Realizaremos un estudio personalizado de tu caso. Indicado si percibes ingresos por criptomonedas o situaciones especiales.",
    },
};

// ── Main Component ──────────────────────────────────────────────
export default function App() {
    // Views: form | result | login | admin
    const [view, setView] = useState("form");
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [direction, setDirection] = useState("forward");
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Auth state
    const [adminToken, setAdminToken] = useState(
        () => sessionStorage.getItem("lf_token") || null
    );
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    // ── API helpers ───────────────────────────────────────────────
    const saveSubmission = async (planNumber) => {
        try {
            await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, answers, plan: planNumber }),
            });
        } catch (e) {
            console.error("Error saving submission:", e);
        }
    };

    const handleLogin = async () => {
        setLoginLoading(true);
        setLoginError("");
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: loginPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLoginError(data.error || "Error de autenticación");
            } else {
                setAdminToken(data.token);
                sessionStorage.setItem("lf_token", data.token);
                setLoginPassword("");
                loadSubmissions(data.token);
                setView("admin");
            }
        } catch {
            setLoginError("Error de conexión con el servidor");
        }
        setLoginLoading(false);
    };

    const handleLogout = () => {
        setAdminToken(null);
        sessionStorage.removeItem("lf_token");
        setView("form");
        startOver();
    };

    const loadSubmissions = useCallback(
        async (tokenOverride) => {
            const token = tokenOverride || adminToken;
            if (!token) return;
            setLoadingSubs(true);
            try {
                const res = await fetch("/api/submissions", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSubmissions(data);
                } else if (res.status === 401) {
                    // Token expired
                    setAdminToken(null);
                    sessionStorage.removeItem("lf_token");
                    setView("login");
                }
            } catch {
                setSubmissions([]);
            }
            setLoadingSubs(false);
        },
        [adminToken]
    );

    const deleteSubmission = async (id) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/submissions/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (res.ok) {
                setSubmissions((prev) => prev.filter((s) => s.id !== id));
            } else if (res.status === 401) {
                setAdminToken(null);
                sessionStorage.removeItem("lf_token");
                setView("login");
            }
        } catch (e) {
            console.error("Error deleting submission:", e);
        }
        setDeletingId(null);
        setConfirmDeleteId(null);
    };

    // ── Form logic ────────────────────────────────────────────────
    const handleAnswer = async (value) => {
        if (submitting) return;
        const qId = questions[step - 1].id;
        const newAnswers = { ...answers, [qId]: value };
        setAnswers(newAnswers);

        if (step < questions.length) {
            setDirection("forward");
            setAnimating(true);
            setTimeout(() => {
                setStep(step + 1);
                setAnimating(false);
            }, 300);
        } else {
            setSubmitting(true);
            const planNum = determinePlan(newAnswers);
            setResult(planNum);
            await saveSubmission(planNum);
            setSubmitting(false);
            setDirection("forward");
            setAnimating(true);
            setTimeout(() => {
                setView("result");
                setAnimating(false);
            }, 300);
        }
    };

    const goBack = () => {
        if (step > 0) {
            setDirection("backward");
            setAnimating(true);
            setTimeout(() => {
                setStep(step - 1);
                setAnimating(false);
            }, 300);
        }
    };

    const startOver = () => {
        setView("form");
        setStep(0);
        setName("");
        setEmail("");
        setPhone("");
        setAnswers({});
        setResult(null);
    };

    const goToAdmin = () => {
        if (adminToken) {
            loadSubmissions();
            setView("admin");
        } else {
            setView("login");
            setLoginError("");
            setLoginPassword("");
        }
    };

    const progress = step === 0 ? 0 : (step / (questions.length + 1)) * 100;

    // ── Styles ────────────────────────────────────────────────────
    const styles = {
        wrapper: {
            minHeight: "100vh",
            background: `linear-gradient(160deg, ${theme.bg} 0%, #EDF2F7 50%, #E2E8F0 100%)`,
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            color: theme.text,
            position: "relative",
            overflow: "hidden",
        },
        topBar: {
            background: theme.accent,
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 10,
        },
        logo: {
            color: "#fff",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
        },
        logoAccent: { color: theme.primary },
        adminBtn: {
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            transition: "all 0.2s",
        },
        container: {
            maxWidth: "640px",
            margin: "0 auto",
            padding: "40px 20px 60px",
        },
        progressWrap: {
            background: theme.border,
            borderRadius: "100px",
            height: "6px",
            marginBottom: "40px",
            overflow: "hidden",
        },
        progressBar: {
            height: "100%",
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryDark})`,
            borderRadius: "100px",
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            width: `${progress}%`,
        },
        card: {
            background: theme.card,
            borderRadius: "20px",
            padding: "40px 36px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            transition: "opacity 0.3s, transform 0.3s",
            opacity: animating ? 0 : 1,
            transform: animating
                ? direction === "forward"
                    ? "translateY(20px)"
                    : "translateY(-20px)"
                : "translateY(0)",
        },
        stepLabel: {
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            color: theme.primary,
            marginBottom: "8px",
        },
        title: {
            fontSize: "24px",
            fontWeight: 700,
            color: theme.accent,
            lineHeight: 1.3,
            marginBottom: "8px",
        },
        helpText: {
            fontSize: "14px",
            color: theme.textLight,
            lineHeight: 1.5,
            marginBottom: "32px",
        },
        input: {
            width: "100%",
            padding: "14px 16px",
            borderRadius: "12px",
            border: `2px solid ${theme.border}`,
            fontSize: "15px",
            color: theme.text,
            outline: "none",
            transition: "border-color 0.2s",
            marginBottom: "16px",
            boxSizing: "border-box",
            background: "#FAFBFC",
        },
        btnRow: { display: "flex", gap: "12px", marginTop: "8px" },
        btnYes: {
            flex: 1,
            padding: "16px",
            borderRadius: "14px",
            border: "2px solid transparent",
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: `0 4px 14px ${theme.primary}44`,
        },
        btnNo: {
            flex: 1,
            padding: "16px",
            borderRadius: "14px",
            border: `2px solid ${theme.border}`,
            background: "#fff",
            color: theme.text,
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
        },
        btnPrimary: {
            width: "100%",
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            marginTop: "8px",
            boxShadow: `0 4px 14px ${theme.primary}44`,
            transition: "all 0.2s",
        },
        backBtn: {
            background: "none",
            border: "none",
            color: theme.textLight,
            cursor: "pointer",
            fontSize: "14px",
            padding: "8px 0",
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "color 0.2s",
        },
        resultIcon: { fontSize: "56px", marginBottom: "16px" },
        resultPlan: (color) => ({
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "100px",
            background: `${color}18`,
            color: color,
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            marginBottom: "16px",
        }),
        resultName: {
            fontSize: "28px",
            fontWeight: 700,
            color: theme.accent,
            marginBottom: "12px",
            lineHeight: 1.2,
        },
        resultDesc: {
            fontSize: "15px",
            color: theme.textLight,
            lineHeight: 1.6,
            marginBottom: "32px",
        },
        adminContainer: {
            maxWidth: "900px",
            margin: "0 auto",
            padding: "32px 20px 60px",
        },
        table: {
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            background: "#fff",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        },
        th: {
            background: theme.accent,
            color: "#fff",
            padding: "14px 16px",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px",
            textAlign: "left",
        },
        td: {
            padding: "14px 16px",
            fontSize: "14px",
            borderBottom: `1px solid ${theme.border}`,
            color: theme.text,
        },
        planBadge: (color) => ({
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "100px",
            background: `${color}18`,
            color: color,
            fontSize: "12px",
            fontWeight: 700,
        }),
        deleteBtn: {
            background: "none",
            border: `1px solid ${theme.danger}40`,
            color: theme.danger,
            padding: "6px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
            transition: "all 0.2s",
        },
        confirmOverlay: {
            position: "fixed",
            inset: 0,
            background: "rgba(26,43,74,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
        },
        confirmCard: {
            background: "#fff",
            borderRadius: "20px",
            padding: "36px 32px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            textAlign: "center",
        },
        confirmTitle: {
            fontSize: "18px",
            fontWeight: 700,
            color: theme.accent,
            marginBottom: "8px",
        },
        confirmText: {
            fontSize: "14px",
            color: theme.textLight,
            marginBottom: "24px",
            lineHeight: 1.5,
        },
        confirmBtnRow: {
            display: "flex",
            gap: "10px",
            justifyContent: "center",
        },
        confirmBtnCancel: {
            padding: "10px 24px",
            borderRadius: "10px",
            border: `1px solid ${theme.border}`,
            background: "#fff",
            color: theme.text,
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
        },
        confirmBtnDelete: {
            padding: "10px 24px",
            borderRadius: "10px",
            border: "none",
            background: theme.danger,
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
        },
        // Login overlay
        overlay: {
            position: "fixed",
            inset: 0,
            background: "rgba(26,43,74,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
        },
        loginCard: {
            background: "#fff",
            borderRadius: "24px",
            padding: "48px 40px",
            maxWidth: "420px",
            width: "90%",
            boxShadow:
                "0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)",
            textAlign: "center",
        },
        loginIcon: {
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: "28px",
        },
        loginTitle: {
            fontSize: "22px",
            fontWeight: 700,
            color: theme.accent,
            marginBottom: "8px",
        },
        loginSubtitle: {
            fontSize: "14px",
            color: theme.textLight,
            marginBottom: "28px",
        },
        loginError: {
            background: "#FFF5F5",
            color: theme.danger,
            padding: "10px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
            border: `1px solid ${theme.danger}30`,
        },
    };

    // ── Identity Step ─────────────────────────────────────────────
    const renderIdentity = () => (
        <div style={styles.card}>
            <div style={styles.stepLabel}>Datos de contacto</div>
            <div style={styles.title}>Antes de empezar, ¿quién eres?</div>
            <div style={styles.helpText}>
                Necesitamos estos datos para asociar tu resultado al presupuesto. No
                almacenamos datos sensibles.
            </div>
            <input
                style={styles.input}
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                onBlur={(e) => (e.target.style.borderColor = theme.border)}
            />
            <input
                style={styles.input}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                onBlur={(e) => (e.target.style.borderColor = theme.border)}
            />
            <input
                style={styles.input}
                placeholder="Teléfono (opcional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                onBlur={(e) => (e.target.style.borderColor = theme.border)}
            />
            <button
                style={{
                    ...styles.btnPrimary,
                    opacity: name && email ? 1 : 0.5,
                    pointerEvents: name && email ? "auto" : "none",
                }}
                onClick={() => {
                    setDirection("forward");
                    setAnimating(true);
                    setTimeout(() => {
                        setStep(1);
                        setAnimating(false);
                    }, 300);
                }}
            >
                Comenzar →
            </button>
        </div>
    );

    // ── Question Step ─────────────────────────────────────────────
    const renderQuestion = () => {
        const q = questions[step - 1];
        return (
            <div style={styles.card}>
                <div style={styles.stepLabel}>
                    Pregunta {step} de {questions.length}
                </div>
                <div style={styles.title}>{q.text}</div>
                <div style={styles.helpText}>{q.helpText}</div>
                <div style={styles.btnRow}>
                    <button
                        style={styles.btnYes}
                        onClick={() => handleAnswer(true)}
                        onMouseEnter={(e) =>
                            (e.target.style.transform = "translateY(-2px)")
                        }
                        onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
                    >
                        Sí
                    </button>
                    <button
                        style={styles.btnNo}
                        onClick={() => handleAnswer(false)}
                        onMouseEnter={(e) => {
                            e.target.style.borderColor = theme.primary;
                            e.target.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderColor = theme.border;
                            e.target.style.transform = "translateY(0)";
                        }}
                    >
                        No
                    </button>
                </div>
                <button style={styles.backBtn} onClick={goBack}>
                    ← Volver
                </button>
            </div>
        );
    };

    // ── Result View ───────────────────────────────────────────────
    const renderResult = () => {
        const plan = planInfo[result];
        return (
            <div style={styles.container}>
                <div
                    style={{
                        ...styles.card,
                        textAlign: "center",
                        opacity: 1,
                        transform: "none",
                    }}
                >
                    <div style={styles.resultIcon}>{plan.icon}</div>
                    <div style={styles.resultPlan(plan.color)}>PLAN RECOMENDADO</div>
                    <div style={styles.resultName}>{plan.name}</div>
                    <div style={styles.resultDesc}>{plan.desc}</div>

                    <div
                        style={{
                            background: `${plan.color}0C`,
                            borderRadius: "14px",
                            padding: "20px",
                            marginBottom: "24px",
                            textAlign: "left",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: plan.color,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                marginBottom: "12px",
                            }}
                        >
                            Resumen de tus respuestas
                        </div>
                        {questions.map((q) => (
                            <div
                                key={q.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${theme.border}40`,
                                    fontSize: "13px",
                                }}
                            >
                                <span
                                    style={{
                                        color: theme.text,
                                        flex: 1,
                                        paddingRight: "12px",
                                    }}
                                >
                                    {q.text}
                                </span>
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color: answers[q.id] ? theme.success : theme.textLight,
                                        flexShrink: 0,
                                    }}
                                >
                                    {answers[q.id] ? "Sí" : "No"}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button style={styles.btnPrimary} onClick={startOver}>
                        Realizar otra consulta
                    </button>
                </div>
            </div>
        );
    };

    // ── Login View ────────────────────────────────────────────────
    const renderLogin = () => (
        <div style={styles.overlay} onClick={() => setView("form")}>
            <div style={styles.loginCard} onClick={(e) => e.stopPropagation()}>
                <div style={styles.loginIcon}>🔒</div>
                <div style={styles.loginTitle}>Acceso administrador</div>
                <div style={styles.loginSubtitle}>
                    Introduce la contraseña para ver los resultados de las encuestas
                </div>
                {loginError && <div style={styles.loginError}>{loginError}</div>}
                <input
                    style={{ ...styles.input, textAlign: "center", fontSize: "16px" }}
                    type="password"
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loginPassword && handleLogin()}
                    onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                    onBlur={(e) => (e.target.style.borderColor = theme.border)}
                    autoFocus
                />
                <button
                    style={{
                        ...styles.btnPrimary,
                        opacity: loginPassword ? 1 : 0.5,
                        pointerEvents: loginPassword ? "auto" : "none",
                    }}
                    onClick={handleLogin}
                    disabled={loginLoading}
                >
                    {loginLoading ? "Verificando..." : "Entrar"}
                </button>
                <button
                    style={{ ...styles.backBtn, justifyContent: "center", width: "100%" }}
                    onClick={() => setView("form")}
                >
                    ← Volver al formulario
                </button>
            </div>
        </div>
    );

    // ── Admin View ────────────────────────────────────────────────
    const renderAdmin = () => (
        <div style={styles.adminContainer}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div>
                    <div
                        style={{ fontSize: "24px", fontWeight: 700, color: theme.accent }}
                    >
                        Resultados del formulario
                    </div>
                    <div
                        style={{
                            fontSize: "14px",
                            color: theme.textLight,
                            marginTop: "4px",
                        }}
                    >
                        {submissions.length} respuesta
                        {submissions.length !== 1 ? "s" : ""} registrada
                        {submissions.length !== 1 ? "s" : ""}
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        style={{
                            ...styles.btnPrimary,
                            width: "auto",
                            padding: "12px 20px",
                            fontSize: "14px",
                            marginTop: 0,
                        }}
                        onClick={() => {
                            setView("form");
                            startOver();
                        }}
                    >
                        ← Formulario
                    </button>
                    <button
                        style={{
                            ...styles.adminBtn,
                            background: "rgba(252,129,129,0.15)",
                            border: `1px solid ${theme.danger}40`,
                            color: theme.danger,
                        }}
                        onClick={handleLogout}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {loadingSubs ? (
                <div
                    style={{ textAlign: "center", padding: "60px", color: theme.textLight }}
                >
                    Cargando resultados...
                </div>
            ) : submissions.length === 0 ? (
                <div
                    style={{
                        background: "#fff",
                        borderRadius: "16px",
                        padding: "60px",
                        textAlign: "center",
                        color: theme.textLight,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    }}
                >
                    Aún no hay respuestas registradas.
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Nombre</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Teléfono</th>
                                <th style={styles.th}>Plan</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((s, i) => {
                                const plan = planInfo[s.plan];
                                return (
                                    <tr
                                        key={s.id}
                                        style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}
                                    >
                                        <td style={styles.td}>
                                            {new Date(s.date).toLocaleDateString("es-ES", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                                        <td style={styles.td}>{s.email}</td>
                                        <td style={styles.td}>{s.phone || "—"}</td>
                                        <td style={styles.td}>
                                            <span style={styles.planBadge(plan?.color || "#999")}>
                                                Plan {s.plan}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <button
                                                style={{
                                                    ...styles.deleteBtn,
                                                    opacity: deletingId === s.id ? 0.5 : 1,
                                                    pointerEvents: deletingId === s.id ? 'none' : 'auto',
                                                }}
                                                onClick={() => setConfirmDeleteId(s.id)}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = `${theme.danger}15`;
                                                    e.target.style.borderColor = theme.danger;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'none';
                                                    e.target.style.borderColor = `${theme.danger}40`;
                                                }}
                                            >
                                                {deletingId === s.id ? 'Eliminando...' : '🗑 Eliminar'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Confirmation dialog */}
            {confirmDeleteId && (
                <div style={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
                    <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                        <div style={styles.confirmTitle}>¿Eliminar este registro?</div>
                        <div style={styles.confirmText}>
                            Esta acción no se puede deshacer. El registro será eliminado permanentemente.
                        </div>
                        <div style={styles.confirmBtnRow}>
                            <button
                                style={styles.confirmBtnCancel}
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={styles.confirmBtnDelete}
                                onClick={() => deleteSubmission(confirmDeleteId)}
                            >
                                {deletingId ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Layout ────────────────────────────────────────────────────
    return (
        <div style={styles.wrapper}>
            {/* Top bar */}
            <div style={styles.topBar}>
                <div style={styles.logo}>
                    lean <span style={styles.logoAccent}>finance</span>
                </div>
                <button
                    style={styles.adminBtn}
                    onClick={() => {
                        if (view === "admin") {
                            setView("form");
                            startOver();
                        } else {
                            goToAdmin();
                        }
                    }}
                    onMouseEnter={(e) =>
                        (e.target.style.background = "rgba(255,255,255,0.2)")
                    }
                    onMouseLeave={(e) =>
                        (e.target.style.background = "rgba(255,255,255,0.1)")
                    }
                >
                    {view === "admin" ? "← Formulario" : "Acceso Administrador"}
                </button>
            </div>

            {/* Login overlay */}
            {view === "login" && renderLogin()}

            {/* Main content */}
            {view === "admin" ? (
                renderAdmin()
            ) : view === "result" ? (
                renderResult()
            ) : (
                <div style={styles.container}>
                    <div style={styles.progressWrap}>
                        <div style={styles.progressBar} />
                    </div>
                    {step === 0 ? renderIdentity() : renderQuestion()}
                </div>
            )}
        </div>
    );
}
