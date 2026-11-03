import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-dashboard/AdminSidebar"
import { ModeToggle } from "@/components/mode-toggle"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* سایدبار سراسری ادمین */}
      <AdminSidebar />
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
  )
}