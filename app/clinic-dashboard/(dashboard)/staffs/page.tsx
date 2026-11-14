import { getStaffsPageData } from "./actions";
import { StaffsClient } from "@/components/clinic-dashboard/staffs-client";

export const metadata = {
  title: "مدیریت پرسنل و سطح دسترسی‌ها",
};

export default async function StaffsPage() {
  const data = await getStaffsPageData();

  return (
    <div className="flex flex-1 flex-col min-h-0" dir="rtl">
      {/* هدر استاندارد داخل SidebarInset */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-base font-bold tracking-tight">
              مدیریت پرسنل
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              تعریف اعضای تیم، نقش‌های درمانی و سطح دسترسی‌های عملیاتی در{" "}
              {data.clinicName}
            </p>
          </div>
        </div>
      </header>

      {/* محتوای اصلی صفحه */}
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <StaffsClient
          initialStaffs={data.staffs}
          services={data.services}
          maxStaff={data.maxStaff}
        />
      </main>
    </div>
  );
}