from __future__ import annotations

from datetime import date, datetime

import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import load_dotenv

from src.ai_assistant import generate_health_answer
from src.database import (
    add_fitness_metric,
    add_goal,
    add_medication,
    deactivate_medication,
    fitness_metrics,
    health_goals,
    init_db,
    list_medications,
    log_medication,
    medication_logs,
    update_goal_progress,
)
from src.health_apis import check_weather_safety, lookup_drug_label, search_medlineplus
from src.reporting import build_export_report, medication_adherence_summary


load_dotenv()
init_db()

st.set_page_config(page_title="SwasthyaTrack AI", page_icon="+", layout="wide")

st.markdown(
    """
    <style>
    .block-container { padding-top: 1.3rem; }
    .safety-box {
        border-left: 4px solid #c2410c;
        background: #fff7ed;
        padding: 0.75rem 1rem;
        border-radius: 0.35rem;
        color: #431407;
    }
    .metric-card {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        background: #ffffff;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def main() -> None:
    st.title("SwasthyaTrack AI")
    st.caption("Track A personal health assistant: medication adherence, fitness logs, goals, and reliable medical lookup.")

    st.markdown(
        """
        <div class="safety-box">
        This educational app does not diagnose, prescribe, or replace professional medical care.
        For emergencies, severe symptoms, allergic reactions, chest pain, breathing difficulty, or overdose concerns, contact local emergency services immediately.
        </div>
        """,
        unsafe_allow_html=True,
    )

    tabs = st.tabs(["Dashboard", "Medications", "Fitness", "Goals", "Medical Lookup", "AI Assistant", "Export"])
    with tabs[0]:
        dashboard_tab()
    with tabs[1]:
        medications_tab()
    with tabs[2]:
        fitness_tab()
    with tabs[3]:
        goals_tab()
    with tabs[4]:
        lookup_tab()
    with tabs[5]:
        assistant_tab()
    with tabs[6]:
        export_tab()


def dashboard_tab() -> None:
    meds = list_medications()
    logs = medication_logs()
    fitness = fitness_metrics()
    goals = health_goals()
    adherence = medication_adherence_summary(logs)

    st.subheader("Patient Dashboard")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Active medicines", len(meds))
    c2.metric("Adherence", f"{adherence['adherence_rate']}%")
    c3.metric("Fitness entries", len(fitness))
    c4.metric("Open goals", len(goals))

    left, right = st.columns([1.2, 1])
    with left:
        st.markdown("#### Fitness trend")
        if fitness.empty:
            st.info("Add fitness data to see trends.")
        else:
            ordered = fitness.sort_values("metric_date")
            fig = px.line(ordered, x="metric_date", y=["steps", "calories"], markers=True)
            fig.update_layout(height=330, margin=dict(l=12, r=12, t=20, b=12), legend_title_text="")
            st.plotly_chart(fig, use_container_width=True)

    with right:
        st.markdown("#### Today's medicine schedule")
        if meds.empty:
            st.info("No active medicines yet.")
        else:
            st.dataframe(meds[["name", "dosage", "frequency", "time_of_day"]], use_container_width=True, hide_index=True)

    st.markdown("#### Goal progress")
    if goals.empty:
        st.info("Create a wellness goal to track progress.")
    else:
        for _, goal in goals.iterrows():
            target = float(goal["target_value"]) or 1
            st.progress(min(float(goal["current_value"]) / target, 1.0), text=f"{goal['title']} - due {goal['due_date']}")


def medications_tab() -> None:
    st.subheader("Medication Tracker")
    form_col, list_col = st.columns([0.85, 1.15])

    with form_col:
        st.markdown("#### Add medication")
        with st.form("add_medication_form", clear_on_submit=True):
            name = st.text_input("Medicine name", placeholder="Metformin")
            dosage = st.text_input("Dosage", placeholder="500 mg")
            frequency = st.selectbox("Frequency", ["Once daily", "Twice daily", "Three times daily", "Weekly", "As prescribed"])
            time_of_day = st.time_input("Reminder time")
            start_date = st.date_input("Start date", value=date.today())
            notes = st.text_area("Notes", placeholder="Take after food, avoid missed doses...")
            submitted = st.form_submit_button("Add medicine")
            if submitted:
                if not name.strip() or not dosage.strip():
                    st.error("Medicine name and dosage are required.")
                else:
                    add_medication(name, dosage, frequency, time_of_day.strftime("%H:%M"), start_date.isoformat(), notes)
                    st.success("Medication added.")
                    st.rerun()

    with list_col:
        meds = list_medications()
        st.markdown("#### Active medications")
        if meds.empty:
            st.info("No active medications recorded.")
        else:
            st.dataframe(meds[["id", "name", "dosage", "frequency", "time_of_day", "notes"]], use_container_width=True, hide_index=True)

            with st.form("log_medication_form"):
                med_options = {f"{row['name']} ({row['dosage']})": int(row["id"]) for _, row in meds.iterrows()}
                selected = st.selectbox("Medication", list(med_options.keys()))
                status = st.radio("Dose status", ["Taken", "Missed", "Skipped with doctor advice"], horizontal=True)
                taken_at = st.datetime_input("Log time", value=datetime.now())
                note = st.text_input("Log note")
                submitted = st.form_submit_button("Save dose log")
                if submitted:
                    log_medication(med_options[selected], taken_at.isoformat(timespec="minutes"), status, note)
                    st.success("Dose log saved.")
                    st.rerun()

            deactivate_id = st.selectbox("Stop tracking medication", [None] + meds["id"].astype(int).tolist())
            if deactivate_id and st.button("Deactivate selected medicine"):
                deactivate_medication(int(deactivate_id))
                st.success("Medication deactivated.")
                st.rerun()

    logs = medication_logs()
    st.markdown("#### Adherence history")
    if logs.empty:
        st.info("No dose logs yet.")
    else:
        st.dataframe(logs, use_container_width=True, hide_index=True)


def fitness_tab() -> None:
    st.subheader("Fitness and Wellness Metrics")
    left, right = st.columns([0.9, 1.1])

    with left:
        with st.form("fitness_form", clear_on_submit=True):
            metric_date = st.date_input("Date", value=date.today())
            steps = st.number_input("Steps", min_value=0, value=6000, step=500)
            calories = st.number_input("Active calories", min_value=0, value=300, step=25)
            sleep_hours = st.number_input("Sleep hours", min_value=0.0, max_value=24.0, value=7.0, step=0.5)
            water_liters = st.number_input("Water intake (liters)", min_value=0.0, max_value=20.0, value=2.0, step=0.25)
            mood = st.selectbox("Mood", ["Good", "Okay", "Tired", "Stressed", "Unwell"])
            notes = st.text_area("Notes")
            if st.form_submit_button("Save wellness entry"):
                add_fitness_metric(metric_date.isoformat(), int(steps), int(calories), float(sleep_hours), float(water_liters), mood, notes)
                st.success("Fitness data saved.")
                st.rerun()

    with right:
        fitness = fitness_metrics()
        if fitness.empty:
            st.info("No fitness metrics recorded.")
        else:
            st.dataframe(fitness, use_container_width=True, hide_index=True)
            ordered = fitness.sort_values("metric_date")
            fig = px.bar(ordered, x="metric_date", y="steps", color="mood", title="Daily steps")
            fig.update_layout(height=360, margin=dict(l=12, r=12, t=45, b=12))
            st.plotly_chart(fig, use_container_width=True)


def goals_tab() -> None:
    st.subheader("Wellness Goals")
    left, right = st.columns([0.85, 1.15])

    with left:
        with st.form("goal_form", clear_on_submit=True):
            title = st.text_input("Goal", placeholder="Walk 80,000 steps this month")
            target = st.number_input("Target", min_value=0.0, value=80000.0, step=100.0)
            current = st.number_input("Current progress", min_value=0.0, value=0.0, step=100.0)
            unit = st.text_input("Unit", value="steps")
            due_date = st.date_input("Due date", value=date.today())
            if st.form_submit_button("Create goal"):
                if not title.strip() or not unit.strip():
                    st.error("Goal and unit are required.")
                else:
                    add_goal(title, float(target), float(current), unit, due_date.isoformat())
                    st.success("Goal created.")
                    st.rerun()

    with right:
        goals = health_goals()
        if goals.empty:
            st.info("No goals yet.")
        else:
            for _, goal in goals.iterrows():
                with st.container(border=True):
                    progress = 0 if goal["target_value"] == 0 else min(float(goal["current_value"]) / float(goal["target_value"]), 1.0)
                    st.progress(progress, text=f"{goal['title']} ({progress * 100:.1f}%)")
                    new_value = st.number_input(
                        f"Update progress for goal #{goal['id']}",
                        min_value=0.0,
                        value=float(goal["current_value"]),
                        step=1.0,
                        key=f"goal_{goal['id']}",
                    )
                    if st.button("Update", key=f"update_goal_{goal['id']}"):
                        update_goal_progress(int(goal["id"]), float(new_value))
                        st.rerun()


def lookup_tab() -> None:
    st.subheader("Reliable Medical Information Lookup")
    query = st.text_input("Search MedlinePlus", placeholder="diabetes, hypertension, fever...")
    if st.button("Search health topics") and query.strip():
        try:
            results = search_medlineplus(query)
            if not results:
                st.info("No results found. Try a simpler term.")
            for result in results:
                st.markdown(f"**[{result.title}]({result.url})**")
                st.caption(result.source)
                st.write(result.snippet)
        except Exception as exc:  # noqa: BLE001
            st.error(f"Lookup failed: {exc}")

    st.divider()
    drug = st.text_input("Drug label lookup", placeholder="paracetamol, metformin...")
    if st.button("Check drug label") and drug.strip():
        try:
            label = lookup_drug_label(drug)
            if not label:
                st.warning("No OpenFDA label found. Confirm medicine details with a pharmacist or doctor.")
            else:
                st.markdown("#### OpenFDA label highlights")
                for field in ["purpose", "indications_and_usage", "warnings", "dosage_and_administration"]:
                    values = label.get(field)
                    if values:
                        st.markdown(f"**{field.replace('_', ' ').title()}**")
                        st.write(values[0])
        except Exception as exc:  # noqa: BLE001
            st.error(f"Drug lookup failed: {exc}")

    st.divider()
    city = st.text_input("Outdoor wellness weather check", placeholder="Delhi")
    if st.button("Check weather safety") and city.strip():
        try:
            weather = check_weather_safety(city)
            if not weather:
                st.info("Add WEATHERSTACK_API_KEY in .env to enable weather checks.")
            else:
                st.metric(f"Temperature in {weather['city']}", f"{weather['temperature']} C")
                st.write(weather["description"])
                for item in weather["advice"]:
                    st.warning(item)
        except Exception as exc:  # noqa: BLE001
            st.error(f"Weather lookup failed: {exc}")


def assistant_tab() -> None:
    st.subheader("Cautious AI Health Assistant")
    st.write("Ask about medication adherence, fitness goals, or how to prepare for a doctor visit.")
    question = st.text_area("Question", placeholder="How can I remember my evening medicine?")
    meds = list_medications()
    fitness = fitness_metrics().head(5)
    context = f"Active medications:\n{meds.to_string(index=False) if not meds.empty else 'None'}\n\nRecent fitness:\n{fitness.to_string(index=False) if not fitness.empty else 'None'}"

    if st.button("Ask assistant"):
        answer = generate_health_answer(question, context)
        st.markdown(answer)


def export_tab() -> None:
    st.subheader("Export Health Report")
    meds = list_medications()
    logs = medication_logs()
    fitness = fitness_metrics()
    goals = health_goals()
    report = build_export_report(meds, logs, fitness, goals)
    st.download_button(
        "Download Markdown report",
        data=report,
        file_name=f"health_report_{date.today().isoformat()}.md",
        mime="text/markdown",
    )
    st.text_area("Preview", value=report, height=420)


if __name__ == "__main__":
    main()
