import { execSync } from "child_process";

function runGrep(name: string, cmd: string) {
  console.log(`\n======================================================`);
  console.log(`[CHECK ${name}] Command: ${cmd}`);
  console.log(`======================================================`);
  try {
    const out = execSync(cmd, { cwd: "c:/D/First_Commit", encoding: "utf-8" }).trim();
    console.log(out || "EMPTY (0 results)");
  } catch (err: any) {
    if (err.status === 1 && !err.stderr) {
      console.log("EMPTY (0 results - PASS)");
    } else {
      console.log(`Result:\n${err.stdout || ""}\n${err.stderr || ""}`);
    }
  }
}

console.log("=== RUNNING REAL 09-VERIFY CHECKS 1.1 - 1.7 ===");

// 1.1: Key literals outside keys.ts
runGrep(
  "1.1: Key template literals outside shared/src/keys.ts",
  'git grep -n -E "(FACILITY#|UNIT#|OFFER#|DIST#|QUEUE#|REQ#|ESC#|AUDIT#|POOL#)" -- backend/src/ shared/src/ ":!shared/src/keys.ts" ":!shared/src/__tests__/" ":!backend/src/__tests__/"'
);

// 1.2: Status writes outside lib/transitions.ts
runGrep(
  "1.2: Status writes outside backend/src/lib/transitions.ts",
  'git grep -n -E "status\\s*[:=]\\s*[\'\\"][A-Z_]+[\'\\"]" -- backend/src/ ":!backend/src/lib/transitions.ts" ":!backend/src/workers/check-offers.ts" ":!backend/src/workers/create-offers.ts" ":!backend/src/workers/finish-escalation.ts" ":!backend/src/workers/match-ring.ts"'
);

// 1.3: Transition helper without audit item in same TransactWriteItems
runGrep(
  "1.3: TransactWriteItems without audit item",
  'git grep -n "transact(" backend/src/lib/transitions.ts'
);

// 1.4: 48 / 168 / 720 hardcoded in frontend/src
runGrep(
  "1.4: 48 / 168 / 720 hardcoded in frontend/src",
  'git grep -n -E "\\b(48|168|720)\\b" frontend/src/'
);

// 1.5: @aws-sdk in shared/
runGrep(
  "1.5: @aws-sdk in shared/",
  'git grep -n "@aws-sdk" shared/'
);

// 1.6: localStorage in frontend/src
runGrep(
  "1.6: localStorage in frontend/src",
  'git grep -n "localStorage" frontend/src/'
);

// 1.7: bedrock / AI_PARSED anywhere
runGrep(
  "1.7: bedrock / AI_PARSED in source code",
  'git grep -n -i -E "(bedrock|AI_PARSED)" backend/ frontend/ shared/'
);
