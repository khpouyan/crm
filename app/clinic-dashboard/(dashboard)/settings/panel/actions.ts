// app/clinic-dashboard/(dashboard)/settings/panel/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

function canManagePanelSettings(
  ctx: NonNullable<Awaited<ReturnType<typeof getCurrentClinicContext>>>
) {
  return (
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "management.settings")
  );
}

export async function saveNumberingSettingsAction(input: {
  fileNumberAutoEnabled: boolean;
  fileNumberStartFrom: number;
  invoiceNumberAutoEnabled: boolean;
  invoiceNumberStartFrom: number;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManagePanelSettings(ctx)) {
    return { success: false, error: "شما مجوز تغییر تنظیمات پنل را ندارید." };
  }

  const fileStart = Math.max(
    1,
    Math.round(
      Number(normalizePersianDigits(String(input.fileNumberStartFrom))) || 1001
    )
  );
  const invoiceStart = Math.max(
    1,
    Math.round(
      Number(normalizePersianDigits(String(input.invoiceNumberStartFrom))) ||
        150001
    )
  );

  try {
    await prisma.clinic.update({
      where: { id: ctx.clinicId },
      data: {
        fileNumberAutoEnabled: Boolean(input.fileNumberAutoEnabled),
        fileNumberStartFrom: fileStart,
        invoiceNumberAutoEnabled: Boolean(input.invoiceNumberAutoEnabled),
        invoiceNumberStartFrom: invoiceStart,
      },
    });

    revalidatePath("/clinic-dashboard/settings/panel");
    revalidatePath("/clinic-dashboard/clients");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات شماره‌گذاری.",
    };
  }
}

export async function saveFileCompletenessConfigAction(
  config: Record<string, unknown>
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };
  if (!canManagePanelSettings(ctx)) {
    return { success: false, error: "شما مجوز تغییر تنظیمات پنل را ندارید." };
  }

  try {
    await prisma.clinic.update({
      where: { id: ctx.clinicId },
      data: {
        fileCompletenessConfig: JSON.parse(JSON.stringify(config ?? {})),
      },
    });

    revalidatePath("/clinic-dashboard/settings/panel");
    revalidatePath("/clinic-dashboard/clients");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات تکمیل پرونده.",
    };
  }
}
