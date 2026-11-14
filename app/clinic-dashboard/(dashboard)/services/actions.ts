// app/clinic-dashboard/(dashborad)/services/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
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
 * ایجاد یا ویرایش خدمت اصلی (همراه با انتساب پرسنل)
 */
export async function upsertServiceAction(data: {
  id?: string;
  title: string;
  assignedStaffIds: string[];
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "دسترسی غیرمجاز" };

  if (!data.title.trim()) {
    return { success: false, error: "عنوان خدمت الزامی است" };
  }

  try {
    if (data.id) {
      await prisma.service.update({
        where: { id: data.id, clinicId: ctx.clinicId },
        data: {
          title: data.title.trim(),
          assignedStaff: {
            set: data.assignedStaffIds.map((id) => ({ id })),
          },
        },
      });
    } else {
      await prisma.service.create({
        data: {
          clinicId: ctx.clinicId,
          title: data.title.trim(),
          assignedStaff: {
            connect: data.assignedStaffIds.map((id) => ({ id })),
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

  try {
    await prisma.service.delete({
      where: { id: serviceId, clinicId: ctx.clinicId },
    });
    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "امکان حذف این خدمت وجود ندارد (ممکن است در فاکتورها استفاده شده باشد).",
    };
  }
}

/**
 * ایجاد یا ویرایش زیرسرویس (همراه با قیمت، مشخصه‌های دلخواه و اقلام مصرفی دیفالت)
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

  if (!data.title.trim()) {
    return { success: false, error: "عنوان زیرسرویس الزامی است" };
  }
  if (!data.price || data.price <= 0) {
    return { success: false, error: "وارد کردن قیمت معتبر اجباری است" };
  }

  // پاکسازی مشخصه‌های خالی
  const cleanAttributes = data.attributes.filter(
    (attr) => attr.key.trim() !== "" && attr.value.trim() !== ""
  );

  // پاکسازی مصرفی‌های تکراری یا صفر
  const cleanProducts = data.defaultProducts.filter(
    (p) => p.clinicProductId && p.quantity > 0
  );

  try {
    // اطمینان از اینکه خدمت متعلق به همین کلینیک است
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, clinicId: ctx.clinicId },
    });
    if (!service) return { success: false, error: "خدمت اصلی یافت نشد" };

    await prisma.$transaction(async (tx) => {
      if (data.id) {
        // ویرایش زیرسرویس
        await tx.subService.update({
          where: { id: data.id },
          data: {
            title: data.title.trim(),
            price: Number(data.price),
            attributes: cleanAttributes,
          },
        });

        // بازنویسی اقلام مصرفی پیش‌فرض
        await tx.serviceDefaultProduct.deleteMany({
          where: { subServiceId: data.id },
        });

        if (cleanProducts.length > 0) {
          await tx.serviceDefaultProduct.createMany({
            data: cleanProducts.map((p) => ({
              subServiceId: data.id!,
              clinicProductId: p.clinicProductId,
              quantity: Number(p.quantity),
            })),
          });
        }
      } else {
        // ایجاد زیرسرویس جدید
        await tx.subService.create({
          data: {
            serviceId: data.serviceId,
            title: data.title.trim(),
            price: Number(data.price),
            attributes: cleanAttributes,
            defaultProducts: {
              create: cleanProducts.map((p) => ({
                clinicProductId: p.clinicProductId,
                quantity: Number(p.quantity),
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

  try {
    await prisma.subService.delete({
      where: { id: subServiceId },
    });
    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "امکان حذف این زیرسرویس وجود ندارد (در پرونده کلاینت‌ها ثبت شده است).",
    };
  }
}