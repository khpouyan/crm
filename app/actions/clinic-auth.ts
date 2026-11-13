// app/actions/auth.ts
"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"; // مسیر فایل prisma client خود را جایگزین کنید
import {
  normalizeIranianPhone,
  isValidIranianMobile,
  sendOTPWithKavenegar,
} from "@/lib/kavenegar/kavenegar";
import {
  createSession,
  destroySession,
  getCurrentUser,
} from "@/lib/auth/session";

const OTP_EXPIRY_MINUTES = 2;
const MAX_OTP_ATTEMPTS = 5;

/**
 * ۱. ورود با شماره موبایل و رمز عبور
 */
export async function loginWithPasswordAction(rawPhone: string, password: string) {
  try {
    const phone = normalizeIranianPhone(rawPhone);

    if (!isValidIranianMobile(phone)) {
      return { success: false, error: "شماره موبایل وارد شده معتبر نیست." };
    }

    if (!password) {
      return { success: false, error: "لطفاً رمز عبور را وارد کنید." };
    }

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return { success: false, error: "شماره موبایل یا رمز عبور اشتباه است." };
    }

    // اگر کاربر قبلاً با OTP ثبت‌نام کرده اما رمز عبور تعیین نکرده باشد
    if (!user.password) {
      return {
        success: false,
        error: "برای این حساب رمز عبور تنظیم نشده است. لطفاً با رمز یک‌بار مصرف وارد شوید.",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "شماره موبایل یا رمز عبور اشتباه است." };
    }

    await createSession(user.id);
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "خطایی در فرآیند ورود رخ داد." };
  }
}

/**
 * ۲. ارسال کد ۶ رقمی OTP با کاوه‌نگار
 */
export async function sendOtpAction(rawPhone: string) {
  try {
    const phone = normalizeIranianPhone(rawPhone);

    if (!isValidIranianMobile(phone)) {
      return { success: false, error: "لطفاً یک شماره موبایل معتبر وارد کنید (مثال: 09123456789)." };
    }

    // جلوگیری از ارسال اسپم (اگر کد قبلی هنوز منقضی نشده باشد)
    const activeOtp = await prisma.otpVerification.findFirst({
      where: {
        phone,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeOtp) {
      const remainingSeconds = Math.ceil(
        (activeOtp.expiresAt.getTime() - Date.now()) / 1000
      );
      if (remainingSeconds > 0) {
        return {
          success: false,
          error: `کد تأیید قبلی هنوز معتبر است. لطفاً ${remainingSeconds} ثانیه صبر کنید.`,
        };
      }
    }

    // تولید کد تصادفی ۶ رقمی امن
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // پاک کردن کدهای منقضی‌شده قبلی این شماره
    await prisma.otpVerification.deleteMany({
      where: { phone },
    });

    // ذخیره کد در دیتابیس
    await prisma.otpVerification.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // ارسال پیامک از طریق کاوه‌نگار
    await sendOTPWithKavenegar({
      receptor: phone,
      token: code,
    });

    return { success: true };
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      success: false,
      error: "ارسال پیامک با خطا مواجه شد. لطفاً دقایقی دیگر تلاش کنید.",
    };
  }
}

/**
 * ۳. بررسی کد OTP و ایجاد سشن
 * اگر کاربر بار اول وارد شود یا پسورد نداشته باشد، needsPassword: true برمی‌گرداند
 */
export async function verifyOtpAction(rawPhone: string, code: string) {
  try {
    const phone = normalizeIranianPhone(rawPhone);
    const normalizedCode = normalizeIranianPhone(code); // تبدیل اعداد فارسی احتمالی

    if (!isValidIranianMobile(phone) || normalizedCode.length !== 6) {
      return { success: false, error: "اطلاعات وارد شده معتبر نیست." };
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return { success: false, error: "کد تأیید منقضی شده یا وجود ندارد. مجدداً درخواست دهید." };
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      return {
        success: false,
        error: "تعداد تلاش‌های ناموفق بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (otpRecord.code !== normalizedCode) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, error: "کد وارد شده صحیح نمی‌باشد." };
    }

    // کد صحیح است؛ حذف رکورد OTP
    await prisma.otpVerification.delete({
      where: { id: otpRecord.id },
    });

    // جستجو یا ایجاد کاربر در صورت ورود اول
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    let isFirstLoginOrNoPassword = false;

    if (!user) {
      user = await prisma.user.create({
        data: { phone },
      });
      isFirstLoginOrNoPassword = true;
    } else if (!user.password) {
      isFirstLoginOrNoPassword = true;
    }

    // ایجاد سشن ۷ روزه
    await createSession(user.id);

    return {
      success: true,
      needsPassword: isFirstLoginOrNoPassword,
    };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return { success: false, error: "خطا در بررسی کد تأیید." };
  }
}

/**
 * ۴. تنظیم رمز عبور برای کاربری که با OTP وارد شده است
 */
export async function setInitialPasswordAction(newPassword: string, confirmPassword: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "نشست شما منقضی شده است. لطفاً مجدداً وارد شوید." };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "رمز عبور باید حداقل ۶ کاراکتر باشد." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "رمز عبور و تکرار آن یکسان نیستند." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Set password error:", error);
    return { success: false, error: "خطا در ذخیره رمز عبور." };
  }
}

/**
 * ۵. خروج از حساب کاربری
 */
export async function logoutAction() {
  await destroySession();
  redirect("/clinic-dashboard"); // یا مسیر صفحه لاگین شما
}