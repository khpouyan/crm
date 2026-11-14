// lib/auth/session.ts
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "clinic_session_token";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // ۷ روز به میلی‌ثانیه

/**
 * ایجاد سشن جدید در دیتابیس و ست کردن کوکی ۷ روزه
 */
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

/**
 * دریافت اطلاعات کاربر لاگین‌شده از روی کوکی و دیتابیس
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          clinicUsers: {
            where: { deletedAt: null }, // نادیده گرفتن سوابق حذف نرم‌شده
            include: {
              clinic: true,
              role: true,
              assignedServices: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  // بررسی انقضای سشن ۷ روزه
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session.user;
}

/**
 * حذف سشن از دیتابیس و پاک کردن کوکی (خروج از حساب)
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * دریافت کلینیک فعال کاربر لاگین‌شده (با بررسی فعال بودن، عدم حذف و مجوز ورود به پنل)
 */
export async function getCurrentClinicContext() {
  const user = await getCurrentUser();
  if (!user) return null;

  // پیدا کردن اولین کلینیکی که کاربر در آن عضویت فعال دارد و اجازه ورود به پنل دارد
  const activeMembership = user.clinicUsers.find(
    (cu) => cu.isActive && cu.canLogin && !cu.deletedAt
  );

  if (!activeMembership) return null;

  return {
    userId: user.id,
    fullName: user.fullName,
    phone: user.phone,
    clinicId: activeMembership.clinicId,
    clinicUserId: activeMembership.id,
    clinic: activeMembership.clinic,
    role: activeMembership.role,
    clinicUser: activeMembership, // شامل isOwner، permissions، jobTitle و دسترسی خدمات
  };
}