// app/clinic-dashboard/(dashboard)/clients/[id]/layout.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientProfileHeader } from "@/components/clinic-dashboard/client-profile-header";

export default async function ClientProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
      _count: {
        select: {
          providedServices: true,
        },
      },
    },
  });

  if (!client) notFound();

  const isNoPhone = client.user.phone.startsWith("NO_PHONE_");

  return (
    <div className="flex min-h-full flex-col">
      <ClientProfileHeader
        client={{
          id: client.id,
          fileNumber: client.fileNumber,
          fullName: client.user.fullName || "بدون نام",
          phone: isNoPhone ? null : client.user.phone,
          nationalId: client.user.nationalId,
          walletBalance: client.walletBalance,
          servicesCount: client._count.providedServices,
        }}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}