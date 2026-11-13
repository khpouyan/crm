// hash.mjs
import bcrypt from "bcryptjs";

// رمز عبور دلخواه خود را اینجا بنویسید یا از ترمینال پاس بدهید
const password = process.argv[2] || "@$Nn1373";

const hashedPassword = bcrypt.hashSync(password, 12);

console.log("\n🔑 رمز خام:", password);
console.log("🔒 هش آماده برای دیتابیس:\n");
console.log(hashedPassword);
console.log("");