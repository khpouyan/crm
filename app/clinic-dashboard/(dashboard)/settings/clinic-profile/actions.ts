// app/clinic-dashboard/(dashboard)/settings/clinic-profile/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { isValidNationalId } from "@/lib/national-id";

export async function updateClinicProfileAction(input: {
  name: string;
  logoUrl?: string | null;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  landlinePhone?: string;
  secondaryPhone?: string;
  ownerNationalId?: string;
  medicalCouncilCode?: string;
  website?: string;
  instagram?: string;
}) {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    const canManage =
      ctx.clinicUser.isOwner ||
      hasPermission(ctx.clinicUser, "management.settings");

    if (!canManage) {
      return {
        success: false,
        error: "شما مجوز ویرایش مشخصات کلینیک را ندارید.",
      };
    }

    const cleanName = input.name?.trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "نام کلینیک یا مرکز الزامی است." };
    }

    const cleanOwnerNationalId = normalizePersianDigits(
      input.ownerNationalId || ""
    ).trim();

    if (cleanOwnerNationalId && !isValidNationalId(cleanOwnerNationalId)) {
      return {
        success: false,
        error: "کد ملی صاحب کلینیک معتبر نیست.",
      };
    }

    const cleanPostalCode = normalizePersianDigits(
      input.postalCode || ""
    ).trim();
    const cleanLandline = normalizePersianDigits(
      input.landlinePhone || ""
    ).trim();
    const cleanSecondaryPhone = normalizePersianDigits(
      input.secondaryPhone || ""
    ).trim();
    const cleanMedicalCode = normalizePersianDigits(
      input.medicalCouncilCode || ""
    ).trim();

    await prisma.clinic.update({
      where: { id: ctx.clinicId },
      data: {
        name: cleanName,
        logoUrl: input.logoUrl?.trim() || null,
        province: input.province?.trim() || null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        postalCode: cleanPostalCode || null,
        landlinePhone: cleanLandline || null,
        secondaryPhone: cleanSecondaryPhone || null,
        ownerNationalId: cleanOwnerNationalId || null,
        medicalCouncilCode: cleanMedicalCode || null,
        website: input.website?.trim() || null,
        instagram: input.instagram?.trim() || null,
      },
    });

    revalidatePath("/clinic-dashboard", "layout");
    revalidatePath("/clinic-dashboard/settings/clinic-profile");

    return { success: true };
  } catch (error) {
    console.error("Update clinic profile error:", error);
    return {
      success: false,
      error: "خطایی در ذخیره اطلاعات مرکز رخ داد.",
    };
  }
}