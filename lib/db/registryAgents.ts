import type { GeminiModelTier } from "@/lib/manager/gemini";

const TIER_PROFILE: Record<GeminiModelTier, { reputation: number; successRate: number; avgQuality: number; avgLatencyMs: number }> = {
  economy: { reputation: 76, successRate: 0.88, avgQuality: 81, avgLatencyMs: 5000 },
  standard: { reputation: 85, successRate: 0.93, avgQuality: 88, avgLatencyMs: 8000 },
  premium: { reputation: 93, successRate: 0.97, avgQuality: 95, avgLatencyMs: 14000 },
};

const TIER_PRICE: Record<GeminiModelTier, number> = { economy: 3, standard: 5, premium: 8 };

function tieredAgent(params: { id: string; name: string; capabilities: string[]; tier: GeminiModelTier; priceOverride?: number }) {
  const profile = TIER_PROFILE[params.tier];
  return {
    id: params.id,
    name: params.name,
    capabilities: params.capabilities,
    price: params.priceOverride ?? TIER_PRICE[params.tier],
    endpoint: `/agents/${params.capabilities[0]}`,
    model: params.tier,
    seedReputation: profile.reputation,
    seedSuccessRate: profile.successRate,
    seedAvgQuality: profile.avgQuality,
    seedAvgLatencyMs: profile.avgLatencyMs,
  };
}

export const REGISTRY_AGENTS: Array<{
  id: string;
  name: string;
  capabilities: string[];
  price: number;
  endpoint: string;
  model?: GeminiModelTier;
  seedReputation: number;
  seedSuccessRate: number;
  seedAvgQuality: number;
  seedAvgLatencyMs: number;
}> = [
  // market_research
  tieredAgent({ id: "researcher-01", name: "Atlas Researcher", capabilities: ["market_research", "data_extraction"], tier: "economy" }),
  tieredAgent({ id: "researcher-02", name: "Beacon Insights", capabilities: ["market_research", "financial_analysis"], tier: "premium" }),

  // financial_analysis
  tieredAgent({ id: "analyst-01", name: "Ledger Analyst", capabilities: ["financial_analysis", "data_extraction"], tier: "standard" }),
  tieredAgent({ id: "analyst-02", name: "Vantage Capital", capabilities: ["financial_analysis"], tier: "premium" }),

  // data_extraction
  tieredAgent({ id: "extractor-01", name: "Scraper Bot", capabilities: ["data_extraction"], tier: "economy" }),
  tieredAgent({ id: "extractor-02", name: "Harvest Extractor", capabilities: ["data_extraction", "summarization"], tier: "standard" }),

  // writing / report_generation
  tieredAgent({ id: "writer-01", name: "Writer", capabilities: ["writing", "report_generation"], tier: "economy" }),
  tieredAgent({ id: "writer-02", name: "Narrative Pro", capabilities: ["writing", "report_generation", "review"], tier: "standard" }),
  tieredAgent({ id: "writer-03", name: "Dossier Premium", capabilities: ["report_generation", "writing"], tier: "premium" }),

  // summarization
  tieredAgent({ id: "summarizer-01", name: "Summarizer", capabilities: ["summarization"], tier: "economy" }),
  tieredAgent({ id: "summarizer-02", name: "Digest Plus", capabilities: ["summarization", "review"], tier: "standard" }),

  // quality_verification / review
  tieredAgent({ id: "qa-01", name: "QA Sentinel", capabilities: ["quality_verification", "review"], tier: "standard" }),
  tieredAgent({ id: "qa-02", name: "Guardian Prime", capabilities: ["quality_verification", "review"], tier: "premium" }),
  tieredAgent({ id: "reviewer-01", name: "Reviewer Lite", capabilities: ["review"], tier: "economy" }),

  // [Local] deliberately weak agents
  {
    id: "local-fake-researcher",
    name: "[Local] Fake Research Bot",
    capabilities: ["market_research", "data_extraction"],
    price: 3,
    endpoint: "/agents/research",
    seedReputation: 70,
    seedSuccessRate: 0.85,
    seedAvgQuality: 80,
    seedAvgLatencyMs: 5000,
  },
  {
    id: "local-fake-analyst",
    name: "[Local] Fake Financial Bot",
    capabilities: ["financial_analysis"],
    price: 4,
    endpoint: "/agents/analyze",
    seedReputation: 72,
    seedSuccessRate: 0.88,
    seedAvgQuality: 82,
    seedAvgLatencyMs: 6000,
  },
  {
    id: "rogue-agent",
    name: "Rogue Agent",
    capabilities: ["market_research"],
    price: 1,
    endpoint: "/agents/rogue",
    seedReputation: 40,
    seedSuccessRate: 0.5,
    seedAvgQuality: 50,
    seedAvgLatencyMs: 3000,
  },
];
