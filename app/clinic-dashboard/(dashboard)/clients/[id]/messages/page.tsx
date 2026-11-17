import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ClientMessagesClient } from "@/components/clinic-dashboard/client-messages-client";

export const metadata = {
  title: "پیام‌های ارسالی مراجع | پنل کلینیک",
};

export default async function ClientMessagesPage({
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
      user: { select: { fullName: true, phone: true } },
      smsLogs: {
        orderBy: { sentAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const isNoPhone = client.user.phone.startsWith("NO_PHONE_");

  return (
    <ClientMessagesClient
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        phone: isNoPhone ? null : client.user.phone,
      }}
      smsLogs={client.smsLogs.map((log) => ({
        id: log.id,
        title: log.title || "پیامک سیستمی",
        messageBody: log.messageBody,
        status: log.status,
        sentAt: log.sentAt.toISOString(),
      }))}
      canSendSms={hasPermission(ctx.clinicUser, "other.messages")}
    />
  );
}