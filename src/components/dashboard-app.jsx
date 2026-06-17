"use client";

import {
  Activity,
  Brain,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  IdCard,
  LockKeyhole,
  LogOut,
  Pill,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "./auth-provider";
import { useCareNetwork, useHealthData } from "@/lib/health-data";

const navItems = [
  { id: "overview", label: "Overview", icon: HeartPulse },
  { id: "medications", label: "Medication", icon: Pill },
  { id: "fitness", label: "Fitness", icon: Activity },
  { id: "goals", label: "Goals", icon: Target },
  { id: "care-team", label: "Care team", icon: Users },
  { id: "lookup", label: "Medical lookup", icon: Search },
  { id: "assistant", label: "AI assistant", icon: Brain },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Privacy", icon: ShieldCheck },
];

const roleNavItems = {
  patient: navItems,
  doctor: [
    { id: "clinical", label: "Clinical review", icon: HeartPulse },
    { id: "patients", label: "Patients", icon: Users },
    { id: "safety", label: "Medication safety", icon: ShieldCheck },
    { id: "lookup", label: "Medical lookup", icon: Search },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "security", label: "Privacy", icon: ShieldCheck },
  ],
  caregiver: [
    { id: "family", label: "Family dashboard", icon: Users },
    { id: "reminders", label: "Reminders", icon: Pill },
    { id: "alerts", label: "Care notes", icon: Activity },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "assistant", label: "AI assistant", icon: Brain },
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "security", label: "Privacy", icon: ShieldCheck },
  ],
};

const defaultViewByRole = {
  patient: "overview",
  doctor: "clinical",
  caregiver: "family",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardApp() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="auth-screen">
        <div className="auth-visual">
          <div className="brand">
            <div className="brand-mark">
              <HeartPulse size={22} />
            </div>
            <div>
              <div className="brand-title">SwasthyaTrack AI</div>
              <div className="brand-subtitle">Loading secure workspace</div>
            </div>
          </div>
        </div>
        <div className="auth-side">
          <div className="auth-card">Preparing your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <AuthScreen />;
  }

  return <Workspace />;
}

function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authState, setAuthState] = useState({ verified: false, googleReturn: false, resetRequested: false });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "true") {
      setMode("reset");
    }
    setAuthState({
      verified: params.get("verified") === "true",
      googleReturn: params.get("auth") === "google",
      resetRequested: params.get("reset") === "true",
    });
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (mode === "signin") {
        await auth.signIn(email, password);
      } else if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Create a password with at least 8 characters.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await auth.signUp(email, password, name || "Healthcare User", role);
        setMessage("Verification email sent. Open the email and confirm your account to activate the dashboard.");
      } else {
        await auth.sendPasswordReset(email);
        setMessage("Secure reset link sent. Open your email and use the link to create a new password.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="brand-title">SwasthyaTrack AI</div>
            <div className="brand-subtitle">Personal health monitoring platform</div>
          </div>
        </div>
        <div>
          <h1>Safer daily health tracking.</h1>
          <p style={{ maxWidth: 540, color: "#d6edf0" }}>
            Medication, wellness, consent-based doctor review, and AI insights in one clinical-style workspace.
          </p>
        </div>
        <div className="toolbar">
          <span className="badge">Consent based</span>
          <span className="badge">Role specific</span>
          <span className="badge">Live records</span>
        </div>
      </section>

      <section className="auth-side">
        <div className="auth-card">
          <h2 style={{ marginTop: 0 }}>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</h2>
          <p className="muted">Use email access or continue with Google.</p>

          {authState.verified ? (
            <AuthNotice
              tone="success"
              title="Email verified"
              text="Your account is confirmed. Sign in to open your personalized workspace."
            />
          ) : null}
          {authState.googleReturn ? (
            <AuthNotice
              tone="success"
              title="Google sign-in completed"
              text="If this is your first time, finish your profile after the dashboard opens."
            />
          ) : null}
          {authState.resetRequested && !auth.user ? (
            <AuthNotice
              tone="warning"
              title="Reset link opened"
              text="If the password form does not appear, request a fresh reset link from this screen."
            />
          ) : null}

          <div className="segment" aria-label="Authentication mode">
            <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>
              Login
            </button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
              Register
            </button>
            <button className={mode === "reset" ? "active" : ""} onClick={() => setMode("reset")}>
              Reset
            </button>
          </div>

          <form className="form-grid" onSubmit={submit}>
            {mode === "signup" ? (
              <>
                <Field label="Full name">
                  <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ananya Sharma" />
                </Field>
                <Field label="Role">
                  <select className="select" value={role} onChange={(event) => setRole(event.target.value)}>
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="caregiver">Caregiver</option>
                  </select>
                </Field>
              </>
            ) : null}

            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </Field>

            {mode !== "reset" ? (
              <Field label="Password">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={mode === "signup" ? "Create password" : "Enter password"}
                />
                {mode === "signup" ? <PasswordGuide password={password} confirmPassword={confirmPassword} /> : null}
              </Field>
            ) : null}

            {mode === "signup" ? (
              <Field label="Confirm password">
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Confirm password" />
              </Field>
            ) : null}

            {mode === "signin" ? (
              <button className="text-button" type="button" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
            ) : null}

            <button className="button" type="submit">
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <button className="button google-button" onClick={() => auth.signInWithGoogle().catch((err) => setError(err.message))}>
            <UserRound size={17} /> Continue with Google
          </button>
          <p className="microcopy">Google sign-in opens a secure Google account chooser. New Google users can set their role from Profile after login.</p>

          {message ? <p className="badge success">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}

function Workspace() {
  const auth = useAuth();
  const role = auth.user?.role || "patient";
  const care = useCareNetwork(auth.user);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const activePatientId = role === "patient" ? auth.user?.id : selectedPatientId || care.acceptedPatients[0]?.patient_id || "";
  const activePatient = role === "patient" ? { id: auth.user?.id, full_name: auth.user?.name } : care.acceptedPatients.find((item) => item.patient_id === activePatientId)?.patient;
  const health = useHealthData(auth.user, activePatientId);
  const navigation = roleNavItems[role] || roleNavItems.patient;
  const [view, setView] = useState(defaultViewByRole[role] || "overview");
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowPasswordReset(params.get("reset") === "true");
  }, []);

  useEffect(() => {
    if (!navigation.some((item) => item.id === view)) {
      setView(defaultViewByRole[role] || navigation[0]?.id || "overview");
    }
  }, [navigation, role, view]);

  useEffect(() => {
    if (role !== "patient" && !selectedPatientId && care.acceptedPatients[0]?.patient_id) {
      setSelectedPatientId(care.acceptedPatients[0].patient_id);
    }
  }, [care.acceptedPatients, role, selectedPatientId]);

  const personalizedLabel =
    auth.user?.role === "doctor"
      ? "Doctor review queue"
      : auth.user?.role === "caregiver"
        ? "Caregiver monitoring"
        : "Personal health workspace";

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} items={navigation} role={role} />
      {showPasswordReset ? <PasswordResetModal onClose={() => setShowPasswordReset(false)} /> : null}

      <main className="main">
        <header className="topbar">
          <div className="workspace-identity">
            {auth.user?.avatarUrl ? <img className="avatar" src={auth.user.avatarUrl} alt="" /> : <div className="avatar">{auth.user?.name?.slice(0, 1)}</div>}
            <div className="workspace-copy">
              <strong>{personalizedLabel}</strong>
              <span>{auth.user?.name} | {auth.user?.role}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="system-status">
              <i /> {health.realtimeStatus === "live" ? "Live records" : health.mode === "supabase" ? "Records connected" : "Setup required"}
            </span>
            <span className="safety-label">
              <ShieldCheck size={15} /> Informational only
            </span>
            <button className="icon-button" onClick={() => health.refresh()} aria-label="Refresh records" title="Refresh records">
              <RotateCcw size={17} />
            </button>
            <button className="icon-button" onClick={() => setView("profile")} aria-label="Open profile" title="Open profile">
              <UserRound size={18} />
            </button>
            <button className="icon-button" onClick={() => auth.signOut()} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page">
          {role !== "patient" && activePatient ? (
            <div className="patient-context">
              <span><Users size={15} /> Reviewing {activePatient.full_name || "selected patient"}</span>
              <select className="select compact-select" value={activePatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                {care.acceptedPatients.map((access) => (
                  <option value={access.patient_id} key={access.patient_id}>{access.patient?.full_name || "Patient"}</option>
                ))}
              </select>
            </div>
          ) : null}
          {health.loading ? <div className="sync-alert subtle">Loading real-time health records...</div> : null}
          {view === "overview" ? <Overview health={health} setView={setView} /> : null}
          {view === "clinical" ? <DoctorOverview health={health} care={care} setSelectedPatientId={setSelectedPatientId} setView={setView} /> : null}
          {view === "patients" ? <PatientsView health={health} care={care} selectedPatientId={activePatientId} setSelectedPatientId={setSelectedPatientId} /> : null}
          {view === "safety" ? <MedicationSafetyView health={health} activePatient={activePatient} /> : null}
          {view === "family" ? <CaregiverOverview health={health} /> : null}
          {view === "reminders" ? <CaregiverRemindersView health={health} /> : null}
          {view === "alerts" ? <CaregiverAlertsView health={health} /> : null}
          {view === "medications" ? <MedicationView health={health} /> : null}
          {view === "fitness" ? <FitnessView health={health} /> : null}
          {view === "goals" ? <GoalsView health={health} /> : null}
          {view === "care-team" ? <CareTeamView care={care} /> : null}
          {view === "lookup" ? <LookupView /> : null}
          {view === "assistant" ? <AssistantView health={health} /> : null}
          {view === "reports" ? <ReportsView health={health} activePatient={activePatient} /> : null}
          {view === "profile" ? <ProfileView /> : null}
          {view === "security" ? <SecurityView /> : null}
        </div>
      </main>
      <MobileDock view={view} setView={setView} items={navigation} />
    </div>
  );
}

function MobileDock({ view, setView, items }) {
  const dockItems = items.slice(0, 5);
  return (
    <nav className="mobile-dock" aria-label="Mobile navigation">
      {dockItems.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
            <Icon size={19} />
            <span>{item.id === "medications" ? "Meds" : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function PasswordResetModal({ onClose }) {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      if (password.length < 8) {
        throw new Error("Create a password with at least 8 characters.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      await auth.updatePassword(password);
      setMessage("Password updated. You can continue using your dashboard.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    }
  }

  return (
    <Modal title="Set a new password" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="New password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="New password" />
          <PasswordGuide password={password} confirmPassword={confirmPassword} />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Confirm new password" />
        </Field>
        <button className="button">Update password</button>
        {message ? <p className="badge success">{message}</p> : null}
      </form>
    </Modal>
  );
}

function Sidebar({ view, setView, items = navItems, role = "patient", compact = false }) {
  const roleLabel = role === "doctor" ? "Clinical workspace" : role === "caregiver" ? "Caregiver workspace" : "Patient workspace";
  return (
    <aside className={compact ? "" : "sidebar"}>
      {!compact ? (
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="brand-title">SwasthyaTrack AI</div>
            <div className="brand-subtitle">{roleLabel}</div>
          </div>
        </div>
      ) : null}
      <nav className="nav-stack">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={`nav-button ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
              <Icon size={18} /> {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function Overview({ health, setView }) {
  const { data, activeMedications, adherence } = health;
  const sortedFitness = [...data.fitness].sort((a, b) => a.date.localeCompare(b.date));
  const avgSteps = data.fitness.length ? Math.round(data.fitness.reduce((sum, item) => sum + item.steps, 0) / data.fitness.length) : 0;
  const avgSleep = data.fitness.length ? (data.fitness.reduce((sum, item) => sum + item.sleepHours, 0) / data.fitness.length).toFixed(1) : "0.0";
  const healthScore = Math.min(Math.round(adherence.rate * 0.55 + Math.min(avgSteps / 10000, 1) * 25 + Math.min(Number(avgSleep) / 8, 1) * 20), 100);
  const hasRecords = data.medications.length || data.logs.length || data.fitness.length || data.goals.length;

  return (
    <>
      <section className="overview-head">
        <div>
          <span className="eyebrow">Today | Care plan overview</span>
          <h1>Your health, clearly organized.</h1>
          <p>Review today&apos;s priorities, recent trends, and medication schedule.</p>
        </div>
        <div className="health-score" style={{ "--score": `${healthScore * 3.6}deg` }}>
          <div>
            <strong>{healthScore}</strong>
            <span>Care score</span>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <Kpi icon={Pill} label="Active medicines" value={activeMedications.length.toString()} note={activeMedications.length ? "Live schedule" : "Add medication"} tone="teal" />
        <Kpi icon={CheckCircle2} label="Adherence rate" value={`${adherence.rate}%`} note={`${adherence.taken} doses taken`} tone="green" />
        <Kpi icon={Activity} label="Average steps" value={avgSteps.toLocaleString()} note={data.fitness.length ? "Weekly average" : "Add fitness"} tone="blue" />
        <Kpi icon={CalendarClock} label="Average sleep" value={`${avgSleep}h`} note={data.fitness.length ? "Recent entries" : "Add sleep log"} tone="amber" />
      </section>

      <section className="grid-2">
        <div className="card chart-card">
          <div className="card-heading">
            <div><span className="eyebrow">7-day movement</span><h3>Activity and recovery</h3></div>
            <span className="trend-positive">+8.4% this week</span>
          </div>
          <div style={{ height: 320 }}>
            {sortedFitness.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedFitness}>
                  <defs>
                    <linearGradient id="stepsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e6ebf0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#7a8695", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7a8695", fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="steps" name="Steps" stroke="#0f766e" strokeWidth={3} fill="url(#stepsFill)" />
                  <Line type="monotone" dataKey="calories" name="Calories" stroke="#2563eb" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No fitness metrics yet" text="Add real steps, calories, and sleep logs to populate this chart." />
            )}
          </div>
        </div>

        <div className="card care-plan-card">
          <div className="card-heading">
            <div><span className="eyebrow">Today</span><h3>Care plan</h3></div>
            <span className="badge success">On track</span>
          </div>
          <div className="care-timeline">
            {activeMedications.length ? (
              activeMedications.map((medication, index) => (
                <div className="timeline-item" key={medication.id}>
                  <div className={`timeline-dot ${index === 0 ? "active" : ""}`}><Pill size={15} /></div>
                  <div>
                    <strong>{medication.name} | {medication.dosage}</strong>
                    <span>{medication.frequency}</span>
                  </div>
                  <time>{medication.reminderTime}</time>
                </div>
              ))
            ) : (
              <EmptyState title="No medication schedule" text="Add prescribed medications to build today's care plan." />
            )}
            {data.fitness.length ? (
              <div className="timeline-item">
                <div className="timeline-dot fitness"><Activity size={15} /></div>
                <div><strong>Daily movement goal</strong><span>{avgSteps.toLocaleString()} steps average</span></div>
                <time>Today</time>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="insight-band">
        <div className="insight-icon"><Sparkles size={21} /></div>
        <div>
          <span className="eyebrow">Personalized insight</span>
          <strong>
            {hasRecords
              ? "Your live records are connected. Continue logging doses and fitness metrics for stronger insights."
              : "No real health records yet. Add medications, fitness metrics, and goals to unlock personalized insights."}
          </strong>
        </div>
        <button className="button secondary" onClick={() => setView("assistant")}>Review insight <ChevronRight size={16} /></button>
      </section>
    </>
  );
}

function MedicationView({ health }) {
  const [showAdd, setShowAdd] = useState(false);
  const [logMedicationId, setLogMedicationId] = useState("");
  const active = health.activeMedications;
  const logsWithNames = health.data.logs.map((log) => ({
    ...log,
    medicationName: health.data.medications.find((medication) => medication.id === log.medicationId)?.name ?? "Unknown",
  }));

  return (
    <>
      <SectionHeader title="Medication adherence center" description="Schedule reminders, log doses, and track adherence reports.">
        <button className="button" onClick={() => setShowAdd(true)}><Plus size={16} /> Add medicine</button>
      </SectionHeader>

      <section className="medication-summary">
        <div><span>Today&apos;s doses</span><strong>{active.length * 2}</strong></div>
        <div><span>Completed</span><strong className="text-success">{health.adherence.taken}</strong></div>
        <div><span>Needs attention</span><strong className="text-warning">{health.adherence.missed}</strong></div>
        <div><span>Current streak</span><strong>4 days</strong></div>
      </section>

      <section className="grid-2 medication-grid">
        <div className="card schedule-panel">
          <div className="card-heading">
            <div><span className="eyebrow">Medication plan</span><h3>Active schedule</h3></div>
            <span className="badge">{active.length} active</span>
          </div>
          <div className="medication-list">
            {active.length ? active.map((medication, index) => (
              <article className="medication-card" key={medication.id}>
                <div className={`medication-symbol tone-${index % 3}`}><Pill size={20} /></div>
                <div className="medication-main">
                  <div className="medication-title-row">
                    <div><h4>{medication.name}</h4><span>{medication.dosage} - {medication.frequency}</span></div>
                    <span className="medication-time"><Clock3 size={14} /> {medication.reminderTime}</span>
                  </div>
                  <p>{medication.instructions || "Follow the instructions provided by your clinician."}</p>
                  <div className="medication-actions">
                    <button className="button compact" onClick={() => setLogMedicationId(medication.id)}><CheckCircle2 size={15} /> Log dose</button>
                    <button className="button secondary compact" onClick={() => health.pauseMedication(medication.id)}><X size={15} /> Pause</button>
                  </div>
                </div>
              </article>
            )) : <EmptyState title="No active medicines yet" text="Add prescribed medicines to start reminders, dose logging, and adherence insights." />}
          </div>
        </div>
        <div className="card adherence-panel">
          <div className="card-heading">
            <div><span className="eyebrow">Last 30 days</span><h3>Adherence quality</h3></div>
            <span className="trend-positive">{health.adherence.rate}%</span>
          </div>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Kpi icon={CheckCircle2} label="Taken" value={health.adherence.taken.toString()} tone="green" />
            <Kpi icon={Clock3} label="Missed" value={health.adherence.missed.toString()} tone="teal" />
          </div>
          <div style={{ height: 240 }}>
            {health.adherence.total ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: "Dose logs", taken: health.adherence.taken, missed: health.adherence.missed }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="taken" fill="#15803d" />
                  <Bar dataKey="missed" fill="#b91c1c" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No dose logs yet" text="Use Log dose after adding medicine to create adherence analytics." />}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3 className="section-title">Dose history</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Medication</th><th>Status</th><th>Logged at</th><th>Note</th></tr></thead>
            <tbody>
              {logsWithNames.map((log) => (
                <tr key={log.id}>
                  <td>{log.medicationName}</td>
                  <td><span className={`badge ${log.status === "taken" ? "success" : "warning"}`}>{log.status}</span></td>
                  <td>{log.loggedAt}</td>
                  <td>{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAdd ? <MedicationModal onClose={() => setShowAdd(false)} onSubmit={health.addMedication} /> : null}
      {logMedicationId ? <DoseLogModal medicationId={logMedicationId} onClose={() => setLogMedicationId("")} onSubmit={health.logDose} /> : null}
    </>
  );
}

function DoctorOverview({ health, care, setSelectedPatientId, setView }) {
  const riskCount = health.adherence.missed + health.data.fitness.filter((item) => item.mood === "Unwell" || item.mood === "Stressed").length;
  const avgSleep = health.data.fitness.length ? (health.data.fitness.reduce((sum, item) => sum + item.sleepHours, 0) / health.data.fitness.length).toFixed(1) : "0.0";
  const pendingRequests = care.requests.filter((request) => request.status === "pending");

  return (
    <>
      <section className="clinical-hero">
        <div>
          <span className="eyebrow">Clinical review</span>
          <h1>Requests first, records second.</h1>
          <p>Patients appear here only after they ask for review and you accept access. Medication and report actions apply to the selected approved patient.</p>
        </div>
        <div className="clinical-actions">
          <button className="button secondary" onClick={() => setView("lookup")}><Search size={16} /> Lookup condition</button>
          <button className="button" onClick={() => setView("reports")}><FileText size={16} /> Prepare report</button>
        </div>
      </section>

      <section className="kpi-grid">
        <Kpi icon={Users} label="Approved patients" value={care.acceptedPatients.length.toString()} note="Consent granted" tone="teal" />
        <Kpi icon={Clock3} label="Pending requests" value={pendingRequests.length.toString()} note="Awaiting response" tone="teal" />
        <Kpi icon={Activity} label="Review notes" value={riskCount.toString()} note="Missed doses or stress signals" tone="blue" />
        <Kpi icon={Pill} label="Active medicines" value={health.activeMedications.length.toString()} note="Medication list" tone="blue" />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-heading">
            <div><span className="eyebrow">Incoming requests</span><h3>Patients asking for review</h3></div>
          </div>
          <ul className="insight-list">
            {pendingRequests.length ? pendingRequests.map((request) => (
              <li key={request.id}>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{request.patient?.full_name || "Patient request"}</strong>
                    <p className="muted">{(request.request_type || "record_review").replaceAll("_", " ")} | {request.reason || "No reason provided"}</p>
                  </div>
                  <div className="toolbar">
                    <button className="button compact" onClick={() => care.respondToRequest(request, "accepted")}><CheckCircle2 size={14} /> Accept</button>
                    <button className="button compact secondary" onClick={() => care.respondToRequest(request, "declined")}><X size={14} /> Decline</button>
                  </div>
                </div>
              </li>
            )) : <li><strong>No pending requests</strong><p className="muted">Patients will appear here after they send you a review request.</p></li>}
          </ul>
        </div>

        <div className="card">
          <div className="card-heading">
            <div><span className="eyebrow">Clinical snapshot</span><h3>Medication and wellness notes</h3></div>
            <span className="badge">Clinical note</span>
          </div>
          <ul className="clinical-list">
            <li><strong>Adherence</strong><span>{health.adherence.rate}% adherence across {health.adherence.total} logged doses.</span></li>
            <li><strong>Medication safety</strong><span>{health.activeMedications.length ? "Run OpenFDA lookup before giving guidance." : "No active medication records yet."}</span></li>
            <li><strong>Wellness pattern</strong><span>{health.data.fitness.length ? "Recent fitness logs are available for review." : "No fitness records available yet."}</span></li>
          </ul>
        </div>
        <div className="card">
          <div className="card-heading">
            <div><span className="eyebrow">Patient handoff</span><h3>Recommended next actions</h3></div>
          </div>
          <ul className="insight-list">
            {care.acceptedPatients.map((access) => (
              <li key={access.patient_id}>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <div><strong>{access.patient?.full_name || "Approved patient"}</strong><p className="muted">Consent approved. Select this patient to review records.</p></div>
                  <button className="button compact secondary" onClick={() => setSelectedPatientId(access.patient_id)}>Review</button>
                </div>
              </li>
            ))}
            <li><strong>Ask about missed doses</strong><p className="muted">Confirm whether misses were accidental, side-effect related, or clinician-directed.</p></li>
            <li><strong>Verify before adding medication</strong><p className="muted">Add medication only after confirming prescription details and dosage with the patient.</p></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function PatientsView({ health, care, selectedPatientId, setSelectedPatientId }) {
  return (
    <>
      <SectionHeader title="Assigned patients" description="Only accepted patient requests become visible here." />
      <section className="card">
        <div className="patient-list">
          {care.acceptedPatients.length ? care.acceptedPatients.map((access) => (
            <button className={`patient-row selectable ${selectedPatientId === access.patient_id ? "active" : ""}`} key={access.patient_id} onClick={() => setSelectedPatientId(access.patient_id)}>
              <div className="avatar">{access.patient?.full_name?.slice(0, 1) || "P"}</div>
              <div>
                <strong>{access.patient?.full_name || "Approved patient"}</strong>
                <p className="muted">{selectedPatientId === access.patient_id ? `${health.activeMedications.length} active medicines, ${health.data.fitness.length} wellness entries, ${health.adherence.rate}% adherence.` : "Click to load this patient's real-time records."}</p>
              </div>
              <span className="badge success">Consent granted</span>
            </button>
          )) : <EmptyState title="No approved patients yet" text="Accepted patient requests will appear here." />}
        </div>
      </section>
    </>
  );
}

function MedicationSafetyView({ health, activePatient }) {
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  return (
    <>
      <SectionHeader title="Medication safety review" description="Verify prescription details before adding medication to the selected patient record.">
        <button className="button" onClick={() => setShowMedicationModal(true)}><Plus size={16} /> Add medication</button>
      </SectionHeader>
      {showMedicationModal ? <MedicationModal onClose={() => setShowMedicationModal(false)} onSubmit={health.addMedication} /> : null}
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Medication review list {activePatient?.full_name ? `for ${activePatient.full_name}` : ""}</h3>
          <ul className="insight-list">
            {health.activeMedications.length ? health.activeMedications.map((medication) => (
              <li key={medication.id}>
                <strong>{medication.name} | {medication.dosage}</strong>
                <p className="muted">{medication.frequency}. {medication.instructions}</p>
              </li>
            )) : <li><strong>No active medications</strong><p className="muted">Patient has not added medication records yet.</p></li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="section-title">Safety workflow</h3>
          <ul className="clinical-list">
            <li><strong>1. Confirm consent</strong><span>Only approved patient requests should be reviewed.</span></li>
            <li><strong>2. Verify prescription</strong><span>Confirm medicine name, dosage, timing, and source before saving.</span></li>
            <li><strong>3. Check label warnings</strong><span>Use OpenFDA lookup for public label information.</span></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function CaregiverOverview({ health }) {
  return (
    <>
      <section className="clinical-hero caregiver">
        <div>
          <span className="eyebrow">Caregiver dashboard</span>
          <h1>Family care at a glance</h1>
          <p>Monitor reminders, adherence, wellness goals, and care handoff summaries.</p>
        </div>
        <div className="clinical-actions">
          <button className="button secondary"><Pill size={16} /> View reminders</button>
          <button className="button"><FileText size={16} /> Download summary</button>
        </div>
      </section>
      <section className="kpi-grid">
        <Kpi icon={Pill} label="Due reminders" value={health.activeMedications.length.toString()} note="Medication schedule" tone="teal" />
        <Kpi icon={Clock3} label="Missed doses" value={health.adherence.missed.toString()} note="Follow-up list" tone="teal" />
        <Kpi icon={Target} label="Goals tracked" value={health.data.goals.length.toString()} note="Wellness progress" tone="blue" />
        <Kpi icon={CheckCircle2} label="Adherence" value={`${health.adherence.rate}%`} note="Logged doses" tone="green" />
      </section>
      <section className="grid-2">
        <div className="card care-plan-card">
          <div className="card-heading">
            <div><span className="eyebrow">Today</span><h3>Reminder plan</h3></div>
          </div>
          <div className="care-timeline">
            {health.activeMedications.length ? health.activeMedications.map((medication) => (
              <div className="timeline-item" key={medication.id}>
                <div className="timeline-dot active"><Pill size={15} /></div>
                <div><strong>{medication.name}</strong><span>{medication.dosage} | {medication.frequency}</span></div>
                <time>{medication.reminderTime}</time>
              </div>
            )) : <EmptyState title="No reminders yet" text="Medication reminders appear here after the patient adds medicines." />}
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">Caregiver guidance</h3>
          <ul className="insight-list">
            <li><strong>Support, do not prescribe</strong><p className="muted">Help the patient follow their clinician-provided schedule.</p></li>
            <li><strong>Escalate red flags</strong><p className="muted">Seek professional help for severe symptoms or medication reactions.</p></li>
            <li><strong>Keep notes ready</strong><p className="muted">Use reports for doctor visits and family handoffs.</p></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function CaregiverRemindersView({ health }) {
  return (
    <>
      <SectionHeader title="Care reminders" description="Track medicine timing and dose logs for supported family members." />
      <section className="card">
        <div className="medication-list">
          {health.activeMedications.length ? health.activeMedications.map((medication, index) => (
            <article className="medication-card" key={medication.id}>
              <div className={`medication-symbol tone-${index % 3}`}><Pill size={20} /></div>
              <div className="medication-main">
                <div className="medication-title-row">
                  <div><h4>{medication.name}</h4><span>{medication.dosage} | {medication.frequency}</span></div>
                  <span className="medication-time"><Clock3 size={14} /> {medication.reminderTime}</span>
                </div>
                <p>{medication.instructions || "Follow the care plan provided by the patient and clinician."}</p>
              </div>
            </article>
          )) : <EmptyState title="No reminders available" text="Ask the patient to add medication records or grant access to an existing care plan." />}
        </div>
      </section>
    </>
  );
}

function CaregiverAlertsView({ health }) {
  return (
    <>
      <SectionHeader title="Care notes" description="Review missed doses, mood changes, and wellness records in one calm follow-up view." />
      <section className="grid-3">
        <InfoCard icon={Clock3} title="Dose follow-up" text={`${health.adherence.missed} missed dose logs are ready for caregiver follow-up.`} />
        <InfoCard icon={Activity} title="Wellness entries" text={`${health.data.fitness.length} recent fitness or wellness records are available.`} />
        <InfoCard icon={Target} title="Open goals" text={`${health.data.goals.length} wellness goals are currently tracked.`} />
      </section>
    </>
  );
}

function CareTeamView({ care }) {
  const [selectedProvider, setSelectedProvider] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [requestType, setRequestType] = useState("record_review");
  const [reason, setReason] = useState("");
  const selected = care.providers.find((provider) => provider.id === selectedProvider);

  const filteredProviders = useMemo(() => {
    const term = providerSearch.trim().toLowerCase();
    return care.providers
      .filter((provider) =>
        roleFilter === "all" || provider.role === roleFilter,
      )
      .filter((provider) =>
        !term || [provider.full_name, provider.email, provider.role].filter(Boolean).some((value) => value.toLowerCase().includes(term)),
      );
  }, [care.providers, providerSearch, roleFilter]);

  useEffect(() => {
    if (!selectedProvider && filteredProviders.length === 1) {
      setSelectedProvider(filteredProviders[0].id);
    }
    if (selectedProvider && !filteredProviders.some((provider) => provider.id === selectedProvider)) {
      setSelectedProvider("");
    }
  }, [filteredProviders, selectedProvider]);

  async function submit(event) {
    event.preventDefault();
    if (!selected) return;
    await care.requestAccess({
      providerId: selected.id,
      providerRole: selected.role,
      requestType,
      reason,
    });
    setReason("");
  }

  return (
    <>
      <SectionHeader title="Find doctors and caregivers" description="Pick a provider, choose a role filter, and send a consent request without typing extra details." />
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Provider directory</h3>
          <div className="quick-chip-row" style={{ marginBottom: 14 }}>
            {[
              { key: "all", label: "All providers" },
              { key: "doctor", label: "Doctors" },
              { key: "caregiver", label: "Caregivers" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`quick-chip ${roleFilter === option.key ? "active" : ""}`}
                onClick={() => setRoleFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <input
              className="input"
              value={providerSearch}
              onChange={(event) => setProviderSearch(event.target.value)}
              placeholder="Search by doctor, caregiver, email, or role"
            />
            <button type="button" className="button secondary compact" onClick={care.refresh}>Refresh</button>
          </div>
          <div className="provider-grid">
            {filteredProviders.length ? filteredProviders.map((provider) => (
              <button className={`provider-card ${selectedProvider === provider.id ? "active" : ""}`} key={provider.id} onClick={() => setSelectedProvider(provider.id)}>
                <span className="provider-icon">{provider.role === "doctor" ? <IdCard size={18} /> : <Users size={18} />}</span>
                <strong>{provider.full_name || "Care provider"}</strong>
                <small>{provider.role}{provider.email ? ` | ${provider.email}` : ""}</small>
              </button>
            )) : (
              <EmptyState
                title={care.providers.length ? "No matching providers" : "No providers found yet"}
                text="Refresh the list or ask a doctor/caregiver to sign in with a Doctor or Caregiver account so they appear here."
              />
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Send access request</h3>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Selected provider">
              <input className="input" value={selected ? `${selected.full_name || "Care provider"} (${selected.role})` : "Tap a provider to select one"} disabled />
            </Field>
            <Field label="Request type">
              <select className="select" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                <option value="record_review">Record review</option>
                <option value="medication_review">Medication review</option>
                <option value="caregiver_monitoring">Caregiver monitoring</option>
                <option value="report_generation">Report generation</option>
              </select>
            </Field>
            <Field label="Reason">
              <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Please review my medication schedule before my next consultation." />
            </Field>
            <button className="button" disabled={!selected}>Send request</button>
          </form>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3 className="section-title">Request history</h3>
        <ul className="insight-list">
          {care.requests.length ? care.requests.map((request) => {
            const provider = care.providers.find((item) => item.id === request.provider_id);
            return (
              <li key={request.id}>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{provider?.full_name || "Care provider"}</strong>
                    <p className="muted">{(request.request_type || "record_review").replaceAll("_", " ")} | {request.reason || "No reason provided"}</p>
                  </div>
                  <span className={`badge ${request.status === "accepted" ? "success" : ""}`}>{request.status || "pending"}</span>
                </div>
              </li>
            );
          }) : <li><strong>No requests yet</strong><p className="muted">Send a request to let a doctor or caregiver review selected records.</p></li>}
        </ul>
      </section>
    </>
  );
}

function FitnessView({ health }) {
  const sorted = [...health.data.fitness].sort((a, b) => a.date.localeCompare(b.date));
  const quickEntries = [
    { label: "Light day", steps: 3500, calories: 180, sleepHours: 7, waterLiters: 2, mood: "Okay" },
    { label: "Active day", steps: 8000, calories: 420, sleepHours: 7.5, waterLiters: 2.5, mood: "Good" },
    { label: "Recovery day", steps: 2000, calories: 120, sleepHours: 8, waterLiters: 2.3, mood: "Tired" },
  ];

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    health.addFitness({
      date: String(form.get("date")),
      steps: Number(form.get("steps")),
      calories: Number(form.get("calories")),
      sleepHours: Number(form.get("sleepHours")),
      waterLiters: Number(form.get("waterLiters")),
      mood: String(form.get("mood")),
    });
    event.currentTarget.reset();
  }

  return (
    <>
      <SectionHeader title="Fitness and wellness analytics" description="Track steps, calories, sleep, hydration, and mood over time." />
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Add wellness entry</h3>
          <div className="template-grid">
            {quickEntries.map((entry) => (
              <button
                className="template-card"
                type="button"
                key={entry.label}
                onClick={() => health.addFitness({ date: today(), ...entry })}
              >
                <strong>{entry.label}</strong>
                <span>{entry.steps.toLocaleString()} steps - {entry.sleepHours}h sleep</span>
              </button>
            ))}
          </div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Date"><input className="input" name="date" type="date" defaultValue={today()} required /></Field>
            <Field label="Steps"><input className="input" name="steps" type="number" defaultValue={7000} min={0} /></Field>
            <Field label="Calories"><input className="input" name="calories" type="number" defaultValue={350} min={0} /></Field>
            <Field label="Sleep hours"><input className="input" name="sleepHours" type="number" defaultValue={7} min={0} step={0.5} /></Field>
            <Field label="Water liters"><input className="input" name="waterLiters" type="number" defaultValue={2.2} min={0} step={0.1} /></Field>
            <Field label="Mood">
              <select className="select" name="mood" defaultValue="Good">
                <option>Good</option><option>Okay</option><option>Tired</option><option>Stressed</option><option>Unwell</option>
              </select>
            </Field>
            <button className="button"><Plus size={16} /> Save entry</button>
          </form>
        </div>
        <div className="card">
          <h3 className="section-title">Activity trend</h3>
          <div style={{ height: 360 }}>
            {sorted.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sorted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="steps" stroke="#0f766e" strokeWidth={3} />
                  <Line type="monotone" dataKey="sleepHours" stroke="#6687d8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No wellness trend yet" text="Save a wellness entry to start the activity and recovery chart." />}
          </div>
        </div>
      </section>
    </>
  );
}

function GoalsView({ health }) {
  const goalTemplates = [
    { title: "Walk 7,000 steps daily", target: 7000, current: 0, unit: "steps", dueDate: today() },
    { title: "Drink 2.5L water today", target: 2.5, current: 0, unit: "liters", dueDate: today() },
    { title: "Sleep 7 hours tonight", target: 7, current: 0, unit: "hours", dueDate: today() },
  ];
  const goalUnits = ["steps", "liters", "hours", "minutes", "reps", "days"];
  const [newGoal, setNewGoal] = useState({
    title: "Walk 80,000 steps this month",
    target: 80000,
    current: 0,
    unit: "steps",
    dueDate: today(),
  });

  function applyTemplate(goal) {
    setNewGoal(goal);
  }

  function updateNewGoal(key, value) {
    setNewGoal((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    health.addGoal({
      title: String(newGoal.title).trim(),
      target: Number(newGoal.target),
      current: Number(newGoal.current),
      unit: String(newGoal.unit),
      dueDate: String(newGoal.dueDate),
    });
    setNewGoal({
      title: "Walk 80,000 steps this month",
      target: 80000,
      current: 0,
      unit: "steps",
      dueDate: today(),
    });
  }

  return (
    <>
      <SectionHeader title="Wellness goals" description="Choose a goal template, update progress with taps, and keep tracking easy." />
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Create goal</h3>
          <div className="template-grid">
            {goalTemplates.map((goal) => (
              <button className="template-card" type="button" key={goal.title} onClick={() => applyTemplate(goal)}>
                <strong>{goal.title}</strong>
                <span>Target: {goal.target} {goal.unit}</span>
              </button>
            ))}
          </div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Goal">
              <input
                className="input"
                name="title"
                value={newGoal.title}
                onChange={(event) => updateNewGoal("title", event.target.value)}
                placeholder="Walk 80,000 steps this month"
                required
              />
            </Field>
            <Field label="Target">
              <input
                className="input"
                name="target"
                type="number"
                value={newGoal.target}
                onChange={(event) => updateNewGoal("target", Number(event.target.value))}
                required
              />
            </Field>
            <Field label="Current progress">
              <input
                className="input"
                name="current"
                type="number"
                value={newGoal.current}
                onChange={(event) => updateNewGoal("current", Number(event.target.value))}
                required
              />
            </Field>
            <Field label="Unit">
              <select
                className="select"
                name="unit"
                value={newGoal.unit}
                onChange={(event) => updateNewGoal("unit", event.target.value)}
                required
              >
                {goalUnits.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                className="input"
                name="dueDate"
                type="date"
                value={newGoal.dueDate}
                onChange={(event) => updateNewGoal("dueDate", event.target.value)}
                required
              />
            </Field>
            <button className="button"><Plus size={16} /> Create goal</button>
          </form>
        </div>
        <div className="card">
          <h3 className="section-title">Progress board</h3>
          <ul className="insight-list">
            {health.data.goals.length ? health.data.goals.map((goal) => {
              const pct = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <li key={goal.id}>
                  <div className="toolbar" style={{ justifyContent: "space-between" }}>
                    <strong>{goal.title}</strong>
                    <span className="badge">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="muted">{goal.current} / {goal.target} {goal.unit} by {goal.dueDate}</p>
                  <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                  <div className="progress-actions" style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button type="button" className="button secondary compact" onClick={() => health.updateGoal(goal.id, Math.max(0, goal.current - 1))}>-1</button>
                    <button type="button" className="button secondary compact" onClick={() => health.updateGoal(goal.id, goal.current + 1)}>+1</button>
                    <button type="button" className="button secondary compact" onClick={() => health.updateGoal(goal.id, goal.current + Math.max(1, Math.round(goal.target * 0.1)))}>+10%</button>
                  </div>
                </li>
              );
            }) : <EmptyState title="No goals yet" text="Use a template to create a measurable goal in one click." />}
          </ul>
        </div>
      </section>
    </>
  );
}

function LookupView() {
  const [query, setQuery] = useState("");
  const [drug, setDrug] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState([]);
  const [drugLabel, setDrugLabel] = useState(null);
  const [drugMeta, setDrugMeta] = useState(null);
  const [weather, setWeather] = useState(null);
  const [message, setMessage] = useState("");
  const [drugLoading, setDrugLoading] = useState(false);

  const healthTopics = ["Fever", "Diabetes", "Hypertension", "Migraine", "Asthma", "Cold"];
  const drugExamples = ["Dolo 650", "Metformin", "Aspirin", "Cetirizine", "Paracetamol", "Ibuprofen"];
  const cityExamples = ["Delhi", "Bengaluru", "Hyderabad", "Mumbai", "Chennai"];

  async function searchHealth(nextQuery = query) {
    setQuery(nextQuery);
    setMessage("Searching MedlinePlus...");
    const response = await fetch(`/api/medical?q=${encodeURIComponent(nextQuery)}`);
    const payload = await response.json();
    setResults(payload.results ?? []);
    setMessage("");
  }

  async function searchDrug(nextDrug = drug) {
    setDrug(nextDrug);
    if (!nextDrug.trim()) {
      setDrugMeta({ message: "Choose a medicine from the quick examples or type one like metformin." });
      return;
    }
    setMessage("Checking OpenFDA...");
    setDrugLoading(true);
    setDrugLabel(null);
    try {
      const response = await fetch(`/api/drug?q=${encodeURIComponent(nextDrug)}`);
      const payload = await response.json();
      setDrugLabel(payload.label);
      setDrugMeta({ searchedFor: payload.searchedFor, message: payload.message || payload.error });
    } catch {
      setDrugMeta({ message: "Drug lookup could not connect. Check your network and try again." });
    } finally {
      setDrugLoading(false);
      setMessage("");
    }
  }

  async function checkWeather(nextCity = city) {
    setCity(nextCity);
    setMessage("Checking outdoor safety...");
    const response = await fetch(`/api/weather?city=${encodeURIComponent(nextCity)}`);
    const payload = await response.json();
    setWeather(payload.weather);
    setMessage(payload.configured === false ? "Add WEATHERSTACK_API_KEY to enable live weather checks." : "");
  }

  return (
    <>
      <SectionHeader title="Medical safety lookup" description="Choose a condition, medicine, or city with fewer keystrokes and faster results." />
      <section className="grid-3">
        <div className="card">
          <h3 className="section-title">Health topic</h3>
          <QuickChips items={healthTopics} onPick={searchHealth} />
          <div className="form-grid">
            <input
              list="health-topics"
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="diabetes, fever, hypertension"
            />
            <datalist id="health-topics">
              {healthTopics.map((item) => <option key={item} value={item} />)}
            </datalist>
            <button className="button" type="button" onClick={() => searchHealth()}><Search size={16} /> Search MedlinePlus</button>
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">Drug label</h3>
          <QuickChips items={drugExamples} onPick={searchDrug} />
          <div className="form-grid">
            <input
              list="drug-examples"
              className="input"
              value={drug}
              onChange={(event) => setDrug(event.target.value)}
              placeholder="metformin"
            />
            <datalist id="drug-examples">
              {drugExamples.map((item) => <option key={item} value={item} />)}
            </datalist>
            <button className="button" type="button" onClick={() => searchDrug()} disabled={drugLoading}><Pill size={16} /> {drugLoading ? "Checking..." : "Check OpenFDA"}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">Outdoor wellness</h3>
          <QuickChips items={cityExamples} onPick={checkWeather} />
          <div className="form-grid">
            <input
              list="city-examples"
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Delhi"
            />
            <datalist id="city-examples">
              {cityExamples.map((item) => <option key={item} value={item} />)}
            </datalist>
            <button className="button" type="button" onClick={() => checkWeather()}><Activity size={16} /> Check weather</button>
          </div>
        </div>
      </section>

      <section className="grid-2" style={{ marginTop: 18 }}>
        {results[0] ? (
          <div className="card lookup-summary">
            <span className="badge">MedlinePlus summary</span>
            <h3>{results[0].title}</h3>
            <p className="muted">{results[0].snippet}</p>
            <a className="button secondary compact" href={results[0].url} target="_blank" rel="noreferrer">Open full article</a>
          </div>
        ) : (
          <div className="card lookup-summary">
            <span className="badge">Ready</span>
            <h3>Choose a topic</h3>
            <p className="muted">Use the quick checks above to avoid typing and get a short reliable summary.</p>
          </div>
        )}
        <div className="card">
          <h3 className="section-title">Medication and safety context</h3>
          {drugMeta?.searchedFor ? <span className="badge">Searched OpenFDA for {drugMeta.searchedFor}</span> : null}
          {drugLabel ? (
            <ul className="insight-list">
              {["purpose", "indications_and_usage", "warnings", "dosage_and_administration"].map((key) =>
                drugLabel[key]?.[0] ? (
                  <li key={key}><strong>{key.replaceAll("_", " ")}</strong><ReadMoreText text={drugLabel[key][0]} /></li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="muted">Search a drug label to show public OpenFDA safety fields.</p>
          )}
          {weather ? (
            <div style={{ marginTop: 14 }}>
              <span className="badge">{weather.city}: {weather.temperature} C, UV {weather.uvIndex}</span>
              <p className="muted">{weather.description}</p>
              {weather.advice.map((item) => <p className="badge" key={item}>{item}</p>)}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function AssistantView({ health }) {
  const [question, setQuestion] = useState("What should I focus on today based on my medicines, fitness logs, and goals?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  async function ask(nextQuestion) {
    const requestedQuestion = nextQuestion ?? question;
    setQuestion(requestedQuestion);
    setLoading(true);
    setAssistantError("");
    setAnswer("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: requestedQuestion,
          context: {
            medications: health.activeMedications,
            adherence: health.adherence,
            recentFitness: health.data.fitness.slice(0, 5),
            goals: health.data.goals,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed.");
      }

      const payload = await response.json();
      setAnswer(payload.answer || payload.error || "No response was returned. Try a different question or refresh the page.");
    } catch (err) {
      setAssistantError("Unable to get an assistant response. Check your network or try again.");
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    "Summarize my medication adherence.",
    "What should I ask my doctor?",
    "Explain how care team requests work.",
    "What should I add to my wellness routine today?",
    "How can I improve goal tracking this week?",
  ];

  return (
    <>
      <SectionHeader title="AI care insights" description="Choose a question or type it, then tap ask for a personalized update." />
      <section className="assistant-prompts">
        {quickQuestions.map((prompt) => (
          <button className="button secondary compact" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>
        ))}
      </section>
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Ask a tracking question</h3>
          <textarea
            className="textarea"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
          />
          <button className="button" style={{ marginTop: 12 }} onClick={() => ask()}>
            <Brain size={16} /> {loading ? "Thinking..." : "Ask assistant"}
          </button>
        </div>
        <div className="card">
          <h3 className="section-title">Assistant response</h3>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {answer || "The assistant uses your live medications, dose logs, fitness entries, and goals as context. Select a quick question above or type a new one to get started."}
          </p>
        </div>
      </section>
    </>
  );
}

function ReportsView({ health, activePatient }) {
  const report = useMemo(() => {
    const lines = [
      "# SwasthyaTrack AI Visit Summary",
      `Generated: ${today()}`,
      activePatient?.full_name ? `Patient: ${activePatient.full_name}` : "",
      "",
      "## Safety note",
      "Educational tracking only. Not medical advice.",
      "",
      `Active medications: ${health.activeMedications.length}`,
      `Medication adherence: ${health.adherence.rate}%`,
      `Fitness entries: ${health.data.fitness.length}`,
      `Goals: ${health.data.goals.length}`,
      "",
      "## Goals",
      ...health.data.goals.map((goal) => `- ${goal.title}: ${goal.current}/${goal.target} ${goal.unit}`),
    ];
    return lines.join("\n");
  }, [activePatient?.full_name, health.activeMedications.length, health.adherence.rate, health.data.fitness.length, health.data.goals]);

  const href = `data:text/markdown;charset=utf-8,${encodeURIComponent(report)}`;

  return (
    <>
      <SectionHeader title="Visit summary" description="Use this before appointments, caregiver handoffs, or personal record review.">
        <a className="button" href={href} download={`swasthyatrack-visit-summary-${today()}.md`}><Download size={16} /> Download summary</a>
      </SectionHeader>
      <section className="grid-2">
        <div className="card">
          <h3 className="section-title">Generated summary</h3>
          <textarea className="textarea report-textarea" value={report} readOnly />
        </div>
        <div className="card">
          <h3 className="section-title">Why this exists</h3>
          <ul className="clinical-list">
            <li><strong>Patient visit prep</strong><span>Bring medication adherence, goals, and wellness trends into one concise document.</span></li>
            <li><strong>Doctor review</strong><span>Clinicians can review approved patient records and export a handoff summary.</span></li>
            <li><strong>Caregiver handoff</strong><span>Family caregivers can keep a non-diagnostic summary of reminders and progress.</span></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function SecurityView() {
  return (
    <>
      <SectionHeader title="Privacy and compliance posture" description="Practical controls expected in an industry-oriented healthcare student project." />
      <section className="grid-3">
        <InfoCard icon={ShieldCheck} title="Secure access policies" text="Each patient owns their records, while clinicians and caregivers need explicit access grants." />
        <InfoCard icon={Users} title="Role-based dashboards" text="Patients manage records, caregivers monitor assigned patients, and doctors review reports without exposing service keys." />
        <InfoCard icon={ShieldCheck} title="Medical safety" text="Show disclaimers, cite reliable sources, avoid diagnosis, and route emergency symptoms to professional care." />
      </section>
    </>
  );
}

function ProfileView() {
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [name, setName] = useState(auth.user?.name || "");
  const [phone, setPhone] = useState(auth.user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(auth.user?.avatarUrl || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(auth.user?.name || "");
    setPhone(auth.user?.phone || "");
    setAvatarUrl(auth.user?.avatarUrl || "");
  }, [auth.user?.avatarUrl, auth.user?.name, auth.user?.phone]);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your profile photo.");
      return;
    }
    if (file.size > 700 * 1024) {
      setError("Choose an image below 700 KB for this demo profile photo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (!name.trim()) {
        throw new Error("Full name is required.");
      }
      await auth.updateProfile({ name: name.trim(), phone: phone.trim(), avatarUrl });
      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    }
  }

  return (
    <>
      <SectionHeader title="Profile" description="Manage account identity, contact number, photo, and password.">
        <div className="toolbar">
          {editing ? (
            <button className="button" type="submit" form="profile-form">
              <Save size={16} /> Save profile
            </button>
          ) : null}
          <button className="button secondary" onClick={() => setEditing((value) => !value)}>
            <Edit3 size={16} /> {editing ? "Cancel editing" : "Edit profile"}
          </button>
        </div>
      </SectionHeader>
      {showPasswordReset ? <PasswordResetModal onClose={() => setShowPasswordReset(false)} /> : null}

      <section className="profile-layout">
        <div className="card profile-card">
          {avatarUrl ? <img className="profile-avatar photo" src={avatarUrl} alt="" /> : <div className="profile-avatar">{auth.user?.name?.slice(0, 1) || "U"}</div>}
          <div>
            <h2>{auth.user?.name}</h2>
            <p className="muted">{auth.user?.email}</p>
          </div>
          <div className="profile-badges">
            <span className="badge">{auth.user?.role}</span>
            <span className="badge success">Active account</span>
          </div>
          <button className="button secondary" onClick={() => setShowPasswordReset(true)}>
            <LockKeyhole size={16} /> Change password
          </button>
        </div>

        <div className="card">
          <h3 className="section-title">Account information</h3>
          <form id="profile-form" className="form-grid" onSubmit={saveProfile}>
            <Field label="Full name">
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} disabled={!editing} required />
            </Field>
            <Field label="Email">
              <input className="input" value={auth.user?.email || ""} disabled />
            </Field>
            <Field label="Account role">
              <input className="input" value={auth.user?.role || "patient"} disabled />
            </Field>
            <Field label="Phone number">
              <div className="input-icon-wrap">
                <Phone size={17} />
                <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!editing} placeholder="+91 98765 43210" />
              </div>
            </Field>
            <Field label="Profile photo">
              <label className={`file-control ${!editing ? "disabled" : ""}`}>
                <Camera size={17} />
                <span>{avatarUrl ? "Replace photo" : "Upload photo"}</span>
                <input type="file" accept="image/*" onChange={handlePhoto} disabled={!editing} />
              </label>
            </Field>
            {editing ? (
              <button className="button" type="submit">
                <Save size={16} /> Save profile
              </button>
            ) : null}
          </form>
          {message ? <p className="badge success">{message}</p> : null}
        </div>
      </section>
    </>
  );
}

function MedicationModal({ onClose, onSubmit }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      name: String(form.get("name")),
      dosage: String(form.get("dosage")),
      frequency: String(form.get("frequency")),
      reminderTime: String(form.get("reminderTime")),
      startDate: String(form.get("startDate")),
      instructions: String(form.get("instructions")),
    });
    onClose();
  }

  return (
    <Modal title="Add medication" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Medicine"><input className="input" name="name" placeholder="Metformin" required /></Field>
        <Field label="Dosage"><input className="input" name="dosage" placeholder="500 mg" required /></Field>
        <Field label="Frequency"><select className="select" name="frequency"><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>Weekly</option><option>As prescribed</option></select></Field>
        <Field label="Reminder time"><input className="input" name="reminderTime" type="time" defaultValue="08:00" required /></Field>
        <Field label="Start date"><input className="input" name="startDate" type="date" defaultValue={today()} required /></Field>
        <Field label="Instructions"><textarea className="textarea" name="instructions" placeholder="Take after food..." /></Field>
        <button className="button"><Plus size={16} /> Save medication</button>
      </form>
    </Modal>
  );
}

function DoseLogModal({ medicationId, onClose, onSubmit }) {
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      medicationId,
      status: String(form.get("status")),
      loggedAt: String(form.get("loggedAt")),
      note: String(form.get("note")),
    });
    onClose();
  }

  return (
    <Modal title="Log medication dose" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Status"><select className="select" name="status"><option value="taken">Taken</option><option value="missed">Missed</option><option value="skipped">Skipped with doctor advice</option></select></Field>
        <Field label="Logged at"><input className="input" name="loggedAt" type="datetime-local" defaultValue={`${today()}T08:00`} /></Field>
        <Field label="Note"><input className="input" name="note" placeholder="After breakfast" /></Field>
        <button className="button"><CheckCircle2 size={16} /> Save log</button>
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ title, description, children }) {
  return (
    <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30 }}>{title}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, note, tone = "teal" }) {
  return (
    <div className={`kpi tone-${tone}`}>
      <div className="kpi-head">
        <div className="kpi-label">{label}</div>
        <span className="kpi-icon"><Icon size={17} /></span>
      </div>
      <div className="kpi-value">{value}</div>
      {note ? <div className="kpi-note">{note}</div> : null}
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="card">
      <span className="badge"><Icon size={15} /> {title}</span>
      <p className="muted">{text}</p>
    </div>
  );
}

function QuickChips({ items, onPick }) {
  return (
    <div className="quick-chip-row">
      {items.map((item) => (
        <button className="quick-chip" type="button" key={item} onClick={() => onPick(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function AuthNotice({ title, text, tone = "info" }) {
  return (
    <div className={`auth-notice ${tone}`}>
      <CheckCircle2 size={18} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ReadMoreText({ text, limit = 240 }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > limit;
  const visibleText = expanded || !needsToggle ? text : `${text.slice(0, limit).trim()}...`;

  return (
    <p className="muted">
      {visibleText}
      {needsToggle ? (
        <button className="inline-read-more" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? " Show less" : " Read more"}
        </button>
      ) : null}
    </p>
  );
}

function PasswordGuide({ password, confirmPassword }) {
  const rules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
    { label: "Passwords match", valid: Boolean(password) && password === confirmPassword },
  ];

  return (
    <div className="password-guide" aria-label="Password requirements">
      {rules.map((rule) => (
        <span className={rule.valid ? "valid" : ""} key={rule.label}>
          <CheckCircle2 size={13} /> {rule.label}
        </span>
      ))}
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-control">
      <input
        className="input"
        type={visible ? "text" : "password"}
        minLength={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
