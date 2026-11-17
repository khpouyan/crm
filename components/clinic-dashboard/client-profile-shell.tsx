// components/clinic-dashboard/client-profile-shell.tsx
"use client";

import { usePathname } from "next/navigation";
import { ClientProfileHeader } from "@/components/clinic-dashboard/client-profile-header";

interface ClientProfileShellProps {
  client: {
    id: string;
    fileNumber: number | null;
    fullName: string;
    phone: string | null;
    nationalId: string | null;
    walletBalance: number;
    servicesCount: number;
  };
  children: React.ReactNode;
}

export function ClientProfileShell({
  client,
  children,
}: ClientProfileShellProps) {
  const pathname = usePathname();
  // در صفحات ثبت/ویرایش فاکتور، هدر پرونده مخفی می‌شود تا ویزارد در فضای تمام‌صفحه نمایش داده شود
  const isWizardRoute =
    pathname.endsWith("/invoices/new") || pathname.endsWith("/edit");

  if (isWizardRoute) {
    return <div className="flex min-h-full flex-col bg-muted/20">{children}</div>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <ClientProfileHeader client={client} />
      <div className="flex-1">{children}</div>
    </div>
  );
}