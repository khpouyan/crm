import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  hasPermission,
  buildProvidedServiceScopeFilter,
} from "@/lib/permissions";
import { ClientDetailPrintClient } from "@/components/clinic-dashboard/client-detail-print-client";

export const metadata = {
  title: "گزارش پرونده و پرینت | پنل کلینیک",
};

export default async function ClientDetailReportPage({
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
        select: { fullName: true, phone: true, nationalId: true },
      },
      clinic: {
        select: { name: true, currentPlan: true },
      },
      providedServices: {
        where: buildProvidedServiceScopeFilter(ctx.clinicUser),
        include: {
          subService: {
            include: { service: { select: { title: true } } },
          },
          therapist: {
            include: { user: { select: { fullName: true } } },
          },
          invoice: {
            select: {
              invoiceNumber: true,
              discountAmount: true,
              totalAmount: true,
              status: true,
            },
          },
        },
        orderBy: { performedAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const rawMed =
    client.medicalRecord && typeof client.medicalRecord === "object"
      ? (client.medicalRecord as { conditions?: string[]; notes?: string })
      : {};

  return (
    <ClientDetailPrintClient
      clinicName={client.clinic.name}
      managerName={ctx.fullName || "اپراتور سیستم"}
      client={{
        fileNumber: client.fileNumber,
        fullName: client.user.fullName || "بدون نام",
        phone: client.user.phone.startsWith("NO_PHONE_")
          ? "—"
          : client.user.phone,
        nationalId: client.user.nationalId || "—",
        gender:
          client.gender === "MALE"
            ? "آقا"
            : client.gender === "FEMALE"
            ? "خانم"
            : "—",
        birthDate: client.birthDate ? client.birthDate.toISOString() : null,
        notes: client.notes,
        createdAt: client.createdAt.toISOString(),
      }}
      medicalConditions={
        Array.isArray(rawMed.conditions) ? rawMed.conditions : []
      }
      medicalNotes={rawMed.notes || null}
      services={client.providedServices.map((ps) => ({
        id: ps.id,
        serviceTitle: ps.subService.service.title,
        subServiceTitle: ps.subService.title,
        therapistName:
          ps.therapist?.user.fullName || ps.therapistNameSnapshot || "—",
        performedAt: ps.performedAt.toISOString(),
        finalPrice: ps.finalPrice,
        description: ps.description,
        invoiceNumber: ps.invoice?.invoiceNumber ?? null,
        invoiceStatus: ps.invoice?.status ?? "PAID",
      }))}
    />
  );
}