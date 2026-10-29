import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  getDocs,
  getDoc,
  increment,
  deleteField
} from "firebase/firestore";
import { db } from "../firebase";
import type { Student, Bus, Teacher, Worker, Notice } from "./mock-data";

export type FeePayment = {
  id: string;
  date: string;
  amount: number;
  method: "Cash" | "UPI" | "Bank" | "Card" | string;
  category: "School Fee" | "Bus Fee" | string;
  note?: string;
};

export type FullStudent = Student & {
  password?: string;
  fees: {
    allocated: number;      // School Fee Allocated
    paid: number;           // School Fee Paid
    busAllocated: number;   // Bus Fee Allocated
    busPaid: number;        // Bus Fee Paid
    payments: FeePayment[];
  };
  marks: Record<string, { scores: Record<string, number>; max_marks?: number }>;
  attendance: {
    daysPresent: number;
    daysAbsent: number;
  };
  status?: string;
};

// ----------------------------------------------------
// 1. STUDENTS HOOK
// ----------------------------------------------------
export function useStudents(classFilter?: string, sectionFilter?: string) {
  const [students, setStudents] = useState<FullStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "students");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: FullStudent[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const satsId = d.satsId || docSnap.id;
        
        // Filter by class/section if requested
        if (classFilter && classFilter !== "all" && d.class !== classFilter) return;
        if (sectionFilter && sectionFilter !== "all" && d.section !== sectionFilter) return;

        const schoolAllocated = d.totalAllocatedFee ?? d.totalAllocated ?? d.fees?.schoolAllocated ?? d.fees?.totalAllocated ?? 50000;
        const schoolPaid = d.totalPaidFee ?? d.totalPaid ?? d.fees?.schoolPaid ?? d.fees?.totalPaid ?? 0;

        const assignedBus = d.assignedBusNumber || d.bus || "No Bus";
        const isNoBus = assignedBus === "No Bus" || assignedBus === "Unassigned" || assignedBus === "None";
        const busAllocated = isNoBus ? 0 : (d.busAllocatedFee ?? d.busAllocated ?? d.fees?.busAllocated ?? 12000);
        const busPaid = isNoBus ? 0 : (d.busPaidFee ?? d.busPaid ?? d.fees?.busPaid ?? 0);

        const rawReceipts = Array.isArray(d.receipts) ? d.receipts : [];

        const payments: FeePayment[] = rawReceipts.map((r: any, idx: number) => ({
          id: r.id || `REC-${idx + 1}`,
          date: r.date || new Date().toISOString().split("T")[0],
          amount: Number(r.amount || 0),
          method: r.method || "Cash",
          category: r.category || (r.note?.toLowerCase().includes("bus") ? "Bus Fee" : "School Fee"),
          note: r.note || ""
        }));

        list.push({
          satsId,
          name: d.name || "Unnamed Student",
          gender: d.gender === "Female" || d.gender === "F" ? "F" : "M",
          class: d.class || "1st Class",
          section: d.section || "Section A",
          bus: assignedBus,
          parentUserId: d.parentUid || d.parentEmail || `Parent-${satsId}`,
          academicYear: d.academicYear || "2026-27",
          status: d.status || "active",
          password: d.password || d.parentPassword || d.studentPassword || "123456",
          fees: {
            allocated: Number(schoolAllocated),
            paid: Number(schoolPaid),
            busAllocated: Number(busAllocated),
            busPaid: Number(busPaid),
            payments
          },
          marks: d.marks || {},
          attendance: {
            daysPresent: Number(d.daysPresent ?? d.attendance?.daysPresent ?? 0),
            daysAbsent: Number(d.daysAbsent ?? d.attendance?.daysAbsent ?? 0)
          }
        });
      });

      // Sort by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore students snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classFilter, sectionFilter]);

  return { students, loading };
}

// ----------------------------------------------------
// 2. SINGLE STUDENT PROFILE HOOK
// ----------------------------------------------------
export function useStudentProfile(satsId: string | null) {
  const [student, setStudent] = useState<FullStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!satsId) {
      setStudent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, "students", satsId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) {
        setStudent(null);
        setLoading(false);
        return;
      }

      const d = docSnap.data();
      const schoolAllocated = d.totalAllocatedFee ?? d.totalAllocated ?? d.fees?.schoolAllocated ?? d.fees?.totalAllocated ?? 50000;
      const schoolPaid = d.totalPaidFee ?? d.totalPaid ?? d.fees?.schoolPaid ?? d.fees?.totalPaid ?? 0;

      const assignedBus = d.assignedBusNumber || d.bus || "No Bus";
      const isNoBus = assignedBus === "No Bus" || assignedBus === "Unassigned" || assignedBus === "None";
      const busAllocated = isNoBus ? 0 : (d.busAllocatedFee ?? d.busAllocated ?? d.fees?.busAllocated ?? 12000);
      const busPaid = isNoBus ? 0 : (d.busPaidFee ?? d.busPaid ?? d.fees?.busPaid ?? 0);

      const rawReceipts = Array.isArray(d.receipts) ? d.receipts : [];

      const payments: FeePayment[] = rawReceipts.map((r: any, idx: number) => ({
        id: r.id || `REC-${idx + 1}`,
        date: r.date || new Date().toISOString().split("T")[0],
        amount: Number(r.amount || 0),
        method: r.method || "Cash",
        category: r.category || (r.note?.toLowerCase().includes("bus") ? "Bus Fee" : "School Fee"),
        note: r.note || ""
      }));

      setStudent({
        satsId: d.satsId || docSnap.id,
        name: d.name || "Unnamed Student",
        gender: d.gender === "Female" || d.gender === "F" ? "F" : "M",
        class: d.class || "1st Class",
        section: d.section || "Section A",
        bus: assignedBus,
        parentUserId: d.parentUid || d.parentEmail || `Parent-${docSnap.id}`,
        academicYear: d.academicYear || "2026-27",
        status: d.status || "active",
        password: d.password || d.parentPassword || d.studentPassword || "123456",
        fees: {
          allocated: Number(schoolAllocated),
          paid: Number(schoolPaid),
          busAllocated: Number(busAllocated),
          busPaid: Number(busPaid),
          payments
        },
        marks: d.marks || {},
        attendance: {
          daysPresent: Number(d.daysPresent ?? d.attendance?.daysPresent ?? 0),
          daysAbsent: Number(d.daysAbsent ?? d.attendance?.daysAbsent ?? 0)
        }
      });
      setLoading(false);
    }, (err) => {
      console.error("Firestore student profile error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [satsId]);

  return { student, loading };
}

// ----------------------------------------------------
// 3. CLASSES & SECTIONS HOOK
// ----------------------------------------------------
export function useClassesAndSections() {
  const [classes, setClasses] = useState<string[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let rawClasses: { name: string; order: number }[] = [];
    let rawStudents: { class: string; section: string }[] = [];
    let rawGlobalSections: string[] = [];

    function recompute() {
      const classSet = new Set<string>();
      rawClasses.forEach((c) => classSet.add(c.name));
      rawStudents.forEach((s) => {
        if (s.class) classSet.add(s.class);
      });

      const classList = Array.from(classSet);
      classList.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 99;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 99;
        return numA - numB;
      });

      const sMap: Record<string, Set<string>> = {};
      classList.forEach((c) => {
        sMap[c] = new Set<string>(rawGlobalSections);
      });

      rawStudents.forEach((s) => {
        if (s.class && s.section) {
          if (!sMap[s.class]) sMap[s.class] = new Set<string>();
          sMap[s.class].add(s.section);
        }
      });

      const finalSectionsByClass: Record<string, string[]> = {};
      classList.forEach((c) => {
        const secArr = Array.from(sMap[c] || new Set(["Section A", "Section B"]));
        secArr.sort();
        finalSectionsByClass[c] = secArr.length > 0 ? secArr : ["Section A", "Section B"];
      });

      setClasses(classList);
      setSectionsByClass(finalSectionsByClass);
      setLoading(false);
    }

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      rawClasses = snap.docs.map((d) => ({
        name: d.data().name || d.id,
        order: d.data().order || 99,
      }));
      recompute();
    }, (err) => {
      console.error("Classes listener error:", err);
      setLoading(false);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      rawStudents = snap.docs.map((d) => ({
        class: d.data().class,
        section: d.data().section,
      }));
      recompute();
    }, (err) => {
      console.error("Students listener error:", err);
      setLoading(false);
    });

    const unsubSections = onSnapshot(collection(db, "sections"), (snap) => {
      rawGlobalSections = snap.docs.map((d) => d.data().name || d.id).filter(Boolean);
      recompute();
    }, (err) => {
      console.error("Sections listener error:", err);
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubStudents();
      unsubSections();
    };
  }, []);

  return { classes, sectionsByClass, loading };
}

// ----------------------------------------------------
// 4. TEACHERS HOOK
// ----------------------------------------------------
export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "teachers");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Teacher[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.status === "system") return;

        list.push({
          id: d.id || docSnap.id,
          name: d.name || "Unnamed Teacher",
          mobile: d.mobile || d.phone || "+91 98000 00000",
          subject: d.subject || "General",
          status: d.status === "active" || d.status === "online" ? "online" : "offline"
        });
      });
      setTeachers(list);
      setLoading(false);
    }, (err) => {
      console.error("Teachers snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { teachers, loading };
}

// ----------------------------------------------------
// 5. STAFF / WORKERS HOOK
// ----------------------------------------------------
export function useStaff() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "users");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Worker[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: d.uid || docSnap.id,
          displayName: d.name || d.displayName || d.email?.split("@")[0] || "Staff Member",
          email: d.email || "",
          status: d.accessRevoked ? "offline" : (d.status === "active" ? "online" : "offline")
        });
      });
      setWorkers(list);
      setLoading(false);
    }, (err) => {
      console.error("Users snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { workers, loading };
}

// ----------------------------------------------------
// 6. BUSES HOOK
// ----------------------------------------------------
export function useBuses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "buses");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: d.id || d.busNumber || docSnap.id,
          route: d.routeName || d.route || `Route - ${docSnap.id}`,
          driver: d.driverName || d.driver || "Unassigned",
          driverMobile: d.driverMobile || d.mobile || d.driverPhone || "+91 98000 00000",
          capacity: Number(d.capacity || 40),
          onboard: Number(d.onboard || 0),
          fee: Number(d.fee || d.busFee || 12000),
          status: d.status || "active"
        });
      });

      if (list.length === 0) {
        setBuses([
          { id: "Bus-101", route: "Route 1 · Main City Loop", driver: "R. Kulkarni", driverMobile: "+91 98000 11111", capacity: 42, onboard: 38, fee: 12000, status: "active" },
          { id: "Bus-102", route: "Route 2 · Lakeside Express", driver: "S. Verma", driverMobile: "+91 98000 22222", capacity: 42, onboard: 30, fee: 15000, status: "active" },
          { id: "Bus-103", route: "Route 3 · South Ring Road", driver: "A. Fernandes", driverMobile: "+91 98000 33333", capacity: 36, onboard: 15, fee: 14000, status: "active" },
        ]);
      } else {
        setBuses(list);
      }
      setLoading(false);
    }, (err) => {
      console.error("Buses snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { buses, loading };
}

// ----------------------------------------------------
// 7. NOTICES HOOK
// ----------------------------------------------------
export function useNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "events");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Notice[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || "Untitled Announcement",
          body: d.description || d.content || d.body || "",
          date: d.date || new Date().toISOString().split("T")[0],
          time: d.time || "09:00",
          academicYear: d.academicYear || "2026-27",
          klass: d.targetClass !== "All Classes" ? d.targetClass : undefined,
          sections: Array.isArray(d.targetSections) && !d.targetSections.includes("All Sections") ? d.targetSections : undefined
        });
      });

      list.sort((a, b) => b.date.localeCompare(a.date));
      setNotices(list);
      setLoading(false);
    }, (err) => {
      console.error("Notices snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { notices, loading };
}

// ----------------------------------------------------
// 8. RANKINGS HOOK
// ----------------------------------------------------
export type StudentRanking = {
  satsId: string;
  studentName: string;
  class: string;
  section: string;
  totalScore: number;
  totalMaxMarks: number;
  percentage: number;
  sectionRank: number;
  sectionTotalStudents: number;
  classRank: number;
  classTotalStudents: number;
  updatedAt?: string;
};

export function useRankings(classFilter?: string, sectionFilter?: string) {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "rankings");

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: StudentRanking[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (classFilter && classFilter !== "all" && d.class !== classFilter) return;
        if (sectionFilter && sectionFilter !== "all" && d.section !== sectionFilter) return;

        list.push({
          satsId: d.satsId || docSnap.id,
          studentName: d.studentName || d.name || "Student",
          class: d.class || "1st Class",
          section: d.section || "Section A",
          totalScore: Number(d.totalScore || 0),
          totalMaxMarks: Number(d.totalMaxMarks || 100),
          percentage: Number(d.percentage || 0),
          sectionRank: Number(d.sectionRank || 1),
          sectionTotalStudents: Number(d.sectionTotalStudents || 1),
          classRank: Number(d.classRank || 1),
          classTotalStudents: Number(d.classTotalStudents || 1),
          updatedAt: d.updatedAt
        });
      });

      setRankings(list);
      setLoading(false);
    }, (err) => {
      console.error("Rankings snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classFilter, sectionFilter]);

  return { rankings, loading };
}

// ----------------------------------------------------
// 9. FIRESTORE WRITE ACTIONS
// ----------------------------------------------------
export const firestoreActions = {
  // --- Class & Section Actions ---
  async addClass(className: string) {
    const cleanName = className.trim();
    if (!cleanName) return;
    const docRef = doc(db, "classes", cleanName);
    const orderNum = parseInt(cleanName.replace(/\D/g, ""), 10) || 99;

    await setDoc(docRef, {
      name: cleanName,
      order: orderNum,
      status: "active",
      createdAt: serverTimestamp()
    }, { merge: true });
  },

  async deleteClass(className: string) {
    // 1. Clean up subcollections under /classes/{className}
    try {
      const subSnap = await getDocs(collection(db, `classes/${className}/sections`));
      const batchSub = writeBatch(db);
      subSnap.forEach((subDoc) => batchSub.delete(subDoc.ref));
      await batchSub.commit();
    } catch (e) {}

    // 2. Delete class doc by ID and query
    try {
      await deleteDoc(doc(db, "classes", className));
    } catch (e) {}

    try {
      const qCls = query(collection(db, "classes"), where("name", "==", className));
      const clsSnap = await getDocs(qCls);
      const batchCls = writeBatch(db);
      clsSnap.forEach((d) => batchCls.delete(d.ref));
      await batchCls.commit();
    } catch (e) {}

    // 3. Cascade delete all students enrolled in this class
    try {
      const qStud = query(collection(db, "students"), where("class", "==", className));
      const studSnap = await getDocs(qStud);
      
      for (const studentDoc of studSnap.docs) {
        const satsId = studentDoc.data().satsId || studentDoc.id;
        // Delete attendance subcollection
        try {
          const attSnap = await getDocs(collection(db, `students/${satsId}/attendance`));
          const batchAtt = writeBatch(db);
          attSnap.forEach((attDoc) => batchAtt.delete(attDoc.ref));
          await batchAtt.commit();
        } catch (e) {}

        // Delete student main document
        await deleteDoc(studentDoc.ref);
      }
    } catch (e) {
      console.error("Cascading class student deletion error:", e);
    }
  },

  async deleteSection(className: string, sectionName: string) {
    // 1. Delete section document in /classes/{className}/sections/{sectionName}
    try {
      await deleteDoc(doc(db, `classes/${className}/sections`, sectionName));
    } catch (e) {}

    try {
      const qClassSec = query(collection(db, `classes/${className}/sections`), where("name", "==", sectionName));
      const classSecSnap = await getDocs(qClassSec);
      const batchClassSec = writeBatch(db);
      classSecSnap.forEach((d) => batchClassSec.delete(d.ref));
      await batchClassSec.commit();
    } catch (e) {}

    // 2. Delete section document in root /sections collection
    try {
      await deleteDoc(doc(db, "sections", sectionName));
    } catch (e) {}

    try {
      const qRootSec = query(collection(db, "sections"), where("name", "==", sectionName));
      const rootSecSnap = await getDocs(qRootSec);
      const batchRootSec = writeBatch(db);
      rootSecSnap.forEach((d) => batchRootSec.delete(d.ref));
      await batchRootSec.commit();
    } catch (e) {}

    // 3. Delete all students in this class and section
    try {
      const qStud = query(
        collection(db, "students"),
        where("class", "==", className),
        where("section", "==", sectionName)
      );
      const studSnap = await getDocs(qStud);

      for (const studentDoc of studSnap.docs) {
        const satsId = studentDoc.data().satsId || studentDoc.id;
        try {
          const attSnap = await getDocs(collection(db, `students/${satsId}/attendance`));
          const batchAtt = writeBatch(db);
          attSnap.forEach((attDoc) => batchAtt.delete(attDoc.ref));
          await batchAtt.commit();
        } catch (e) {}

        await deleteDoc(studentDoc.ref);
      }
    } catch (e) {
      console.error("Cascading section student deletion error:", e);
    }
  },

  // --- Fee Structure Action ---
  async updateSectionSchoolFee(className: string, sectionName: string, allocatedFee: number) {
    const isAll = !sectionName || sectionName === "All Sections" || sectionName === "all";

    // 1. Save fee structure rule in Cloud Firestore
    const feeDocId = `${className}_${isAll ? "All_Sections" : sectionName}`.replace(/[^a-zA-Z0-9_]/g, "_");
    await setDoc(doc(db, "fee_structures", feeDocId), {
      class: className,
      section: isAll ? "All Sections" : sectionName,
      schoolAllocatedFee: allocatedFee,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Update all matching students in Firestore
    const qStud = isAll
      ? query(collection(db, "students"), where("class", "==", className))
      : query(
          collection(db, "students"),
          where("class", "==", className),
          where("section", "==", sectionName)
        );
    const studSnap = await getDocs(qStud);

    for (const studentDoc of studSnap.docs) {
      const data = studentDoc.data();
      const currentPaid = Number(data.totalPaidFee ?? data.totalPaid ?? data.fees?.schoolPaid ?? 0);
      const newBalance = Math.max(0, allocatedFee - currentPaid);

      await updateDoc(studentDoc.ref, {
        totalAllocatedFee: allocatedFee,
        totalAllocated: allocatedFee,
        outstandingBalance: newBalance,
        "fees.schoolAllocated": allocatedFee,
        "fees.totalAllocated": allocatedFee,
        lastUpdatedTimestamp: serverTimestamp()
      });
    }
  },

  // --- Student Actions ---
  async addStudent(studentData: {
    satsId: string;
    name: string;
    gender: "M" | "F";
    class: string;
    section: string;
    bus?: string;
    parentEmail?: string;
    password?: string;
  }) {
    const defaultPassword = studentData.password || "123456";
    const assignedBus = studentData.bus || "No Bus";
    const isNoBus = assignedBus === "No Bus" || assignedBus === "Unassigned" || assignedBus === "None";
    
    // Fetch bus fee from Firestore if assigned to a bus
    let busFeeAllocated = 0;
    if (!isNoBus) {
      try {
        const busDocRef = doc(db, "buses", assignedBus);
        const busSnap = await getDoc(busDocRef);
        if (busSnap.exists()) {
          busFeeAllocated = Number(busSnap.data().fee || busSnap.data().busFee || 12000);
        } else {
          busFeeAllocated = 12000;
        }
      } catch (e) {
        busFeeAllocated = 12000;
      }
    }

    // Ensure class document exists in /classes
    if (studentData.class) {
      await firestoreActions.addClass(studentData.class);
    }

    const docRef = doc(db, "students", studentData.satsId);
    await setDoc(docRef, {
      satsId: studentData.satsId,
      name: studentData.name,
      gender: studentData.gender === "F" ? "Female" : "Male",
      class: studentData.class,
      section: studentData.section,
      assignedBusNumber: assignedBus,
      parentEmail: studentData.parentEmail || studentData.satsId,
      parentAccountUid: `Parent-${studentData.satsId}`,
      password: defaultPassword,
      passwordSet: true,
      mustChangePassword: true,
      requiresPasswordReset: true,
      isTemporaryPassword: true,
      requirePasswordChange: true,
      status: "active",
      totalAllocatedFee: 50000,
      totalPaidFee: 0,
      outstandingBalance: 50000,
      busAllocatedFee: busFeeAllocated,
      busPaidFee: 0,
      fees: { totalAllocated: 50000, totalPaid: 0, schoolAllocated: 50000, schoolPaid: 0, busAllocated: busFeeAllocated, busPaid: 0 },
      daysPresent: 0,
      daysAbsent: 0,
      createdAt: serverTimestamp()
    }, { merge: true });

    // Also provision Firebase Authentication user for mobile app login
    try {
      const studentAuthEmail = `${studentData.satsId.toLowerCase()}@ace.school`;
      await fetch("/api/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentAuthEmail, password: defaultPassword }),
      });
    } catch (e) {
      console.warn("Firebase Auth student provisioning notice:", e);
    }
  },

  async updateStudent(satsId: string, patch: Partial<FullStudent>) {
    const docRef = doc(db, "students", satsId);
    const payload: Record<string, any> = {
      lastUpdatedTimestamp: serverTimestamp()
    };

    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.class !== undefined) payload.class = patch.class;
    if (patch.section !== undefined) payload.section = patch.section;
    if (patch.gender !== undefined) payload.gender = patch.gender === "F" ? "Female" : "Male";
    if (patch.bus !== undefined) {
      const busVal = patch.bus;
      payload.assignedBusNumber = busVal;
      const isNoBus = busVal === "No Bus" || busVal === "Unassigned" || busVal === "None";
      if (isNoBus) {
        payload.busAllocatedFee = 0;
        payload.busAllocated = 0;
        payload["fees.busAllocated"] = 0;
      } else {
        // Look up bus fee
        try {
          const busSnap = await getDoc(doc(db, "buses", busVal));
          const feeVal = busSnap.exists() ? Number(busSnap.data().fee || busSnap.data().busFee || 12000) : 12000;
          payload.busAllocatedFee = feeVal;
          payload.busAllocated = feeVal;
          payload["fees.busAllocated"] = feeVal;
        } catch (e) {
          payload.busAllocatedFee = 12000;
          payload.busAllocated = 12000;
          payload["fees.busAllocated"] = 12000;
        }
      }
    }
    if (patch.status !== undefined) payload.status = patch.status;

    await setDoc(docRef, payload, { merge: true });

    if (patch.password !== undefined && patch.password.trim() !== "") {
      await firestoreActions.updateStudentPassword(satsId, patch.password.trim());
    }
  },

  async updateStudentPassword(satsId: string, newPassword: string) {
    console.log("[Admin Console] Setting requiresPasswordReset: true for student:", satsId);

    const docRef = doc(db, "students", satsId);

    // 1. Cleanly update/overwrite password fields & set security flags in Cloud Firestore
    await setDoc(docRef, {
      password: newPassword,
      parentPassword: newPassword,
      studentPassword: newPassword,
      requiresPasswordReset: true,
      isTemporaryPassword: true,
      mustChangePassword: true,
      requirePasswordChange: true,
      passwordSet: true,
      tokenVersion: increment(1),
      passwordUpdatedAt: serverTimestamp(),
      passwordLastUpdated: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log("[Admin Console] Firestore password update & requiresPasswordReset flag set successfully:", satsId);

    // 2. Write real-time parent notification event in Cloud Firestore for Parent App
    try {
      const notifData = {
        title: "Mobile App Password Updated",
        body: `Your account password was updated by school administration to: ${newPassword}`,
        satsId: satsId,
        password: newPassword,
        type: "password_update",
        read: false,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, `students/${satsId}/notifications`), notifData);
      await addDoc(collection(db, "parent_alerts"), notifData);
    } catch (e) {
      console.warn("Parent app notification creation notice:", e);
    }

    // 3. Update Firebase Authentication user account password for `${satsId.toLowerCase()}@ace.school`
    const studentAuthEmail = `${satsId.toLowerCase()}@ace.school`;
    try {
      const res = await fetch("/api/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentAuthEmail, password: newPassword }),
      });
      const data = await res.json();
      console.log("[Firebase Auth] Student password updated successfully:", data);
    } catch (e: any) {
      console.warn("API update-password call notice:", e.message);
    }

    // 3. Sync password to parent user doc in /users if parentUid exists
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d.parentUid) {
          const userRef = doc(db, "users", d.parentUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await setDoc(userRef, {
              password: newPassword,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        }
      }
    } catch (e) {
      console.warn("Parent user doc password sync notice:", e);
    }
  },

  async deleteStudent(satsId: string) {
    // 1. Delete main student doc by document ID
    const studentRef = doc(db, "students", satsId);
    
    // 2. Delete subcollections (e.g. attendance)
    try {
      const attSnap = await getDocs(collection(db, `students/${satsId}/attendance`));
      const batch = writeBatch(db);
      attSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn("Subcollection deletion notice:", e);
    }

    await deleteDoc(studentRef);

    // 3. Query by satsId field to ensure any alternate document IDs are also removed from Firestore
    try {
      const q = query(collection(db, "students"), where("satsId", "==", satsId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch2 = writeBatch(db);
        snap.forEach((d) => batch2.delete(d.ref));
        await batch2.commit();
      }
    } catch (e) {
      console.warn("SatsId query deletion notice:", e);
    }
  },

  // --- Attendance Action ---
  async markAttendance(
    date: string,
    className: string,
    sectionName: string,
    attendanceMap: Record<string, "P" | "A" | "L">,
    markedBy: string = "teacher"
  ) {
    const batch = writeBatch(db);

    for (const [satsId, status] of Object.entries(attendanceMap)) {
      const studentRef = doc(db, "students", satsId);
      const attDocRef = doc(db, `students/${satsId}/attendance`, date);

      const statusStr = status === "P" ? "present" : (status === "A" ? "absent" : "late");

      batch.set(attDocRef, {
        date,
        class: className,
        section: sectionName,
        status: statusStr,
        markedBy,
        timestamp: serverTimestamp()
      }, { merge: true });

      // Update student summary counts
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const curPres = Number(studentSnap.data().daysPresent || 0);
        const curAbs = Number(studentSnap.data().daysAbsent || 0);

        if (status === "P") {
          batch.update(studentRef, { daysPresent: curPres + 1 });
        } else if (status === "A") {
          batch.update(studentRef, { daysAbsent: curAbs + 1 });
        }
      }
    }

    await batch.commit();
  },

  // --- Fee Payment Action (Separate School Fee & Bus Fee) ---
  async addFeePayment(satsId: string, payment: FeePayment) {
    const studentRef = doc(db, "students", satsId);
    const snap = await getDoc(studentRef);

    if (!snap.exists()) return;

    const data = snap.data();
    const currentReceipts = Array.isArray(data.receipts) ? data.receipts : [];

    const category = payment.category || "School Fee";
    const isBus = category === "Bus Fee";

    const currentSchoolPaid = Number(data.totalPaidFee ?? data.totalPaid ?? data.fees?.schoolPaid ?? data.fees?.totalPaid ?? 0);
    const currentBusPaid = Number(data.busPaidFee ?? data.busPaid ?? data.fees?.busPaid ?? 0);

    const schoolAllocated = Number(data.totalAllocatedFee ?? data.totalAllocated ?? 50000);

    const newSchoolPaid = isBus ? currentSchoolPaid : (currentSchoolPaid + payment.amount);
    const newBusPaid = isBus ? (currentBusPaid + payment.amount) : currentBusPaid;
    const newSchoolBalance = Math.max(0, schoolAllocated - newSchoolPaid);

    const updatedReceipts = [
      ...currentReceipts,
      {
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        method: payment.method,
        category: category,
        note: payment.note || ""
      }
    ];

    await updateDoc(studentRef, {
      totalPaidFee: newSchoolPaid,
      totalPaid: newSchoolPaid,
      outstandingBalance: newSchoolBalance,
      "fees.schoolPaid": newSchoolPaid,
      "fees.totalPaid": newSchoolPaid,
      busPaidFee: newBusPaid,
      busPaid: newBusPaid,
      "fees.busPaid": newBusPaid,
      receipts: updatedReceipts,
      lastUpdatedTimestamp: serverTimestamp()
    });
  },

  // --- Exam Scores Action ---
  async saveExamScores(
    satsId: string,
    examCategory: string,
    scores: Record<string, number>
  ) {
    const studentRef = doc(db, "students", satsId);
    const categoryKey = examCategory.toLowerCase().replace(/[^a-z0-9]/g, "");

    const sanitizedScores: Record<string, number> = {};
    Object.entries(scores || {}).forEach(([sub, val]) => {
      const cleanedStr = String(val ?? 0).replace(/^0+(?=\d)/, "");
      const numVal = parseInt(cleanedStr, 10);
      sanitizedScores[sub] = isNaN(numVal) ? 0 : Math.min(100, Math.max(0, numVal));
    });

    await setDoc(studentRef, {
      marks: {
        [categoryKey]: {
          scores: sanitizedScores,
          max_marks: 100
        }
      },
      lastUpdatedTimestamp: serverTimestamp()
    }, { merge: true });

    // Recalculate rankings across all students and update /rankings collection
    await firestoreActions.recalculateRankings();
  },

  async recalculateRankings() {
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      if (studentsSnap.empty) return;

      const allStudents: any[] = [];
      const byClass: Record<string, any[]> = {};
      const byClassAndSection: Record<string, any[]> = {};

      studentsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const satsId = d.satsId || docSnap.id;
        const marks = d.marks || {};

        let totalScore = 0;
        let totalMax = 0;
        Object.values(marks).forEach((catData: any) => {
          const catScores = catData?.scores || {};
          const maxPerSub = Number(catData?.max_marks || 100);
          Object.values(catScores).forEach((val: any) => {
            totalScore += Number(val || 0);
            totalMax += maxPerSub;
          });
        });

        const percentage = totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0;
        const sObj = {
          satsId,
          name: d.name || satsId,
          class: d.class || "1st Class",
          section: d.section || "Section A",
          totalScore,
          totalMax,
          percentage,
          ref: docSnap.ref
        };

        allStudents.push(sObj);
        if (!byClass[sObj.class]) byClass[sObj.class] = [];
        byClass[sObj.class].push(sObj);

        const secKey = `${sObj.class}_${sObj.section}`;
        if (!byClassAndSection[secKey]) byClassAndSection[secKey] = [];
        byClassAndSection[secKey].push(sObj);
      });

      Object.keys(byClass).forEach((cName) => {
        byClass[cName].sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage);
        byClass[cName].forEach((s, idx) => {
          s.classRank = idx + 1;
          s.classTotal = byClass[cName].length;
        });
      });

      Object.keys(byClassAndSection).forEach((secKey) => {
        byClassAndSection[secKey].sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage);
        byClassAndSection[secKey].forEach((s, idx) => {
          s.sectionRank = idx + 1;
          s.sectionTotal = byClassAndSection[secKey].length;
        });
      });

      const batch = writeBatch(db);
      for (const s of allStudents) {
        const rankingRef = doc(db, "rankings", s.satsId);
        batch.set(rankingRef, {
          satsId: s.satsId,
          studentName: s.name,
          class: s.class,
          section: s.section,
          totalScore: s.totalScore,
          totalMaxMarks: s.totalMax,
          percentage: s.percentage,
          sectionRank: s.sectionRank,
          sectionTotalStudents: s.sectionTotal,
          classRank: s.classRank,
          classTotalStudents: s.classTotal,
          lastUpdated: serverTimestamp(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        batch.set(s.ref, {
          sectionRank: s.sectionRank,
          sectionTotalStudents: s.sectionTotal,
          classRank: s.classRank,
          classTotalStudents: s.classTotal,
          percentage: s.percentage,
          totalScore: s.totalScore
        }, { merge: true });
      }
      await batch.commit();
    } catch (e) {
      console.warn("Recalculate rankings notice:", e);
    }
  },

  // --- Bus Actions ---
  async addBus(bus: {
    id: string;
    routeName: string;
    driverName: string;
    driverMobile?: string;
    capacity: number;
    fee?: number;
  }) {
    const docRef = doc(db, "buses", bus.id);
    await setDoc(docRef, {
      busNumber: bus.id,
      routeName: bus.routeName,
      driverName: bus.driverName,
      driverMobile: bus.driverMobile || "+91 98000 00000",
      capacity: bus.capacity,
      fee: bus.fee ?? 12000,
      busFee: bus.fee ?? 12000,
      onboard: 0,
      status: "active",
      createdAt: serverTimestamp()
    });
  },

  async updateBus(busId: string, patch: Partial<Bus>) {
    const docRef = doc(db, "buses", busId);
    const payload: Record<string, any> = {};
    if (patch.route) payload.routeName = patch.route;
    if (patch.driver) payload.driverName = patch.driver;
    if (patch.driverMobile) payload.driverMobile = patch.driverMobile;
    if (patch.capacity) payload.capacity = patch.capacity;
    if (patch.fee !== undefined) {
      payload.fee = patch.fee;
      payload.busFee = patch.fee;
    }
    if (patch.status) payload.status = patch.status;
    await updateDoc(docRef, payload);
  },

  async deleteBus(busId: string) {
    await deleteDoc(doc(db, "buses", busId));
  },

  // --- Teacher Actions ---
  async addTeacher(teacher: { name: string; email: string; mobile: string; subject: string }) {
    const docRef = doc(collection(db, "teachers"));
    await setDoc(docRef, {
      id: docRef.id,
      name: teacher.name,
      email: teacher.email,
      mobile: teacher.mobile,
      subject: teacher.subject,
      role: "teacher",
      status: "active",
      createdAt: serverTimestamp()
    });
  },

  async updateTeacher(teacherId: string, patch: Partial<Teacher>) {
    const docRef = doc(db, "teachers", teacherId);
    const payload: Record<string, any> = {};
    if (patch.name) payload.name = patch.name;
    if (patch.mobile) payload.mobile = patch.mobile;
    if (patch.subject) payload.subject = patch.subject;
    if (patch.status) payload.status = patch.status === "online" ? "active" : "offline";
    await updateDoc(docRef, payload);
  },

  async deleteTeacher(teacherId: string) {
    await deleteDoc(doc(db, "teachers", teacherId));
  },

  // --- Notice / Event Actions ---
  async addNotice(notice: { title: string; body?: string; date: string; time: string; targetClass?: string }) {
    await addDoc(collection(db, "events"), {
      title: notice.title,
      description: notice.body || "",
      date: notice.date,
      time: notice.time,
      targetClass: notice.targetClass || "All Classes",
      targetSections: ["All Sections"],
      status: "active",
      createdAt: serverTimestamp()
    });
  },

  async deleteNotice(noticeId: string) {
    await deleteDoc(doc(db, "events", noticeId));
  }
};
