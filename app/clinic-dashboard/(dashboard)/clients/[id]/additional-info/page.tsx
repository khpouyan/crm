// app/clinic-dashboard/(dashboard)/clients/[id]/additional-info/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientAdditionalInfoClient } from "@/components/clinic-dashboard/client-additional-info-client";

export const metadata = {
  title: "اطلاعات تکمیلی مراجع | پنل کلینیک",
};

export default async function ClientAdditionalInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "patients.view")) {
    redirect("/clinic-dashboard");
  }

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, clinicId: ctx.clinicId },
    include: {
      user: {
        select: {
          fullName: true,
          phone: true,
          nationalId: true,
        },
      },
      referrerClient: {
        include: { user: { select: { fullName: true } } },
      },
      referrerStaff: {
        include: { user: { select: { fullName: true } } },
      },
      providedServices: {
        orderBy: { performedAt: "desc" },
        take: 1,
        select: { performedAt: true },
      },
      _count: {
        select: { providedServices: true },
      },
    },
  });

  if (!client) notFound();

  const isNoPhone = client.user.phone.startsWith("NO_PHONE_");
  const rawAdditional =
    client.additionalInfo && typeof client.additionalInfo === "object"
      ? (client.additionalInfo as Record<string, string | null | undefined>)
      : {};

  return (
    <ClientAdditionalInfoClient
      client={{
        id: client.id,
        fileNumber: client.fileNumber,
        fullName: client.user.fullName || "",
        phone: isNoPhone ? "" : client.user.phone,
        nationalId: client.user.nationalId || "",
        gender: client.gender || "FEMALE",
        birthDate: client.birthDate ? client.birthDate.toISOString() : null,
        referralSource: client.referralSource,
        referrerName:
          client.referrerClient?.user.fullName ||
          client.referrerStaff?.user.fullName ||
          null,
        tag: client.tag || "NONE",
        servicesCount: client._count.providedServices,
        lastVisitAt: client.providedServices[0]?.performedAt.toISOString() || null,
        additionalInfo: {
          fatherName: rawAdditional.fatherName || "",
          secondaryPhone: rawAdditional.secondaryPhone || "",
          maritalStatus: rawAdditional.maritalStatus || "NONE",
          marriageDate: rawAdditional.marriageDate || null,
          educationLevel: rawAdditional.educationLevel || "NONE",
          fieldOfStudy: rawAdditional.fieldOfStudy || "",
          insurance: rawAdditional.insurance || "NONE",
          occupation: rawAdditional.occupation || "",
          postalCode: rawAdditional.postalCode || "",
          address: rawAdditional.address || "",
        },
      }}
      canEdit={hasPermission(ctx.clinicUser, "patients.edit")}
    />
  );
}