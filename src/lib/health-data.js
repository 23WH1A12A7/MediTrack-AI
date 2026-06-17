"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase";

const emptyData = {
  medications: [],
  logs: [],
  fitness: [],
  goals: [],
};

function fromMedication(row) {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    reminderTime: String(row.reminder_time ?? "").slice(0, 5),
    startDate: row.start_date,
    instructions: row.instructions ?? "",
    status: row.status ?? "active",
  };
}

function fromMedicationLog(row) {
  return {
    id: row.id,
    medicationId: row.medication_id,
    status: row.status,
    loggedAt: String(row.logged_at ?? "").slice(0, 16),
    note: row.note ?? "",
  };
}

function fromFitness(row) {
  return {
    id: row.id,
    date: row.metric_date,
    steps: Number(row.steps ?? 0),
    calories: Number(row.calories ?? 0),
    sleepHours: Number(row.sleep_hours ?? 0),
    waterLiters: Number(row.water_liters ?? 0),
    mood: row.mood ?? "Okay",
  };
}

function fromGoal(row) {
  return {
    id: row.id,
    title: row.title,
    target: Number(row.target ?? 0),
    current: Number(row.current ?? 0),
    unit: row.unit,
    dueDate: row.due_date,
  };
}

export function useHealthData(user, patientId) {
  const supabase = getSupabaseBrowserClient();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("offline");

  const activePatientId = patientId || user?.id;

  const loadData = useCallback(async () => {
    if (!supabase || !user?.id || !activePatientId) {
      setData(emptyData);
      setRealtimeStatus("offline");
      return;
    }

    setLoading(true);
    setSyncError("");

    try {
      const [medications, logs, fitness, goals] = await Promise.all([
        supabase.from("medications").select("*").eq("patient_id", activePatientId).order("reminder_time", { ascending: true }),
        supabase.from("medication_logs").select("*").eq("patient_id", activePatientId).order("logged_at", { ascending: false }),
        supabase.from("fitness_metrics").select("*").eq("patient_id", activePatientId).order("metric_date", { ascending: false }),
        supabase.from("health_goals").select("*").eq("patient_id", activePatientId).order("due_date", { ascending: true }),
      ]);

      const firstError = medications.error || logs.error || fitness.error || goals.error;
      if (firstError) throw firstError;

      setData({
        medications: medications.data.map(fromMedication),
        logs: logs.data.map(fromMedicationLog),
        fitness: fitness.data.map(fromFitness),
        goals: goals.data.map(fromGoal),
      });
    } catch (error) {
      setSyncError(error.message ?? "Could not load health records.");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [activePatientId, supabase, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!supabase || !user?.id || !activePatientId) {
      return undefined;
    }

    const channel = supabase
      .channel(`patient-health-${activePatientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "medications", filter: `patient_id=eq.${activePatientId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "medication_logs", filter: `patient_id=eq.${activePatientId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "fitness_metrics", filter: `patient_id=eq.${activePatientId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "health_goals", filter: `patient_id=eq.${activePatientId}` }, loadData)
      .subscribe((status) => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "live" : "connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePatientId, loadData, supabase, user?.id]);

  const activeMedications = useMemo(
    () => data.medications.filter((medication) => medication.status === "active"),
    [data.medications],
  );

  const adherence = useMemo(() => {
    const total = data.logs.length;
    const taken = data.logs.filter((log) => log.status === "taken").length;
    const missed = data.logs.filter((log) => log.status === "missed").length;
    return {
      total,
      taken,
      missed,
      rate: total ? Math.round((taken / total) * 100) : 0,
    };
  }, [data.logs]);

  const addMedication = async (payload) => {
    if (!supabase || !user?.id || !activePatientId) return;

    const { error } = await supabase.from("medications").insert({
      patient_id: activePatientId,
      name: payload.name,
      dosage: payload.dosage,
      frequency: payload.frequency,
      reminder_time: payload.reminderTime,
      start_date: payload.startDate,
      instructions: payload.instructions,
      status: "active",
    });

    if (error) setSyncError(error.message);
    else await loadData();
  };

  const logDose = async (payload) => {
    if (!supabase || !user?.id || !activePatientId) return;

    const { error } = await supabase.from("medication_logs").insert({
      medication_id: payload.medicationId,
      patient_id: activePatientId,
      status: payload.status,
      logged_at: payload.loggedAt,
      note: payload.note,
    });

    if (error) setSyncError(error.message);
    else await loadData();
  };

  const addFitness = async (payload) => {
    if (!supabase || !user?.id || !activePatientId) return;

    const { error } = await supabase.from("fitness_metrics").insert({
      patient_id: activePatientId,
      metric_date: payload.date,
      steps: payload.steps,
      calories: payload.calories,
      sleep_hours: payload.sleepHours,
      water_liters: payload.waterLiters,
      mood: payload.mood,
    });

    if (error) setSyncError(error.message);
    else await loadData();
  };

  const addGoal = async (payload) => {
    if (!supabase || !user?.id || !activePatientId) return;

    const { error } = await supabase.from("health_goals").insert({
      patient_id: activePatientId,
      title: payload.title,
      target: payload.target,
      current: payload.current,
      unit: payload.unit,
      due_date: payload.dueDate,
    });

    if (error) setSyncError(error.message);
    else await loadData();
  };

  const updateGoal = async (goalId, current) => {
    if (!supabase || !user?.id) return;

    setData((state) => ({
      ...state,
      goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, current } : goal)),
    }));

    const { error } = await supabase.from("health_goals").update({ current }).eq("id", goalId).eq("patient_id", activePatientId);
    if (error) setSyncError(error.message);
  };

  const pauseMedication = async (medicationId) => {
    if (!supabase || !user?.id) return;

    setData((state) => ({
      ...state,
      medications: state.medications.map((medication) =>
        medication.id === medicationId ? { ...medication, status: "paused" } : medication,
      ),
    }));

    const { error } = await supabase.from("medications").update({ status: "paused" }).eq("id", medicationId).eq("patient_id", activePatientId);
    if (error) setSyncError(error.message);
  };

  return {
    data,
    activeMedications,
    adherence,
    loading,
    syncError,
    mode: supabase && user?.id ? "supabase" : "not-configured",
    realtimeStatus,
    addMedication,
    logDose,
    addFitness,
    addGoal,
    updateGoal,
    pauseMedication,
    refresh: loadData,
  };
}

export function useCareNetwork(user) {
  const supabase = getSupabaseBrowserClient();
  const [providers, setProviders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [acceptedPatients, setAcceptedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);

  const loadCareNetwork = useCallback(async () => {
    if (!supabase || !user?.id) return;

    setLoading(true);
    setError("");
    setSetupRequired(false);

    try {
      if (user.role === "patient") {
        const providerRows = await supabase.from("profiles").select("id, full_name, email, role").in("role", ["doctor", "caregiver"]).order("full_name");
        const response = await fetch("/api/providers");
        const payload = await response.json();
        const clientProviders = providerRows.error ? [] : providerRows.data ?? [];
        const serverProviders = payload.providers ?? [];
        const byId = new Map([...clientProviders, ...serverProviders].map((provider) => [provider.id, provider]));
        setProviders(Array.from(byId.values()));

        const requestRows = await supabase.from("care_requests").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
        if (requestRows.error) {
          const message = requestRows.error.message ?? "";
          const missingCareSchema = message.includes("care_requests") || message.includes("schema cache");
          setSetupRequired(missingCareSchema);
          setError(missingCareSchema ? "" : message);
          setRequests([]);
          setAcceptedPatients([]);
          return;
        }
        setRequests(requestRows.data ?? []);
        setAcceptedPatients([]);
      } else {
        const [requestRows, accessRows] = await Promise.all([
          supabase.from("care_requests").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
          supabase.from("care_access").select("*").eq("viewer_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (requestRows.error || accessRows.error) throw requestRows.error || accessRows.error;

        const patientIds = Array.from(new Set([
          ...(requestRows.data ?? []).map((item) => item.patient_id),
          ...(accessRows.data ?? []).map((item) => item.patient_id),
        ]));
        const profileRows = patientIds.length
          ? await supabase.from("profiles").select("id, full_name, email, role").in("id", patientIds)
          : { data: [], error: null };
        if (profileRows.error) throw profileRows.error;

        const profileById = new Map((profileRows.data ?? []).map((profile) => [profile.id, profile]));
        setRequests((requestRows.data ?? []).map((request) => ({ ...request, patient: profileById.get(request.patient_id) })));
        setAcceptedPatients((accessRows.data ?? []).map((access) => ({ ...access, patient: profileById.get(access.patient_id) })).filter((access) => access.patient));
        setProviders([]);
      }
    } catch (err) {
      const message = err.message ?? "Could not load care network.";
      const missingCareSchema = message.includes("care_requests") || message.includes("care_access") || message.includes("schema cache");
      setSetupRequired(missingCareSchema);
      setError(
        missingCareSchema
          ? ""
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, user?.role]);

  useEffect(() => {
    loadCareNetwork();
  }, [loadCareNetwork]);

  const requestAccess = async ({ providerId, providerRole, requestType, reason }) => {
    if (!supabase || !user?.id) return;
    const { error: requestError } = await supabase.from("care_requests").upsert({
      patient_id: user.id,
      provider_id: providerId,
      provider_role: providerRole,
      request_type: requestType,
      reason,
      status: "pending",
    }, { onConflict: "patient_id,provider_id" });
    if (requestError) setError(requestError.message);
    else await loadCareNetwork();
  };

  const respondToRequest = async (request, status) => {
    if (!supabase || !user?.id) return;
    const { error: updateError } = await supabase.from("care_requests").update({ status }).eq("id", request.id).eq("provider_id", user.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (status === "accepted") {
      const { error: accessError } = await supabase.from("care_access").upsert({
        patient_id: request.patient_id,
        viewer_id: user.id,
        viewer_role: user.role,
      }, { onConflict: "patient_id,viewer_id" });
      if (accessError) setError(accessError.message);
    }
    await loadCareNetwork();
  };

  return {
    providers,
    requests,
    acceptedPatients,
    loading,
    error,
    setupRequired,
    requestAccess,
    respondToRequest,
    refresh: loadCareNetwork,
  };
}
