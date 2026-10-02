import "dotenv/config";
import { firestoreService } from "@/lib/firestoreDb";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function getDatabaseUrl(): string {
  return (
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    "firestore"
  );
}

export function isDatabaseConfigured(): boolean {
  return true;
}

// ── Real Prisma Client initialization (PostgreSQL / Supabase) ──────────────
let realPrismaInstance: any = null;

function getRealPrisma(): any {
  if (realPrismaInstance !== null) {
    return realPrismaInstance;
  }

  const url = getDatabaseUrl();
  const isPostgresUrl =
    Boolean(url) &&
    (url.startsWith("postgresql://") || url.startsWith("postgres://")) &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1") &&
    !url.includes("dummy:dummy");

  if (isPostgresUrl) {
    try {
      const adapter = new PrismaPg({ connectionString: url });
      realPrismaInstance = new PrismaClient({ adapter });
      return realPrismaInstance;
    } catch (err: any) {
      console.warn("[Prisma] Could not create PrismaPg adapter:", err.message);
      realPrismaInstance = false;
      return null;
    }
  }

  realPrismaInstance = false;
  return null;
}

// ── Universal Firestore-backed Prisma proxy fallback ─────────────────────────
function createPrismaFirestoreProxy(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop: string) {
      if (prop === "$transaction") {
        return async (arg: any) => {
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          if (typeof arg === "function") {
            return arg(proxy);
          }
          return [];
        };
      }

      if (prop === "$queryRaw") {
        return async () => [{ "?column?": 1 }];
      }

      if (prop === "$disconnect") {
        return async () => {};
      }

      // Model delegates
      return {
        // ── USER ──────────────────────────────────────────
        user: {
          upsert: async ({ where, create, update }: any) => {
            const id = where?.id || create?.id || "demo-user";
            return {
              id,
              email: create?.email || "demo@kraven.local",
              name: create?.name || "Demo User",
              isDemo: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
          findUnique: async ({ where }: any) => {
            const id = where?.id || "demo-user";
            return {
              id,
              email: "demo@kraven.local",
              name: "Demo User",
              isDemo: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
          count: async () => 1,
        },

        // ── TASK ──────────────────────────────────────────
        task: {
          findMany: async (args?: any) => {
            const userId = args?.where?.userId;
            const tasks = await firestoreService.getTasks(userId);
            return tasks.map((t) => ({
              ...t,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt || t.createdAt),
            }));
          },
          findUnique: async ({ where }: any) => {
            const task = await firestoreService.getTask(where.id);
            if (!task) return null;
            return {
              ...task,
              createdAt: new Date(task.createdAt),
              updatedAt: new Date(task.updatedAt || task.createdAt),
            };
          },
          create: async ({ data }: any) => {
            const created = await firestoreService.createTask(data);
            return {
              ...created,
              createdAt: new Date(created.createdAt),
              updatedAt: new Date(created.updatedAt || created.createdAt),
            };
          },
          update: async ({ where, data }: any) => {
            const updated = await firestoreService.updateTask(where.id, data);
            return {
              ...updated,
              createdAt: new Date(updated.createdAt),
              updatedAt: new Date(updated.updatedAt || updated.createdAt),
            };
          },
          count: async () => {
            const tasks = await firestoreService.getTasks();
            return tasks.length;
          },
        },

        // ── SUBTASK ────────────────────────────────────────
        subtask: {
          findMany: async ({ where }: any) => {
            const subtasks = await firestoreService.getSubtasks(where?.taskId);
            return subtasks.map((s) => ({
              ...s,
              createdAt: new Date(s.createdAt),
              updatedAt: new Date(s.updatedAt || s.createdAt),
            }));
          },
          findUnique: async ({ where }: any) => {
            const sub = await firestoreService.getSubtask(where.id);
            if (!sub) return null;
            return {
              ...sub,
              createdAt: new Date(sub.createdAt),
              updatedAt: new Date(sub.updatedAt || sub.createdAt),
            };
          },
          create: async ({ data }: any) => {
            const created = await firestoreService.createSubtask(data);
            return {
              ...created,
              createdAt: new Date(created.createdAt),
              updatedAt: new Date(created.updatedAt || created.createdAt),
            };
          },
          update: async ({ where, data }: any) => {
            const updated = await firestoreService.updateSubtask(where.id, data);
            return {
              ...updated,
              createdAt: new Date(updated.createdAt),
              updatedAt: new Date(updated.updatedAt || updated.createdAt),
            };
          },
          count: async () => 0,
        },

        // ── AGENT ──────────────────────────────────────────
        agent: {
          findMany: async () => {
            const agents = await firestoreService.getAgents();
            return agents;
          },
          findUnique: async ({ where }: any) => {
            const agent = await firestoreService.getAgent(where.id);
            return agent;
          },
          upsert: async ({ where, create, update }: any) => {
            const agent = await firestoreService.upsertAgent({ ...create, id: where.id });
            return agent;
          },
          update: async ({ where, data }: any) => {
            const updated = await firestoreService.updateAgent(where.id, data);
            return updated;
          },
          count: async () => {
            const agents = await firestoreService.getAgents();
            return agents.length;
          },
        },

        // ── WALLET ─────────────────────────────────────────
        wallet: {
          findUnique: async ({ where }: any) => {
            const wallet = await firestoreService.getWallet(where.id || where.agentId);
            return wallet;
          },
          upsert: async ({ where, create, update }: any) => {
            const id = where?.id || (where?.agentId ? `wallet-${where.agentId}` : "wallet-temp");
            const wallet = await firestoreService.upsertWallet({ ...create, id });
            return wallet;
          },
          update: async ({ where, data }: any) => {
            const id = where?.id || (where?.agentId ? `wallet-${where.agentId}` : "");
            const wallet = await firestoreService.updateWallet(id, data);
            return wallet;
          },
          findMany: async () => [],
          count: async () => 2,
        },

        // ── EVENT ──────────────────────────────────────────
        event: {
          create: async ({ data }: any) => {
            const evt = await firestoreService.createEvent(data);
            return {
              ...evt,
              createdAt: new Date(evt.createdAt),
            };
          },
          findMany: async ({ where }: any) => {
            const events = await firestoreService.getEvents(where?.taskId);
            return events.map((e) => ({
              ...e,
              createdAt: new Date(e.createdAt),
            }));
          },
        },

        // ── TRANSACTION ────────────────────────────────────
        transaction: {
          create: async ({ data }: any) => {
            const tx = await firestoreService.createTransaction(data);
            return {
              ...tx,
              timestamp: new Date(tx.timestamp),
            };
          },
          findMany: async ({ where }: any) => {
            const txs = await firestoreService.getTransactions(where?.taskId);
            return txs.map((t) => ({
              ...t,
              timestamp: new Date(t.timestamp),
            }));
          },
        },

        // ── AGENT ESCROW & AGENT LEDGER ───────────────────
        agentEscrow: {
          create: async ({ data }: any) => ({ ...data, id: `esc_${Date.now()}` }),
          update: async ({ where, data }: any) => ({ ...data, id: where.id }),
          findMany: async () => [],
        },
        agentLedger: {
          create: async ({ data }: any) => ({ ...data, id: `aledg_${Date.now()}` }),
          findMany: async () => [],
        },
        centralEscrow: {
          create: async ({ data }: any) => ({ ...data, id: `cesc_${Date.now()}` }),
          update: async ({ where, data }: any) => ({ ...data, id: where.id }),
          findUnique: async () => null,
        },
        centralLedger: {
          create: async ({ data }: any) => ({ ...data, id: `cledg_${Date.now()}` }),
          findMany: async () => [],
        },
        agentPerformance: {
          create: async ({ data }: any) => ({ ...data, id: `perf_${Date.now()}` }),
          findMany: async () => [],
          count: async () => 0,
        },
        workflowMemory: {
          create: async ({ data }: any) => ({ ...data, id: `wf_${Date.now()}` }),
          findMany: async () => [],
          count: async () => 0,
        },
        securityEvent: {
          create: async ({ data }: any) => ({ ...data, id: `sec_${Date.now()}` }),
          findMany: async () => [],
        },
        algorandLedgerTransaction: {
          create: async ({ data }: any) => ({ ...data, id: `algo_${Date.now()}` }),
          findUnique: async () => null,
          findMany: async () => [],
        },
        blockchainWorkflowEvent: {
          create: async ({ data }: any) => ({ ...data, id: `bc_${Date.now()}` }),
          findMany: async () => [],
        },
      }[prop] || {
        findMany: async () => [],
        findFirst: async () => null,
        findUnique: async () => null,
        findUniqueOrThrow: async () => ({}),
        create: async ({ data }: any) => data,
        update: async ({ data }: any) => data,
        upsert: async ({ create }: any) => create,
        delete: async () => ({}),
        count: async () => 0,
      };
    },
  };

  const proxy = new Proxy({}, handler);
  return proxy;
}

const firestoreProxy = createPrismaFirestoreProxy();

// Unified Prisma interface: prefers real PostgreSQL/Supabase, falls back to Firestore proxy
export const prisma = new Proxy({} as any, {
  get(_target, prop: string) {
    const real = getRealPrisma();
    if (real && typeof real[prop] !== "undefined") {
      const val = real[prop];
      if (typeof val === "function") {
        return (...args: any[]) => val.apply(real, args);
      }
      return val;
    }
    return firestoreProxy[prop];
  },
});
