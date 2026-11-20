// app/clinic-dashboard/(auth)/login/clinic-auth.ts
"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendOTPWithKavenegar } from "@/lib/kavenegar/kavenegar";
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  createSession,
  destroySession,
  getCurrentUser,
} from "@/lib/auth/session";

const OTP_EXPIRY_MINUTES = 2;
const MAX_OTP_ATTEMPTS = 5;

/**
 * تولید و ارسال کد OTP با محدودیت ضد اسپم
 */
async function dispatchOtpCode(phone: string) {
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
        success: false as const,
        error: `کد تأیید قبلی هنوز معتبر است. لطفاً ${remainingSeconds} ثانیه صبر کنید.`,
      };
    }
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.deleteMany({
    where: { phone },
  });

  await prisma.otpVerification.create({
    data: {
      phone,
      code,
      expiresAt,
    },
  });

  await sendOTPWithKavenegar({
    receptor: phone,
    token: code,
  });

  return { success: true as const };
}

/**
 * بررسی وضعیت عضویت پرسنلی کاربر در کلینیک‌ها
 */
async function inspectClinicMembership(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      clinicUsers: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!user || user.clinicUsers.length === 0) {
    return { status: "NOT_REGISTERED" as const, user };
  }

  const activeLoginMembership = user.clinicUsers.find(
    (cu) => cu.isActive && cu.canLogin
  );

  if (!activeLoginMembership) {
    return {
      status: "DISABLED" as const,
      error:
        "دسترسی ورود شما به پنل کلینیک غیرفعال شده است. با مدیر کلینیک تماس بگیرید.",
    };
  }

  return {
    status: "ELIGIBLE" as const,
    user,
  };
}

/**
 * ۱. ورود با شماره موبایل و رمز عبور
 */
export async function loginWithPasswordAction(
  rawPhone: string,
  password: string
) {
  try {
    const phone = normalizeIranPhone(rawPhone);

    if (!isValidIranPhone(phone)) {
      return { success: false, error: "شماره موبایل وارد شده معتبر نیست." };
    }

    if (!password) {
      return { success: false, error: "لطفاً رمز عبور را وارد کنید." };
    }

    const membership = await inspectClinicMembership(phone);
    if (membership.status === "NOT_REGISTERED") {
      return {
        success: false,
        error:
          "حساب کلینیکی با این شماره یافت نشد. می‌توانید از گزینه «ثبت‌نام مرکز جدید» استفاده کنید.",
      };
    }
    if (membership.status === "DISABLED") {
      return { success: false, error: membership.error };
    }

    const { user } = membership;

    if (!user.password) {
      return {
        success: false,
        error:
          "برای این حساب رمز عبور تنظیم نشده است. لطفاً با رمز یک‌بار مصرف وارد شوید.",
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
 * ۲. ارسال کد ۶ رقمی OTP در صفحه ورود
 * اگر شماره در کلینیک ثبت نشده باشد، به‌جای خطا کد تأیید را می‌فرستد و کاربر را به صفحه ثبت‌نام هدایت می‌کند
 */
export async function sendOtpAction(rawPhone: string) {
  try {
    const phone = normalizeIranPhone(rawPhone);

    if (!isValidIranPhone(phone)) {
      return {
        success: false,
        error: "لطفاً یک شماره موبایل معتبر وارد کنید (مثال: 09123456789).",
      };
    }

    const membership = await inspectClinicMembership(phone);
    if (membership.status === "DISABLED") {
      return { success: false, error: membership.error };
    }

    const otpRes = await dispatchOtpCode(phone);
    if (!otpRes.success) {
      return { success: false, error: otpRes.error };
    }

    if (membership.status === "NOT_REGISTERED") {
      return {
        success: true,
        redirectToRegister: true,
      };
    }

    return {
      success: true,
      redirectToRegister: false,
    };
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      success: false,
      error: "ارسال پیامک با خطا مواجه شد. لطفاً دقایقی دیگر تلاش کنید.",
    };
  }
}

/**
 * ۳. بررسی کد OTP و ایجاد سشن در صفحه ورود
 */
export async function verifyOtpAction(rawPhone: string, code: string) {
  try {
    const phone = normalizeIranPhone(rawPhone);
    const normalizedCode = normalizePersianDigits(code).trim();

    if (!isValidIranPhone(phone) || normalizedCode.length !== 6) {
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
      return {
        success: false,
        error: "کد تأیید منقضی شده یا وجود ندارد. مجدداً درخواست دهید.",
      };
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      return {
        success: false,
        error:
          "تعداد تلاش‌های ناموفق بیش از حد مجاز بود. لطفاً کد جدید دریافت کنید.",
      };
    }

    if (otpRecord.code !== normalizedCode) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, error: "کد وارد شده صحیح نمی‌باشد." };
    }

    await prisma.otpVerification.delete({
      where: { id: otpRecord.id },
    });

    const membership = await inspectClinicMembership(phone);
    if (membership.status === "NOT_REGISTERED") {
      return {
        success: false,
        redirectToRegister: true,
        error: "حسابی با این شماره وجود ندارد. لطفاً ثبت‌نام را تکمیل کنید.",
      };
    }
    if (membership.status === "DISABLED") {
      return { success: false, error: membership.error };
    }

    const { user } = membership;
    const needsPassword = !user.password;

    await createSession(user.id);

    return {
      success: true,
      needsPassword,
    };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return { success: false, error: "خطا در بررسی کد تأیید." };
  }
}

/**
 * ۴. ارسال کد OTP در فرم ثبت‌نام مرکز جدید
 */
export async function sendRegistrationOtpAction(input: {
  fullName: string;
  clinicName: string;
  phone: string;
}) {
  try {
    const fullName = input.fullName?.trim();
    const clinicName = input.clinicName?.trim();
    const phone = normalizeIranPhone(input.phone || "");

    if (!fullName || fullName.length < 2) {
      return {
        success: false,
        error: "لطفاً نام و نام خانوادگی خود را وارد کنید.",
      };
    }

    if (!clinicName || clinicName.length < 2) {
      return {
        success: false,
        error: "لطفاً نام کلینیک یا مرکز را وارد کنید.",
      };
    }

    if (!isValidIranPhone(phone)) {
      return {
        success: false,
        error: "لطفاً یک شماره موبایل معتبر وارد کنید (مثال: 09123456789).",
      };
    }

    const membership = await inspectClinicMembership(phone);
    if (membership.status !== "NOT_REGISTERED") {
      return {
        success: false,
        alreadyExists: true,
        error:
          "این شماره موبایل قبلاً در سیستم ثبت شده است. لطفاً از صفحه ورود وارد شوید.",
      };
    }

    const otpRes = await dispatchOtpCode(phone);
    if (!otpRes.success) {
      return { success: false, error: otpRes.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Send Registration OTP error:", error);
    return {
      success: false,
      error: "خطا در ارسال کد تأیید. لطفاً مجدداً تلاش کنید.",
    };
  }
}

/**
 * ۵. تأیید کد OTP و ساخت کامل کلینیک + مالک + نقش پیش‌فرض + سشن
 */
export async function completeClinicRegistrationAction(input: {
  fullName: string;
  clinicName: string;
  phone: string;
  code: string;
}) {
  try {
    const fullName = input.fullName?.trim();
    const clinicName = input.clinicName?.trim();
    const phone = normalizeIranPhone(input.phone || "");
    const normalizedCode = normalizePersianDigits(input.code || "").trim();

    if (!fullName || !clinicName || !isValidIranPhone(phone)) {
      return { success: false, error: "اطلاعات ثبت‌نام کامل نیست." };
    }

    if (normalizedCode.length !== 6) {
      return { success: false, error: "کد تأیید باید ۶ رقم باشد." };
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return {
        success: false,
        error: "کد تأیید منقضی شده یا وجود ندارد. مجدداً درخواست دهید.",
      };
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      return {
        success: false,
        error: "تعداد تلاش‌های ناموفق بیش از حد مجاز بود. کد جدید دریافت کنید.",
      };
    }

    if (otpRecord.code !== normalizedCode) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return { success: false, error: "کد وارد شده صحیح نمی‌باشد." };
    }

    const membership = await inspectClinicMembership(phone);
    if (membership.status !== "NOT_REGISTERED") {
      return {
        success: false,
        error: "این شماره موبایل قبلاً در یک مرکز ثبت شده است.",
      };
    }

    // تولید ساب‌دامین یکتا
    let subdomain = `clinic-${crypto.randomBytes(3).toString("hex")}`;
    const existingSub = await prisma.clinic.findUnique({
      where: { subdomain },
    });
    if (existingSub) {
      subdomain = `clinic-${Date.now().toString(36)}`;
    }

    const createdUserId = await prisma.$transaction(async (tx) => {
      await tx.otpVerification.delete({
        where: { id: otpRecord.id },
      });

      // اگر کاربر قبلاً به عنوان مراجع در کلینیک دیگری بوده، اطلاعاتش به‌روزرسانی می‌شود
      const user = await tx.user.upsert({
        where: { phone },
        update: {
          fullName,
        },
        create: {
          phone,
          fullName,
        },
      });

      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          subdomain,
          currentPlan: "FREE",
          smsBalance: 50,
          smsSetting: {
            create: {},
          },
        },
      });

      const ownerRole = await tx.clinicRole.create({
        data: {
          clinicId: clinic.id,
          name: "مدیر کلینیک",
          permissions: [],
        },
      });

      await tx.clinicUser.create({
        data: {
          userId: user.id,
          clinicId: clinic.id,
          roleId: ownerRole.id,
          jobTitle: "مدیر و مؤسس مرکز",
          isOwner: true,
          isActive: true,
          canLogin: true,
          canBeTherapist: false,
          canBeAssistant: false,
          canBeReferrer: true,
          hasAllServicesAccess: true,
        },
      });

      return user.id;
    });

    await createSession(createdUserId);

    return { success: true };
  } catch (error) {
    console.error("Complete registration error:", error);
    return {
      success: false,
      error: "خطایی در ثبت‌نام مرکز رخ داد. لطفاً مجدداً تلاش کنید.",
    };
  }
}

/**
 * ۶. تنظیم رمز عبور برای پرسنلی که بدون پسورد و با OTP وارد شده است
 */
export async function setInitialPasswordAction(
  newPassword: string,
  confirmPassword: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "نشست شما منقضی شده است. لطفاً مجدداً وارد شوید.",
      };
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
 * ۷. خروج از حساب کاربری
 */
export async function logoutAction() {
  await destroySession();
  redirect("/clinic-dashboard/login");
}