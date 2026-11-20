// app/clinic-dashboard/(dashboard)/inventory/service-usage/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Stethoscope, Eye, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { formatJalaliNumeric } from "@/lib/jalali";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "کالاهای کسر شده با خدمات | انبار",
};

export default async function InventoryServiceUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const canView =
    hasPermission(ctx.clinicUser, "finance.inventory") ||
    hasPermission(ctx.clinicUser, "tools.inventory_view");
  if (!canView) redirect("/clinic-dashboard");

  const params = await searchParams;
  const { skip, take } = parsePaginationParams(params);

  const usages = await prisma.usedConsumable.findMany({
    where: { clinicProduct: { clinicId: ctx.clinicId } },
    include: {
      clinicProduct: { select: { name: true, unit: true } },
      providedService: {
        select: {
          clientId: true,
          invoiceId: true,
          createdAt: true,
          therapistNameSnapshot: true,
          subService: {
            select: { title: true, service: { select: { title: true } } },
          },
          client: {
            select: { user: { select: { fullName: true, phone: true } } },
          },
        },
      },
    },
    orderBy: { providedService: { createdAt: "desc" } },
    skip,
    take,
  });

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          کالاهای کسر شده با خدمات
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          لیست دقیق اقلام مصرفی که هنگام ثبت خدمات در پرونده مراجعین از انبار کسر شده‌اند
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="size-4 text-primary" />
            گزارش مصرف در خدمات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">کالای مصرفی</TableHead>
                  <TableHead className="text-right">مقدار</TableHead>
                  <TableHead className="text-right">خدمت انجام‌شده</TableHead>
                  <TableHead className="text-right">مراجع</TableHead>
                  <TableHead className="text-right">درمانگر</TableHead>
                  <TableHead className="w-24 text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      هنوز مصرفی‌ای در پرونده خدمات ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  usages.map((u) => {
                    const { clientId, invoiceId } = u.providedService;
                    const hasInvoice = Boolean(clientId && invoiceId);

                    const viewReportHref = hasInvoice
                      ? `/clinic-dashboard/clients/${clientId}/invoices/${invoiceId}/edit?step=3`
                      : null;

                    const editHref = hasInvoice
                      ? `/clinic-dashboard/clients/${clientId}/invoices/${invoiceId}/edit`
                      : `/clinic-dashboard/clients/${clientId}`;

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">
                          {formatJalaliNumeric(
                            new Date(u.providedService.createdAt)
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {u.clinicProduct.name}
                        </TableCell>
                        <TableCell className="tabular-nums font-semibold">
                          {u.quantity.toLocaleString("fa-IR")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {u.clinicProduct.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.providedService.subService.service.title} -{" "}
                          {u.providedService.subService.title}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Link
                            href={`/clinic-dashboard/clients/${clientId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {u.providedService.client.user.fullName ||
                              u.providedService.client.user.phone}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.providedService.therapistNameSnapshot || "—"}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            {viewReportHref && (
                              <Button
                                nativeButton={false}
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary hover:text-primary"
                                title="مشاهده رسید و گزارش سرویس (مرحله سوم)"
                                render={<Link href={viewReportHref} />}
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            )}

                            <Button
                              nativeButton={false}
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="ویرایش سرویس و فاکتور مراجع"
                              render={<Link href={editHref} />}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}