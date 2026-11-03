"use client"

import * as React from "react"
import {
  AudioWaveform,
  ChartColumn,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  Folder,
  Forward,
  Frame,
  LogOut,
  Map,
  MessageCircleCheck,
  MoreHorizontal,
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

export const adminSidebarData = {
  user: {
    name: "پویان خیراندیش",
    email: "kh.pouyan@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    { name: "پویان خیراندیش", logo: User, userRole: "مدیرکل" },
  ],
  dashboard: [
    { name: "داشبورد", icon: ChartColumn, href: "/admin-dashboard" },
  ],
  navMain: [
    {
      title: "مدیریت کاربران",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "کلینیک ها", href: "/admin-dashboard/clinics" },
        { title: "افزودن مرکز جدید", href: "#" },
      ],
    },
    {
      title: "پنل پیامکی",
      icon: MessageCircleCheck,
      items: [
        { title: "گزارش ارسال", href: "#" },
        { title: "شارژ اعتبار", href: "#" },
        { title: "خطوط اختصاصی", href: "#" },
      ],
    },
    {
      title: "درگاه پرداخت",
      icon: CreditCard,
      items: [
        { title: "تراکنش‌ها", href: "#" },
        { title: "تسویه‌حساب", href: "#" },
        { title: "گزارش مالی", href: "#" },
      ],
    },
    {
      title: "تنظیمات",
      icon: Settings2,
      items: [
        { title: "عمومی", href: "#" },
        { title: "تیم و دسترسی‌ها", href: "#" },
        { title: "صورت‌حساب", href: "#" },
      ],
    },
  ],
  projects: [
    { name: "مهندسی طراحی", icon: Frame },
    { name: "فروش و بازاریابی", icon: PieChart },
    { name: "سفر", icon: Map },
  ],
}

function TeamSwitcher({ teams = adminSidebarData.teams }: { teams?: typeof adminSidebarData.teams }) {
  const [activeTeam] = React.useState(teams[0])

  if (!activeTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex gap-2 p-1">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <activeTeam.logo className="size-4" />
        </div>
        <div className="grid flex-1 text-start text-sm leading-tight">
          <span className="truncate font-semibold">{activeTeam.name}</span>
          <span className="truncate text-xs text-muted-foreground">{activeTeam.userRole}</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavDashboard({ dashboard = adminSidebarData.dashboard }: { dashboard?: typeof adminSidebarData.dashboard }) {
  return (
    <SidebarMenu>
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

function NavMain({ items = adminSidebarData.navMain }: { items?: typeof adminSidebarData.navMain }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger
                render={<SidebarMenuButton tooltip={item.title} />}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                <span>{item.title}</span>
                <ChevronRight className="ms-auto transition-transform duration-200 group-data-[open]/collapsible:rotate-90 rtl:-scale-x-100 rtl:group-data-[open]/collapsible:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
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

function NavProjects({ projects = adminSidebarData.projects }: { projects?: typeof adminSidebarData.projects }) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>پروژه‌ها</SidebarGroupLabel>
      <SidebarGroupAction>
        <Plus className="size-4" /> <span className="sr-only">افزودن پروژه</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<a href="#" />}>
              <item.icon className="size-4" />
              <span>{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
                <MoreHorizontal className="size-4" />
                <span className="sr-only">بیشتر</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "left"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <Folder className="size-4 text-muted-foreground" />
                  <span>مشاهده پروژه</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="size-4 text-muted-foreground" />
                  <span>اشتراک‌گذاری پروژه</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="size-4" />
                  <span>حذف پروژه</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal className="size-4 text-sidebar-foreground/70" />
            <span>بیشتر</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavUser({ user = adminSidebarData.user }: { user?: typeof adminSidebarData.user }) {
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

export interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData?: typeof adminSidebarData
}

export function AdminSidebar({ sidebarData = adminSidebarData, ...props }: AdminSidebarProps) {
  return (
    <Sidebar side="right" dir="rtl" collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavDashboard dashboard={sidebarData.dashboard} />
        <NavMain items={sidebarData.navMain} />
        <NavProjects projects={sidebarData.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}