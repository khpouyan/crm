// app/clinic-dashboard/(dashboard)/settings/clinic-profile/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClinicProfileClient } from "@/components/clinic-dashboard/clinic-profile-client";

export const metadata = {
  title: "مشخصات و اطلاعات تکمیلی کلینیک | پنل کلینیک",
};

export default async function ClinicProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canAccess =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "management.settings");

  if (!canAccess) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;

  const [clinic, ownerMember] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: ctx.clinicId },
    }),
    prisma.clinicUser.findFirst({
      where: { clinicId: ctx.clinicId, isOwner: true },
      include: {
        user: { select: { fullName: true, phone: true } },
      },
    }),
  ]);

  if (!clinic) {
    redirect("/clinic-dashboard");
  }

  return (
    <ClinicProfileClient
      clinic={{
        id: clinic.id,
        name: clinic.name,
        subdomain: clinic.subdomain,
        logoUrl: clinic.logoUrl,
        province: clinic.province,
        city: clinic.city,
        address: clinic.address,
        postalCode: clinic.postalCode,
        landlinePhone: clinic.landlinePhone,
        secondaryPhone: clinic.secondaryPhone,
        ownerNationalId: clinic.ownerNationalId,
        medicalCouncilCode: clinic.medicalCouncilCode,
        website: clinic.website,
        instagram: clinic.instagram,
      }}
      ownerFullName={ownerMember?.user.fullName || "مدیر کلینیک"}
      ownerPhone={ownerMember?.user.phone || ""}
      isWelcomeOnboarding={params.welcome === "1"}
    />
  );
}