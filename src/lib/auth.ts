import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export type Role = "principal" | "faculty";

export type Session = {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
};

const KEY = "ace.session.v1";

export function normalizeRole(raw: unknown): Role {
  const v = String(raw ?? "").toLowerCase();
  if (v === "principal" || v === "admin") return "principal";
  return "faculty";
}

export function shellForRole(role: Role): "/principal" | "/faculty" {
  return role === "principal" ? "/principal" : "/faculty";
}

export function landingFor(role: Role): string {
  return role === "principal" ? "/principal/overview" : "/faculty/students";
}

export function canEnterShell(pathname: string, role: Role | null): boolean {
  if (!role) return false;
  if (pathname.startsWith("/principal")) return role === "principal";
  if (pathname.startsWith("/faculty")) return role === "faculty";
  return true;
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    return null;
  }
}

export function writeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (!s) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("ace-auth-change"));
}

/**
 * Signs in using live Firebase Authentication and queries Firestore `/users/{uid}` for the user's role.
 */
export async function signIn(email: string, password: string): Promise<Session> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    let role: Role = "faculty";
    let displayName = user.displayName || user.email?.split("@")[0] || "User";

    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.role) {
          role = normalizeRole(userData.role);
        }
        if (userData.name || userData.displayName) {
          displayName = userData.name || userData.displayName;
        }
      } else {
        // Fallback email role inference if document isn't populated yet
        if (email.toLowerCase().includes("principal") || email.toLowerCase().includes("admin") || email.toLowerCase().includes("garret")) {
          role = "principal";
        }
      }
    } catch (e) {
      console.warn("Could not fetch user document from Firestore:", e);
    }

    const session: Session = {
      uid: user.uid,
      email: user.email || email,
      displayName,
      role,
    };

    writeSession(session);
    return session;
  } catch (error: any) {
    console.error("Firebase authentication error:", error);
    throw new Error(error.message || "Invalid email or password.");
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn("Sign out error:", e);
  }
  writeSession(null);
}

export const demoCredentials = [
  { email: "gagan00270@gmail.com", role: "faculty" as const },
  { email: "yashwanth.32997@gmail.com", role: "faculty" as const },
  { email: "gagan123@ace.school", role: "faculty" as const },
];
