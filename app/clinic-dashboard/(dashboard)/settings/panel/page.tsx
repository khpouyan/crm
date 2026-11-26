// app/clinic-dashboard/(dashboard)/settings/panel/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { PanelSettingsClient } from "@/components/clinic-dashboard/panel-settings/panel-settings-client";

export const metadata = {
  title: "تنظیمات پنل | پنل کلینیک",
};

export default async function PanelSettingsPage() {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canAccess =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "management.settings");

  if (!canAccess) {
    redirect("/clinic-dashboard");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: ctx.clinicId },
    select: {
      fileNumberAutoEnabled: true,
      fileNumberStartFrom: true,
      invoiceNumberAutoEnabled: true,
      invoiceNumberStartFrom: true,
      fileCompletenessConfig: true,
    },
  });

  if (!clinic) redirect("/clinic-dashboard");

  return (
    <PanelSettingsClient
      numbering={{
        fileNumberAutoEnabled: clinic.fileNumberAutoEnabled,
        fileNumberStartFrom: clinic.fileNumberStartFrom,
        invoiceNumberAutoEnabled: clinic.invoiceNumberAutoEnabled,
        invoiceNumberStartFrom: clinic.invoiceNumberStartFrom,
      }}
      completenessConfig={
        (clinic.fileCompletenessConfig as Record<string, unknown>) || {}
      }
    />
  );
}
