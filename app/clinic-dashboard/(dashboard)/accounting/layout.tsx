// app/clinic-dashboard/(dashboard)/accounting/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const allowed =
    ctx.clinicUser.isOwner ||
    hasPermission(ctx.clinicUser, "finance.accounting") ||
    hasPermission(ctx.clinicUser, "finance.visit_report");

  if (!allowed) {
    redirect("/clinic-dashboard");
  }

  return <div className="space-y-6 p-4 md:p-0">{children}</div>;
}