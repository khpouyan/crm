// app/actions/auth.ts
"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendOTPWithKavenegar, toKavenegarReceptor } from "@/lib/kavenegar/kavenegar";

const OTP_EXPIRY_SECONDS = 120;
const MAX_ATTEMPTS = 5;

// ۱. ارسال OTP
export async function sendOtpAction(rawPhone: string) {
  const phone = toKavenegarReceptor(rawPhone);

  if (!/^09\d{9}$/.test(phone)) {
    return { success: false, error: "شماره موبایل وارد شده معتبر نیست." };
  }

  // جلوگیری از ارسال متوالی اسپم
  const activeOtp = await prisma.otpVerification.findFirst({
    where: {
      phone,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeOtp && Date.now() - activeOtp.createdAt.getTime() < 60 * 1000) {
    return { success: false, error: "لطفاً ۱ دقیقه قبل از درخواست مجدد صبر کنید." };
  }

  // تولید کد ۶ رقمی مطابق با UI
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  // پاک کردن کدهای پیشین شماره و ایجاد کد جدید
  await prisma.otpVerification.deleteMany({ where: { phone } });
  await prisma.otpVerification.create({
    data: {
      phone,
      code,
      expiresAt,
    },
  });

  try {
    await sendOTPWithKavenegar({
      receptor: phone,
      token: code,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Kavenegar Error:", error);
    return { success: false, error: "خطا در برقراری ارتباط با سامانه پیامکی." };
  }
}

// ۲. تایید OTP و ورود یا ثبت‌نام
export async function verifyOtpAction(rawPhone: string, code: string) {
  const phone = toKavenegarReceptor(rawPhone);

  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { success: false, error: "کد تأیید منقضی شده یا درخواستی یافت نشد." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpVerification.deleteMany({ where: { phone } });
    return { success: false, error: "تعداد تلاش‌های ناموفق بیش از حد مجاز بود. کد جدید دریافت کنید." };
  }

  if (record.code !== code.trim()) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: "کد وارد شده صحیح نمی‌باشد." };
  }

  // حذف رکورد مصرف‌شده
  await prisma.otpVerification.deleteMany({ where: { phone } });

  // ورود یا ثبت‌نام کاربر در دیتابیس
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  // صدور نشست ورود (Session)
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return { success: true };
}

// ۳. ورود با کلمه عبور
export async function loginWithPasswordAction(rawPhone: string, password: string) {
  const phone = toKavenegarReceptor(rawPhone);

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user || !user.password) {
    return { success: false, error: "کاربری با این مشخصات یافت نشد یا رمز عبور تعریف نشده است." };
  }

  // مقایسه پسورد هش شده (با استفاده از crypto یا bcrypt)
  const [salt, storedHash] = user.password.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");

  if (testHash !== storedHash) {
    return { success: false, error: "شماره موبایل یا رمز عبور اشتباه است." };
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return { success: true };
}