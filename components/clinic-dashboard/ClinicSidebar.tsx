"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChartColumn,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  FolderArchive,
  MessageCircleCheck,
  Package,
  Settings2,
  Toolbox,
  User,
  Users,
  Wallet,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/clinic-dashboard/logout-button"
import { PermissionKey } from "@/lib/permissions"

export interface SidebarUserProp {
  name: string
  phone: string
  avatar?: string
  jobTitle: string
  isOwner: boolean
  permissions: string[]
}

export interface SidebarClinicProp {
  name: string
}

interface NavSingleItem {
  name: string
  icon: React.ElementType
  href: string
  requiredAnyPermissions?: PermissionKey[]
}

interface NavLeafItem {
  title: string
  href: string
  requiredAnyPermissions?: PermissionKey[]
}

interface NavSubItem {
  title: string
  href?: string
  requiredAnyPermissions?: PermissionKey[]
  items?: NavLeafItem[]
}

interface NavGroupItem {
  title: string
  icon: React.ElementType
  requiredAnyPermissions?: PermissionKey[]
  items: NavSubItem[]
}

const SINGLE_TOP_ITEMS: NavSingleItem[] = [
  {
    name: "داشبورد",
    icon: ChartColumn,
    href: "/clinic-dashboard",
  },
  {
    name: "پرونده و مراجعین",
    icon: FolderArchive,
    href: "/clinic-dashboard/clients",
    requiredAnyPermissions: [
      "patients.view",
      "patients.create",
      "patients.edit",
      "patients.visit_report",
    ],
  },
]

const COLLAPSIBLE_GROUPS: NavGroupItem[] = [
  {
    title: "تقویم نوبت دهی",
    icon: MessageCircleCheck,
    requiredAnyPermissions: [
      "appointments.view",
      "appointments.create",
      "appointments.edit",
    ],
    items: [
      {
        title: "روزانه",
        href: "/clinic-dashboard/calendar",
        requiredAnyPermissions: ["appointments.view"],
      },
      {
        title: "ماهانه",
        href: "/clinic-dashboard/calendar?view=month",
        requiredAnyPermissions: ["appointments.view"],
      },
      {
        title: "جدولی",
        href: "/clinic-dashboard/calendar?view=table",
        requiredAnyPermissions: ["appointments.view"],
      },
      {
        title: "افزودن نوبت جدید",
        href: "/clinic-dashboard/calendar?action=new",
        requiredAnyPermissions: ["appointments.create"],
      },
      {
        title: "نوبت های در انتظار تایید",
        href: "/clinic-dashboard/calendar?status=pending",
        requiredAnyPermissions: ["appointments.view", "appointments.edit"],
      },
      {
        title: "گزارش",
        href: "/clinic-dashboard/calendar/reports",
        requiredAnyPermissions: [
          "patients.visit_report",
          "finance.visit_report",
        ],
      },
    ],
  },
  {
    title: "صندوق و حسابداری",
    icon: Wallet,
    requiredAnyPermissions: [
      "finance.accounting",
      "finance.visit_report",
      "patients.visit_report",
    ],
    items: [
      {
        title: "خدمات",
        href: "/clinic-dashboard/accounting/services",
        requiredAnyPermissions: ["finance.accounting", "finance.visit_report"],
      },
      {
        title: "دریافتی",
        href: "/clinic-dashboard/accounting/receivables",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "مطالبات",
        href: "/clinic-dashboard/accounting/claims",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "کیف پول",
        href: "/clinic-dashboard/accounting/wallet",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "پرداختی‌ها",
        href: "/clinic-dashboard/accounting/payouts",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "بدهی‌ها",
        href: "/clinic-dashboard/accounting/debts",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "محاسبه کمیسیون",
        href: "/clinic-dashboard/accounting/commission",
        requiredAnyPermissions: ["finance.accounting"],
      },
      {
        title: "تنظیمات حسابداری",
        href: "/clinic-dashboard/accounting/settings",
        requiredAnyPermissions: ["finance.accounting", "management.settings"],
      },
    ],
  },
  {
    title: "انبار کالا",
    icon: Package,
    requiredAnyPermissions: ["finance.inventory", "tools.inventory_view"],
    items: [
      {
        title: "تعریف کالا و مصرفی",
        href: "/clinic-dashboard/inventory/products",
        requiredAnyPermissions: ["finance.inventory", "tools.inventory_view"],
      },
      {
        title: "ورود کالا به انبار",
        href: "/clinic-dashboard/inventory/stock-in",
        requiredAnyPermissions: ["finance.inventory"],
      },
      {
        title: "خروج کالا از انبار",
        href: "/clinic-dashboard/inventory/stock-out",
        requiredAnyPermissions: ["finance.inventory"],
      },
      {
        title: "کالاهای تمام‌شده و رو به اتمام",
        href: "/clinic-dashboard/inventory/low-stock",
        requiredAnyPermissions: ["finance.inventory", "tools.inventory_view"],
      },
      {
        title: "کالاهای وارد شده با تامین کننده ها",
        href: "/clinic-dashboard/inventory/suppliers",
        requiredAnyPermissions: ["finance.inventory"],
      },
      {
        title: "کالاهای کسر شده با خدمات",
        href: "/clinic-dashboard/inventory/service-usage",
        requiredAnyPermissions: ["finance.inventory", "tools.inventory_view"],
      },
      {
        title: "گزارش فروش و مصرف کالاها",
        href: "/clinic-dashboard/inventory/sales-report",
        requiredAnyPermissions: ["finance.inventory", "finance.accounting"],
      },
    ],
  },
  {
    title: "تنظیمات",
    icon: Settings2,
    requiredAnyPermissions: [
      "management.settings",
      "finance.accounting",
      "appointments.settings",
      "appointments.self_schedule",
    ],
    items: [
      {
        title: "مشخصات و اطلاعات مرکز",
        href: "/clinic-dashboard/settings/clinic-profile",
        requiredAnyPermissions: ["management.settings"],
      },
      {
        title: "تنظیمات مالی و اعتباری",
        href: "/clinic-dashboard/settings/financial",
        requiredAnyPermissions: ["management.settings", "finance.accounting"],
      },
      {
        title: "نوبت دهی",
        requiredAnyPermissions: [
          "appointments.settings",
          "appointments.self_schedule",
          "management.settings",
        ],
        items: [
          {
            title: "ساعات کاری کلینیک",
            href: "/clinic-dashboard/settings/appointments/working-hours",
            requiredAnyPermissions: ["appointments.settings"],
          },
          {
            title: "مدیریت مکان‌ها",
            href: "/clinic-dashboard/settings/appointments/spaces",
            requiredAnyPermissions: [
              "appointments.settings",
              "management.settings",
            ],
          },
          {
            title: "زمان‌بندی پرسنل و سرویس‌ها",
            href: "/clinic-dashboard/settings/appointments/staff-schedule",
            requiredAnyPermissions: [
              "appointments.settings",
              "appointments.self_schedule",
              "management.settings",
            ],
          },
        ],
      },
      {
        title: "مدیریت پرسنل و دسترسی‌ها",
        href: "/clinic-dashboard/staffs",
        requiredAnyPermissions: ["management.settings"],
      },
    ],
  },
]

const SINGLE_BOTTOM_ITEMS: NavSingleItem[] = [
  {
    name: "تعریف سرویس و خدمات",
    icon: Toolbox,
    href: "/clinic-dashboard/services",
    requiredAnyPermissions: [
      "services.view",
      "services.create",
      "services.edit",
    ],
  },
  {
    name: "مدیریت پرسنل و دسترسی‌ها",
    icon: Users,
    href: "/clinic-dashboard/staffs",
    requiredAnyPermissions: ["management.settings"],
  },
]

const ACTIVE_ITEM_CLASS =
  "data-[active=true]:bg-primary/15 data-[active=true]:font-semibold data-[active=true]:text-primary dark:data-[active=true]:bg-primary/20 dark:data-[active=true]:text-sidebar-foreground"

function canSee(
  user: SidebarUserProp,
  requiredAnyPermissions?: PermissionKey[]
): boolean {
  if (!requiredAnyPermissions || requiredAnyPermissions.length === 0) {
    return true
  }
  if (user.isOwner) return true
  return requiredAnyPermissions.some((perm) => user.permissions.includes(perm))
}

function subItemHasActivePath(sub: NavSubItem, pathname: string): boolean {
  if (sub.href && pathname.startsWith(sub.href.split("?")[0])) {
    return true
  }
  if (sub.items) {
    return sub.items.some((leaf) =>
      pathname.startsWith(leaf.href.split("?")[0])
    )
  }
  return false
}

export interface ClinicSidebarProps extends React.ComponentProps<
  typeof Sidebar
> {
  clinic: SidebarClinicProp
  user: SidebarUserProp
}

export function ClinicSidebar({ clinic, user, ...props }: ClinicSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const visibleTopItems = SINGLE_TOP_ITEMS.filter((item) =>
    canSee(user, item.requiredAnyPermissions)
  )

  const visibleGroups = React.useMemo(
    () =>
      COLLAPSIBLE_GROUPS.filter((group) =>
        canSee(user, group.requiredAnyPermissions)
      )
        .map((group) => ({
          ...group,
          items: group.items
            .filter((sub) => canSee(user, sub.requiredAnyPermissions))
            .map((sub) =>
              sub.items
                ? {
                    ...sub,
                    items: sub.items.filter((leaf) =>
                      canSee(user, leaf.requiredAnyPermissions)
                    ),
                  }
                : sub
            )
            .filter((sub) => !sub.items || sub.items.length > 0),
        }))
        .filter((group) => group.items.length > 0),
    [user]
  )

  const visibleBottomItems = SINGLE_BOTTOM_ITEMS.filter((item) =>
    canSee(user, item.requiredAnyPermissions)
  )

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {}
      for (const group of visibleGroups) {
        initial[group.title] = group.items.some((sub) =>
          subItemHasActivePath(sub, pathname)
        )
        for (const sub of group.items) {
          if (sub.items) {
            initial[`${group.title}::${sub.title}`] = subItemHasActivePath(
              sub,
              pathname
            )
          }
        }
      }
      return initial
    }
  )

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      for (const group of visibleGroups) {
        if (group.items.some((sub) => subItemHasActivePath(sub, pathname))) {
          next[group.title] = true
        }
        for (const sub of group.items) {
          if (sub.items && subItemHasActivePath(sub, pathname)) {
            next[`${group.title}::${sub.title}`] = true
          }
        }
      }
      return next
    })
    closeMobileSidebar()
  }, [pathname, visibleGroups, closeMobileSidebar])

  const isRouteActive = (href: string) => {
    const cleanHref = href.split("?")[0]
    if (cleanHref === "/clinic-dashboard") {
      return pathname === "/clinic-dashboard"
    }
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`)
  }

  return (
    <Sidebar side="right" dir="rtl" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex gap-2 p-1">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <User className="size-4" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">{clinic.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.jobTitle}
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {visibleTopItems.map((item) => (
            <SidebarMenuItem className="px-3" key={item.name}>
              <SidebarMenuButton
                tooltip={item.name}
                isActive={isRouteActive(item.href)}
                className={ACTIVE_ITEM_CLASS}
                render={
                  <Link href={item.href} onClick={closeMobileSidebar} />
                }
              >
                <item.icon className="size-4" />
                <span className="font-medium">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {visibleGroups.length > 0 && (
          <SidebarGroup>
            <SidebarMenu>
              {visibleGroups.map((group) => (
                <Collapsible
                  key={group.title}
                  open={Boolean(openGroups[group.title])}
                  onOpenChange={(isOpen) =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [group.title]: isOpen,
                    }))
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={<SidebarMenuButton tooltip={group.title} />}
                    >
                      <group.icon className="size-4" />
                      <span>{group.title}</span>
                      <ChevronRight className="ms-auto transition-transform duration-300 group-data-[open]/collapsible:rotate-90 rtl:-scale-x-100 rtl:group-data-[open]/collapsible:-rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-s-1 border-primary/20">
                        {group.items.map((subItem) =>
                          subItem.items ? (
                            <SidebarMenuSubItem key={subItem.title}>
                              <Collapsible
                                open={Boolean(
                                  openGroups[`${group.title}::${subItem.title}`]
                                )}
                                onOpenChange={(isOpen) =>
                                  setOpenGroups((prev) => ({
                                    ...prev,
                                    [`${group.title}::${subItem.title}`]:
                                      isOpen,
                                  }))
                                }
                                className="group/subcollapsible"
                              >
                                <CollapsibleTrigger
                                  nativeButton={false}
                                  render={
                                    <SidebarMenuSubButton className="w-full cursor-pointer justify-between" />
                                  }
                                >
                                  <span>{subItem.title}</span>
                                  <ChevronRight className="ms-auto size-3.5 transition-transform duration-300 group-data-[open]/subcollapsible:rotate-90 rtl:-scale-x-100 rtl:group-data-[open]/subcollapsible:-rotate-90" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub className="me-0 border-s-1 border-primary/20 ps-2.5">
                                    {subItem.items.map((leafItem) => (
                                      <SidebarMenuSubItem key={leafItem.title}>
                                        <SidebarMenuSubButton
                                          isActive={
                                            pathname ===
                                            leafItem.href.split("?")[0]
                                          }
                                          className={ACTIVE_ITEM_CLASS}
                                          render={
                                            <Link
                                              href={leafItem.href}
                                              onClick={closeMobileSidebar}
                                            >
                                              {leafItem.title}
                                            </Link>
                                          }
                                        />
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </Collapsible>
                            </SidebarMenuSubItem>
                          ) : (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                isActive={
                                  pathname ===
                                  (subItem.href || "").split("?")[0]
                                }
                                className={ACTIVE_ITEM_CLASS}
                                render={
                                  <Link
                                    href={subItem.href || "#"}
                                    onClick={closeMobileSidebar}
                                  >
                                    {subItem.title}
                                  </Link>
                                }
                              />
                            </SidebarMenuSubItem>
                          )
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarMenu>
          {visibleBottomItems.map((item) => (
            <SidebarMenuItem className="px-3" key={item.name}>
              <SidebarMenuButton
                tooltip={item.name}
                isActive={isRouteActive(item.href)}
                className={ACTIVE_ITEM_CLASS}
                render={
                  <Link href={item.href} onClick={closeMobileSidebar} />
                }
              >
                <item.icon className="size-4" />
                <span className="font-medium">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span
                    dir="ltr"
                    className="truncate text-start text-xs text-muted-foreground"
                  >
                    {user.phone}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "left"}
                align="end"
                sideOffset={4}
              >
                {canSee(user, [
                  "finance.accounting",
                  "management.settings",
                ]) && (
                  <>
                    <DropdownMenuGroup>
                      {canSee(user, ["finance.accounting"]) && (
                        <DropdownMenuItem>
                          <CreditCard className="size-4" />
                          صورت‌حساب و اشتراک
                        </DropdownMenuItem>
                      )}
                      {canSee(user, ["management.settings"]) && (
                        <DropdownMenuItem
                          render={
                            <Link
                              href="/clinic-dashboard/staffs"
                              onClick={closeMobileSidebar}
                            />
                          }
                        >
                          <Settings2 className="size-4" />
                          تنظیمات و پرسنل
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem variant="destructive">
                  <LogoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}