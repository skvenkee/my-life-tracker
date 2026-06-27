"use client"
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type CategoryId = "move" | "explore" | "relax" | "nourish" | "connect" | "discipline";
type Frequency = "daily" | "2x_week" | "3x_week" | "weekly" | "weekdays" | "weekends";
type HabitType = "checkbox" | "time";
type MealTag = "whole" | "cooked" | "packaged" | "junk";
type Portion = "half" | "single" | "double" | "triple";
type Rating = 1 | 2 | 3 | 4 | 5;
type View = "login" | "today" | "checkin" | "food" | "beverages" | "calories" | "analytics" | "history" | "settings";

type Habit = { id: string; title: string; emoji: string; type: HabitType; category: CategoryId; frequency: Frequency; active: boolean; allowComments: boolean; };
type HabitLog = { id: string; habitId: string; value: string; comment?: string; date: string; };
type DayRating = { id: string; date: string; ratings: Record<CategoryId, Rating>; notes: Record<CategoryId, string>; };
type Meal = { id: string; mealType: string; description: string; tag: MealTag; portion: Portion; notes?: string; calories?: number; time: string; date: string; isBeverage?: boolean; };
type CalorieItem = { id: string; name: string; emoji: string; calories: number; category: string; isCustom?: boolean; };

const todayStr = () => new Date().toISOString().split("T")[0];
const nowStr = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

const CATEGORIES: Record<CategoryId, { label: string; emoji: string; color: string; bg: string; description: string; weight: number }> = {
  discipline: { label: "DISCIPLINE", emoji: "🔥", color: "#f97316", bg: "#fff7ed", description: "Self-control & consistency", weight: 0.25 },
  move:       { label: "MOVE",       emoji: "💪", color: "#ff6b6b", bg: "#fff0f0", description: "Activity & fitness",        weight: 0.15 },
  explore:    { label: "EXPLORE",    emoji: "🧠", color: "#a78bfa", bg: "#f3f0ff", description: "Learning & growth",         weight: 0.15 },
  relax:      { label: "RELAX",      emoji: "😌", color: "#4ecdc4", bg: "#e8faf9", description: "Rest & mindfulness",        weight: 0.15 },
  nourish:    { label: "NOURISH",    emoji: "🥗", color: "#4ade80", bg: "#f0fdf4", description: "Food & hydration",          weight: 0.15 },
  connect:    { label: "CONNECT",    emoji: "🤝", color: "#f5c842", bg: "#fdf3c0", description: "Family & relationships",    weight: 0.15 },
};

const CAT_ORDER: CategoryId[] = ["discipline","move","explore","relax","nourish","connect"];

const RATINGS: Record<Rating, { label: string; color: string; bg: string }> = {
  1: { label: "Poor",          color: "#ff6b6b", bg: "#fff0f0" },
  2: { label: "Below Average", color: "#fb923c", bg: "#fff7ed" },
  3: { label: "Average",       color: "#f5c842", bg: "#fdf3c0" },
  4: { label: "Good",          color: "#4ade80", bg: "#f0fdf4" },
  5: { label: "Excellent",     color: "#4ecdc4", bg: "#e8faf9" },
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily", "2x_week": "2x/week", "3x_week": "3x/week", weekly: "Weekly", weekdays: "Weekdays", weekends: "Weekends",
};

const TAG_CONFIG: Record<MealTag, { label: string; emoji: string; color: string; bg: string }> = {
  whole:    { label: "Whole food",      emoji: "🥗", color: "#4ade80", bg: "#f0fdf4" },
  cooked:   { label: "Cooked/fried",    emoji: "🍳", color: "#f5c842", bg: "#fdf3c0" },
  packaged: { label: "Packaged",        emoji: "📦", color: "#a78bfa", bg: "#f3f0ff" },
  junk:     { label: "Junk/Eating out", emoji: "🍔", color: "#ff6b6b", bg: "#fff0f0" },
};

const PORTION_CONFIG: Record<Portion, string> = { half: "1/2", single: "1x", double: "2x", triple: "3x" };

const DEFAULT_CALORIE_ITEMS: CalorieItem[] = [
  { id: "bev1", name: "Black filter coffee",             emoji: "☕", calories: 5,   category: "Beverages" },
  { id: "bev2", name: "Filter coffee with milk (50/50)", emoji: "☕", calories: 50,  category: "Beverages" },
  { id: "bev3", name: "Chai with milk & sugar",          emoji: "🍵", calories: 60,  category: "Beverages" },
  { id: "bev4", name: "Sparkling water",                 emoji: "💧", calories: 0,   category: "Beverages" },
  { id: "bev5", name: "Fresh lime soda (plain)",         emoji: "🍋", calories: 10,  category: "Beverages" },
  { id: "bev6", name: "Coconut water",                   emoji: "🥥", calories: 45,  category: "Beverages" },
  { id: "si1",  name: "Plain idli (1 piece)",            emoji: "🫓", calories: 39,  category: "South Indian" },
  { id: "si2",  name: "Masala dosa",                     emoji: "🫔", calories: 200, category: "South Indian" },
  { id: "si3",  name: "Plain dosa",                      emoji: "🫔", calories: 120, category: "South Indian" },
  { id: "si4",  name: "Sambar (bowl)",                   emoji: "🥣", calories: 80,  category: "South Indian" },
  { id: "si5",  name: "Rice (1 cup cooked)",             emoji: "🍚", calories: 200, category: "South Indian" },
  { id: "si6",  name: "Rasam (bowl)",                    emoji: "🥣", calories: 35,  category: "South Indian" },
  { id: "si7",  name: "Upma (1 cup)",                    emoji: "🥣", calories: 170, category: "South Indian" },
  { id: "si8",  name: "Puri (1 piece)",                  emoji: "🫓", calories: 85,  category: "South Indian" },
  { id: "si9",  name: "Vada (1 piece)",                  emoji: "🍩", calories: 100, category: "South Indian" },
  { id: "cf1",  name: "Egg (boiled)",                    emoji: "🥚", calories: 78,  category: "Common Foods" },
  { id: "cf2",  name: "Banana",                          emoji: "🍌", calories: 90,  category: "Common Foods" },
  { id: "cf3",  name: "Apple",                           emoji: "🍎", calories: 80,  category: "Common Foods" },
  { id: "cf4",  name: "Whole wheat bread (1 slice)",     emoji: "🍞", calories: 70,  category: "Common Foods" },
  { id: "cf5",  name: "Peanut butter (1 tbsp)",          emoji: "🥜", calories: 94,  category: "Common Foods" },
  { id: "cf6",  name: "Dal (1 cup)",                     emoji: "🥣", calories: 180, category: "Common Foods" },
  { id: "cf7",  name: "Chicken curry (1 cup)",           emoji: "🍗", calories: 250, category: "Common Foods" },
  { id: "cf8",  name: "Almonds (10 pieces)",             emoji: "🌰", calories: 70,  category: "Common Foods" },
];

const DEFAULT_HABITS = [
  { id: "h1",  title: "Morning brush",       emoji: "🪥", type: "checkbox", category: "relax",      frequency: "daily",   active: true, allow_comments: false, sort_order: 0 },
  { id: "h2",  title: "Night brush",         emoji: "🪥", type: "checkbox", category: "relax",      frequency: "daily",   active: true, allow_comments: false, sort_order: 1 },
  { id: "h3",  title: "Walking",             emoji: "🚶", type: "checkbox", category: "move",       frequency: "daily",   active: true, allow_comments: true,  sort_order: 2 },
  { id: "h4",  title: "Tennis",              emoji: "🎾", type: "checkbox", category: "move",       frequency: "2x_week", active: true, allow_comments: true,  sort_order: 3 },
  { id: "h5",  title: "Strength training",   emoji: "🏋️", type: "checkbox", category: "move",       frequency: "2x_week", active: true, allow_comments: true,  sort_order: 4 },
  { id: "h6",  title: "Play with kids",      emoji: "👪", type: "checkbox", category: "connect",    frequency: "daily",   active: true, allow_comments: true,  sort_order: 5 },
  { id: "h7",  title: "Bedtime",             emoji: "😴", type: "time",     category: "relax",      frequency: "daily",   active: true, allow_comments: false, sort_order: 6 },
  { id: "h8",  title: "Read",                emoji: "📚", type: "checkbox", category: "explore",    frequency: "daily",   active: true, allow_comments: true,  sort_order: 7 },
  { id: "h9",  title: "Learn something",     emoji: "🎯", type: "checkbox", category: "explore",    frequency: "3x_week", active: true, allow_comments: true,  sort_order: 8 },
  { id: "h10", title: "Call family",         emoji: "📞", type: "checkbox", category: "connect",    frequency: "weekly",  active: true, allow_comments: true,  sort_order: 9 },
  { id: "h11", title: "No snacking after 8pm", emoji: "🛑", type: "checkbox", category: "discipline", frequency: "daily", active: true, allow_comments: false, sort_order: 10 },
  { id: "h12", title: "Screen time limit",   emoji: "📵", type: "checkbox", category: "discipline", frequency: "daily",   active: true, allow_comments: false, sort_order: 11 },
  { id: "h13", title: "Woke up on time",     emoji: "⏰", type: "checkbox", category: "discipline", frequency: "daily",   active: true, allow_comments: false, sort_order: 12 },
  { id: "h14", title: "No junk food",        emoji: "🔥", type: "checkbox", category: "discipline", frequency: "daily",   active: true, allow_comments: false, sort_order: 13 },
  { id: "h15", title: "Followed budget",     emoji: "💰", type: "checkbox", category: "discipline", frequency: "daily",   active: true, allow_comments: true,  sort_order: 14 },
];

const C = {
  navy: "#1a2340", gold: "#f5c842", goldLight: "#fdf3c0", coral: "#ff6b6b", coralLight: "#fff0f0",
  mint: "#4ecdc4", mintLight: "#e8faf9", purple: "#a78bfa", purpleLight: "#f3f0ff",
  green: "#4ade80", greenLight: "#f0fdf4", orange: "#f97316",
  bg: "#f7f8fc", card: "#ffffff", text: "#1a2340", muted: "#8892a4", border: "#e8eaf0",
};

const S: Record<string, React.CSSProperties> = {
  app:      { minHeight: "100vh", width: "100%", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text },
  header:   { background: C.navy, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 12px rgba(26,35,64,0.15)" },
  body:     { padding: "16px 16px 100px" },
  card:     { background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(26,35,64,0.06)", border: `1px solid ${C.border}` },
  input:    { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box" as const, color: C.text, fontFamily: "inherit" },
  label:    { fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  bottomNav:{ position: "fixed" as const, bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 12px", zIndex: 20 },
  secTitle: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 8 },
};

const btn = (variant = "primary", extra?: React.CSSProperties): React.CSSProperties => ({
  background: variant === "primary" ? C.gold : variant === "navy" ? C.navy : variant === "danger" ? C.coral : "transparent",
  color: variant === "primary" ? C.navy : variant === "ghost" ? C.muted : "#fff",
  border: variant === "ghost" ? `1px solid ${C.border}` : "none",
  borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14,
  cursor: "pointer", display: "inline-flex" as const, alignItems: "center" as const, gap: 6, fontFamily: "inherit", ...extra,
});

const navBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  background: "none", border: "none", cursor: "pointer",
  color: active ? C.navy : C.muted, fontSize: 9, fontWeight: active ? 800 : 500, fontFamily: "inherit", padding: "4px 0",
});

function calcLifeScore(ratings: Record<CategoryId, Rating>): number {
  return Math.round(CAT_ORDER.reduce((sum, catId) => sum + (ratings[catId] / 5) * CATEGORIES[catId].weight * 100, 0));
}

function isHabitDueToday(habit: Habit): boolean {
  const day = new Date().getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return day >= 1 && day <= 5;
  if (habit.frequency === "weekends") return day === 0 || day === 6;
  return true;
}

function getWeekDates(): string[] {
  const dates: string[] = []; const today = new Date(); const day = today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); dates.push(d.toISOString().split("T")[0]); }
  return dates;
}

function getWeeklyHits(habit: Habit, logs: HabitLog[]): number {
  const week = getWeekDates();
  return logs.filter(l => l.habitId === habit.id && week.includes(l.date)).length;
}

function getFrequencyTarget(freq: Frequency): number {
  if (freq === "daily") return 7; if (freq === "2x_week") return 2; if (freq === "3x_week") return 3;
  if (freq === "weekly") return 1; if (freq === "weekdays") return 5; if (freq === "weekends") return 2;
  return 1;
}

function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split("T")[0]); }
  return dates;
}

function dateLabel(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function dbToHabit(r: any): Habit {
  return { id: r.id, title: r.title, emoji: r.emoji, type: r.type, category: r.category, frequency: r.frequency, active: r.active, allowComments: r.allow_comments };
}
function dbToHabitLog(r: any): HabitLog { return { id: r.id, habitId: r.habit_id, value: r.value, comment: r.comment, date: r.logged_date }; }
function dbToMeal(r: any): Meal { return { id: r.id, mealType: r.meal_type, description: r.description, tag: r.tag, portion: r.portion, notes: r.notes, calories: r.calories, time: r.time, date: r.logged_date, isBeverage: r.is_beverage }; }
function dbToCalItem(r: any): CalorieItem { return { id: r.id, name: r.name, emoji: r.emoji, calories: r.calories, category: r.category, isCustom: r.is_custom }; }
function dbToDayRating(r: any): DayRating {
  return {
    id: r.id, date: r.rated_date,
    ratings: { move: r.move_rating||3, explore: r.explore_rating||3, relax: r.relax_rating||3, nourish: r.nourish_rating||3, connect: r.connect_rating||3, discipline: r.discipline_rating||3 },
    notes: { move: r.move_note||"", explore: r.explore_note||"", relax: r.relax_note||"", nourish: r.nourish_note||"", connect: r.connect_note||"", discipline: r.discipline_note||"" },
  };
}

function LoadingScreen() {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🧘</div>
        <div style={{ fontWeight: 700 }}>Loading...</div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, pinLength }: { onLogin: () => void; pinLength: number }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function handleKey(d: string) {
    if (pin.length >= pinLength) return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === pinLength) {
      const { data } = await supabase.from("personal_settings").select("pin").single();
      if (data && newPin === data.pin) { onLogin(); }
      else { setError("Wrong PIN"); setShake(true); setTimeout(() => { setPin(""); setError(""); setShake(false); }, 800); }
    }
  }

  return (
    <div style={{ ...S.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: 360, padding: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🧘</div>
        <div style={{ fontWeight: 900, fontSize: 28, color: C.navy, marginBottom: 4 }}>My Life Tracker</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 36 }}>Personal & Private</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, transform: shake ? "translateX(8px)" : "none", transition: "transform 0.1s" }}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? C.navy : C.border, transition: "background 0.15s" }} />
          ))}
        </div>
        {error && <div style={{ color: C.coral, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto" }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"<"].map((d, i) => (
            <button key={i} onClick={() => { if (d === "<") setPin(p => p.slice(0,-1)); else if (d !== "") handleKey(String(d)); }}
              style={{ padding: "16px 0", fontSize: d === "<" ? 18 : 22, fontWeight: 700, background: d === "" ? "transparent" : C.card, border: d === "" ? "none" : `1.5px solid ${C.border}`, borderRadius: 12, cursor: d === "" ? "default" : "pointer", color: C.navy, fontFamily: "inherit" }}>{d === "<" ? "⌫" : d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitLogForm({ habit, existing, onSave, onCancel }: { habit: Habit; existing?: HabitLog; onSave: (value: string, comment?: string) => void; onCancel: () => void; }) {
  const [time, setTime] = useState(existing?.value || nowStr());
  const [comment, setComment] = useState(existing?.comment || "");
  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: 12, marginTop: 8, border: `1px solid ${C.border}` }}>
      {habit.type === "time" && <div style={{ marginBottom: habit.allowComments ? 10 : 0 }}><label style={S.label}>Time</label><input style={S.input} type="time" value={time} onChange={e => setTime(e.target.value)} /></div>}
      {habit.allowComments && <div style={{ marginTop: habit.type === "time" ? 10 : 0 }}><label style={S.label}>Comment (optional)</label><input style={S.input} placeholder={`Notes on ${habit.title.toLowerCase()}...`} value={comment} onChange={e => setComment(e.target.value)} /></div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={{ ...btn("primary"), flex: 1, justifyContent: "center", padding: "9px" }} onClick={() => onSave(habit.type === "time" ? time : "done", comment || undefined)}>Save</button>
        <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center", padding: "9px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function TodayTab({ habits, habitLogs, dayRating, onSaveLog, onRemoveLog, onGoCheckin }: { habits: Habit[]; habitLogs: HabitLog[]; dayRating?: DayRating; onSaveLog: (habitId: string, value: string, comment?: string) => void; onRemoveLog: (habitId: string) => void; onGoCheckin: () => void; }) {
  const [openForm, setOpenForm] = useState<string|null>(null);
  const todayHabits = habits.filter(h => h.active && isHabitDueToday(h));
  const checkboxHabits = todayHabits.filter(h => h.type === "checkbox");
  const done = checkboxHabits.filter(h => habitLogs.some(l => l.habitId === h.id && l.date === todayStr())).length;
  const pct = checkboxHabits.length ? Math.round((done/checkboxHabits.length)*100) : 0;
  const getLog = (hid: string) => habitLogs.find(l => l.habitId === hid && l.date === todayStr());
  const lifeScore = dayRating ? calcLifeScore(dayRating.ratings) : null;

  function handleCheckbox(habit: Habit) {
    const log = getLog(habit.id);
    if (log) { if (habit.allowComments) setOpenForm(openForm === habit.id ? null : habit.id); else onRemoveLog(habit.id); }
    else { if (habit.allowComments) setOpenForm(habit.id); else onSaveLog(habit.id, "done"); }
  }

  return (
    <div>
      <div style={{ ...S.card, background: C.navy, color: "#fff", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 4 }}>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
            {lifeScore !== null ? (<><div style={{ fontSize: 42, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{lifeScore}<span style={{ fontSize: 18 }}>/100</span></div><div style={{ fontSize: 12, color: "#a0aec0", marginTop: 2 }}>Life Score</div></>) : (<><div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>No check-in yet</div><div style={{ fontSize: 12, color: "#a0aec0" }}>Rate your day tonight</div></>)}
          </div>
          <div style={{ textAlign: "right" as const }}>
            {dayRating && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                {CAT_ORDER.map(id => { const cat = CATEGORIES[id]; return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 11 }}>{cat.emoji}</span>
                    <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(n => <div key={n} style={{ width: 7, height: 7, borderRadius: "50%", background: n <= dayRating.ratings[id] ? cat.color : "rgba(255,255,255,0.2)" }} />)}</div>
                    <span style={{ fontSize: 9, color: "#a0aec0" }}>{Math.round(cat.weight*100)}%</span>
                  </div>
                ); })}
              </div>
            )}
            <button onClick={onGoCheckin} style={{ ...btn("primary"), fontSize: 12, padding: "8px 14px" }}>{dayRating ? "Edit" : "Check-in"}</button>
          </div>
        </div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 6, overflow: "hidden" }}>
          <div style={{ background: C.gold, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4 }}>{done}/{checkboxHabits.length} habits done today</div>
      </div>

      {CAT_ORDER.map(catId => {
        const cat = CATEGORIES[catId];
        const catHabits = todayHabits.filter(h => h.category === catId);
        if (!catHabits.length) return null;
        return (
          <div key={catId} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{cat.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: cat.color }}>{cat.label}</span>
              <span style={{ fontSize: 10, color: C.muted, background: cat.bg, borderRadius: 8, padding: "2px 6px", fontWeight: 700 }}>{Math.round(cat.weight*100)}%</span>
            </div>
            {catHabits.map(habit => {
              const log = getLog(habit.id); const isDone = !!log; const isOpen = openForm === habit.id;
              const isWeekly = !["daily","weekdays","weekends"].includes(habit.frequency);
              return (
                <div key={habit.id} style={{ marginBottom: 8 }}>
                  {habit.type === "checkbox" ? (
                    <div style={{ ...S.card, padding: "12px 14px", border: isDone ? `2px solid ${cat.color}` : `1px solid ${C.border}`, background: isDone ? cat.bg : C.card, marginBottom: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => handleCheckbox(habit)} style={{ width: 26, height: 26, borderRadius: "50%", background: isDone ? cat.color : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none", cursor: "pointer" }}>
                          {isDone && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
                        </button>
                        <span style={{ fontSize: 22 }}>{habit.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, textDecoration: isDone ? "line-through" : "none", color: isDone ? C.muted : C.text }}>{habit.title}</div>
                          {log?.comment && <div style={{ fontSize: 12, color: cat.color, marginTop: 2 }}>💬 {log.comment}</div>}
                          {isWeekly && <div style={{ fontSize: 11, color: getWeeklyHits(habit, habitLogs) >= getFrequencyTarget(habit.frequency) ? cat.color : C.muted }}>{getWeeklyHits(habit, habitLogs)}/{getFrequencyTarget(habit.frequency)} this week</div>}
                        </div>
                        {habit.allowComments && <button onClick={() => setOpenForm(isOpen ? null : habit.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, padding: 4 }}>{isOpen ? "▲" : "💬"}</button>}
                      </div>
                      {isOpen && <HabitLogForm habit={habit} existing={log} onSave={(v,c) => { onSaveLog(habit.id, v, c); setOpenForm(null); }} onCancel={() => setOpenForm(null)} />}
                    </div>
                  ) : (
                    <div style={{ ...S.card, padding: "12px 14px", border: isDone ? `2px solid ${cat.color}` : `1px solid ${C.border}`, background: isDone ? cat.bg : C.card, marginBottom: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{habit.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{habit.title}</div>
                          {log && <div style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>🕐 {log.value}{log.comment ? ` · ${log.comment}` : ""}</div>}
                        </div>
                        <button onClick={() => setOpenForm(isOpen ? null : habit.id)} style={{ ...btn("navy"), fontSize: 12, padding: "8px 12px" }}>{isDone ? "Edit" : "Log now"}</button>
                      </div>
                      {isOpen && <HabitLogForm habit={habit} existing={log} onSave={(v,c) => { onSaveLog(habit.id, v, c); setOpenForm(null); }} onCancel={() => setOpenForm(null)} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CheckinTab({ existing, onSave }: { existing?: DayRating; onSave: (r: DayRating) => void }) {
  const [ratings, setRatings] = useState<Record<CategoryId,Rating>>(existing?.ratings || { discipline: 3, move: 3, explore: 3, relax: 3, nourish: 3, connect: 3 });
  const [notes, setNotes] = useState<Record<CategoryId,string>>(existing?.notes || { discipline: "", move: "", explore: "", relax: "", nourish: "", connect: "" });
  const [saved, setSaved] = useState(false);
  const lifeScore = calcLifeScore(ratings);

  async function save() {
    const rating: DayRating = { id: existing?.id || Date.now().toString(), date: todayStr(), ratings, notes };
    await supabase.from("day_ratings").upsert({
      id: rating.id, rated_date: rating.date,
      discipline_rating: ratings.discipline, move_rating: ratings.move, explore_rating: ratings.explore,
      relax_rating: ratings.relax, nourish_rating: ratings.nourish, connect_rating: ratings.connect,
      discipline_note: notes.discipline, move_note: notes.move, explore_note: notes.explore,
      relax_note: notes.relax, nourish_note: notes.nourish, connect_note: notes.connect,
    }, { onConflict: "rated_date" });
    onSave(rating);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div style={{ ...S.card, background: C.navy, color: "#fff", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 4 }}>TODAY'S LIFE SCORE</div>
        <div style={{ fontSize: 56, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{lifeScore}</div>
        <div style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>out of 100</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12, flexWrap: "wrap" as const }}>
          {CAT_ORDER.map(id => { const cat = CATEGORIES[id]; return (
            <div key={id} style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 18 }}>{cat.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: RATINGS[ratings[id]].color }}>{ratings[id]}</div>
              <div style={{ fontSize: 9, color: "#a0aec0" }}>{Math.round(cat.weight*100)}%</div>
            </div>
          ); })}
        </div>
      </div>
      {CAT_ORDER.map(catId => { const cat = CATEGORIES[catId]; return (
        <div key={catId} style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{cat.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: cat.color }}>{cat.label}</div>
                <span style={{ fontSize: 11, background: cat.bg, color: cat.color, borderRadius: 8, padding: "2px 6px", fontWeight: 700 }}>{Math.round(cat.weight*100)}%</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{cat.description}</div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: RATINGS[ratings[catId]].color }}>{ratings[catId]}/5</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([1,2,3,4,5] as Rating[]).map(r => (
              <button key={r} onClick={() => setRatings(p => ({ ...p, [catId]: r }))} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: ratings[catId] === r ? RATINGS[r].bg : C.bg, color: ratings[catId] === r ? RATINGS[r].color : C.muted, border: `2px solid ${ratings[catId] === r ? RATINGS[r].color : C.border}` }}>
                {RATINGS[r].label.split(" ")[0]}
              </button>
            ))}
          </div>
          <input style={{ ...S.input, fontSize: 13 }} placeholder={`Notes on ${cat.label.toLowerCase()} today...`} value={notes[catId]} onChange={e => setNotes(p => ({ ...p, [catId]: e.target.value }))} />
        </div>
      ); })}
      <button onClick={save} style={{ ...btn("primary"), width: "100%", justifyContent: "center", padding: "16px", fontSize: 16 }}>{saved ? "Saved!" : "Save Check-in"}</button>
    </div>
  );
}

function HistoryTab({ habits, habitLogs, meals, dayRatings }: { habits: Habit[]; habitLogs: HabitLog[]; meals: Meal[]; dayRatings: DayRating[]; }) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string|null>(null);

  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("en", { month: "long", year: "numeric" });

  function hasData(ds: string) { return habitLogs.some(l => l.date === ds) || meals.some(m => m.date === ds) || dayRatings.some(r => r.date === ds); }
  function getScore(ds: string) { const r = dayRatings.find(d => d.date === ds); return r ? calcLifeScore(r.ratings) : null; }
  function prevMonth() { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); setSelectedDate(null); }
  function nextMonth() { const n = new Date(); if (calYear === n.getFullYear() && calMonth === n.getMonth()) return; if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); setSelectedDate(null); }

  const cells: (number|null)[] = [...Array(startDow).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const detail = selectedDate ? { rating: dayRatings.find(r => r.date === selectedDate), logs: habitLogs.filter(l => l.date === selectedDate), food: meals.filter(m => m.date === selectedDate && !m.isBeverage), bevs: meals.filter(m => m.date === selectedDate && m.isBeverage) } : null;

  return (
    <div>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.navy, padding: "4px 8px" }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{monthName}</div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: calYear === now.getFullYear() && calMonth === now.getMonth() ? C.border : C.navy, padding: "4px 8px" }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {["M","T","W","T","F","S","S"].map((d,i) => <div key={i} style={{ textAlign: "center" as const, fontSize: 11, fontWeight: 700, color: C.muted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const ds = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const future = ds > todayStr(); const isToday = ds === todayStr(); const selected = selectedDate === ds;
            const data = !future && hasData(ds); const score = !future ? getScore(ds) : null;
            return (
              <button key={i} onClick={() => !future && setSelectedDate(selected ? null : ds)}
                style={{ padding: "8px 0", borderRadius: 10, border: "none", cursor: future ? "default" : "pointer", background: selected ? C.navy : isToday ? C.goldLight : C.bg, color: future ? C.border : selected ? "#fff" : isToday ? C.navy : C.text, fontWeight: isToday || selected ? 800 : 500, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                {day}
                {data && <div style={{ width: 6, height: 6, borderRadius: "50%", background: selected ? "#fff" : score !== null ? (score >= 80 ? C.mint : score >= 60 ? C.gold : C.coral) : C.muted }} />}
              </button>
            );
          })}
        </div>
      </div>
      {selectedDate && detail && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 12 }}>{dateLabel(selectedDate)}</div>
          {detail.rating ? (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Life Score</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: C.gold }}>{calcLifeScore(detail.rating.ratings)}/100</div>
              </div>
              {CAT_ORDER.map(catId => { const cat = CATEGORIES[catId]; const r = detail.rating!.ratings[catId]; const note = detail.rating!.notes[catId]; return (
                <div key={catId} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: cat.color }}>{cat.label}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>({Math.round(cat.weight*100)}%)</span>
                    <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>{[1,2,3,4,5].map(n => <div key={n} style={{ width: 10, height: 10, borderRadius: "50%", background: n <= r ? cat.color : C.border }} />)}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: RATINGS[r].color }}>{RATINGS[r].label}</span>
                  </div>
                  {note && <div style={{ fontSize: 12, color: C.muted, paddingLeft: 24 }}>"{note}"</div>}
                </div>
              ); })}
            </div>
          ) : <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 16 }}>No check-in recorded</div>}
          {detail.logs.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Habits</div>
              {detail.logs.map(log => { const habit = habits.find(h => h.id === log.habitId); if (!habit) return null; const cat = CATEGORIES[habit.category]; return (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 18 }}>{habit.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{habit.title}</div>
                    {log.value !== "done" && <div style={{ fontSize: 12, color: cat.color }}>🕐 {log.value}</div>}
                    {log.comment && <div style={{ fontSize: 12, color: C.muted }}>💬 {log.comment}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: cat.color, fontWeight: 700 }}>{cat.emoji}</span>
                </div>
              ); })}
            </div>
          )}
          {detail.food.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Food</div>
              {detail.food.map(meal => { const tag = TAG_CONFIG[meal.tag]; return (
                <div key={meal.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{meal.mealType}</span>
                    <span style={{ background: tag.bg, color: tag.color, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{tag.emoji} {tag.label}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{meal.description}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{meal.time}{meal.calories ? ` · ${meal.calories} cal` : ""}</div>
                  {meal.notes && <div style={{ fontSize: 11, color: C.purple }}>📍 {meal.notes}</div>}
                </div>
              ); })}
            </div>
          )}
          {detail.bevs.length > 0 && (
            <div style={S.card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Beverages</div>
              {detail.bevs.map(bev => (
                <div key={bev.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{bev.mealType}</div>
                  <div style={{ fontSize: 13 }}>{bev.description}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{bev.time}{bev.calories ? ` · ${bev.calories} cal` : ""}</div>
                </div>
              ))}
            </div>
          )}
          {!detail.rating && !detail.logs.length && !detail.food.length && !detail.bevs.length && (
            <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>📭</div><div style={{ fontWeight: 700, marginTop: 8 }}>Nothing logged this day</div></div>
          )}
        </div>
      )}
      {!selectedDate && <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "16px 0" }}>Tap any date to see what happened</div>}
    </div>
  );
}

function AnalyticsTab({ habits, habitLogs, meals, dayRatings }: { habits: Habit[]; habitLogs: HabitLog[]; meals: Meal[]; dayRatings: DayRating[]; }) {
  const [period, setPeriod] = useState<7|30>(7);
  const dates = getLastNDates(period);
  const scoreData = dates.map(date => { const r = dayRatings.find(d => d.date === date); return { date, score: r ? calcLifeScore(r.ratings) : null, label: new Date(date+"T12:00:00").toLocaleDateString("en", { weekday: "short" }) }; });
  const scoredDays = scoreData.filter(d => d.score !== null);
  const avgScore = scoredDays.length ? Math.round(scoredDays.reduce((s,d) => s+(d.score||0),0)/scoredDays.length) : null;
  const catAverages = CAT_ORDER.map(catId => { const rs = dayRatings.filter(r => dates.includes(r.date)).map(r => r.ratings[catId]); return { catId, avg: rs.length ? Math.round(rs.reduce((s,r) => s+r,0)/rs.length*10)/10 : 0 }; });
  const weekHabits = habits.filter(h => h.active).map(h => { const hits = getWeeklyHits(h, habitLogs); const target = getFrequencyTarget(h.frequency); return { habit: h, hits, target, pct: Math.min(100, Math.round((hits/target)*100)) }; });
  const periodMeals = meals.filter(m => dates.includes(m.date) && !m.isBeverage);
  const tagCounts = { whole: 0, cooked: 0, packaged: 0, junk: 0 } as Record<MealTag,number>;
  periodMeals.forEach(m => tagCounts[m.tag]++);
  const totalMeals = periodMeals.length || 1;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, marginBottom: 16, border: `1px solid ${C.border}` }}>
        {([7,30] as const).map(p => <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: period === p ? C.gold : "transparent", color: period === p ? C.navy : C.muted, border: "none" }}>Last {p} days</button>)}
      </div>
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Life Score Trend</div>
          {avgScore !== null && <div style={{ fontWeight: 900, fontSize: 20, color: C.gold }}>{avgScore}<span style={{ fontSize: 12, color: C.muted }}>/100 avg</span></div>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
          {scoreData.slice(-14).map((d,i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              {d.score !== null && <div style={{ fontSize: 9, fontWeight: 700 }}>{d.score}</div>}
              <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: d.score === null ? C.border : d.score >= 80 ? C.mint : d.score >= 60 ? C.gold : C.coral, height: d.score !== null ? Math.max((d.score/100)*64,4) : 4 }} />
              {scoreData.slice(-14).length <= 7 && <div style={{ fontSize: 9, color: C.muted }}>{d.label}</div>}
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Category Averages</div>
        {catAverages.map(({ catId, avg }) => { const cat = CATEGORIES[catId]; return (
          <div key={catId} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{cat.label}</span>
                <span style={{ fontSize: 10, color: C.muted }}>({Math.round(cat.weight*100)}%)</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: 15, color: avg >= 4 ? C.mint : avg >= 3 ? C.gold : C.coral }}>{avg > 0 ? avg.toFixed(1) : "—"}/5</span>
            </div>
            <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{ background: cat.color, width: `${Math.round((avg/5)*100)}%`, height: "100%", borderRadius: 8 }} />
            </div>
          </div>
        ); })}
      </div>
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>This Week's Habits</div>
        {weekHabits.map(({ habit, hits, target, pct }) => { const cat = CATEGORIES[habit.category]; return (
          <div key={habit.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{habit.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{habit.title}</span>
                <span style={{ fontSize: 10, color: C.muted, background: C.bg, borderRadius: 6, padding: "1px 5px" }}>{FREQUENCY_LABELS[habit.frequency]}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? C.mint : C.muted }}>{hits}/{target}</span>
            </div>
            <div style={{ background: C.border, borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{ background: pct >= 100 ? C.mint : cat.color, width: `${Math.min(pct,100)}%`, height: "100%", borderRadius: 6 }} />
            </div>
          </div>
        ); })}
      </div>
      {periodMeals.length > 0 && (
        <div style={S.card}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Food Quality</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(Object.entries(TAG_CONFIG) as [MealTag, typeof TAG_CONFIG[MealTag]][]).map(([key, cfg]) => (
              <div key={key} style={{ background: cfg.bg, borderRadius: 12, padding: "10px", textAlign: "center" as const }}>
                <div style={{ fontWeight: 900, fontSize: 20 }}>{Math.round((tagCounts[key]/totalMeals)*100)}%</div>
                <div style={{ fontSize: 11, color: C.muted }}>{cfg.emoji} {cfg.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FoodTab({ meals, onAdd, onDelete, calorieItems }: { meals: Meal[]; onAdd: (m: Omit<Meal,"id">) => void; onDelete: (id: string) => void; calorieItems: CalorieItem[]; }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mealType: "Breakfast", description: "", tag: "whole" as MealTag, portion: "single" as Portion, calories: "", notes: "", time: nowStr() });
  const [showCalRef, setShowCalRef] = useState(false);
  const MEAL_TYPES = ["Breakfast","Lunch","Dinner","Snack"];
  const foodItems = calorieItems.filter(i => i.category !== "Beverages");
  const todayMeals = meals.filter(m => m.date === todayStr() && !m.isBeverage).sort((a,b) => a.time.localeCompare(b.time));
  const snacks = todayMeals.filter(m => m.mealType === "Snack").length;
  const junkPkg = todayMeals.filter(m => m.tag === "junk" || m.tag === "packaged").length;
  const totalCals = todayMeals.filter(m => m.calories).reduce((s,m) => s+(m.calories||0),0);

  function submit() {
    if (!form.description.trim()) return;
    onAdd({ mealType: form.mealType, description: form.description, tag: form.tag, portion: form.portion, calories: form.calories ? Number(form.calories) : undefined, notes: form.notes||undefined, time: form.time, date: todayStr(), isBeverage: false });
    setForm({ mealType: "Breakfast", description: "", tag: "whole", portion: "single", calories: "", notes: "", time: nowStr() });
    setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ ...S.card, textAlign: "center", background: C.coralLight, marginBottom: 0, padding: "12px 8px" }}><div style={{ fontSize: 24, fontWeight: 900 }}>{snacks}</div><div style={{ fontSize: 10, color: C.muted }}>Snacks</div></div>
        <div style={{ ...S.card, textAlign: "center", background: junkPkg > 1 ? C.coralLight : C.greenLight, marginBottom: 0, padding: "12px 8px" }}><div style={{ fontSize: 24, fontWeight: 900, color: junkPkg > 1 ? C.coral : C.navy }}>{junkPkg}</div><div style={{ fontSize: 10, color: C.muted }}>Junk/Pkg</div></div>
        <div style={{ ...S.card, textAlign: "center", background: C.goldLight, marginBottom: 0, padding: "12px 8px" }}><div style={{ fontSize: 24, fontWeight: 900 }}>{totalCals||"—"}</div><div style={{ fontSize: 10, color: C.muted }}>Calories</div></div>
      </div>
      {junkPkg > 1 && <div style={{ background: C.coralLight, borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.coral, fontWeight: 600 }}>Warning: {junkPkg} junk/packaged meals today!</div>}
      <button style={{ ...btn("primary"), width: "100%", justifyContent: "center", marginBottom: 14, padding: "13px" }} onClick={() => setShowForm(true)}>+ Log food</button>
      {showForm && (
        <div style={{ ...S.card, border: `2px solid ${C.gold}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Log Food</div>
          <label style={S.label}>Type</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
            {MEAL_TYPES.map(t => <button key={t} onClick={() => setForm(p => ({ ...p, mealType: t }))} style={{ padding: "7px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: form.mealType === t ? C.navy : C.bg, color: form.mealType === t ? "#fff" : C.muted, border: `1.5px solid ${form.mealType === t ? C.navy : C.border}` }}>{t}</button>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ ...S.label, marginBottom: 0 }}>What did you eat?</label>
            <button onClick={() => setShowCalRef(!showCalRef)} style={{ fontSize: 11, color: C.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Pick from list</button>
          </div>
          {showCalRef && (
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10, maxHeight: 160, overflowY: "auto" as const }}>
              {foodItems.map(item => <button key={item.id} onClick={() => { setForm(p => ({ ...p, description: item.name, calories: String(item.calories) })); setShowCalRef(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit" }}><span style={{ fontSize: 13 }}>{item.emoji} {item.name}</span><span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{item.calories} cal</span></button>)}
            </div>
          )}
          <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Idli sambar, chicken curry..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <label style={S.label}>Food type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            {(Object.entries(TAG_CONFIG) as [MealTag, typeof TAG_CONFIG[MealTag]][]).map(([key, cfg]) => <button key={key} onClick={() => setForm(p => ({ ...p, tag: key }))} style={{ padding: "9px 8px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const, background: form.tag === key ? cfg.bg : C.bg, color: form.tag === key ? cfg.color : C.muted, border: `2px solid ${form.tag === key ? cfg.color : C.border}` }}>{cfg.emoji} {cfg.label}</button>)}
          </div>
          <label style={S.label}>Portion</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(Object.entries(PORTION_CONFIG) as [Portion,string][]).map(([key, label]) => <button key={key} onClick={() => setForm(p => ({ ...p, portion: key }))} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: form.portion === key ? C.navy : C.bg, color: form.portion === key ? "#fff" : C.muted, border: `1.5px solid ${form.portion === key ? C.navy : C.border}` }}>{label}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div><label style={S.label}>Time</label><input style={S.input} type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div><label style={S.label}>Calories (optional)</label><input style={S.input} type="number" placeholder="e.g. 200" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} placeholder="e.g. Copper Chimney, team lunch..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={submit}>Save</button>
            <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.secTitle}>Today's Food</div>
      {todayMeals.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>🍽️</div><div style={{ fontWeight: 700, marginTop: 8 }}>Nothing logged yet</div></div>}
      {todayMeals.map(meal => { const tag = TAG_CONFIG[meal.tag]; return (
        <div key={meal.id} style={{ ...S.card, display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" as const }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{meal.mealType}</span>
              <span style={{ background: tag.bg, color: tag.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{tag.emoji} {tag.label}</span>
              <span style={{ background: C.bg, color: C.muted, borderRadius: 20, padding: "2px 8px", fontSize: 11, border: `1px solid ${C.border}` }}>{PORTION_CONFIG[meal.portion]}</span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{meal.description}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{meal.time}{meal.calories ? ` · ${meal.calories} cal` : ""}</div>
            {meal.notes && <div style={{ fontSize: 12, color: C.purple, marginTop: 2 }}>📍 {meal.notes}</div>}
          </div>
          <button onClick={() => onDelete(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral, fontSize: 16, padding: 4 }}>✕</button>
        </div>
      ); })}
    </div>
  );
}

function BeveragesTab({ meals, onAdd, onDelete, calorieItems }: { meals: Meal[]; onAdd: (m: Omit<Meal,"id">) => void; onDelete: (id: string) => void; calorieItems: CalorieItem[]; }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mealType: "Coffee/Tea", description: "", calories: "", time: nowStr() });
  const [showCalRef, setShowCalRef] = useState(false);
  const TYPES = ["Coffee/Tea","Water/Sparkling","Juice","Other drink"];
  const bevItems = calorieItems.filter(i => i.category === "Beverages");
  const todayBevs = meals.filter(m => m.date === todayStr() && m.isBeverage).sort((a,b) => a.time.localeCompare(b.time));
  const coffeeCount = todayBevs.filter(m => m.mealType === "Coffee/Tea").length;
  const totalCals = todayBevs.filter(m => m.calories).reduce((s,m) => s+(m.calories||0),0);

  function submit() {
    if (!form.description.trim()) return;
    onAdd({ mealType: form.mealType, description: form.description, tag: "whole", portion: "single", calories: form.calories ? Number(form.calories) : undefined, time: form.time, date: todayStr(), isBeverage: true });
    setForm({ mealType: "Coffee/Tea", description: "", calories: "", time: nowStr() });
    setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ ...S.card, textAlign: "center", background: C.goldLight, marginBottom: 0 }}><div style={{ fontSize: 28, fontWeight: 900 }}>{coffeeCount}</div><div style={{ fontSize: 11, color: C.muted }}>Coffee/Tea</div></div>
        <div style={{ ...S.card, textAlign: "center", background: C.mintLight, marginBottom: 0 }}><div style={{ fontSize: 28, fontWeight: 900 }}>{totalCals||"—"}</div><div style={{ fontSize: 11, color: C.muted }}>Bev cals</div></div>
      </div>
      <button style={{ ...btn("navy"), width: "100%", justifyContent: "center", marginBottom: 14, padding: "13px" }} onClick={() => setShowForm(true)}>+ Log beverage</button>
      {showForm && (
        <div style={{ ...S.card, border: `2px solid ${C.navy}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Log Beverage</div>
          <label style={S.label}>Type</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
            {TYPES.map(t => <button key={t} onClick={() => setForm(p => ({ ...p, mealType: t }))} style={{ padding: "7px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: form.mealType === t ? C.navy : C.bg, color: form.mealType === t ? "#fff" : C.muted, border: `1.5px solid ${form.mealType === t ? C.navy : C.border}` }}>{t}</button>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={{ ...S.label, marginBottom: 0 }}>What did you drink?</label>
            <button onClick={() => setShowCalRef(!showCalRef)} style={{ fontSize: 11, color: C.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Pick from list</button>
          </div>
          {showCalRef && (
            <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10, maxHeight: 150, overflowY: "auto" as const }}>
              {bevItems.map(item => <button key={item.id} onClick={() => { setForm(p => ({ ...p, description: item.name, calories: String(item.calories) })); setShowCalRef(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit" }}><span style={{ fontSize: 13 }}>{item.emoji} {item.name}</span><span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{item.calories} cal</span></button>)}
            </div>
          )}
          <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Filter coffee with milk..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div><label style={S.label}>Time</label><input style={S.input} type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
            <div><label style={S.label}>Calories (optional)</label><input style={S.input} type="number" placeholder="e.g. 50" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={submit}>Save</button>
            <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={S.secTitle}>Today's Drinks</div>
      {todayBevs.length === 0 && <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 24 }}><div style={{ fontSize: 32 }}>☕</div><div style={{ fontWeight: 700, marginTop: 8 }}>No beverages logged yet</div></div>}
      {todayBevs.map(bev => (
        <div key={bev.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{bev.mealType}</div><div style={{ fontSize: 14, marginBottom: 2 }}>{bev.description}</div><div style={{ fontSize: 12, color: C.muted }}>{bev.time}{bev.calories ? ` · ${bev.calories} cal` : ""}</div></div>
          <button onClick={() => onDelete(bev.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral, fontSize: 16 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function CalorieTab({ items, onUpdate }: { items: CalorieItem[]; onUpdate: (items: CalorieItem[]) => void; }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({ name: "", emoji: "🍽️", calories: "", category: "Common Foods" });
  const CATS = ["Beverages","South Indian","Common Foods","Custom"];
  const EMOJIS = ["🍽️","☕","🍵","🥗","🍚","🫓","🥣","🍳","🥚","🍌","🍎","🥜","🍗","🌰","🍪","💧","🥥","🍋","🍊","🫔","🍩","🍞"];
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const grouped = CATS.reduce((acc, cat) => { const ci = filtered.filter(i => i.category === cat); if (ci.length) acc[cat] = ci; return acc; }, {} as Record<string,CalorieItem[]>);

  async function save() {
    if (!form.name.trim() || !form.calories) return;
    if (editId) {
      await supabase.from("calorie_items").update({ name: form.name, emoji: form.emoji, calories: Number(form.calories), category: form.category }).eq("id", editId);
      onUpdate(items.map(i => i.id === editId ? { ...i, name: form.name, emoji: form.emoji, calories: Number(form.calories), category: form.category } : i));
      setEditId(null);
    } else {
      const newItem = { id: "c"+Date.now(), name: form.name, emoji: form.emoji, calories: Number(form.calories), category: form.category, is_custom: true };
      await supabase.from("calorie_items").insert([newItem]);
      onUpdate([...items, { ...newItem, isCustom: true }]);
    }
    setForm({ name: "", emoji: "🍽️", calories: "", category: "Common Foods" }); setShowAdd(false);
  }

  async function deleteItem(id: string) {
    await supabase.from("calorie_items").delete().eq("id", id);
    onUpdate(items.filter(i => i.id !== id));
  }

  return (
    <div>
      <input style={{ ...S.input, marginBottom: 12 }} placeholder="Search foods..." value={search} onChange={e => setSearch(e.target.value)} />
      <button style={{ ...btn("primary"), width: "100%", justifyContent: "center", marginBottom: 14 }} onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: "", emoji: "🍽️", calories: "", category: "Common Foods" }); }}>+ Add food</button>
      {showAdd && (
        <div style={{ ...S.card, border: `2px solid ${C.gold}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{editId ? "Edit" : "Add"} Food</div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, marginBottom: 10 }}>
            <div><label style={S.label}>Icon</label><select value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} style={{ ...S.input, fontSize: 18, padding: "8px 4px" }}>{EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label style={S.label}>Name</label><input style={S.input} placeholder="e.g. Idli (1 piece)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div><label style={S.label}>Calories</label><input style={S.input} type="number" placeholder="e.g. 39" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} /></div>
            <div><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={save}>{editId ? "Update" : "Save"}</button>
            <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={S.secTitle}>{cat}</div>
          {catItems.map(item => (
            <div key={item.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div></div>
              <div style={{ fontWeight: 900, fontSize: 16, minWidth: 55, textAlign: "right" as const }}>{item.calories} cal</div>
              <button onClick={() => { setForm({ name: item.name, emoji: item.emoji, calories: String(item.calories), category: item.category }); setEditId(item.id); setShowAdd(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.muted }}>✏️</button>
              {item.isCustom && <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.coral }}>✕</button>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ habits, onUpdate }: { habits: Habit[]; onUpdate: (h: Habit[]) => void; }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", emoji: "⭐", type: "checkbox" as HabitType, category: "discipline" as CategoryId, frequency: "daily" as Frequency, allowComments: false });
  const EMOJIS = ["⭐","💪","📚","🧘","🏃","💧","🎯","🌿","🛁","💊","🎨","🎵","🚴","📞","🎾","🏋️","🤸","🔥","⏰","🛑","📵","💰"];
  const FREQS: Frequency[] = ["daily","weekdays","weekends","2x_week","3x_week","weekly"];

  async function addHabit() {
    if (!form.title.trim()) return;
    const newHabit: Habit = { id: "h"+Date.now(), ...form, active: true };
    await supabase.from("habits").insert([{ id: newHabit.id, title: newHabit.title, emoji: newHabit.emoji, type: newHabit.type, category: newHabit.category, frequency: newHabit.frequency, active: true, allow_comments: newHabit.allowComments, sort_order: habits.length }]);
    onUpdate([...habits, newHabit]);
    setForm({ title: "", emoji: "⭐", type: "checkbox", category: "discipline", frequency: "daily", allowComments: false });
    setShowAdd(false);
  }

  async function toggleActive(habit: Habit) {
    await supabase.from("habits").update({ active: !habit.active }).eq("id", habit.id);
    onUpdate(habits.map(h => h.id === habit.id ? { ...h, active: !h.active } : h));
  }

  async function toggleComments(habit: Habit) {
    await supabase.from("habits").update({ allow_comments: !habit.allowComments }).eq("id", habit.id);
    onUpdate(habits.map(h => h.id === habit.id ? { ...h, allowComments: !h.allowComments } : h));
  }

  async function deleteHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    onUpdate(habits.filter(h => h.id !== id));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={S.secTitle}>My Habits</div>
        <button style={btn("primary")} onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      {showAdd && (
        <div style={{ ...S.card, border: `2px solid ${C.gold}`, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>New Habit</div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, marginBottom: 10 }}>
            <div><label style={S.label}>Icon</label><select value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} style={{ ...S.input, fontSize: 18, padding: "8px 4px" }}>{EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label style={S.label}>Name</label><input style={S.input} placeholder="e.g. No snacking after 8pm" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><label style={S.label}>Category</label><select style={S.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as CategoryId }))}>{CAT_ORDER.map(id => <option key={id} value={id}>{CATEGORIES[id].emoji} {CATEGORIES[id].label}</option>)}</select></div>
            <div><label style={S.label}>Frequency</label><select style={S.input} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value as Frequency }))}>{FREQS.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {(["checkbox","time"] as HabitType[]).map(t => <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))} style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: form.type === t ? C.navy : C.bg, color: form.type === t ? "#fff" : C.muted, border: `1.5px solid ${form.type === t ? C.navy : C.border}` }}>{t === "checkbox" ? "Done/Not done" : "Log time"}</button>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", marginBottom: 12, borderTop: `1px solid ${C.border}` }}>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>Allow comments</div><div style={{ fontSize: 12, color: C.muted }}>Show notes when logging</div></div>
            <button onClick={() => setForm(p => ({ ...p, allowComments: !p.allowComments }))} style={{ padding: "6px 14px", borderRadius: 20, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: form.allowComments ? C.mintLight : C.bg, color: form.allowComments ? C.mint : C.muted, border: `1.5px solid ${form.allowComments ? C.mint : C.border}` }}>{form.allowComments ? "On" : "Off"}</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn("primary"), flex: 1, justifyContent: "center" }} onClick={addHabit}>Save</button>
            <button style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {CAT_ORDER.map(catId => { const cat = CATEGORIES[catId]; const catHabits = habits.filter(h => h.category === catId); if (!catHabits.length) return null; return (
        <div key={catId} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>{cat.emoji}</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: cat.color }}>{cat.label}</span>
            <span style={{ fontSize: 10, color: C.muted }}>({Math.round(cat.weight*100)}%)</span>
          </div>
          {catHabits.map(habit => (
            <div key={habit.id} style={{ ...S.card, padding: "12px 14px", opacity: habit.active ? 1 : 0.5, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{habit.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{habit.title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{FREQUENCY_LABELS[habit.frequency]} · {habit.type === "checkbox" ? "checkbox" : "time"}{habit.allowComments ? " · comments on" : ""}</div>
                </div>
                <button onClick={() => toggleComments(habit)} style={{ padding: "4px 8px", borderRadius: 12, fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: "inherit", background: habit.allowComments ? C.purpleLight : C.bg, color: habit.allowComments ? C.purple : C.muted, border: `1px solid ${habit.allowComments ? C.purple : C.border}` }}>💬</button>
                <button onClick={() => toggleActive(habit)} style={{ padding: "5px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: habit.active ? C.mintLight : C.bg, color: habit.active ? C.mint : C.muted, border: `1.5px solid ${habit.active ? C.mint : C.border}` }}>{habit.active ? "On" : "Off"}</button>
                <button onClick={() => deleteHabit(habit.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral, fontSize: 15 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ); })}
    </div>
  );
}

export default function LifeTracker() {
  const [appState, setAppState] = useState<"loading"|"login"|"app">("loading");
  const [pinLength, setPinLength] = useState(6);
  const [view, setView] = useState<View>("today");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [calorieItems, setCalorieItems] = useState<CalorieItem[]>(DEFAULT_CALORIE_ITEMS);
  const [dayRatings, setDayRatings] = useState<DayRating[]>([]);

  useEffect(() => {
    async function load() {
      const { data: settings } = await supabase.from("personal_settings").select("pin").single();
      if (settings?.pin) setPinLength(settings.pin.length);

      const { data: habitsData } = await supabase.from("habits").select("*").order("sort_order");
      if (habitsData && habitsData.length > 0) {
        setHabits(habitsData.map(dbToHabit));
      } else {
        await supabase.from("habits").insert(DEFAULT_HABITS);
        setHabits(DEFAULT_HABITS.map(dbToHabit));
      }

      const { data: calData } = await supabase.from("calorie_items").select("*");
      if (calData && calData.length > 0) {
        setCalorieItems(calData.map(dbToCalItem));
      } else {
        await supabase.from("calorie_items").insert(DEFAULT_CALORIE_ITEMS.map(i => ({ ...i, is_custom: false })));
      }

      const since = getLastNDates(60)[0];
      const { data: logsData } = await supabase.from("habit_logs").select("*").gte("logged_date", since);
      if (logsData) setHabitLogs(logsData.map(dbToHabitLog));

      const { data: mealsData } = await supabase.from("meals").select("*").gte("logged_date", since);
      if (mealsData) setMeals(mealsData.map(dbToMeal));

      const { data: ratingsData } = await supabase.from("day_ratings").select("*").gte("rated_date", since);
      if (ratingsData) setDayRatings(ratingsData.map(dbToDayRating));

      setAppState("login");
    }
    load();
  }, []);

  async function saveHabitLog(habitId: string, value: string, comment?: string) {
    const existing = habitLogs.find(l => l.habitId === habitId && l.date === todayStr());
    if (existing) {
      await supabase.from("habit_logs").update({ value, comment }).eq("id", existing.id);
      setHabitLogs(p => p.map(l => l.id === existing.id ? { ...l, value, comment } : l));
    } else {
      const newLog = { id: Date.now().toString(), habit_id: habitId, value, comment, logged_date: todayStr() };
      await supabase.from("habit_logs").insert([newLog]);
      setHabitLogs(p => [...p, { id: newLog.id, habitId, value, comment, date: todayStr() }]);
    }
  }

  async function removeHabitLog(habitId: string) {
    const existing = habitLogs.find(l => l.habitId === habitId && l.date === todayStr());
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
      setHabitLogs(p => p.filter(l => l.id !== existing.id));
    }
  }

  async function addMeal(meal: Omit<Meal,"id">) {
    const id = Date.now().toString();
    await supabase.from("meals").insert([{ id, meal_type: meal.mealType, description: meal.description, tag: meal.tag, portion: meal.portion, calories: meal.calories, notes: meal.notes, time: meal.time, logged_date: meal.date, is_beverage: meal.isBeverage }]);
    setMeals(p => [...p, { ...meal, id }]);
  }

  async function deleteMeal(id: string) {
    await supabase.from("meals").delete().eq("id", id);
    setMeals(p => p.filter(m => m.id !== id));
  }

  if (appState === "loading") return <LoadingScreen />;
  if (appState === "login") return <LoginScreen pinLength={pinLength} onLogin={() => setAppState("app")} />;

  const todayRating = dayRatings.find(r => r.date === todayStr());

  const NAV = [
    { id: "today",     label: "Today",   emoji: "🏠" },
    { id: "checkin",   label: "Check-in",emoji: "⭐" },
    { id: "food",      label: "Food",    emoji: "🍽️" },
    { id: "beverages", label: "Drinks",  emoji: "☕" },
    { id: "calories",  label: "Cal Ref", emoji: "📋" },
    { id: "analytics", label: "Stats",   emoji: "📊" },
    { id: "history",   label: "History", emoji: "📅" },
    { id: "settings",  label: "Habits",  emoji: "⚙️" },
  ];

  const TITLES: Record<View, string> = {
    login: "", today: "My Day", checkin: "Evening Check-in", food: "Food Log",
    beverages: "Beverages", calories: "Calorie Reference", analytics: "Analytics",
    history: "History", settings: "Habits & Settings",
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>🧘 {TITLES[view]}</div>
          <div style={{ fontSize: 10, color: "#a0aec0" }}>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
        <button onClick={() => setAppState("login")} style={{ background: "none", border: "none", color: "#a0aec0", cursor: "pointer", fontSize: 18 }}>↩</button>
      </div>
      <div style={S.body}>
        {view === "today"     && <TodayTab habits={habits} habitLogs={habitLogs} dayRating={todayRating} onSaveLog={saveHabitLog} onRemoveLog={removeHabitLog} onGoCheckin={() => setView("checkin")} />}
        {view === "checkin"   && <CheckinTab existing={todayRating} onSave={r => { setDayRatings(p => { const ex = p.find(d => d.date === r.date); return ex ? p.map(d => d.date === r.date ? r : d) : [...p, r]; }); }} />}
        {view === "food"      && <FoodTab meals={meals} onAdd={addMeal} onDelete={deleteMeal} calorieItems={calorieItems} />}
        {view === "beverages" && <BeveragesTab meals={meals} onAdd={addMeal} onDelete={deleteMeal} calorieItems={calorieItems} />}
        {view === "calories"  && <CalorieTab items={calorieItems} onUpdate={setCalorieItems} />}
        {view === "analytics" && <AnalyticsTab habits={habits} habitLogs={habitLogs} meals={meals} dayRatings={dayRatings} />}
        {view === "history"   && <HistoryTab habits={habits} habitLogs={habitLogs} meals={meals} dayRatings={dayRatings} />}
        {view === "settings"  && <SettingsTab habits={habits} onUpdate={setHabits} />}
      </div>
      <div style={S.bottomNav}>
        {NAV.map(n => (
          <button key={n.id} style={navBtn(view === n.id)} onClick={() => setView(n.id as View)}>
            <span style={{ fontSize: 16 }}>{n.emoji}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
