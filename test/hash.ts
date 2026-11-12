// hash-password.mjs
import crypto from "crypto";

// رمزی که می‌خواهید هش شود را اینجا بنویسید:
const plainPassword = "@$Po2224332";

function hashPassword(password:string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const hashedPassword = hashPassword(plainPassword);

console.log("\n=================================");
console.log("Plain Password :", plainPassword);
console.log("Hashed Password:", hashedPassword);
console.log("=================================\n");