import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { REGISTRY_AGENTS } from "@/lib/db/registryAgents";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-memory fallback cache so the app is always ultra-fast and resilient
const memoryStore = new Map<string, Map<string, any>>();

function getMemoryCollection(name: string) {
  if (!memoryStore.has(name)) {
    memoryStore.set(name, new Map());
  }
  return memoryStore.get(name)!;
}

// Initialize default registry agents in memory
const agentMem = getMemoryCollection("agents");
for (const a of REGISTRY_AGENTS) {
  agentMem.set(a.id, {
    id: a.id,
    name: a.name,
    capabilities: typeof a.capabilities === "string" ? JSON.parse(a.capabilities) : a.capabilities,
    price: a.price,
    endpoint: a.endpoint,
    model: a.model ?? null,
    status: "ACTIVE",
    reputation: a.seedReputation,
    successRate: a.seedSuccessRate,
    avgQuality: a.seedAvgQuality,
    avgLatencyMs: a.seedAvgLatencyMs,
    avgCost: a.price,
    totalJobs: 0,
    successCount: 0,
    createdAt: new Date().toISOString(),
  });
}

// Default wallets in memory
const walletMem = getMemoryCollection("wallets");
walletMem.set("wallet-manager", {
  id: "wallet-manager",
  type: "MANAGER",
  balance: 5000,
  algorandAddress: "PRVLKHVPVSMCNDO6PEWHOVWPR3JVBEQVAX4V2TCFN4RMCDC54R3FB34QMM",
  updatedAt: new Date().toISOString(),
});
walletMem.set("wallet-escrow-pool", {
  id: "wallet-escrow-pool",
  type: "MANAGER",
  balance: 10000,
  algorandAddress: "VIRTUAL_ESCROW_POOL",
  updatedAt: new Date().toISOString(),
});

export const firestoreService = {
  // ── TASKS ─────────────────────────────────────────────────────────────
  async getTasks(userId?: string): Promise<any[]> {
    const memTasks = Array.from(getMemoryCollection("tasks").values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (!db) return memTasks;

    const path = "tasks";
    try {
      const q = userId
        ? query(collection(db, path), where("userId", "in", [userId, "demo-user"]), limit(50))
        : query(collection(db, path), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreTasks = snap.docs.map((d) => d.data());
        // Merge into memory
        for (const t of firestoreTasks) {
          getMemoryCollection("tasks").set(t.id, t);
        }
        return firestoreTasks.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
    } catch (err: any) {
      console.warn("[Firestore] Read tasks fallback to memory:", err.message);
    }
    return memTasks;
  },

  async getTask(taskId: string): Promise<any | null> {
    const cached = getMemoryCollection("tasks").get(taskId);
    if (!db) return cached ?? null;

    const path = `tasks/${taskId}`;
    try {
      const snap = await getDoc(doc(db, "tasks", taskId));
      if (snap.exists()) {
        const data = snap.data();
        getMemoryCollection("tasks").set(taskId, data);
        return data;
      }
    } catch (err: any) {
      console.warn("[Firestore] getTask fallback to memory:", err.message);
    }
    return cached ?? null;
  },

  async setTask(taskId: string, data: any): Promise<any> {
    const existing = getMemoryCollection("tasks").get(taskId) || {};
    const merged = {
      ...existing,
      ...data,
      id: taskId,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || data.createdAt || new Date().toISOString(),
    };
    getMemoryCollection("tasks").set(taskId, merged);

    if (db) {
      const path = `tasks/${taskId}`;
      try {
        await setDoc(doc(db, "tasks", taskId), merged, { merge: true });
      } catch (err: any) {
        console.warn("[Firestore] setTask write failed:", err.message);
      }
    }
    return merged;
  },

  // ── SUBTASKS ──────────────────────────────────────────────────────────
  async getSubtasks(taskId: string): Promise<any[]> {
    const memSubtasks = Array.from(getMemoryCollection("subtasks").values()).filter(
      (s) => s.taskId === taskId,
    );
    if (!db) return memSubtasks;

    const path = `tasks/${taskId}/subtasks`;
    try {
      const snap = await getDocs(collection(db, "tasks", taskId, "subtasks"));
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data());
        for (const d of docs) getMemoryCollection("subtasks").set(d.id, d);
        return docs;
      }
    } catch (err: any) {
      console.warn("[Firestore] getSubtasks fallback:", err.message);
    }
    return memSubtasks;
  },

  async setSubtask(taskId: string, subtaskId: string, data: any): Promise<any> {
    const existing = getMemoryCollection("subtasks").get(subtaskId) || {};
    const merged = {
      ...existing,
      ...data,
      id: subtaskId,
      taskId,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || data.createdAt || new Date().toISOString(),
    };
    getMemoryCollection("subtasks").set(subtaskId, merged);

    if (db) {
      try {
        await setDoc(doc(db, "tasks", taskId, "subtasks", subtaskId), merged, { merge: true });
      } catch (err: any) {
        console.warn("[Firestore] setSubtask write failed:", err.message);
      }
    }
    return merged;
  },

  // ── AGENTS ────────────────────────────────────────────────────────────
  async getAgents(): Promise<any[]> {
    const memAgents = Array.from(getMemoryCollection("agents").values());
    if (!db) return memAgents;

    const path = "agents";
    try {
      const snap = await getDocs(collection(db, path));
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data());
        for (const a of list) getMemoryCollection("agents").set(a.id, a);
        return list;
      } else {
        // Seed initial agents to Firestore
        for (const a of memAgents) {
          setDoc(doc(db, path, a.id), a).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn("[Firestore] getAgents fallback:", err.message);
    }
    return memAgents;
  },

  // ── WALLETS ───────────────────────────────────────────────────────────
  async getWallet(id: string): Promise<any> {
    const cached = getMemoryCollection("wallets").get(id);
    if (cached) return cached;

    const fallback = {
      id,
      balance: 1000,
      type: id.includes("agent") ? "AGENT" : "MANAGER",
      algorandAddress: process.env.ALGOD_SENDER_ADDRESS || "PRVLKHVPVSMCNDO6PEWHOVWPR3JVBEQVAX4V2TCFN4RMCDC54R3FB34QMM",
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const snap = await getDoc(doc(db, "wallets", id));
        if (snap.exists()) {
          const val = snap.data();
          getMemoryCollection("wallets").set(id, val);
          return val;
        } else {
          setDoc(doc(db, "wallets", id), fallback).catch(() => {});
        }
      } catch (err: any) {
        console.warn("[Firestore] getWallet fallback:", err.message);
      }
    }
    getMemoryCollection("wallets").set(id, fallback);
    return fallback;
  },

  async updateWallet(id: string, data: any): Promise<any> {
    const current = await this.getWallet(id);
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    getMemoryCollection("wallets").set(id, updated);
    if (db) {
      setDoc(doc(db, "wallets", id), updated, { merge: true }).catch(() => {});
    }
    return updated;
  },

  // ── EVENTS ────────────────────────────────────────────────────────────
  async addEvent(event: any): Promise<any> {
    const id = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full = {
      ...event,
      id,
      createdAt: event.createdAt || new Date().toISOString(),
    };
    getMemoryCollection("events").set(id, full);

    if (db) {
      setDoc(doc(db, "events", id), full).catch(() => {});
    }
    return full;
  },

  async getEvents(taskId?: string): Promise<any[]> {
    const all = Array.from(getMemoryCollection("events").values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    if (taskId) return all.filter((e) => e.taskId === taskId);
    return all;
  },

  // ── TRANSACTIONS ──────────────────────────────────────────────────────
  async addTransaction(tx: any): Promise<any> {
    const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full = {
      ...tx,
      id,
      timestamp: tx.timestamp || new Date().toISOString(),
    };
    getMemoryCollection("transactions").set(id, full);

    if (db) {
      setDoc(doc(db, "transactions", id), full).catch(() => {});
    }
    return full;
  },

  async getTransactions(taskId?: string): Promise<any[]> {
    const all = Array.from(getMemoryCollection("transactions").values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    if (taskId) return all.filter((t) => t.taskId === taskId);
    return all;
  },
};
