import { resetTable } from "./reset.js";
import { loadSeedData } from "./load.js";

async function main() {
  console.log("=========================================");
  console.log("  PulseChain Demo Environment Staging    ");
  console.log("=========================================");
  await resetTable();
  await loadSeedData();
  console.log("=========================================");
  console.log("  Demo environment ready for live test!  ");
  console.log("=========================================");
}

main().catch((err) => {
  console.error("[Staging Error]", err);
  process.exit(1);
});
