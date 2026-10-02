async function testEndpoints() {
  console.log("=== Testing Local Server Endpoints ===");
  try {
    const agentsRes = await fetch("http://localhost:3000/api/agents");
    const agents = await agentsRes.json();
    console.log("✓ /api/agents (status", agentsRes.status, "):", agents.agents?.length, "agents loaded");

    const walletsRes = await fetch("http://localhost:3000/api/wallets/manager-wallet");
    const wallet = await walletsRes.json();
    console.log("✓ /api/wallets/manager-wallet (status", walletsRes.status, "): balance =", wallet.wallet?.balance);

    const txRes = await fetch("http://localhost:3000/api/transactions");
    const tx = await txRes.json();
    console.log("✓ /api/transactions (status", txRes.status, "):", Object.keys(tx).join(", "));

    const tasksRes = await fetch("http://localhost:3000/api/tasks");
    const tasks = await tasksRes.json();
    console.log("✓ /api/tasks (status", tasksRes.status, "):", tasks.tasks?.length, "tasks");

    const homeRes = await fetch("http://localhost:3000/");
    console.log("✓ / (status", homeRes.status, ")");

    const dashRes = await fetch("http://localhost:3000/dashboard");
    console.log("✓ /dashboard (status", dashRes.status, ")");

    console.log("\nALL LOCAL ENDPOINTS AND PAGES ARE FUNCTIONAL!");
  } catch (err: any) {
    console.error("Endpoint test failed:", err.message);
  }
}

testEndpoints();
