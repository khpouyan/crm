"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getCurrentClinicContext } from "@/lib/auth/session"
import { ALL_PERMISSION_KEYS, PermissionKey } from "@/lib/permissions"
import {
  normalizeIranianPhone,
  isValidIranianMobile,
} from "@/lib/kavenegar/kavenegar"
// تابع کمکی برای بررسی مجوز مدیریت پرسنل و دریافت سقف پلن
async function requireStaffManagementContext() {
  const ctx = await getCurrentClinicContext()

  if (!ctx) {
    throw new Error("نشست کاربری معتبر نیست یا دسترسی شما غیرفعال شده است.")
  }

  const { clinicUser, clinic } = ctx

  if (
    !clinicUser.isOwner &&
    !clinicUser.permissions.includes("management.settings")
  ) {
    throw new Error("شما مجوز مدیریت پرسنل و تنظیمات را ندارید.")
  }

  const [activeSub, plan] = await Promise.all([
    prisma.clinicSubscription.findFirst({
      where: { clinicId: clinic.id, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.subscriptionPlan.findUnique({
      where: { tier: clinic.currentPlan },
    }),
  ])

  const maxStaff = activeSub?.plan.maxStaff ?? plan?.maxStaff ?? 5

  return {
    ...ctx,
    maxStaff,
  }
}

// 1. دریافت داده‌های اولیه صفحه مدیریت پرسنل
export async function getStaffsPageData() {
  const { clinicId, clinic, maxStaff } = await requireStaffManagementContext()

  const [staffs, services] = await Promise.all([
    prisma.clinicUser.findMany({
      where: {
        clinicId,
        deletedAt: null, // پرسنل حذف‌شده نمایش داده نمی‌شوند ولی در دیتابیس می‌مانند
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        assignedServices: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
    }),
    prisma.service.findMany({
      where: { clinicId },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: "asc" },
    }),
  ])

  return {
    staffs,
    services,
    maxStaff,
    clinicName: clinic.name,
  }
}

export interface UpsertStaffInput {
  clinicUserId?: string
  fullName: string
  phone: string
  password?: string
  jobTitle: string
  personnelCode?: string
  specialty?: string
  avatarUrl?: string
  stampUrl?: string
  canLogin: boolean
  canBeTherapist: boolean
  canBeAssistant: boolean
  canBeReferrer: boolean
  hasAllServicesAccess: boolean
  assignedServiceIds: string[]
  permissions: string[]
}

// 2. ایجاد یا ویرایش پرسنل
export async function upsertStaff(input: UpsertStaffInput) {
  try {
    const { clinicId, maxStaff } = await requireStaffManagementContext()

    const cleanPhone = normalizeIranianPhone(input.phone)
    const cleanName = input.fullName.trim()
    const cleanJobTitle = input.jobTitle.trim()

    if (!cleanName || !cleanPhone || !cleanJobTitle) {
      return {
        success: false,
        error: "نام، شماره تماس و سمت در کلینیک الزامی است.",
      }
    }

    if (!isValidIranianMobile(cleanPhone)) {
      return {
        success: false,
        error: "شماره موبایل وارد شده معتبر نیست (مثال صحیح: 09123456789).",
      }
    }

    const validPermissions = input.permissions.filter((p) =>
      ALL_PERMISSION_KEYS.includes(p as PermissionKey)
    )

    if (!input.clinicUserId && validPermissions.length === 0) {
      return {
        success: false,
        error: "حداقل یک دسترسی عملیاتی برای پرسنل انتخاب کنید.",
      }
    }

    let hashedPassword: string | undefined = undefined
    if (input.password && input.password.trim().length > 0) {
      if (input.password.trim().length < 6) {
        return { success: false, error: "رمز عبور باید حداقل ۶ کاراکتر باشد." }
      }
      hashedPassword = await bcrypt.hash(input.password.trim(), 10)
    }

    await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { phone: cleanPhone },
      })

      if (!user) {
        user = await tx.user.create({
          data: {
            phone: cleanPhone,
            fullName: cleanName,
            ...(hashedPassword ? { password: hashedPassword } : {}),
          },
        })
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: cleanName,
            ...(hashedPassword ? { password: hashedPassword } : {}),
          },
        })
      }

      if (input.clinicUserId) {
        const existingStaff = await tx.clinicUser.findFirst({
          where: { id: input.clinicUserId, clinicId, deletedAt: null },
        })

        if (!existingStaff) {
          throw new Error("پرسنل مورد نظر یافت نشد.")
        }

        if (existingStaff.userId !== user.id) {
          const duplicate = await tx.clinicUser.findUnique({
            where: {
              userId_clinicId: { userId: user.id, clinicId },
            },
          })
          if (duplicate && !duplicate.deletedAt) {
            throw new Error(
              "این شماره تماس قبلاً برای پرسنل دیگری ثبت شده است."
            )
          }
        }

        await tx.clinicUser.update({
          where: { id: existingStaff.id },
          data: {
            userId: user.id,
            jobTitle: cleanJobTitle,
            personnelCode: input.personnelCode?.trim() || null,
            specialty: input.specialty?.trim() || null,
            avatarUrl: input.avatarUrl || existingStaff.avatarUrl,
            stampUrl: input.stampUrl || existingStaff.stampUrl,
            canLogin: existingStaff.isOwner ? true : input.canLogin,
            canBeTherapist: input.canBeTherapist,
            canBeAssistant: input.canBeAssistant,
            canBeReferrer: input.canBeReferrer,
            hasAllServicesAccess: input.hasAllServicesAccess,
            permissions: existingStaff.isOwner
              ? ALL_PERMISSION_KEYS
              : validPermissions,
            assignedServices: {
              set: input.hasAllServicesAccess
                ? []
                : input.assignedServiceIds.map((id) => ({ id })),
            },
          },
        })
      } else {
        const currentStaffCount = await tx.clinicUser.count({
          where: { clinicId, deletedAt: null },
        })

        if (currentStaffCount >= maxStaff) {
          throw new Error(
            `سقف مجاز پرسنل در پلن فعلی شما (${maxStaff} نفر) تکمیل شده است.`
          )
        }

        const existingRelation = await tx.clinicUser.findUnique({
          where: {
            userId_clinicId: { userId: user.id, clinicId },
          },
        })

        if (existingRelation) {
          if (!existingRelation.deletedAt) {
            throw new Error(
              "این شماره تماس هم‌اکنون در لیست پرسنل کلینیک وجود دارد."
            )
          }

          // بازیابی رکورد حذف نرم‌شده قبلی
          await tx.clinicUser.update({
            where: { id: existingRelation.id },
            data: {
              deletedAt: null,
              leftAt: null,
              isActive: true,
              jobTitle: cleanJobTitle,
              personnelCode: input.personnelCode?.trim() || null,
              specialty: input.specialty?.trim() || null,
              avatarUrl: input.avatarUrl || null,
              stampUrl: input.stampUrl || null,
              canLogin: input.canLogin,
              canBeTherapist: input.canBeTherapist,
              canBeAssistant: input.canBeAssistant,
              canBeReferrer: input.canBeReferrer,
              hasAllServicesAccess: input.hasAllServicesAccess,
              permissions: validPermissions,
              assignedServices: {
                set: input.hasAllServicesAccess
                  ? []
                  : input.assignedServiceIds.map((id) => ({ id })),
              },
            },
          })
        } else {
          await tx.clinicUser.create({
            data: {
              userId: user.id,
              clinicId,
              jobTitle: cleanJobTitle,
              personnelCode: input.personnelCode?.trim() || null,
              specialty: input.specialty?.trim() || null,
              avatarUrl: input.avatarUrl || null,
              stampUrl: input.stampUrl || null,
              canLogin: input.canLogin,
              canBeTherapist: input.canBeTherapist,
              canBeAssistant: input.canBeAssistant,
              canBeReferrer: input.canBeReferrer,
              hasAllServicesAccess: input.hasAllServicesAccess,
              permissions: validPermissions,
              assignedServices: {
                connect: input.hasAllServicesAccess
                  ? []
                  : input.assignedServiceIds.map((id) => ({ id })),
              },
            },
          })
        }
      }
    })

    revalidatePath("/clinic-dashboard/staffs")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در ذخیره اطلاعات پرسنل",
    }
  }
}

// 3. دکمه فعال / غیرفعال کردن پرسنل
export async function toggleStaffActive(clinicUserId: string) {
  try {
    const { clinicId } = await requireStaffManagementContext()

    const staff = await prisma.clinicUser.findFirst({
      where: { id: clinicUserId, clinicId, deletedAt: null },
    })

    if (!staff) {
      return { success: false, error: "پرسنل یافت نشد." }
    }

    if (staff.isOwner) {
      return {
        success: false,
        error: "امکان غیرفعال کردن مالک کلینیک وجود ندارد.",
      }
    }

    const nextActiveState = !staff.isActive

    await prisma.clinicUser.update({
      where: { id: staff.id },
      data: {
        isActive: nextActiveState,
        leftAt: nextActiveState ? null : new Date(),
      },
    })

    revalidatePath("/clinic-dashboard/staffs")
    return { success: true, isActive: nextActiveState }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در تغییر وضعیت پرسنل",
    }
  }
}

// 4. حذف نرم پرسنل (حفظ رکورد در دیتابیس برای تاریخچه مالی و پرونده‌ها)
export async function softDeleteStaff(clinicUserId: string) {
  try {
    const { clinicId } = await requireStaffManagementContext()

    const staff = await prisma.clinicUser.findFirst({
      where: { id: clinicUserId, clinicId, deletedAt: null },
    })

    if (!staff) {
      return { success: false, error: "پرسنل یافت نشد." }
    }

    if (staff.isOwner) {
      return { success: false, error: "امکان حذف مالک کلینیک وجود ندارد." }
    }

    await prisma.clinicUser.update({
      where: { id: staff.id },
      data: {
        deletedAt: new Date(),
        leftAt: new Date(),
        isActive: false,
        canLogin: false,
      },
    })

    revalidatePath("/clinic-dashboard/staffs")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در حذف پرسنل",
    }
  }
}
