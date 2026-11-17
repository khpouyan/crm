import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users, Gift } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { formatJalali } from "@/lib/jalali";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "سوابق معرفی مراجع | پنل کلینیک",
};

export default async function ClientReferralsPage({
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
      referredClients: {
        include: {
          user: { select: { fullName: true, phone: true } },
          _count: { select: { providedServices: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      referredServices: {
        select: { referrerAmount: true },
      },
    },
  });

  if (!client) notFound();

  const totalCommission = client.referredServices.reduce(
    (sum, s) => sum + s.referrerAmount,
    0
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <p className="text-xs text-muted-foreground">
        فهرست افرادی که این مراجعه‌کننده به کلینیک معرفی کرده است:
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
          <div>
            <p className="text-xs text-muted-foreground">تعداد معرفی‌ها</p>
            <p className="mt-1 text-xl font-bold">
              {client.referredClients.length.toLocaleString("fa-IR")} نفر
            </p>
          </div>
          <Users className="size-8 text-primary" />
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-emerald-500/5 p-4 shadow-2xs">
          <div>
            <p className="text-xs text-muted-foreground">مجموع پورسانت معرفی</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {totalCommission.toLocaleString("fa-IR")} تومان
            </p>
          </div>
          <Gift className="size-8 text-emerald-600" />
        </div>
      </div>

      {client.referredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <Users className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">
            هنوز کسی توسط این مراجعه‌کننده معرفی نشده است
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره پرونده</TableHead>
                <TableHead className="text-right">نام معرفی‌شده</TableHead>
                <TableHead className="text-right">شماره موبایل</TableHead>
                <TableHead className="text-right">تعداد خدمات</TableHead>
                <TableHead className="text-right">تاریخ تشکیل پرونده</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.referredClients.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>{rc.fileNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/clinic-dashboard/clients/${rc.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {rc.user.fullName || "بدون نام"}
                    </Link>
                  </TableCell>
                  <TableCell dir="ltr" className="font-mono">
                    {rc.user.phone.startsWith("NO_PHONE_") ? "—" : rc.user.phone}
                  </TableCell>
                  <TableCell>
                    {rc._count.providedServices.toLocaleString("fa-IR")}
                  </TableCell>
                  <TableCell>{formatJalali(new Date(rc.createdAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}