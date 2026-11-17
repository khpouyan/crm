// app/clinic-dashboard/(dashboard)/clients/[id]/medical-file/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientMedicalFileClient } from "@/components/clinic-dashboard/client-medical-file-client";

export const metadata = {
  title: "پرونده پزشکی مراجع | پنل کلینیک",
};

export default async function ClientMedicalFilePage({
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
    select: {
      id: true,
      medicalRecord: true,
    },
  });

  if (!client) notFound();

  const rawRecord =
    client.medicalRecord && typeof client.medicalRecord === "object"
      ? (client.medicalRecord as {
          conditions?: string[];
          surgeryCount?: string;
          allergies?: string;
          cosmeticHistory?: string;
          specialDisease?: string;
          medications?: string;
          heightCm?: string;
          weightKg?: string;
          weightGainLastYear?: string;
          weightLossLastYear?: string;
          notes?: string;
        })
      : {};

  return (
    <ClientMedicalFileClient
      clientId={client.id}
      initialRecord={{
        conditions: Array.isArray(rawRecord.conditions)
          ? rawRecord.conditions
          : [],
        surgeryCount: rawRecord.surgeryCount || "",
        allergies: rawRecord.allergies || "",
        cosmeticHistory: rawRecord.cosmeticHistory || "",
        specialDisease: rawRecord.specialDisease || "",
        medications: rawRecord.medications || "",
        heightCm: rawRecord.heightCm || "",
        weightKg: rawRecord.weightKg || "",
        weightGainLastYear: rawRecord.weightGainLastYear || "",
        weightLossLastYear: rawRecord.weightLossLastYear || "",
        notes: rawRecord.notes || "",
      }}
      canEdit={hasPermission(ctx.clinicUser, "patients.edit")}
    />
  );
}