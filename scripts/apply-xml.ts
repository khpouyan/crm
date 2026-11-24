import fs from "node:fs";
import path from "node:path";

const xmlFilePath = process.argv[2] || "patch.xml";

if (!fs.existsSync(xmlFilePath)) {
  console.error(`❌ فایل پیدا نشد: ${xmlFilePath}`);
  process.exit(1);
}

const rawContent = fs.readFileSync(xmlFilePath, "utf-8");

// پشتیبانی از هر دو فرمت <file path="...">...</file> و CDATA
const fileRegex = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/g;

let match: RegExpExecArray | null;
let count = 0;

const backupDir = path.join(
  ".apply-backups",
  new Date().toISOString().replace(/[:.]/g, "-")
);

while ((match = fileRegex.exec(rawContent)) !== null) {
  const relativePath = match[1].trim();
  let fileContent = match[2];

  // حذف تگ CDATA در صورت وجود
  fileContent = fileContent.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");

  // حذف خط خالی اول و آخر داخل تگ XML
  fileContent = fileContent.replace(/^\r?\n/, "").replace(/\r?\n\s*$/, "\n");

  const targetPath = path.resolve(process.cwd(), relativePath);

  // جلوگیری از نوشتن بیرون از ریشه پروژه
  if (!targetPath.startsWith(process.cwd())) {
    console.warn(`⚠️ مسیر نامعتبر رد شد: ${relativePath}`);
    continue;
  }

  // گرفتن بکاپ در صورت وجود فایل قبلی
  if (fs.existsSync(targetPath)) {
    const backupTarget = path.join(backupDir, relativePath);
    fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
    fs.copyFileSync(targetPath, backupTarget);
  }

  // ساخت پوشه‌های والد در صورت نبودن و نوشتن فایل
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, fileContent, "utf-8");

  console.log(`✅ اعمال شد: ${relativePath}`);
  count++;
}

if (count === 0) {
  console.warn("⚠️ هیچ تگ <file path=\"...\"> در فایل پیدا نشد.");
} else {
  console.log(`\n🎉 مجموعاً ${count} فایل با موفقیت در پروژه اعمال شد.`);
  if (fs.existsSync(backupDir)) {
    console.log(`📦 نسخه پشتیبان فایل‌های قبلی ذخیره شد در: ${backupDir}`);
  }
}