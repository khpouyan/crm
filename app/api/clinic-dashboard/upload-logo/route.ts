// app/api/clinic-dashboard/upload-logo/route.ts
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: "نشست کاربری معتبر نیست." },
        { status: 401 }
      );
    }

    const canManage =
      ctx.clinicUser.isOwner ||
      hasPermission(ctx.clinicUser, "management.settings");

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "شما مجوز تغییر اطلاعات کلینیک را ندارید." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "فایل لوگو انتخاب نشده است." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "فرمت تصویر مجاز نیست (فقط PNG، JPG، WebP یا SVG).",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "حجم فایل لوگو نباید بیشتر از ۲ مگابایت باشد.",
        },
        { status: 400 }
      );
    }

    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = extMap[file.type] || "png";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "clinics");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${ctx.clinicId}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/clinics/${fileName}`,
    });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در آپلود تصویر لوگو." },
      { status: 500 }
    );
  }
}