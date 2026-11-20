// app/clinic-dashboard/(dashboard)/clients/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { checkClinicExportCapability } from "@/lib/export/data-export";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { ClientsListClient } from "@/components/clinic-dashboard/clients-list-client";

export const metadata = {
  title: "پرونده‌ها و مراجعین | پنل کلینیک",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string; // ALL | INCOMPLETE | COMPLETE
    sort?: string;   // fileNumber_desc | fileNumber_asc | newest | oldest
  }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "patients.view")) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePaginationParams(params);
  const query = normalizePersianDigits(params.q || "").trim();
  const statusFilter =
    params.status === "INCOMPLETE" || params.status === "COMPLETE"
      ? params.status
      : "ALL";
  const sortParam = params.sort || "fileNumber_desc";

  // تعریف شرط تکمیل بودن پرونده: دارای نام، شماره موبایل واقعی (نه NO_PHONE) و کد ملی
  const completeCondition = {
    user: {
      fullName: { not: null },
      phone: { not: { startsWith: "NO_PHONE_" } },
    },
  };

  const incompleteCondition = {
    OR: [
      { user: { fullName: null } },
      { user: { phone: { startsWith: "NO_PHONE_" } } },
    ],
  };

  const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

  const whereClause = {
    clinicId: ctx.clinicId,
    ...(statusFilter === "COMPLETE"
      ? completeCondition
      : statusFilter === "INCOMPLETE"
      ? incompleteCondition
      : {}),
    ...(query
      ? {
          OR: [
            { user: { fullName: { contains: query, mode: "insensitive" as const } } },
            { user: { phone: { contains: query } } },
            { user: { nationalId: { contains: query } } },
            ...(numericQuery !== null ? [{ fileNumber: numericQuery }] : []),
          ],
        }
      : {}),
  };

  const orderBy =
    sortParam === "fileNumber_asc"
      ? [
          { fileNumber: { sort: "asc" as const, nulls: "last" as const } },
          { createdAt: "asc" as const },
        ]
      : sortParam === "newest"
      ? [{ createdAt: "desc" as const }]
      : sortParam === "oldest"
      ? [{ createdAt: "asc" as const }]
      : [
          { fileNumber: { sort: "desc" as const, nulls: "last" as const } },
          { createdAt: "desc" as const },
        ];
  const [
    totalCount,
    clients,
    canExport,
    lastClient,
    staffReferrers,
    clientReferrers,
  ] = await Promise.all([
    prisma.client.count({ where: whereClause }),
    prisma.client.findMany({
      where: whereClause,
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
            invoices: true,
            walletTransactions: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    }),
    checkClinicExportCapability(ctx.clinicId),
    prisma.client.findFirst({
      where: { clinicId: ctx.clinicId, fileNumber: { not: null } },
      orderBy: { fileNumber: "desc" },
      select: { fileNumber: true },
    }),
    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        deletedAt: null,
        isActive: true,
        canBeReferrer: true,
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.client.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        user: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const nextSuggestedFileNumber = (lastClient?.fileNumber || 1000) + 1;

  const serializedClients = clients.map((c) => {
    const isNoPhone = c.user.phone.startsWith("NO_PHONE_");
    const isComplete = Boolean(c.user.fullName && !isNoPhone);

    return {
      id: c.id,
      fileNumber: c.fileNumber,
      fullName: c.user.fullName || "بدون نام",
      phone: isNoPhone ? null : c.user.phone,
      nationalId: c.user.nationalId,
      gender: c.gender,
      tag: c.tag,
      walletBalance: c.walletBalance,
      servicesCount: c._count.providedServices,
      isComplete,
      createdAt: c.createdAt.toISOString(),
      invoicesCount: c._count.invoices,
      walletTransactionsCount: c._count.walletTransactions,
    };
  });

  return (
    <ClientsListClient
      clients={serializedClients}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      initialQuery={query}
      initialStatus={statusFilter}
      initialSort={sortParam}
      nextSuggestedFileNumber={nextSuggestedFileNumber}
      staffReferrers={staffReferrers.map((s) => ({
        id: s.id,
        label: s.user.fullName || s.jobTitle,
      }))}
      clientReferrers={clientReferrers.map((c) => ({
        id: c.id,
        label: `${c.user.fullName || "بدون نام"}${
          c.fileNumber ? ` (پرونده ${c.fileNumber})` : ""
        }`,
      }))}
      canCreate={hasPermission(ctx.clinicUser, "patients.create")}
      canEdit={hasPermission(ctx.clinicUser, "patients.edit")}
      canDelete={hasPermission(ctx.clinicUser, "patients.delete")}
      canExport={canExport}
    />
  );
}