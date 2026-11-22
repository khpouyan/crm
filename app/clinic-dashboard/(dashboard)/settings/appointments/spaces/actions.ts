// app/clinic-dashboard/(dashboard)/settings/appointments/spaces/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { ClinicSpaceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

export interface UpsertClinicSpaceInput {
  id?: string;
  name: string;
  spaceType: ClinicSpaceType;
  capacity: number;
  allowOverlap: boolean;
  requiresPrivacy: boolean;
  equipmentNotes?: string | null;
  description?: string | null;
  isActive: boolean;
  allowedServiceIds: string[];
}

const SPACES_PATH = "/clinic-dashboard/settings/appointments/spaces";

function canManageSpaces(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "appointments.settings") ||
    hasPermission(ctx.clinicUser, "management.settings")
  );
}

const VALID_SPACE_TYPES = new Set<ClinicSpaceType>([
  ClinicSpaceType.ROOM,
  ClinicSpaceType.MULTI_UNIT,
  ClinicSpaceType.HOSPITAL,
]);

export async function upsertClinicSpaceAction(input: UpsertClinicSpaceInput) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageSpaces(ctx)) {
      return {
        success: false,
        error: "شما مجوز مدیریت مکان‌های نوبت‌دهی کلینیک را ندارید.",
      };
    }

    const cleanName = normalizePersianDigits(input.name || "").trim();
    if (!cleanName || cleanName.length < 2) {
      return {
        success: false,
        error: "نام مکان باید حداقل ۲ کاراکتر باشد.",
      };
    }

    if (!VALID_SPACE_TYPES.has(input.spaceType)) {
      return { success: false, error: "نوع مکان انتخاب‌شده معتبر نیست." };
    }

    const rawCap = Number(
      normalizePersianDigits(String(input.capacity ?? 1)).trim()
    );
    const capacity =
      Number.isFinite(rawCap) && rawCap >= 1 ? Math.min(50, Math.floor(rawCap)) : 1;

    // هم‌پوشانی زمانی در مکان تنها زمانی معنی دارد که ظرفیت حداقل ۱ باشد
    const allowOverlap = Boolean(input.allowOverlap);
    const requiresPrivacy = Boolean(input.requiresPrivacy);

    const uniqueServiceIds = Array.from(
      new Set((input.allowedServiceIds || []).filter(Boolean))
    );

    // اطمینان از اینکه سرویس‌ها متعلق به همین کلینیک هستند
    const validServices =
      uniqueServiceIds.length > 0
        ? await prisma.service.findMany({
            where: {
              clinicId: ctx.clinicId,
              id: { in: uniqueServiceIds },
            },
            select: { id: true },
          })
        : [];

    const verifiedServiceIds = validServices.map((s) => s.id);

    if (input.id) {
      const existing = await prisma.clinicSpace.findFirst({
        where: {
          id: input.id,
          clinicId: ctx.clinicId,
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, error: "مکان مورد نظر در این کلینیک یافت نشد." };
      }

      await prisma.clinicSpace.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          spaceType: input.spaceType,
          capacity,
          allowOverlap,
          requiresPrivacy,
          equipmentNotes: input.equipmentNotes?.trim() || null,
          description: input.description?.trim() || null,
          isActive: Boolean(input.isActive),
          allowedServices: {
            set: verifiedServiceIds.map((id) => ({ id })),
          },
        },
      });
    } else {
      const lastSpace = await prisma.clinicSpace.findFirst({
        where: { clinicId: ctx.clinicId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      await prisma.clinicSpace.create({
        data: {
          clinicId: ctx.clinicId,
          name: cleanName,
          spaceType: input.spaceType,
          capacity,
          allowOverlap,
          requiresPrivacy,
          equipmentNotes: input.equipmentNotes?.trim() || null,
          description: input.description?.trim() || null,
          isActive: Boolean(input.isActive),
          sortOrder: (lastSpace?.sortOrder ?? 0) + 1,
          allowedServices: {
            connect: verifiedServiceIds.map((id) => ({ id })),
          },
        },
      });
    }

    revalidatePath(SPACES_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در ذخیره اطلاعات مکان.",
    };
  }
}

export async function moveClinicSpaceTypeAction(
  spaceId: string,
  targetSpaceType: ClinicSpaceType
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageSpaces(ctx)) {
      return {
        success: false,
        error: "شما مجوز جابه‌جایی مکان‌ها را ندارید.",
      };
    }

    if (!VALID_SPACE_TYPES.has(targetSpaceType)) {
      return { success: false, error: "نوع ستون مقصد معتبر نیست." };
    }

    const existing = await prisma.clinicSpace.findFirst({
      where: { id: spaceId, clinicId: ctx.clinicId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "مکان مورد نظر یافت نشد." };
    }

    await prisma.clinicSpace.update({
      where: { id: existing.id },
      data: { spaceType: targetSpaceType },
    });

    revalidatePath(SPACES_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در تغییر ستون مکان در نمای کانبان.",
    };
  }
}

export async function toggleClinicSpaceRuleAction(
  spaceId: string,
  field: "isActive" | "allowOverlap" | "requiresPrivacy",
  value: boolean
) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageSpaces(ctx)) {
      return {
        success: false,
        error: "شما مجوز تغییر قوانین مکان را ندارید.",
      };
    }

    const existing = await prisma.clinicSpace.findFirst({
      where: { id: spaceId, clinicId: ctx.clinicId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "مکان مورد نظر یافت نشد." };
    }

    await prisma.clinicSpace.update({
      where: { id: existing.id },
      data: { [field]: Boolean(value) },
    });

    revalidatePath(SPACES_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در به‌روزرسانی وضعیت مکان.",
    };
  }
}

export async function deleteClinicSpaceAction(spaceId: string) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!canManageSpaces(ctx)) {
      return {
        success: false,
        error: "شما مجوز حذف مکان را ندارید.",
      };
    }

    const existing = await prisma.clinicSpace.findFirst({
      where: { id: spaceId, clinicId: ctx.clinicId },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "مکان مورد نظر یافت نشد." };
    }

    await prisma.clinicSpace.delete({
      where: { id: existing.id },
    });

    revalidatePath(SPACES_PATH);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در حذف مکان.",
    };
  }
}