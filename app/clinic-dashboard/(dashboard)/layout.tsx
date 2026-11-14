// app/clinic-dashboard/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ClinicSidebar } from "@/components/clinic-dashboard/ClinicSidebar";
import { ModeToggle } from "@/components/mode-toggle";

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) {
    redirect("/clinic-dashboard/login");
  }

  const sidebarUser = {
    name: ctx.fullName || "کاربر کلینیک",
    phone: ctx.phone,
    avatar: ctx.clinicUser.avatarUrl || "",
    jobTitle: ctx.clinicUser.isOwner ? "مدیر کلینیک" : ctx.clinicUser.jobTitle,
    isOwner: ctx.clinicUser.isOwner,
    permissions: ctx.clinicUser.permissions,
  };

  const sidebarClinic = {
    name: ctx.clinic.name,
  };

  return (
    <SidebarProvider>
      {/* سایدبار سراسری کلینیک با اعمال سطح دسترسی */}
      <ClinicSidebar clinic={sidebarClinic} user={sidebarUser} />
      {/* ناحیه محتوای متغیر صفحات */}
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ms-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6" dir="rtl">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}