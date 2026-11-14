// app/clinic-dashboard/(dashboard)/services/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export type ServiceAttributeItem = {
  key: string;
  value: string;
};

export type DefaultProductInput = {
  clinicProductId: string;
  quantity: number;
};

/**
 * ایجاد یا ویرایش خدمت اصلی (همراه با بررسی مجوز عملیاتی و انتساب پرسنل معتبر)
 */
export async function upsertServiceAction(data: {
  id?: string;
  title: string;
  assignedStaffIds: string[];
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  // بررسی مجوز عملیاتی ایجاد یا ویرایش سرویس
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

    if (data.id) {
      const existing = await prisma.service.findFirst({
        where: {
          id: data.id,
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

      await prisma.service.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          assignedStaff: {
            set: finalStaffIds.map((id) => ({ id })),
          },
        },
      });
    } else {
      await prisma.service.create({
        data: {
          clinicId: ctx.clinicId,
          title: data.title.trim(),
          assignedStaff: {
            connect: finalStaffIds.map((id) => ({ id })),
          },
        },
      });
    }

    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error) {
    console.error("upsertServiceAction error:", error);
    return { success: false, error: "خطا در ذخیره خدمت" };
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
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        "امکان حذف این خدمت وجود ندارد (ممکن است در فاکتورها استفاده شده باشد).",
    };
  }
}

/**
 * ایجاد یا ویرایش زیرسرویس
 */
export async function upsertSubServiceAction(data: {
  id?: string;
  serviceId: string;
  title: string;
  price: number;
  attributes: ServiceAttributeItem[];
  defaultProducts: DefaultProductInput[];
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
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        "امکان حذف این زیرسرویس وجود ندارد (در پرونده کلاینت‌ها ثبت شده است).",
    };
  }
}