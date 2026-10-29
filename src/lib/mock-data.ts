// Mock data mirroring the Firestore-backed ERP shape.

export type Student = {
  satsId: string;
  name: string;
  gender: "M" | "F";
  class: string;
  section: string;
  bus: string;
  parentUserId: string;
  academicYear: string; // e.g. "2026-27"
};

export type Bus = {
  id: string;
  route: string;
  driver: string;
  driverMobile?: string;
  capacity: number;
  onboard: number;
  fee: number;
  status: "active" | "idle" | "offline" | string;
};

export type Teacher = {
  id: string;
  name: string;
  mobile: string;
  subject: string;
  status: "online" | "offline";
};

export type Worker = {
  id: string;
  displayName: string;
  email: string;
  status: "online" | "offline";
};

export type Notice = {
  id: string;
  title: string;
  body?: string;
  date: string;
  time: string;
  academicYear: string;
  klass?: string;
  sections?: string[];
};

export type EventItem = Notice;

export const DEFAULT_ACADEMIC_YEAR = "2026-27";
export const DEFAULT_ACADEMIC_YEARS = ["2024-25", "2025-26", "2026-27"];

export const students: Student[] = [
  { satsId: "SATS-20481", name: "Ananya Rao", gender: "F", class: "2nd", section: "A", bus: "Bus-101", parentUserId: "U-1042", academicYear: DEFAULT_ACADEMIC_YEAR },
  { satsId: "SATS-20482", name: "Rohan Iyer", gender: "M", class: "2nd", section: "A", bus: "Bus-101", parentUserId: "U-1043", academicYear: DEFAULT_ACADEMIC_YEAR },
];

export const buses: Bus[] = [
  { id: "Bus-101", route: "Route 1 · Main City Loop", driver: "R. Kulkarni", driverMobile: "+91 98000 11111", capacity: 42, onboard: 38, fee: 12000, status: "active" },
  { id: "Bus-102", route: "Route 2 · Lakeside Express", driver: "S. Verma", driverMobile: "+91 98000 22222", capacity: 42, onboard: 30, fee: 15000, status: "active" },
  { id: "Bus-103", route: "Route 3 · South Ring Road", driver: "A. Fernandes", driverMobile: "+91 98000 33333", capacity: 36, onboard: 15, fee: 14000, status: "active" },
];

export const teachers: Teacher[] = [
  { id: "T-01", name: "Priya Menon", mobile: "+91 98450 12034", subject: "Mathematics", status: "online" },
  { id: "T-02", name: "Sanjay Kulkarni", mobile: "+91 98450 22110", subject: "Physics", status: "online" },
];

export const workers: Worker[] = [
  { id: "W-01", displayName: "Ravi Shankar", email: "ravi@aceops.school", status: "online" },
];

export const notices: Notice[] = [
  { id: "N-101", title: "Founders Day Assembly", date: "2026-08-04", time: "09:00", academicYear: DEFAULT_ACADEMIC_YEAR },
];

export const events = notices;
