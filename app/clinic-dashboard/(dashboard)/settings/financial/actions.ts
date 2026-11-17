// app/clinic-dashboard/(dashboard)/settings/financial/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

function canManageFinancialSettings(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "management.settings") ||
    hasPermission(ctx.clinicUser, "finance.accounting")
  );
}

// ==========================================
// 1. حساب‌های بانکی کلینیک
// ==========================================
export async function upsertBankAccountAction(input: {
  id?: string;
  bankName: string;
  ownerName: string;
  accountNumber: string;
  cardNumber?: string;
  iban?: string;
  isActive?: boolean;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return { success: false, error: "شما مجوز مدیریت تنظیمات مالی را ندارید." };
  }

  const bankName = input.bankName?.trim();
  const ownerName = input.ownerName?.trim();
  const accountNumber = normalizePersianDigits(input.accountNumber || "").trim();
  const cardNumber =
    normalizePersianDigits(input.cardNumber || "")
      .replace(/\s|-/g, "")
      .trim() || null;
  const iban =
    normalizePersianDigits(input.iban || "")
      .replace(/\s/g, "")
      .toUpperCase()
      .trim() || null;

  if (!bankName || !ownerName || !accountNumber) {
    return {
      success: false,
      error: "نام بانک، نام صاحب حساب و شماره حساب الزامی است.",
    };
  }

  try {
    if (input.id) {
      await prisma.clinicBankAccount.updateMany({
        where: { id: input.id, clinicId: ctx.clinicId },
        data: {
          bankName,
          ownerName,
          accountNumber,
          cardNumber,
          iban,
          isActive: input.isActive ?? true,
        },
      });
    } else {
      await prisma.clinicBankAccount.create({
        data: {
          clinicId: ctx.clinicId,
          bankName,
          ownerName,
          accountNumber,
          cardNumber,
          iban,
          isActive: true,
        },
      });
    }

    revalidatePath("/clinic-dashboard/settings/financial");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در ذخیره حساب بانکی.",
    };
  }
}

export async function deleteBankAccountAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return { success: false, error: "شما مجوز حذف حساب بانکی را ندارید." };
  }

  const terminalsCount = await prisma.paymentTerminal.count({
    where: { bankAccountId: id, clinicId: ctx.clinicId },
  });
  if (terminalsCount > 0) {
    return {
      success: false,
      error: "ابتدا دستگاه‌های کارت‌خوان متصل به این حساب را حذف یا منتقل کنید.",
    };
  }

  await prisma.clinicBankAccount.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/settings/financial");
  return { success: true };
}

// ==========================================
// 2. دستگاه‌های کارت‌خوان (POS)
// ==========================================
export async function upsertPaymentTerminalAction(input: {
  id?: string;
  bankAccountId: string;
  name: string;
  type: string;
  terminalCode?: string;
  isActive?: boolean;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return { success: false, error: "شما مجوز مدیریت کارت‌خوان‌ها را ندارید." };
  }

  const name = input.name?.trim();
  if (!name || !input.bankAccountId) {
    return {
      success: false,
      error: "نام دستگاه و حساب بانکی متصل الزامی است.",
    };
  }

  const bankExists = await prisma.clinicBankAccount.findFirst({
    where: { id: input.bankAccountId, clinicId: ctx.clinicId },
  });
  if (!bankExists) {
    return { success: false, error: "حساب بانکی انتخاب‌شده معتبر نیست." };
  }

  try {
    if (input.id) {
      await prisma.paymentTerminal.updateMany({
        where: { id: input.id, clinicId: ctx.clinicId },
        data: {
          bankAccountId: input.bankAccountId,
          name,
          type: input.type || "POS",
          terminalCode:
            normalizePersianDigits(input.terminalCode || "").trim() || null,
          isActive: input.isActive ?? true,
        },
      });
    } else {
      await prisma.paymentTerminal.create({
        data: {
          clinicId: ctx.clinicId,
          bankAccountId: input.bankAccountId,
          name,
          type: input.type || "POS",
          terminalCode:
            normalizePersianDigits(input.terminalCode || "").trim() || null,
          isActive: true,
        },
      });
    }

    revalidatePath("/clinic-dashboard/settings/financial");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در ذخیره دستگاه کارت‌خوان.",
    };
  }
}

export async function deletePaymentTerminalAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return {
      success: false,
      error: "شما مجوز حذف دستگاه کارت‌خوان را ندارید.",
    };
  }

  const paymentsCount = await prisma.payment.count({
    where: { terminalId: id },
  });
  if (paymentsCount > 0) {
    await prisma.paymentTerminal.updateMany({
      where: { id, clinicId: ctx.clinicId },
      data: { isActive: false },
    });
    revalidatePath("/clinic-dashboard/settings/financial");
    return {
      success: true,
      message: "به دلیل داشتن سابقه تراکنش، دستگاه به وضعیت غیرفعال تغییر یافت.",
    };
  }

  await prisma.paymentTerminal.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/settings/financial");
  return { success: true };
}

// ==========================================
// 3. سرویس‌های اعتباری (اسنپ‌پی، دیجی‌پی، تارا و...)
// ==========================================
export async function upsertCreditProviderAction(input: {
  id?: string;
  title: string;
  commissionPercent: number;
  clientFeePercent: number;
  isActive?: boolean;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return {
      success: false,
      error: "شما مجوز مدیریت سرویس‌های اعتباری را ندارید.",
    };
  }

  const title = input.title?.trim();
  const commissionPercent = Number(input.commissionPercent) || 0;
  const clientFeePercent = Number(input.clientFeePercent) || 0;

  if (!title) {
    return { success: false, error: "عنوان سرویس اعتباری الزامی است." };
  }
  if (
    commissionPercent < 0 ||
    commissionPercent > 100 ||
    clientFeePercent < 0 ||
    clientFeePercent > 100
  ) {
    return { success: false, error: "درصد کارمزد باید عددی بین ۰ تا ۱۰۰ باشد." };
  }

  try {
    if (input.id) {
      await prisma.clinicCreditProvider.updateMany({
        where: { id: input.id, clinicId: ctx.clinicId },
        data: {
          title,
          commissionPercent,
          clientFeePercent,
          isActive: input.isActive ?? true,
        },
      });
    } else {
      await prisma.clinicCreditProvider.create({
        data: {
          clinicId: ctx.clinicId,
          title,
          commissionPercent,
          clientFeePercent,
          isActive: true,
        },
      });
    }

    revalidatePath("/clinic-dashboard/settings/financial");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در ذخیره سرویس اعتباری.",
    };
  }
}

export async function deleteCreditProviderAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageFinancialSettings(ctx)) {
    return {
      success: false,
      error: "شما مجوز حذف سرویس اعتباری را ندارید.",
    };
  }

  const usedCount = await prisma.payment.count({
    where: { creditProviderId: id },
  });

  if (usedCount > 0) {
    await prisma.clinicCreditProvider.updateMany({
      where: { id, clinicId: ctx.clinicId },
      data: { isActive: false },
    });
    revalidatePath("/clinic-dashboard/settings/financial");
    return {
      success: true,
      message: "به دلیل ثبت تراکنش با این سرویس، وضعیت آن غیرفعال شد.",
    };
  }

  await prisma.clinicCreditProvider.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/settings/financial");
  return { success: true };
}