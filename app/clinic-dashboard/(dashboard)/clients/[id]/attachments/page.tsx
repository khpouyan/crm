import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientAttachmentsClient } from "@/components/clinic-dashboard/client-attachments-client";

export const metadata = {
  title: "ضمیمه‌های پرونده | پنل کلینیک",
};

export default async function ClientAttachmentsPage({
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
      attachments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  return (
    <ClientAttachmentsClient
      clientId={client.id}
      attachments={client.attachments.map((att) => ({
        id: att.id,
        title: att.title,
        fileUrl: att.fileUrl,
        fileType: att.fileType || "OTHER",
        createdAt: att.createdAt.toISOString(),
      }))}
      canEdit={hasPermission(ctx.clinicUser, "patients.edit")}
    />
  );
}