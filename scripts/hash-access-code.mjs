import crypto from "crypto";

const code = process.argv[2];

if (!code) {
  console.error("Usage: node scripts/hash-access-code.mjs <access-code>");
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(code.trim()).digest("hex");
console.log(hash);
