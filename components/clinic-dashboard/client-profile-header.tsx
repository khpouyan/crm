// components/clinic-dashboard/client-profile-header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileStack,
  MessageSquare,
  FileHeart,
  Printer,
  CreditCard,
  Wallet,
  FolderCog,
  UserPlus,
  Paperclip,
  PhoneCall,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ClientProfileHeaderProps {
  client: {
    id: string;
    fileNumber: number | null;
    fullName: string;
    phone: string | null;
    nationalId: string | null;
    walletBalance: number;
    servicesCount: number;
  };
}

export function ClientProfileHeader({ client }: ClientProfileHeaderProps) {
  const pathname = usePathname();
  const basePath = `/clinic-dashboard/clients/${client.id}`;

  const navItems = [
    { href: basePath, label: "سرویس‌ها", icon: FileStack, exact: true },
    { href: `${basePath}/messages`, label: "پیام‌های ارسالی", icon: MessageSquare },
    { href: `${basePath}/medical-file`, label: "پرونده پزشکی", icon: FileHeart },
    { href: `${basePath}/detail`, label: "گزارش پرونده", icon: Printer },
    { href: `${basePath}/financial-records`, label: "گزارش مالی", icon: CreditCard },
    { href: `${basePath}/wallet`, label: "کیف پول", icon: Wallet },
    { href: `${basePath}/additional-info`, label: "اطلاعات تکمیلی", icon: FolderCog },
    { href: `${basePath}/referrals`, label: "سوابق معرفی", icon: UserPlus },
    { href: `${basePath}/attachments`, label: "ضمیمه‌ها", icon: Paperclip },
  ];

  return (
    <div className="space-y-4 border-b bg-card/50 px-4 py-4 md:px-6">
      {/* مسیر بازگشت و عنوان */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Button
            render={<Link href="/clinic-dashboard/clients" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            پرونده‌ها
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold text-foreground">{client.fullName}</span>
          {client.fileNumber && (
            <Badge variant="secondary" className="text-xs">
              پرونده {client.fileNumber}
            </Badge>
          )}
        </div>

        {/* نوار آیکون‌های دسترسی سریع بین بخش‌های پرونده */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-background p-1 shadow-2xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}

          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              title={`تماس با ${client.phone}`}
              className="flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-600 transition-colors hover:bg-emerald-500/20"
            >
              <PhoneCall className="size-4" />
            </a>
          )}
        </div>
      </div>

      {/* نوار خلاصه اطلاعات مراجع */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary px-4 py-2.5 text-xs text-primary-foreground shadow-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>
            نام: <strong>{client.fullName}</strong>
          </span>
          <span>
            تلفن:{" "}
            <strong dir="ltr" className="font-mono">
              {client.phone || "ثبت نشده"}
            </strong>
          </span>
          <span>
            پرونده: <strong>{client.fileNumber ?? "—"}</strong>
          </span>
          <span>
            کد ملی: <strong className="font-mono">{client.nationalId || "—"}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            تعداد سرویس:{" "}
            <strong>{client.servicesCount.toLocaleString("fa-IR")}</strong>
          </span>
          <span>
            موجودی کیف پول:{" "}
            <strong>{client.walletBalance.toLocaleString("fa-IR")} تومان</strong>
          </span>
        </div>
      </div>
    </div>
  );
}