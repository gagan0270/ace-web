// Shared in-memory store for Students / Attendance / Exams / Notices.
// Persisted to localStorage under "ace.roster.v4".

import { useSyncExternalStore } from "react";
import {
  students as seedStudents,
  notices as seedNotices,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_ACADEMIC_YEARS,
  type Student,
  type Notice,
} from "./mock-data";

// Per-year attendance status: yearKey -> `${date}::${class}::${section}` -> satsId -> status
type AttendanceStatus = "P" | "A" | "L";
type YearAttendance = Record<string, Record<string, Record<string, AttendanceStatus>>>;


// Per-year exam scores: yearKey -> `${class}::${section}::${satsId}` -> subject -> score
type ExamScoreMap = Record<string, Record<string, Record<string, number>>>;

// Per-year fee ledger: yearKey -> satsId -> [entries]
export type FeeEntry = { id: string; date: string; amount: number; method: string; note?: string };
type YearFees = Record<string, Record<string, FeeEntry[]>>;

type State = {
  students: Student[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  examCategories: string[];
  academicYears: string[];
  currentAcademicYear: string;
  attendanceByYear: YearAttendance;
  examScoresByYear: ExamScoreMap;
  feesByYear: YearFees;
  notices: Notice[];
};

const STORAGE_KEY = "ace.roster.v4";
const DEFAULT_EXAM_CATEGORIES = ["Mid-Term", "Unit Test", "Final", "Practical"];

function seed(): State {
  const classSet = new Set<string>();
  const sectionsByClass: Record<string, Set<string>> = {};
  for (const s of seedStudents) {
    classSet.add(s.class);
    if (!sectionsByClass[s.class]) sectionsByClass[s.class] = new Set();
    sectionsByClass[s.class].add(s.section);
  }
  const classes = Array.from(classSet).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return (isNaN(na) ? 999 : na) - (isNaN(nb) ? 999 : nb);
  });
  const sMap: Record<string, string[]> = {};
  for (const k of classes) sMap[k] = Array.from(sectionsByClass[k]).sort();
  return {
    students: seedStudents,
    classes,
    sectionsByClass: sMap,
    examCategories: [...DEFAULT_EXAM_CATEGORIES],
    academicYears: [...DEFAULT_ACADEMIC_YEARS],
    currentAcademicYear: DEFAULT_ACADEMIC_YEAR,
    attendanceByYear: {},
    examScoresByYear: {},
    feesByYear: {},
    notices: seedNotices,
  };
}

function loadInitial(): State {
  const s = seed();
  if (typeof window === "undefined") return s;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return s;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.classes)) {
      return {
        ...s,
        ...parsed,
        students: (parsed.students ?? []).map((st) => ({
          ...st,
          academicYear: (st as Student).academicYear ?? DEFAULT_ACADEMIC_YEAR,
        })) as Student[],
        examCategories: parsed.examCategories?.length ? parsed.examCategories : s.examCategories,
        academicYears: parsed.academicYears?.length ? parsed.academicYears : s.academicYears,
        currentAcademicYear: parsed.currentAcademicYear ?? s.currentAcademicYear,
        attendanceByYear: parsed.attendanceByYear ?? {},
        examScoresByYear: parsed.examScoresByYear ?? {},
        feesByYear: parsed.feesByYear ?? {},
        notices: parsed.notices ?? seedNotices,
      };
    }
  } catch {}
  return s;
}

let state: State = loadInitial();
const listeners = new Set<() => void>();

function persist(next: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function set(next: State) {
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return state;
}

export function useRoster() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getRosterState() {
  return state;
}

export const rosterActions = {
  setAcademicYear(year: string) {
    const list = state.academicYears.includes(year)
      ? state.academicYears
      : [...state.academicYears, year];
    set({ ...state, currentAcademicYear: year, academicYears: list });
  },
  addAcademicYear(year: string) {
    const clean = year.trim();
    if (!clean || state.academicYears.includes(clean)) return;
    set({ ...state, academicYears: [...state.academicYears, clean] });
  },
  addClass(label: string) {
    const clean = label.trim();
    if (!clean || state.classes.includes(clean)) return;
    set({
      ...state,
      classes: [...state.classes, clean],
      sectionsByClass: { ...state.sectionsByClass, [clean]: [] },
    });
  },
  removeClass(label: string) {
    set({
      ...state,
      students: state.students.filter((s) => s.class !== label),
      classes: state.classes.filter((c) => c !== label),
      sectionsByClass: Object.fromEntries(
        Object.entries(state.sectionsByClass).filter(([k]) => k !== label),
      ),
    });
  },
  renameClass(oldLabel: string, newLabel: string) {
    const clean = newLabel.trim();
    if (!clean || clean === oldLabel) return;
    if (state.classes.includes(clean)) return;
    set({
      ...state,
      students: state.students.map((s) => (s.class === oldLabel ? { ...s, class: clean } : s)),
      classes: state.classes.map((c) => (c === oldLabel ? clean : c)),
      sectionsByClass: Object.fromEntries(
        Object.entries(state.sectionsByClass).map(([k, v]) => [k === oldLabel ? clean : k, v]),
      ),
    });
  },
  reorderClasses(nextOrder: string[]) {
    const valid = nextOrder.filter((c) => state.classes.includes(c));
    const missing = state.classes.filter((c) => !valid.includes(c));
    set({ ...state, classes: [...valid, ...missing] });
  },
  addSection(klass: string, section: string) {
    const clean = section.trim().toUpperCase();
    if (!clean) return;
    const existing = state.sectionsByClass[klass] ?? [];
    if (existing.includes(clean)) return;
    set({
      ...state,
      sectionsByClass: { ...state.sectionsByClass, [klass]: [...existing, clean] },
    });
  },
  removeSection(klass: string, section: string) {
    set({
      ...state,
      students: state.students.filter((s) => !(s.class === klass && s.section === section)),
      sectionsByClass: {
        ...state.sectionsByClass,
        [klass]: (state.sectionsByClass[klass] ?? []).filter((x) => x !== section),
      },
    });
  },
  renameSection(klass: string, oldSection: string, newSection: string) {
    const clean = newSection.trim().toUpperCase();
    if (!clean || clean === oldSection) return;
    const existing = state.sectionsByClass[klass] ?? [];
    if (existing.includes(clean)) return;
    set({
      ...state,
      students: state.students.map((s) =>
        s.class === klass && s.section === oldSection ? { ...s, section: clean } : s,
      ),
      sectionsByClass: {
        ...state.sectionsByClass,
        [klass]: existing.map((sec) => (sec === oldSection ? clean : sec)),
      },
    });
  },
  reorderSections(klass: string, nextOrder: string[]) {
    const cur = state.sectionsByClass[klass] ?? [];
    const valid = nextOrder.filter((s) => cur.includes(s));
    const missing = cur.filter((s) => !valid.includes(s));
    set({
      ...state,
      sectionsByClass: { ...state.sectionsByClass, [klass]: [...valid, ...missing] },
    });
  },
  addStudent(student: Student) {
    const withYear: Student = { ...student, academicYear: student.academicYear ?? state.currentAcademicYear };
    const classes = state.classes.includes(withYear.class) ? state.classes : [...state.classes, withYear.class];
    const existingSections = state.sectionsByClass[withYear.class] ?? [];
    const sections = existingSections.includes(withYear.section)
      ? existingSections
      : [...existingSections, withYear.section];
    set({
      ...state,
      students: [withYear, ...state.students],
      classes,
      sectionsByClass: { ...state.sectionsByClass, [withYear.class]: sections },
    });
  },
  updateStudent(satsId: string, patch: Partial<Student>) {
    set({
      ...state,
      students: state.students.map((s) => (s.satsId === satsId ? { ...s, ...patch } : s)),
    });
  },
  removeStudent(satsId: string) {
    set({ ...state, students: state.students.filter((s) => s.satsId !== satsId) });
  },
  addExamCategory(label: string) {
    const clean = label.trim();
    if (!clean || state.examCategories.includes(clean)) return;
    set({ ...state, examCategories: [...state.examCategories, clean] });
  },
  removeExamCategory(label: string) {
    set({ ...state, examCategories: state.examCategories.filter((c) => c !== label) });
  },
  renameExamCategory(oldLabel: string, newLabel: string) {
    const clean = newLabel.trim();
    if (!clean || clean === oldLabel) return;
    if (state.examCategories.includes(clean)) return;
    set({
      ...state,
      examCategories: state.examCategories.map((c) => (c === oldLabel ? clean : c)),
    });
  },

  // ---- Notices ----
  addNotice(n: Notice) {
    const stamped: Notice = { ...n, academicYear: n.academicYear ?? state.currentAcademicYear };
    set({ ...state, notices: [stamped, ...state.notices] });
  },
  removeNotice(id: string) {
    set({ ...state, notices: state.notices.filter((n) => n.id !== id) });
  },

  // ---- Attendance (per-year) ----
  markAttendance(
    academicYear: string,
    date: string,
    klass: string,
    section: string,
    map: Record<string, AttendanceStatus>,
  ) {
    const yearBucket = { ...(state.attendanceByYear[academicYear] ?? {}) };
    yearBucket[`${date}::${klass}::${section}`] = map;
    set({
      ...state,
      attendanceByYear: { ...state.attendanceByYear, [academicYear]: yearBucket },
    });
  },
  getAttendance(academicYear: string, date: string, klass: string, section: string) {
    return state.attendanceByYear[academicYear]?.[`${date}::${klass}::${section}`] ?? {};
  },

  // ---- Exam scores (per-year) — write-side for Ranking ----
  saveExamScores(
    academicYear: string,
    klass: string,
    section: string,
    scores: Record<string, Record<string, number>>, // satsId -> subject -> score
  ) {
    const yb = { ...(state.examScoresByYear[academicYear] ?? {}) };
    for (const [satsId, subs] of Object.entries(scores)) {
      const key = `${klass}::${section}::${satsId}`;
      yb[key] = { ...(yb[key] ?? {}), ...subs };
    }
    set({
      ...state,
      examScoresByYear: { ...state.examScoresByYear, [academicYear]: yb },
    });
  },
  getExamScores(academicYear: string, klass: string, section: string) {
    const yb = state.examScoresByYear[academicYear] ?? {};
    const prefix = `${klass}::${section}::`;
    const out: Record<string, Record<string, number>> = {};
    for (const [k, v] of Object.entries(yb)) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
    }
    return out;
  },

  // ---- Promotion ----
  // decisions: satsId -> { action, nextClass?, nextSection? }
  promoteStudents(
    fromYear: string,
    toYear: string,
    decisions: Record<
      string,
      { action: "Promote" | "Retain" | "TransferredOut"; nextClass?: string; nextSection?: string }
    >,
  ) {
    const nextStudents = state.students.map((s) => {
      if (s.academicYear !== fromYear) return s;
      const d = decisions[s.satsId];
      if (!d) return s;
      if (d.action === "TransferredOut") {
        return { ...s, academicYear: `${fromYear}·transferred` };
      }
      if (d.action === "Retain") {
        return { ...s, academicYear: toYear };
      }
      return {
        ...s,
        academicYear: toYear,
        class: d.nextClass ?? s.class,
        section: d.nextSection ?? s.section,
      };
    });
    const yrs = state.academicYears.includes(toYear)
      ? state.academicYears
      : [...state.academicYears, toYear];
    set({
      ...state,
      students: nextStudents,
      academicYears: yrs,
      currentAcademicYear: toYear,
    });
  },
};

// -------- Compatibility helpers used by Student Profile page --------

export type FeePayment = {
  id: string;
  date: string;
  amount: number;
  method: "Cash" | "UPI" | "Bank" | "Card";
  note?: string;
};

export type ExamRow = { subject: string; midterm: number; final: number };

export type StudentExtras = {
  password: string;
  parentSessionActive: boolean;
  fees: { allocated: number; payments: FeePayment[] };
  academics: ExamRow[];
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const extrasCache = new Map<string, StudentExtras>();

export function getStudentExtras(satsId: string): StudentExtras {
  const cached = extrasCache.get(satsId);
  if (cached) return cached;
  const h = hash(satsId);
  const allocated = 42000 + (h % 8) * 3000;
  const paid1 = 10000 + (h % 5) * 1000;
  const paid2 = 8000 + ((h >> 3) % 4) * 1000;
  const extras: StudentExtras = {
    password: "student@123",
    parentSessionActive: h % 2 === 0,
    fees: {
      allocated,
      payments: [
        { id: `P-${satsId}-1`, date: "2026-04-12", amount: paid1, method: "UPI", note: "Term 1" },
        { id: `P-${satsId}-2`, date: "2026-07-02", amount: paid2, method: "Bank", note: "Term 2" },
      ],
    },
    academics: [
      { subject: "Mathematics", midterm: 60 + (h % 35), final: 55 + ((h >> 2) % 40) },
      { subject: "English", midterm: 58 + ((h >> 1) % 38), final: 60 + ((h >> 4) % 35) },
      { subject: "Science", midterm: 62 + ((h >> 3) % 33), final: 65 + ((h >> 5) % 30) },
      { subject: "Social Studies", midterm: 55 + ((h >> 2) % 40), final: 58 + ((h >> 4) % 38) },
    ],
  };
  extrasCache.set(satsId, extras);
  return extras;
}

export function updateStudentExtras(satsId: string, patch: Partial<StudentExtras>) {
  const current = getStudentExtras(satsId);
  extrasCache.set(satsId, { ...current, ...patch });
}

export function addFeePayment(satsId: string, payment: FeePayment) {
  const current = getStudentExtras(satsId);
  extrasCache.set(satsId, {
    ...current,
    fees: { ...current.fees, payments: [...current.fees.payments, payment] },
  });
}

export function updateAcademics(satsId: string, rows: ExamRow[]) {
  const current = getStudentExtras(satsId);
  extrasCache.set(satsId, { ...current, academics: rows });
}
