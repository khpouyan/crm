// app/clinic-dashboard/(dashboard)/inventory/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

async function requireInventoryWriteContext() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    throw new Error("نشست کاربری معتبر نیست.");
  }
  if (!hasPermission(ctx.clinicUser, "finance.inventory")) {
    throw new Error("شما مجوز مدیریت و ثبت تغییرات انبار را ندارید.");
  }
  return ctx;
}

/**
 * ۱. ایجاد یا ویرایش کالای کلینیک (با پشتیبانی از واحد بسته‌بندی و جزء مصرفی)
 */
export async function upsertClinicProductAction(input: {
  id?: string;
  name: string;
  code?: string;
  unit: string;
  packageUnit?: string;
  unitsPerPackage?: number;
  alertThreshold: number;
}) {
  try {
    const ctx = await requireInventoryWriteContext();

    const cleanName = input.name.trim();
    const cleanUnit = input.unit.trim();
    if (!cleanName || !cleanUnit) {
      return {
        success: false,
        error: "نام کالا و واحد مصرف (جزء) الزامی است.",
      };
    }

    const cleanPackageUnit = input.packageUnit?.trim() || null;
    const unitsPerPkg =
      cleanPackageUnit && input.unitsPerPackage && input.unitsPerPackage > 1
        ? Number(input.unitsPerPackage)
        : 1;

    const threshold = Math.max(0, Number(input.alertThreshold) || 0);

    if (input.id) {
      const existing = await prisma.clinicProduct.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId },
      });
      if (!existing) {
        return { success: false, error: "کالای مورد نظر یافت نشد." };
      }

      await prisma.clinicProduct.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          code: input.code?.trim() || null,
          unit: cleanUnit,
          packageUnit: cleanPackageUnit,
          unitsPerPackage: unitsPerPkg,
          alertThreshold: threshold,
        },
      });
    } else {
      await prisma.clinicProduct.create({
        data: {
          clinicId: ctx.clinicId,
          name: cleanName,
          code: input.code?.trim() || null,
          unit: cleanUnit,
          packageUnit: cleanPackageUnit,
          unitsPerPackage: unitsPerPkg,
          alertThreshold: threshold,
        },
      });
    }

    revalidatePath("/clinic-dashboard/inventory", "layout");
    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در ذخیره اطلاعات کالا",
    };
  }
}

/**
 * ۲. حذف کالای کلینیک
 */
export async function deleteClinicProductAction(productId: string) {
  try {
    const ctx = await requireInventoryWriteContext();

    const product = await prisma.clinicProduct.findFirst({
      where: { id: productId, clinicId: ctx.clinicId },
      include: {
        _count: { select: { usedInServices: true, stockOuts: true } },
      },
    });

    if (!product) {
      return { success: false, error: "کالا یافت نشد." };
    }

    if (product._count.usedInServices > 0 || product._count.stockOuts > 0) {
      return {
        success: false,
        error: "این کالا دارای سابقه مصرف یا خروج از انبار است و قابل حذف نیست.",
      };
    }

    await prisma.clinicProduct.delete({
      where: { id: product.id },
    });

    revalidatePath("/clinic-dashboard/inventory", "layout");
    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در حذف کالا",
    };
  }
}

/**
 * ۳. ورود کالا به انبار (با تبدیل خودکار بسته/رول به واحد مصرف)
 */
export async function stockInBatchAction(input: {
  clinicProductId: string;
  entryMode: "UNIT" | "PACKAGE";
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number | null;
  expirationDate?: string | null;
  exclusiveSubServiceId?: string | null;
  exclusiveTherapistId?: string | null;
}) {
  try {
    const ctx = await requireInventoryWriteContext();

    const rawQty = Number(input.quantity);
    const rawPurchasePrice = Number(input.purchasePrice);
    const rawSellingPrice =
      input.sellingPrice && input.sellingPrice > 0
        ? Number(input.sellingPrice)
        : null;

    if (!input.clinicProductId || rawQty <= 0) {
      return { success: false, error: "کالا و تعداد ورودی معتبر را وارد کنید." };
    }
    if (rawPurchasePrice < 0) {
      return { success: false, error: "قیمت خرید نمی‌تواند منفی باشد." };
    }

    const product = await prisma.clinicProduct.findFirst({
      where: { id: input.clinicProductId, clinicId: ctx.clinicId },
    });
    if (!product) {
      return { success: false, error: "کالای انتخاب‌شده معتبر نیست." };
    }

    const multiplier =
      input.entryMode === "PACKAGE" && product.unitsPerPackage > 1
        ? product.unitsPerPackage
        : 1;

    const finalUnitQuantity = rawQty * multiplier;
    const unitPurchasePrice = Math.round(rawPurchasePrice / multiplier);
    const unitSellingPrice = rawSellingPrice
      ? Math.round(rawSellingPrice / multiplier)
      : null;

    await prisma.productBatch.create({
      data: {
        clinicProductId: product.id,
        quantity: finalUnitQuantity,
        initialQuantity: finalUnitQuantity,
        purchasePrice: unitPurchasePrice,
        sellingPrice: unitSellingPrice,
        expirationDate: input.expirationDate
          ? new Date(input.expirationDate)
          : null,
        exclusiveSubServiceId: input.exclusiveSubServiceId || null,
        exclusiveTherapistId: input.exclusiveTherapistId || null,
      },
    });

    revalidatePath("/clinic-dashboard/inventory", "layout");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در ثبت ورود کالا به انبار",
    };
  }
}

/**
 * ۴. خروج دستی کالا از انبار (ثبت در InventoryStockOut + کسر FIFO از بچ‌ها)
 */
export async function stockOutProductAction(input: {
  clinicProductId: string;
  quantity: number;
  sellingPrice?: number | null;
  reason?: string;
}) {
  try {
    const ctx = await requireInventoryWriteContext();

    const deductQty = Number(input.quantity);
    if (!input.clinicProductId || deductQty <= 0) {
      return { success: false, error: "مقدار خروج باید بیشتر از صفر باشد." };
    }

    await prisma.$transaction(async (tx) => {
      const batches = await tx.productBatch.findMany({
        where: {
          clinicProductId: input.clinicProductId,
          clinicProduct: { clinicId: ctx.clinicId },
          quantity: { gt: 0 },
        },
        orderBy: [
          { expirationDate: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ],
      });

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < deductQty) {
        throw new Error(
          `موجودی قابل برداشت کافی نیست (موجودی فعلی: ${totalAvailable.toLocaleString("fa-IR")}).`
        );
      }

      let remaining = deductQty;
      let totalCostAccumulated = 0;

      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        totalCostAccumulated += take * batch.purchasePrice;

        await tx.productBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - take },
        });
        remaining -= take;
      }

      const avgUnitCost = Math.round(totalCostAccumulated / deductQty);

      await tx.inventoryStockOut.create({
        data: {
          clinicId: ctx.clinicId,
          clinicProductId: input.clinicProductId,
          createdById: ctx.clinicUserId,
          quantity: deductQty,
          unitCost: avgUnitCost,
          sellingPrice:
            input.sellingPrice && input.sellingPrice > 0
              ? Number(input.sellingPrice)
              : null,
          reason: input.reason?.trim() || "خروج دستی از انبار",
        },
      });
    });

    revalidatePath("/clinic-dashboard/inventory", "layout");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در ثبت خروج کالا",
    };
  }
}
