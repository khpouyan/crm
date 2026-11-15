// app/clinic-dashboard/(dashboard)/inventory/suppliers/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { formatJalaliNumeric } from "@/lib/jalali";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  title: "کالاهای وارد شده با تامین‌کننده‌ها | انبار",
};

export default async function InventorySuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "finance.inventory")) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const { skip, take } = parsePaginationParams(params);

  const orders = await prisma.b2BOrder.findMany({
    where: { clinicId: ctx.clinicId },
    include: {
      items: {
        include: {
          platformProduct: { select: { name: true, unit: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          کالاهای وارد شده با تامین‌کننده‌ها
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          سوابق سفارشات و خریدهای عمده ثبت‌شده از تامین‌کنندگان پلتفرم
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" />
            لیست سفارشات تامین کالا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-right">تاریخ سفارش</TableHead>
                  <TableHead className="text-right">اقلام سفارش</TableHead>
                  <TableHead className="text-right">مبلغ کل (تومان)</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      هنوز سفارشی از تامین‌کنندگان ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-xs">
                        {formatJalaliNumeric(new Date(order.createdAt))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.items
                          .map(
                            (it) =>
                              `${it.platformProduct.name} (${it.quantity} ${it.platformProduct.unit})`
                          )
                          .join("، ")}
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {order.totalAmount.toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
