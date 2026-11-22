// app/clinic-dashboard/(dashboard)/services/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { ServiceTimingMode } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ServiceAttributeItem = {
  key: string;
  value: string;
};

export type DefaultProductInput = {
  clinicProductId: string;
  quantity: number;
};

export type ServiceTimingInput = {
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  durationMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
};

export type OptionalSubServiceTimingInput = {
  overrideTiming: boolean;
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  durationMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
};

function parseMinutes(raw: unknown, fallback: number, max = 600): number {
  const num = Number(normalizePersianDigits(String(raw ?? fallback)).trim());
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.min(max, Math.floor(num));
}

function sanitizeTiming(input?: Partial<ServiceTimingInput>): ServiceTimingInput {
  const mode =
    input?.timingMode === ServiceTimingMode.SPLIT_STAGE
      ? ServiceTimingMode.SPLIT_STAGE
      : ServiceTimingMode.SINGLE_STAGE;

  return {
    timingMode: mode,
    prepBeforeMinutes: parseMinutes(input?.prepBeforeMinutes, 0, 240),
    durationMinutes: Math.max(5, parseMinutes(input?.durationMinutes, 30, 480)),
    stage1Minutes: Math.max(5, parseMinutes(input?.stage1Minutes, 15, 240)),
    freeGapMinutes: parseMinutes(input?.freeGapMinutes, 0, 360),
    stage2Minutes: Math.max(5, parseMinutes(input?.stage2Minutes, 15, 240)),
    restAfterMinutes: parseMinutes(input?.restAfterMinutes, 0, 180),
    requiresPrivacy: Boolean(input?.requiresPrivacy),
  };
}

/**
 * ایجاد یا ویرایش خدمت اصلی (همراه با زمان‌بندی پیش‌فرض، انتساب پرسنل و کالاهای مصرفی پیش‌فرض)
 */
export async function upsertServiceAction(data: {
  id?: string;
  title: string;
  assignedStaffIds: string[];
  defaultProducts?: DefaultProductInput[];
  timing?: ServiceTimingInput;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  const requiredPerm = data.id ? "services.edit" : "services.create";
  if (!hasPermission(ctx.clinicUser, requiredPerm)) {
    return {
      success: false,
      error: data.id
        ? "شما مجوز ویرایش سرویس را ندارید."
        : "شما مجوز ثبت سرویس جدید را ندارید.",
    };
  }

  if (!data.title.trim()) {
    return { success: false, error: "عنوان خدمت الزامی است" };
  }

  const timing = sanitizeTiming(data.timing);

  const productMap = new Map<string, number>();
  for (const p of data.defaultProducts ?? []) {
    if (p.clinicProductId && p.quantity > 0) {
      productMap.set(
        p.clinicProductId,
        (productMap.get(p.clinicProductId) ?? 0) + Number(p.quantity)
      );
    }
  }
  const cleanProducts = Array.from(productMap.entries()).map(
    ([clinicProductId, quantity]) => ({
      clinicProductId,
      quantity,
    })
  );

  try {
    const validStaff = await prisma.clinicUser.findMany({
      where: {
        id: { in: data.assignedStaffIds },
        clinicId: ctx.clinicId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    const staffIdSet = new Set(validStaff.map((s) => s.id));

    if (!ctx.clinicUser.isOwner && !ctx.clinicUser.hasAllServicesAccess) {
      staffIdSet.add(ctx.clinicUserId);
    }

    const finalStaffIds = Array.from(staffIdSet);

    await prisma.$transaction(async (tx) => {
      if (data.id) {
        const existing = await tx.service.findFirst({
          where: {
            id: data.id,
            clinicId: ctx.clinicId,
            ...(!ctx.clinicUser.isOwner && !ctx.clinicUser.hasAllServicesAccess
              ? { assignedStaff: { some: { id: ctx.clinicUserId } } }
              : {}),
          },
        });

        if (!existing) {
          throw new Error("خدمت مورد نظر یافت نشد یا دسترسی ندارید");
        }

        await tx.service.update({
          where: { id: data.id },
          data: {
            title: data.title.trim(),
            timingMode: timing.timingMode,
            prepBeforeMinutes: timing.prepBeforeMinutes,
            durationMinutes: timing.durationMinutes,
            stage1Minutes: timing.stage1Minutes,
            freeGapMinutes: timing.freeGapMinutes,
            stage2Minutes: timing.stage2Minutes,
            restAfterMinutes: timing.restAfterMinutes,
            requiresPrivacy: timing.requiresPrivacy,
            assignedStaff: {
              set: finalStaffIds.map((id) => ({ id })),
            },
          },
        });

        await tx.serviceCategoryDefaultProduct.deleteMany({
          where: { serviceId: data.id },
        });

        if (cleanProducts.length > 0) {
          await tx.serviceCategoryDefaultProduct.createMany({
            data: cleanProducts.map((p) => ({
              serviceId: data.id!,
              clinicProductId: p.clinicProductId,
              quantity: p.quantity,
            })),
          });
        }
      } else {
        await tx.service.create({
          data: {
            clinicId: ctx.clinicId,
            title: data.title.trim(),
            timingMode: timing.timingMode,
            prepBeforeMinutes: timing.prepBeforeMinutes,
            durationMinutes: timing.durationMinutes,
            stage1Minutes: timing.stage1Minutes,
            freeGapMinutes: timing.freeGapMinutes,
            stage2Minutes: timing.stage2Minutes,
            restAfterMinutes: timing.restAfterMinutes,
            requiresPrivacy: timing.requiresPrivacy,
            assignedStaff: {
              connect: finalStaffIds.map((id) => ({ id })),
            },
            defaultServiceProducts:
              cleanProducts.length > 0
                ? {
                    create: cleanProducts.map((p) => ({
                      clinicProductId: p.clinicProductId,
                      quantity: p.quantity,
                    })),
                  }
                : undefined,
          },
        });
      }
    });

    revalidatePath("/clinic-dashboard/services");
    revalidatePath("/clinic-dashboard/settings/appointments/staff-schedule");
    return { success: true };
  } catch (error: unknown) {
    console.error("upsertServiceAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "خطا در ذخیره خدمت",
    };
  }
}

/**
 * حذف خدمت اصلی
 */
export async function deleteServiceAction(serviceId: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  if (!hasPermission(ctx.clinicUser, "services.delete")) {
    return { success: false, error: "شما مجوز حذف سرویس را ندارید." };
  }

  try {
    const existing = await prisma.service.findFirst({
      where: {
        id: serviceId,
        clinicId: ctx.clinicId,
        ...(!ctx.clinicUser.isOwner && !ctx.clinicUser.hasAllServicesAccess
          ? { assignedStaff: { some: { id: ctx.clinicUserId } } }
          : {}),
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "خدمت مورد نظر یافت نشد یا دسترسی ندارید",
      };
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    revalidatePath("/clinic-dashboard/services");
    revalidatePath("/clinic-dashboard/settings/appointments/staff-schedule");
    return { success: true };
  } catch {
    return {
      success: false,
      error:
        "امکان حذف این خدمت وجود ندارد (ممکن است در فاکتورها استفاده شده باشد).",
    };
  }
}

/**
 * ایجاد یا ویرایش زیرسرویس (همراه با زمان‌بندی اختصاصی یا ارث‌بری از خدمت اصلی)
 */
export async function upsertSubServiceAction(data: {
  id?: string;
  serviceId: string;
  title: string;
  price: number;
  attributes: ServiceAttributeItem[];
  defaultProducts: DefaultProductInput[];
  timing?: OptionalSubServiceTimingInput;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  const requiredPerm = data.id ? "services.edit" : "services.create";
  if (!hasPermission(ctx.clinicUser, requiredPerm)) {
    return {
      success: false,
      error: data.id
        ? "شما مجوز ویرایش زیرسرویس را ندارید."
        : "شما مجوز ثبت زیرسرویس جدید را ندارید.",
    };
  }

  if (!data.title.trim()) {
    return { success: false, error: "عنوان زیرسرویس الزامی است" };
  }
  if (!data.price || data.price <= 0) {
    return { success: false, error: "وارد کردن قیمت معتبر اجباری است" };
  }

  const cleanAttributes = data.attributes.filter(
    (attr) => attr.key.trim() !== "" && attr.value.trim() !== ""
  );

  const productMap = new Map<string, number>();
  for (const p of data.defaultProducts) {
    if (p.clinicProductId && p.quantity > 0) {
      productMap.set(
        p.clinicProductId,
        (productMap.get(p.clinicProductId) ?? 0) + Number(p.quantity)
      );
    }
  }
  const cleanProducts = Array.from(productMap.entries()).map(
    ([clinicProductId, quantity]) => ({
      clinicProductId,
      quantity,
    })
  );

  const override = Boolean(data.timing?.overrideTiming);
  const customTiming = sanitizeTiming(data.timing);

  const subTimingFields = override
    ? {
        timingMode: customTiming.timingMode,
        prepBeforeMinutes: customTiming.prepBeforeMinutes,
        durationMinutes: customTiming.durationMinutes,
        stage1Minutes: customTiming.stage1Minutes,
        freeGapMinutes: customTiming.freeGapMinutes,
        stage2Minutes: customTiming.stage2Minutes,
        restAfterMinutes: customTiming.restAfterMinutes,
        requiresPrivacy: customTiming.requiresPrivacy,
      }
    : {
        timingMode: null,
        prepBeforeMinutes: null,
        durationMinutes: null,
        stage1Minutes: null,
        freeGapMinutes: null,
        stage2Minutes: null,
        restAfterMinutes: null,
        requiresPrivacy: null,
      };

  try {
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        clinicId: ctx.clinicId,
        ...(!ctx.clinicUser.isOwner && !ctx.clinicUser.hasAllServicesAccess
          ? { assignedStaff: { some: { id: ctx.clinicUserId } } }
          : {}),
      },
    });
    if (!service) {
      return {
        success: false,
        error: "خدمت اصلی یافت نشد یا دسترسی ندارید",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (data.id) {
        await tx.subService.update({
          where: { id: data.id, serviceId: data.serviceId },
          data: {
            title: data.title.trim(),
            price: Number(data.price),
            attributes: cleanAttributes,
            ...subTimingFields,
          },
        });

        await tx.serviceDefaultProduct.deleteMany({
          where: { subServiceId: data.id },
        });

        if (cleanProducts.length > 0) {
          await tx.serviceDefaultProduct.createMany({
            data: cleanProducts.map((p) => ({
              subServiceId: data.id!,
              clinicProductId: p.clinicProductId,
              quantity: p.quantity,
            })),
          });
        }
      } else {
        await tx.subService.create({
          data: {
            serviceId: data.serviceId,
            title: data.title.trim(),
            price: Number(data.price),
            attributes: cleanAttributes,
            ...subTimingFields,
            defaultProducts: {
              create: cleanProducts.map((p) => ({
                clinicProductId: p.clinicProductId,
                quantity: p.quantity,
              })),
            },
          },
        });
      }
    });

    revalidatePath("/clinic-dashboard/services");
    revalidatePath("/clinic-dashboard/settings/appointments/staff-schedule");
    return { success: true };
  } catch (error) {
    console.error("upsertSubServiceAction error:", error);
    return { success: false, error: "خطا در ذخیره زیرسرویس" };
  }
}

/**
 * حذف زیرسرویس
 */
export async function deleteSubServiceAction(subServiceId: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  if (!hasPermission(ctx.clinicUser, "services.delete")) {
    return { success: false, error: "شما مجوز حذف زیرسرویس را ندارید." };
  }

  try {
    const subService = await prisma.subService.findFirst({
      where: {
        id: subServiceId,
        service: {
          clinicId: ctx.clinicId,
          ...(!ctx.clinicUser.isOwner && !ctx.clinicUser.hasAllServicesAccess
            ? { assignedStaff: { some: { id: ctx.clinicUserId } } }
            : {}),
        },
      },
    });

    if (!subService) {
      return {
        success: false,
        error: "زیرسرویس یافت نشد یا دسترسی ندارید",
      };
    }

    await prisma.subService.delete({
      where: { id: subServiceId },
    });

    revalidatePath("/clinic-dashboard/services");
    revalidatePath("/clinic-dashboard/settings/appointments/staff-schedule");
    return { success: true };
  } catch {
    return {
      success: false,
      error:
        "امکان حذف این زیرسرویس وجود ندارد (در پرونده کلاینت‌ها ثبت شده است).",
    };
  }
}