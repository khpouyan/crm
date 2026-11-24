// app/clinic-dashboard/(dashboard)/accounting/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { AccountingEntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile";

function canManageAccounting(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "finance.accounting")
  );
}

// ==========================================
// 1. مدیریت ذی‌نفعان (Beneficiaries)
// ==========================================
export async function upsertBeneficiaryAction(input: {
  id?: string;
  fullName: string;
  phone?: string;
  notes?: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "شما مجوز مدیریت حسابداری را ندارید." };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return { success: false, error: "نام ذی‌نفع الزامی است." };
  }

  const rawPhone = normalizePersianDigits(input.phone || "").trim();
  let cleanPhone: string | null = null;
  if (rawPhone) {
    if (!isValidIranPhone(rawPhone)) {
      return { success: false, error: "شماره تماس واردشده معتبر نیست." };
    }
    cleanPhone = normalizeIranPhone(rawPhone);
  }

  try {
    if (input.id) {
      await prisma.accountingBeneficiary.updateMany({
        where: { id: input.id, clinicId: ctx.clinicId },
        data: {
          fullName,
          phone: cleanPhone,
          notes: input.notes?.trim() || null,
        },
      });
    } else {
      await prisma.accountingBeneficiary.create({
        data: {
          clinicId: ctx.clinicId,
          fullName,
          phone: cleanPhone,
          notes: input.notes?.trim() || null,
        },
      });
    }

    revalidatePath("/clinic-dashboard/accounting/settings");
    revalidatePath("/clinic-dashboard/accounting/payouts");
    revalidatePath("/clinic-dashboard/accounting/debts");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در ذخیره ذی‌نفع.",
    };
  }
}

export async function deleteBeneficiaryAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "مجوز حذف ندارید." };
  }

  await prisma.accountingBeneficiary.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/accounting/settings");
  return { success: true };
}

// ==========================================
// 2. شرح‌های آماده پرداختی / دریافتی / بدهی
// ==========================================
export async function createAccountingDescriptionAction(input: {
  scope: "PAYOUT" | "RECEIVE" | "DEBT";
  title: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "مجوز ثبت شرح جدید ندارید." };
  }

  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: "عنوان شرح نمی‌تواند خالی باشد." };
  }

  await prisma.accountingDescriptionItem.create({
    data: {
      clinicId: ctx.clinicId,
      scope: input.scope,
      title,
    },
  });

  revalidatePath("/clinic-dashboard/accounting/settings");
  revalidatePath("/clinic-dashboard/accounting/payouts");
  revalidatePath("/clinic-dashboard/accounting/debts");
  revalidatePath("/clinic-dashboard/accounting/receivables");
  return { success: true };
}

export async function deleteAccountingDescriptionAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "مجوز حذف ندارید." };
  }

  await prisma.accountingDescriptionItem.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/accounting/settings");
  return { success: true };
}

// ==========================================
// 3. ثبت و حذف سند پرداختی / بدهی (Ledger Entry)
// ==========================================
export async function createLedgerEntryAction(input: {
  entryType: "PAYOUT" | "DEBT";
  beneficiaryId?: string | null;
  serviceId?: string | null;
  therapistId?: string | null;
  clientId?: string | null;
  paymentMethod?: string | null;
  descriptionText?: string;
  amount: number;
  notes?: string;
  entryDate?: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "مجوز ثبت سند حسابداری ندارید." };
  }

  const amount = Math.round(Number(input.amount) || 0);
  if (amount <= 0) {
    return { success: false, error: "مبلغ باید بزرگ‌تر از صفر باشد." };
  }

  try {
    await prisma.accountingLedgerEntry.create({
      data: {
        clinicId: ctx.clinicId,
        entryType:
          input.entryType === "PAYOUT"
            ? AccountingEntryType.PAYOUT
            : AccountingEntryType.DEBT,
        beneficiaryId:
          input.beneficiaryId && input.beneficiaryId !== "NONE"
            ? input.beneficiaryId
            : null,
        serviceId:
          input.serviceId && input.serviceId !== "NONE" ? input.serviceId : null,
        therapistId:
          input.therapistId && input.therapistId !== "NONE"
            ? input.therapistId
            : null,
        clientId:
          input.clientId && input.clientId !== "NONE" ? input.clientId : null,
        createdById: ctx.clinicUserId,
        paymentMethod: input.paymentMethod || null,
        descriptionText: input.descriptionText?.trim() || null,
        amount,
        notes: input.notes?.trim() || null,
        entryDate: input.entryDate ? new Date(input.entryDate) : new Date(),
      },
    });

    revalidatePath("/clinic-dashboard/accounting/payouts");
    revalidatePath("/clinic-dashboard/accounting/debts");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در ثبت سند.",
    };
  }
}

export async function deleteLedgerEntryAction(id: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManageAccounting(ctx)) {
    return { success: false, error: "مجوز حذف ندارید." };
  }

  await prisma.accountingLedgerEntry.deleteMany({
    where: { id, clinicId: ctx.clinicId },
  });

  revalidatePath("/clinic-dashboard/accounting/payouts");
  revalidatePath("/clinic-dashboard/accounting/debts");
  return { success: true };
}

// ==========================================
// 4. تنظیمات مالیات بر ارزش افزوده و خدمات مشمول مالیات
// ==========================================
export async function saveTaxSettingsAction(input: {
  vatPercent: number;
  taxEnabledServiceIds: string[];
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (
    !ctx.clinicUser.isOwner &&
    !hasPermission(ctx.clinicUser, "management.settings") &&
    !hasPermission(ctx.clinicUser, "finance.accounting")
  ) {
    return { success: false, error: "مجوز تغییر تنظیمات مالیات ندارید." };
  }

  const vatPercent = Math.max(0, Math.min(100, Number(input.vatPercent) || 0));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clinic.update({
        where: { id: ctx.clinicId },
        data: { vatPercent },
      });

      await tx.service.updateMany({
        where: { clinicId: ctx.clinicId },
        data: { taxEnabled: false },
      });

      if (input.taxEnabledServiceIds.length > 0) {
        await tx.service.updateMany({
          where: {
            clinicId: ctx.clinicId,
            id: { in: input.taxEnabledServiceIds },
          },
          data: { taxEnabled: true },
        });
      }
    });

    revalidatePath("/clinic-dashboard/accounting/settings");
    revalidatePath("/clinic-dashboard/clients");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در ذخیره تنظیمات مالیات.",
    };
  }
}