import "dotenv/config";
import { isGeminiConfigured, geminiModel } from "../lib/manager/gemini";
import { isRealAlgorandConfigured } from "../lib/blockchain/algosdkClient";
import { isRealX402PayerConfigured, getX402PayToAddress } from "../lib/blockchain/x402Algorand";
import { isBrightDataConfigured } from "../lib/manager/webScraper";
import { firebaseConfigured } from "../lib/firebase";
import { generateText } from "ai";

async function main() {
  console.log("=== API Keys & Services Status ===");
  console.log("Gemini API Configured:", isGeminiConfigured());
  console.log("Algorand Client Configured:", isRealAlgorandConfigured());
  console.log("x402 Payer Configured:", isRealX402PayerConfigured());
  console.log("x402 PayTo Address:", getX402PayToAddress());
  console.log("Bright Data Scraping Browser Configured:", isBrightDataConfigured());
  console.log("Firebase Client Configured:", firebaseConfigured);

  console.log("\nTesting live Gemini API call...");
  try {
    const result = await generateText({
      model: geminiModel("economy"),
      prompt: "Respond with 'OK' and nothing else.",
    });
    console.log("✓ Gemini Live Call Success! Response:", result.text.trim());
  } catch (err: any) {
    console.error("✗ Gemini Live Call Error:", err.message);
  }
}

main();
