"use client"

import * as React from "react"
import {
  AudioWaveform,
  ChartColumn,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  Folder,
  FolderArchive,
  Forward,
  Frame,
  LogOut,
  Map,
  MessageCircleCheck,
  MoreHorizontal,
  Phone,
  PieChart,
  Plus,
  Settings2,
  SquareTerminal,
  Trash2,
  User,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export const clinicSidebarData = {
  user: {
    name: "نرگس کوششی",
    email: "kh.pouyan@gmail.com",
    phone:"09185005195",
    avatar: "/avatars/shadcn.jpg",
  },
  clinic: [
    { name: "آرما کلینیک", clinicLogo: User, userRole: "مدیر کلینیک" },
  ],
  dashboard: [
    { name: "داشبورد", icon: ChartColumn, href: "/clinic-dashboard" },
  ],
  files :[{name: "پرونده و سرویس", icon: FolderArchive, href: "/clinic-dashboard"}],

  navMain: [
    
    {
      isActive: false,
      title: "تقویم نوبت دهی",
      icon: MessageCircleCheck,

      items: [
        { title: "روزانه", href: "#" },
        { title: "ماهانه", href: "#" },
        { title: "جدولی", href: "#" },
        { title: "افزودن نوبت جدید", href: "#" },
        { title: "نوبت های در انتظار تایید", href: "#" },
        { title: "گزارش", href: "#" }
      ],
    },
    {
      title: "انبارکالا",
      icon: CreditCard,
      items: [
        { title: "تعریف کالا و مصرفی", href: "#" },
        { title: "ورود کالا به انبار", href: "#" },
        { title: "خروج کالا به انبار", href: "#" },
        { title: "کالاهای وارد شده با تامین کننده ها", href: "#" },
        { title: "کالاهای کسر شده با خدمات", href: "#" },
        { title: "گزارش فروش کالاها", href: "#" },
      ],
    },
  ],
}

function CLinicSwitcher({ clinic = clinicSidebarData.clinic }: { clinic?: typeof clinicSidebarData.clinic }) {
  const [activeClinic] = React.useState(clinic[0])

  if (!activeClinic) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex gap-2 p-1">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <activeClinic.clinicLogo className="size-4" />
        </div>
        <div className="grid flex-1 text-start text-sm leading-tight">
          <span className="truncate font-semibold">{activeClinic.name}</span>
          <span className="truncate text-xs text-muted-foreground">{activeClinic.userRole}</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavDashboard({ dashboard = clinicSidebarData.dashboard }: { dashboard?: typeof clinicSidebarData.dashboard }) {
  return (
    <SidebarMenu >
      {dashboard.map((item) => (
        <SidebarMenuItem className="px-3" key={item.name}>
          <SidebarMenuButton tooltip={item.name} render={<a href={item.href || "#"} />}>
            {item.icon ? <item.icon className="size-4" /> : null}
            <span className="font-medium">{item.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
function NavFile({ files = clinicSidebarData.dashboard }: { files?: typeof clinicSidebarData.files }) {
  return (
    <SidebarMenu>
      {files.map((item) => (
        <SidebarMenuItem className="px-3" key={item.name}>
          <SidebarMenuButton tooltip={item.name} render={<a href={item.href || "#"} />}>
            {item.icon ? <item.icon className="size-4" /> : null}
            <span className="font-medium">{item.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function NavMain({ items = clinicSidebarData.navMain }: { items?: typeof clinicSidebarData.navMain }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem >
              <CollapsibleTrigger
                render={<SidebarMenuButton tooltip={item.title} />}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                <span>{item.title}</span>
                <ChevronRight className="ms-auto transition-transform duration-300 group-data-[open]/collapsible:rotate-90 rtl:-scale-x-100 rtl:group-data-[open]/collapsible:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="border-s-1 border-primary/20">
                  {item.items.map((subItem) => {
                    const title = typeof subItem === "string" ? subItem : subItem.title
                    const href = typeof subItem === "string" ? "#" : subItem.href
                    return (
                      <SidebarMenuSubItem key={title}>
                        <SidebarMenuSubButton
                          render={<a href={href}>{title}</a>}
                        />
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavUser({ user = clinicSidebarData.user }: { user?: typeof clinicSidebarData.user }) {
  const { isMobile } = useSidebar()

  return (
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
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">PL</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <ChevronsUpDown className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "left"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard className="size-4" />
                صورت‌حساب
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings2 className="size-4" />
                تنظیمات
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut className="size-4" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export interface ClinicSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData?: typeof clinicSidebarData
}

export function ClinicSidebar({ sidebarData = clinicSidebarData, ...props }: ClinicSidebarProps) {
  return (
    <Sidebar side="right" dir="rtl" collapsible="icon" {...props}>
      <SidebarHeader>
        <CLinicSwitcher clinic={sidebarData.clinic} />
      </SidebarHeader>
      <SidebarContent>
        <NavDashboard dashboard={sidebarData.dashboard} />
        <NavFile files={sidebarData.files}/>
        <NavMain items={sidebarData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}