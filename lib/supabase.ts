import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ynenzdbhwiamxsmpttpb.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZW56ZGJod2lhbXhzbXB0dHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMDAwMDAsImV4cCI6MjA1NTYwMDAwMH0.dummy";

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseService = {
  async getTasks(userId?: string) {
    let query = supabase.from("Task").select("*").order("createdAt", { ascending: false }).limit(50);
    if (userId) {
      query = query.in("userId", [userId, "demo-user"]);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("[Supabase] getTasks error:", error.message);
      return [];
    }
    return data || [];
  },

  async getTask(taskId: string) {
    const { data, error } = await supabase.from("Task").select("*").eq("id", taskId).single();
    if (error) return null;
    return data;
  },

  async createTask(data: any) {
    const { data: created, error } = await supabase.from("Task").insert([data]).select().single();
    if (error) {
      console.error("[Supabase] createTask error:", error.message);
      throw error;
    }
    return created;
  },

  async updateTask(taskId: string, data: any) {
    const { data: updated, error } = await supabase.from("Task").update(data).eq("id", taskId).select().single();
    if (error) {
      console.error("[Supabase] updateTask error:", error.message);
      throw error;
    }
    return updated;
  },

  async getSubtasks(taskId: string) {
    const { data, error } = await supabase.from("Subtask").select("*").eq("taskId", taskId);
    if (error) return [];
    return data || [];
  },

  async createSubtask(data: any) {
    const { data: created, error } = await supabase.from("Subtask").insert([data]).select().single();
    if (error) throw error;
    return created;
  },

  async updateSubtask(subtaskId: string, data: any) {
    const { data: updated, error } = await supabase.from("Subtask").update(data).eq("id", subtaskId).select().single();
    if (error) throw error;
    return updated;
  },

  async getAgents() {
    const { data, error } = await supabase.from("Agent").select("*");
    if (error) return [];
    return data || [];
  },

  async getAgent(id: string) {
    const { data, error } = await supabase.from("Agent").select("*").eq("id", id).single();
    if (error) return null;
    return data;
  },

  async upsertAgent(data: any) {
    const { data: upserted, error } = await supabase.from("Agent").upsert([data]).select().single();
    if (error) throw error;
    return upserted;
  },

  async updateAgent(id: string, data: any) {
    const { data: updated, error } = await supabase.from("Agent").update(data).eq("id", id).select().single();
    if (error) throw error;
    return updated;
  },

  async getWallet(id: string) {
    const { data, error } = await supabase.from("Wallet").select("*").eq("id", id).single();
    if (error) {
      return {
        id,
        balance: 1000,
        type: id.includes("agent") ? "AGENT" : "MANAGER",
        algorandAddress: process.env.ALGOD_SENDER_ADDRESS || "PRVLKHVPVSMCNDO6PEWHOVWPR3JVBEQVAX4V2TCFN4RMCDC54R3FB34QMM",
      };
    }
    return data;
  },

  async updateWallet(id: string, data: any) {
    const { data: updated, error } = await supabase.from("Wallet").update(data).eq("id", id).select().single();
    if (error) {
      const { data: upserted } = await supabase.from("Wallet").upsert([{ id, ...data }]).select().single();
      return upserted;
    }
    return updated;
  },

  async upsertWallet(data: any) {
    const { data: upserted, error } = await supabase.from("Wallet").upsert([data]).select().single();
    if (error) throw error;
    return upserted;
  },

  async createEvent(data: any) {
    const { data: created, error } = await supabase.from("Event").insert([data]).select().single();
    if (error) throw error;
    return created;
  },

  async getEvents(taskId?: string) {
    let query = supabase.from("Event").select("*").order("createdAt", { ascending: true });
    if (taskId) query = query.eq("taskId", taskId);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  async createTransaction(data: any) {
    const { data: created, error } = await supabase.from("CentralLedger").insert([data]).select().single();
    if (error) throw error;
    return created;
  },

  async getTransactions(taskId?: string) {
    let query = supabase.from("CentralLedger").select("*").order("timestamp", { ascending: false });
    if (taskId) query = query.eq("taskId", taskId);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },
};
