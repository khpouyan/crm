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

/**
 * ۵. حذف رکورد ورود کالا (ProductBatch) با بررسی مصرفی‌های ثبت‌شده
 */
export async function deleteProductBatchAction(
  batchId: string,
  force: boolean = false
) {
  try {
    const ctx = await requireInventoryWriteContext();

    const batch = await prisma.productBatch.findFirst({
      where: {
        id: batchId,
        clinicProduct: { clinicId: ctx.clinicId },
      },
      include: {
        clinicProduct: {
          include: {
            _count: {
              select: { usedInServices: true },
            },
          },
        },
      },
    });

    if (!batch) {
      return { success: false, error: "رکورد ورود کالا یافت نشد." };
    }

    const initialQty =
      batch.initialQuantity > 0 ? batch.initialQuantity : batch.quantity;
    const consumedFromBatch = Math.max(0, initialQty - batch.quantity);
    const hasServiceUsage =
      consumedFromBatch > 0 || batch.clinicProduct._count.usedInServices > 0;

    // اگر این بچ بخشی‌اش مصرف شده یا کالا در خدمات مصرفی دارد و کاربر هنوز تایید نهایی نداده است:
    if (hasServiceUsage && !force) {
      return {
        success: false,
        requiresConfirmation: true,
        consumedFromBatch,
        unit: batch.clinicProduct.unit,
        productName: batch.clinicProduct.name,
      };
    }

    await prisma.productBatch.delete({
      where: { id: batch.id },
    });

    revalidatePath("/clinic-dashboard/inventory", "layout");
    revalidatePath("/clinic-dashboard/services");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در حذف رکورد ورود کالا",
    };
  }
}

/**
 * ۶. ویرایش رکورد ورود کالا (ProductBatch) با حفظ مقدار مصرف‌شده قبلی
 */
export async function updateProductBatchAction(input: {
  batchId: string;
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

    if (!input.batchId || rawQty <= 0) {
      return { success: false, error: "تعداد معتبر وارد کنید." };
    }
    if (rawPurchasePrice < 0) {
      return { success: false, error: "قیمت خرید نمی‌تواند منفی باشد." };
    }

    const existingBatch = await prisma.productBatch.findFirst({
      where: {
        id: input.batchId,
        clinicProduct: { clinicId: ctx.clinicId },
      },
      include: {
        clinicProduct: true,
      },
    });

    if (!existingBatch) {
      return { success: false, error: "رکورد ورود کالا یافت نشد." };
    }

    const product = existingBatch.clinicProduct;
    const multiplier =
      input.entryMode === "PACKAGE" && product.unitsPerPackage > 1
        ? product.unitsPerPackage
        : 1;

    const newInitialUnitQty = rawQty * multiplier;
    const prevInitialQty =
      existingBatch.initialQuantity > 0
        ? existingBatch.initialQuantity
        : existingBatch.quantity;
    const alreadyConsumed = Math.max(0, prevInitialQty - existingBatch.quantity);

    if (newInitialUnitQty < alreadyConsumed) {
      return {
        success: false,
        error: `از این بچ تاکنون ${alreadyConsumed.toLocaleString("fa-IR")} ${product.unit} مصرف شده است؛ تعداد کل نمی‌تواند کمتر از مقدار مصرف‌شده باشد.`,
      };
    }

    const nextRemainingQty = newInitialUnitQty - alreadyConsumed;
    const unitPurchasePrice = Math.round(rawPurchasePrice / multiplier);
    const unitSellingPrice = rawSellingPrice
      ? Math.round(rawSellingPrice / multiplier)
      : null;

    await prisma.productBatch.update({
      where: { id: existingBatch.id },
      data: {
        initialQuantity: newInitialUnitQty,
        quantity: nextRemainingQty,
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
      error: error?.message || "خطا در ویرایش رکورد ورود کالا",
    };
  }
}

/**
 * ۷. ویرایش رکورد خروج دستی کالا از انبار (تنظیم هوشمند موجودی بچ‌ها)
 */
export async function updateStockOutAction(input: {
  stockOutId: string;
  quantity: number;
  sellingPrice?: number | null;
  reason?: string;
}) {
  try {
    const ctx = await requireInventoryWriteContext();

    const nextQty = Number(input.quantity);
    if (!input.stockOutId || nextQty <= 0) {
      return { success: false, error: "مقدار خروجی باید بیشتر از صفر باشد." };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryStockOut.findFirst({
        where: { id: input.stockOutId, clinicId: ctx.clinicId },
        include: { clinicProduct: true },
      });

      if (!existing) {
        throw new Error("رکورد خروج کالا یافت نشد.");
      }

      const diff = nextQty - existing.quantity;
      let updatedUnitCost = existing.unitCost;

      if (diff > 0) {
        // نیاز به کسر مقدار بیشتر از بچ‌های موجود
        const batches = await tx.productBatch.findMany({
          where: {
            clinicProductId: existing.clinicProductId,
            quantity: { gt: 0 },
          },
          orderBy: [
            { expirationDate: { sort: "asc", nulls: "last" } },
            { createdAt: "asc" },
          ],
        });

        const available = batches.reduce((s, b) => s + b.quantity, 0);
        if (available < diff) {
          throw new Error(
            `موجودی انبار برای افزایش مقدار خروج کافی نیست (موجودی قابل برداشت: ${available.toLocaleString("fa-IR")} ${existing.clinicProduct.unit}).`
          );
        }

        let remaining = diff;
        let extraCost = 0;

        for (const b of batches) {
          if (remaining <= 0) break;
          const take = Math.min(b.quantity, remaining);
          extraCost += take * b.purchasePrice;
          await tx.productBatch.update({
            where: { id: b.id },
            data: { quantity: b.quantity - take },
          });
          remaining -= take;
        }

        const prevTotalCost = existing.quantity * existing.unitCost;
        updatedUnitCost = Math.round((prevTotalCost + extraCost) / nextQty);
      } else if (diff < 0) {
        // بازگرداندن مقدار اضافه‌کسرشده به بچ‌های کالا
        let toRestore = Math.abs(diff);
        const batches = await tx.productBatch.findMany({
          where: { clinicProductId: existing.clinicProductId },
          orderBy: { createdAt: "desc" },
        });

        if (batches.length > 0) {
          for (const b of batches) {
            if (toRestore <= 0) break;
            const maxCap =
              b.initialQuantity > 0 ? b.initialQuantity : b.quantity + toRestore;
            const room = Math.max(0, maxCap - b.quantity);
            if (room > 0) {
              const putBack = Math.min(room, toRestore);
              await tx.productBatch.update({
                where: { id: b.id },
                data: { quantity: b.quantity + putBack },
              });
              toRestore -= putBack;
            }
          }
          // اگر همچنان مقداری باقی ماند، به آخرین بچ اضافه شود
          if (toRestore > 0) {
            await tx.productBatch.update({
              where: { id: batches[0].id },
              data: { quantity: batches[0].quantity + toRestore },
            });
          }
        }
      }

      await tx.inventoryStockOut.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          unitCost: updatedUnitCost,
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
      error: error?.message || "خطا در ویرایش رکورد خروج کالا",
    };
  }
}

/**
 * ۸. حذف رکورد خروج دستی کالا و بازگرداندن موجودی آن به انبار
 */
export async function deleteStockOutAction(stockOutId: string) {
  try {
    const ctx = await requireInventoryWriteContext();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryStockOut.findFirst({
        where: { id: stockOutId, clinicId: ctx.clinicId },
      });

      if (!existing) {
        throw new Error("رکورد خروج کالا یافت نشد.");
      }

      let toRestore = existing.quantity;
      const batches = await tx.productBatch.findMany({
        where: { clinicProductId: existing.clinicProductId },
        orderBy: { createdAt: "desc" },
      });

      if (batches.length > 0) {
        for (const b of batches) {
          if (toRestore <= 0) break;
          const maxCap =
            b.initialQuantity > 0 ? b.initialQuantity : b.quantity + toRestore;
          const room = Math.max(0, maxCap - b.quantity);
          if (room > 0) {
            const putBack = Math.min(room, toRestore);
            await tx.productBatch.update({
              where: { id: b.id },
              data: { quantity: b.quantity + putBack },
            });
            toRestore -= putBack;
          }
        }

        if (toRestore > 0) {
          await tx.productBatch.update({
            where: { id: batches[0].id },
            data: { quantity: batches[0].quantity + toRestore },
          });
        }
      }

      await tx.inventoryStockOut.delete({
        where: { id: existing.id },
      });
    });

    revalidatePath("/clinic-dashboard/inventory", "layout");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "خطا در حذف رکورد خروج کالا",
    };
  }
}