// app/actions/admin-auth.ts
"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { toKavenegarReceptor } from "@/lib/kavenegar/kavenegar";

export async function loginSuperAdminAction(rawPhone: string, passwordPlain: string) {
  const phone = toKavenegarReceptor(rawPhone);

  if (!phone || !passwordPlain) {
    return { success: false, error: "شماره موبایل و رمز عبور الزامی است." };
  }

  // ۱. دریافت کاربر به همراه رابطه جدول SystemAdmin
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      systemAdmins: true,
    },
  });

  // ۲. بررسی وجود کاربر و رمز عبور
  if (!user || !user.password) {
    return { success: false, error: "اطلاعات ورود نامعتبر است." };
  }

  // ۳. بررسی دسترسی: حتماً باید رکوردی در جدول SystemAdmin وجود داشته باشد
  if (!user.systemAdmins || user.systemAdmins.length === 0) {
    return { success: false, error: "دسترسی غیرمجاز: حساب کاربری شما سوپرادمین نیست." };
  }

  // ۴. مقایسه رمز عبور
  // اگر از هش استاندارد salt:hash با scrypt استفاده کرده‌اید:
  const isSaltedHash = user.password.includes(":");
  let isPasswordValid = false;

  if (isSaltedHash) {
    const [salt, storedHash] = user.password.split(":");
    const computedHash = crypto.scryptSync(passwordPlain, salt, 64).toString("hex");
    isPasswordValid = crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(storedHash, "hex"));
  } else {
    // در صورتی که رمز موقتاً خام ذخیره شده باشد (جهت تست‌های اولیه)
    isPasswordValid = user.password === passwordPlain;
  }

  if (!isPasswordValid) {
    return { success: false, error: "شماره موبایل یا رمز عبور اشتباه است." };
  }

  // ۵. صدور سشن اختصاصی
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // اعتبار ۷ روزه

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  // ۶. ذخیره توکن در کوکی اختصاصی یا سراسری
  const cookieStore = await cookies();
  cookieStore.set("admin_session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return { success: true };
}