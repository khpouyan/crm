// app/clinic-dashboard/(dashboard)/clients/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { parsePaginationParams } from "@/lib/inventory/pagination-helper";
import { checkClinicExportCapability } from "@/lib/export/data-export";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { isValidNationalId } from "@/lib/national-id";
import {
  ClientsListClient,
  type ClientListItem,
} from "@/components/clinic-dashboard/clients-list-client";

export const metadata = {
  title: "پرونده‌ها و مراجعین | پنل کلینیک",
};

interface CompletenessConfig {
  requirePhone?: boolean;
  requireNationalId?: boolean;
  requireGender?: boolean;
  requireBirthDate?: boolean;
  requireAddress?: boolean;
  requireAtLeastOneService?: boolean;
}

function evaluateClientCompleteness(
  record: {
    fullName: string | null;
    phone: string;
    nationalId: string | null;
    gender: string | null;
    birthDate: Date | null;
    additionalInfo: unknown;
    servicesCount: number;
    appointmentsCount: number;
  },
  config: CompletenessConfig
): { isComplete: boolean; missingReasons: string[] } {
  const missingReasons: string[] = [];
  const isNoPhone = record.phone.startsWith("NO_PHONE_");

  if (!record.fullName || !record.fullName.trim()) {
    missingReasons.push("نام و نام خانوادگی ثبت نشده است");
  }

  if (config.requirePhone && (isNoPhone || !record.phone.trim())) {
    missingReasons.push("شماره تماس معتبر ثبت نشده است");
  }

  if (config.requireNationalId) {
    const cleanNat = normalizePersianDigits(record.nationalId || "").replace(
      /\D/g,
      ""
    );
    if (!cleanNat || !isValidNationalId(cleanNat)) {
      missingReasons.push("کد ملی معتبر ثبت نشده است");
    }
  }

  if (config.requireGender && !record.gender) {
    missingReasons.push("جنسیت ثبت نشده است");
  }

  if (config.requireBirthDate && !record.birthDate) {
    missingReasons.push("تاریخ تولد ثبت نشده است");
  }

  if (config.requireAddress) {
    const addInfo =
      record.additionalInfo && typeof record.additionalInfo === "object"
        ? (record.additionalInfo as Record<string, unknown>)
        : {};
    const address = String(addInfo.address || "").trim();
    if (!address) {
      missingReasons.push("آدرس در اطلاعات تکمیلی ثبت نشده است");
    }
  }

  if (
    config.requireAtLeastOneService &&
    record.servicesCount === 0 &&
    record.appointmentsCount === 0
  ) {
    missingReasons.push("حداقل یک سرویس یا نوبت ثبت نشده است");
  }

  return {
    isComplete: missingReasons.length === 0,
    missingReasons,
  };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  if (!hasPermission(ctx.clinicUser, "patients.view")) {
    redirect("/clinic-dashboard");
  }

  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);
  const query = normalizePersianDigits(params.q || "").trim();
  const statusFilter =
    params.status === "INCOMPLETE" || params.status === "COMPLETE"
      ? params.status
      : "ALL";
  const sortParam = params.sort || "fileNumber_desc";

  const clinicMeta = await prisma.clinic.findUnique({
    where: { id: ctx.clinicId },
    select: {
      fileNumberAutoEnabled: true,
      fileNumberStartFrom: true,
      fileCompletenessConfig: true,
    },
  });

  const fileNumberAutoEnabled = clinicMeta?.fileNumberAutoEnabled ?? true;
  const fileNumberStartFrom = clinicMeta?.fileNumberStartFrom ?? 1001;
  const completenessConfig: CompletenessConfig =
    clinicMeta?.fileCompletenessConfig &&
    typeof clinicMeta.fileCompletenessConfig === "object"
      ? (clinicMeta.fileCompletenessConfig as CompletenessConfig)
      : {};

  const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

  const searchWhereClause = {
    clinicId: ctx.clinicId,
    ...(query
      ? {
          OR: [
            {
              user: {
                fullName: { contains: query, mode: "insensitive" as const },
              },
            },
            { nickname: { contains: query, mode: "insensitive" as const } },
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
    matchingClientsRows,
    canExport,
    lastClient,
    staffReferrers,
    allClinicClients,
  ] = await Promise.all([
    prisma.client.findMany({
      where: searchWhereClause,
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
            appointments: true,
            invoices: true,
            walletTransactions: true,
          },
        },
      },
      orderBy,
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
        user: { select: { fullName: true, phone: true, nationalId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const nextSuggestedFileNumber = lastClient?.fileNumber
    ? Math.max(lastClient.fileNumber + 1, fileNumberStartFrom)
    : fileNumberStartFrom;

  const evaluatedAll: ClientListItem[] = matchingClientsRows.map((c) => {
    const isNoPhone = c.user.phone.startsWith("NO_PHONE_");
    const evalResult = evaluateClientCompleteness(
      {
        fullName: c.user.fullName,
        phone: c.user.phone,
        nationalId: c.user.nationalId,
        gender: c.gender,
        birthDate: c.birthDate,
        additionalInfo: c.additionalInfo,
        servicesCount: c._count.providedServices,
        appointmentsCount: c._count.appointments,
      },
      completenessConfig
    );

    return {
      id: c.id,
      fileNumber: c.fileNumber,
      fullName: c.user.fullName || "بدون نام",
      nickname: c.nickname,
      phone: isNoPhone ? null : c.user.phone,
      nationalId: c.user.nationalId,
      gender: c.gender,
      tag: c.tag,
      walletBalance: c.walletBalance,
      servicesCount: c._count.providedServices,
      isComplete: evalResult.isComplete,
      missingReasons: evalResult.missingReasons,
      createdAt: c.createdAt.toISOString(),
      invoicesCount: c._count.invoices,
      walletTransactionsCount: c._count.walletTransactions,
    };
  });

  const statusFilteredList = evaluatedAll.filter((item) => {
    if (statusFilter === "COMPLETE") return item.isComplete;
    if (statusFilter === "INCOMPLETE") return !item.isComplete;
    return true;
  });

  const totalCount = statusFilteredList.length;
  const startIdx = (page - 1) * pageSize;
  const paginatedClients = statusFilteredList.slice(startIdx, startIdx + pageSize);

  const existingClientsSummary = allClinicClients.map((c) => ({
    id: c.id,
    fullName: c.user.fullName || "",
    nickname: c.nickname,
    fileNumber: c.fileNumber,
    phone: c.user.phone.startsWith("NO_PHONE_") ? null : c.user.phone,
    nationalId: c.user.nationalId || null,
  }));

  return (
    <ClientsListClient
      clients={paginatedClients}
      existingClients={existingClientsSummary}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      initialQuery={query}
      initialStatus={statusFilter}
      initialSort={sortParam}
      fileNumberAutoEnabled={fileNumberAutoEnabled}
      nextSuggestedFileNumber={nextSuggestedFileNumber}
      staffReferrers={staffReferrers.map((s) => ({
        id: s.id,
        label: s.user.fullName || s.jobTitle,
      }))}
      clientReferrers={allClinicClients.slice(0, 200).map((c) => ({
        id: c.id,
        label: `${c.user.fullName || "بدون نام"}${
          c.nickname ? ` (${c.nickname})` : ""
        }${c.fileNumber ? ` (پرونده ${c.fileNumber})` : ""}`,
      }))}
      canCreate={hasPermission(ctx.clinicUser, "patients.create")}
      canEdit={hasPermission(ctx.clinicUser, "patients.edit")}
      canDelete={hasPermission(ctx.clinicUser, "patients.delete")}
      canExport={canExport}
    />
  );
}
