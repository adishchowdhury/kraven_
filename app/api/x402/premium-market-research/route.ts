export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getX402ResourceServer, X402_ALGORAND_NETWORK, getX402PayToAddress } from "@/lib/blockchain/x402Algorand";

const RESOURCE_PATH = "/api/x402/premium-market-research";

/**
 * Real, x402-protocol-compliant premium resource: GET is protected by
 * withX402 (from the official @x402/next package), which returns a proper
 * HTTP 402 with payment requirements when unpaid, verifies the caller's
 * signed Algorand USDC payment (AVM "exact" scheme) against the configured
 * facilitator, and only then invokes this handler. Settlement (the actual
 * on-chain submission) happens after this handler returns a successful
 * response, and only then.
 *
 * Query params are used instead of a JSON body because the x402 SDK may
 * consume the request body while parsing payment context before this
 * handler runs.
 */
async function handler(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") || "fintech market";
  const depth = request.nextUrl.searchParams.get("depth") || "premium";

  const premiumData = {
    query,
    depth,
    timestamp: new Date().toISOString(),
    source: "Premium ALGORAND-Paid x402 Service (real settlement)",
    paymentVerified: true,
    result: `## Comprehensive Market Intelligence Report: "${query}"\n\n### Executive Summary\nThe market landscape for ${query} is experiencing rapid technological evolution and capital deployment. Major growth catalysts include regulatory clarity, widespread adoption of zero-knowledge smart contracts, autonomous agentic commerce, and accelerated expansion of decentralized micro-escrow frameworks.\n\n### Key Market Dynamics & Metrics\n- **Projected 5-Year CAGR**: 28.4% growth driven by enterprise automation.\n- **Key Value Drivers**: Programmatic micropayments, on-chain cryptographic settlement verification, and zero-trust dispute mediation.\n- **Primary Headwinds**: Cross-chain latency and fragmented liquidity bridges.\n\n### Strategic Takeaways\nOrganizations adopting autonomous micro-transaction protocols report an average 34% reduction in intermediary settlement friction and enhanced counterparty trust.`,
  };

  return NextResponse.json(premiumData);
}

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      payTo: getX402PayToAddress(),
      price: "$0.01",
      network: X402_ALGORAND_NETWORK,
    },
    resource: RESOURCE_PATH,
    description: "Premium Market Intelligence Service",
    mimeType: "application/json",
  },
  getX402ResourceServer(),
);

export const OPTIONS = GET;
