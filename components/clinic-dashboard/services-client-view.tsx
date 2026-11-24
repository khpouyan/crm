// components/clinic-dashboard/services-client-view.tsx
"use client";

import { useState, useMemo } from "react";
import { ServiceTimingMode } from "@prisma/client";
import {
  Plus,
  Search,
  Stethoscope,
  Pencil,
  Trash2,
  Users,
  Package,
  Layers,
  Clock,
  Split,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TomanIcon } from "@/components/ui/toman-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServiceFormDialog } from "./service-form-dialog";
import { SubServiceFormDialog } from "./sub-service-form-dialog";
import {
  deleteServiceAction,
  deleteSubServiceAction,
  ServiceAttributeItem,
} from "@/app/clinic-dashboard/(dashboard)/services/actions";
import { toast } from "sonner";

export type ServiceWithDetails = {
  id: string;
  title: string;
  timingMode: ServiceTimingMode;
  prepBeforeMinutes: number;
  durationMinutes: number;
  stage1Minutes: number;
  freeGapMinutes: number;
  stage2Minutes: number;
  restAfterMinutes: number;
  requiresPrivacy: boolean;
  assignedStaff: {
    id: string;
    user: { id: string; fullName: string | null; phone: string };
    role: { name: string };
  }[];
  defaultServiceProducts?: {
    id: string;
    quantity: number;
    clinicProduct: { id: string; name: string; unit: string };
  }[];
  subServices: {
    id: string;
    title: string;
    price: number;
    attributes: unknown;
    timingMode: ServiceTimingMode | null;
    prepBeforeMinutes: number | null;
    durationMinutes: number | null;
    stage1Minutes: number | null;
    freeGapMinutes: number | null;
    stage2Minutes: number | null;
    restAfterMinutes: number | null;
    requiresPrivacy: boolean | null;
    defaultProducts: {
      id: string;
      quantity: number;
      clinicProduct: { id: string; name: string; unit: string };
    }[];
  }[];
};

interface ServicesClientViewProps {
  initialServices: ServiceWithDetails[];
  activeStaff: {
    id: string;
    hasAllServicesAccess?: boolean;
    user: { id: string; fullName: string | null; phone: string };
    role: { name: string };
  }[];
  clinicProducts: { id: string; name: string; unit: string }[];
  permissions?: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export function ServicesClientView({
  initialServices,
  activeStaff,
  clinicProducts,
  permissions = { canCreate: true, canEdit: true, canDelete: true },
}: ServicesClientViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<ServiceWithDetails | null>(null);
  const [openItems, setOpenItems] = useState<string[]>(() =>
    initialServices.map((s) => s.id)
  );

  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [targetService, setTargetService] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingSubService, setEditingSubService] = useState<
    ServiceWithDetails["subServices"][number] | null
  >(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "service" | "subService";
    id: string;
    title: string;
  } | null>(null);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialServices;

    return initialServices
      .map((service) => {
        const serviceMatches = service.title.toLowerCase().includes(q);
        const matchingSubs = service.subServices.filter((sub) =>
          sub.title.toLowerCase().includes(q)
        );

        if (serviceMatches) return service;
        if (matchingSubs.length > 0) {
          return { ...service, subServices: matchingSubs };
        }
        return null;
      })
      .filter((item): item is ServiceWithDetails => item !== null);
  }, [initialServices, searchQuery]);

  const handleOpenNewService = () => {
    if (!permissions.canCreate) return;
    setEditingService(null);
    setServiceDialogOpen(true);
  };

  const handleEditService = (service: ServiceWithDetails) => {
    if (!permissions.canEdit) return;
    setEditingService(service);
    setServiceDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === "service") {
      const res = await deleteServiceAction(target.id);
      if (res.success) {
        toast.success("خدمت حذف شد");
      } else {
        toast.error(res.error);
      }
    } else {
      const res = await deleteSubServiceAction(target.id);
      if (res.success) {
        toast.success("زیرسرویس حذف شد");
      } else {
        toast.error(res.error);
      }
    }
  };

  const handleOpenNewSubService = (service: ServiceWithDetails) => {
    if (!permissions.canCreate) return;
    setTargetService({ id: service.id, title: service.title });
    setEditingSubService(null);
    setSubDialogOpen(true);
  };

  const handleEditSubService = (
    service: ServiceWithDetails,
    sub: ServiceWithDetails["subServices"][number]
  ) => {
    if (!permissions.canEdit) return;
    setTargetService({ id: service.id, title: service.title });
    setEditingSubService(sub);
    setSubDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            خدمات و تعرفه‌های کلینیک
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            دسته‌بندی خدمات اصلی، زمان‌بندی پیش‌فرض و چندمرحله‌ای، زیرسرویس‌ها، قیمت‌گذاری و اقلام مصرفی را مدیریت کنید.
          </p>
        </div>

        {permissions.canCreate && (
          <Button onClick={handleOpenNewService} className="shrink-0 gap-2">
            <Plus className="size-4" />
            افزودن خدمت جدید
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجو در نام خدمت یا زیرسرویس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
          <span>
            تعداد خدمات اصلی:{" "}
            <strong className="font-semibold text-foreground">
              {initialServices.length.toLocaleString("fa-IR")}
            </strong>
          </span>
          <span>•</span>
          <span>
            مجموع زیرسرویس‌ها:{" "}
            <strong className="font-semibold text-foreground">
              {initialServices
                .reduce((acc, s) => acc + s.subServices.length, 0)
                .toLocaleString("fa-IR")}
            </strong>
          </span>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <Empty className="border bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Stethoscope className="size-5" />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery
                ? "خدمتی با این مشخصات پیدا نشد"
                : "هنوز خدمتی ثبت نشده است"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "عبارت جستجو را تغییر دهید یا خدمت جدیدی ایجاد کنید."
                : "برای شروع، اولین دسته‌بندی خدمت (مثلاً PRP یا تزریق ژل) را ایجاد کنید."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {!searchQuery && permissions.canCreate && (
              <Button onClick={handleOpenNewService} className="gap-2">
                <Plus className="size-4" />
                ایجاد اولین خدمت
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <Accordion
          value={openItems}
          onValueChange={setOpenItems}
          className="space-y-4"
        >
          {filteredServices.map((service) => {
            const isSplit =
              service.timingMode === ServiceTimingMode.SPLIT_STAGE;
            const timingLabel = isSplit
              ? `چندمرحله‌ای (${service.stage1Minutes.toLocaleString(
                  "fa-IR"
                )}د + ${service.freeGapMinutes.toLocaleString(
                  "fa-IR"
                )}د آزاد + ${service.stage2Minutes.toLocaleString("fa-IR")}د)`
              : `تک‌مرحله‌ای (${service.durationMinutes.toLocaleString(
                  "fa-IR"
                )} دقیقه)`;

            const hasServiceMenuActions =
              permissions.canEdit || permissions.canDelete;

            return (
              <AccordionItem
                key={service.id}
                value={service.id}
                className="rounded-xl border bg-card px-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 sm:items-center">
                  <AccordionTrigger className="min-w-0 flex-1 py-4 hover:no-underline">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-right">
                      <span className="text-base font-bold">
                        {service.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 gap-1 font-normal"
                      >
                        <Layers className="size-3" />
                        {service.subServices.length.toLocaleString("fa-IR")}{" "}
                        زیرسرویس
                      </Badge>
                      <Badge
                        variant={isSplit ? "default" : "outline"}
                        className="max-w-full shrink-0 gap-1 truncate text-xs font-normal"
                      >
                        {isSplit ? (
                          <Split className="size-3 shrink-0" />
                        ) : (
                          <Clock className="size-3 shrink-0" />
                        )}
                        <span className="truncate">{timingLabel}</span>
                      </Badge>
                      {service.defaultServiceProducts?.map((dp) => (
                        <Badge
                          key={dp.id}
                          variant="outline"
                          className="max-w-[220px] gap-1 truncate border-primary/30 bg-primary/5 text-xs font-normal text-primary sm:max-w-xs"
                        >
                          <Package className="size-3 shrink-0" />
                          <span className="truncate">
                            {dp.clinicProduct.name} (
                            {dp.quantity.toLocaleString("fa-IR")}{" "}
                            {dp.clinicProduct.unit})
                          </span>
                        </Badge>
                      ))}
                      {service.assignedStaff.length > 0 && (
                        <Badge
                          variant="outline"
                          className="max-w-[200px] gap-1 truncate font-normal sm:max-w-xs"
                        >
                          <Users className="size-3 shrink-0" />
                          <span className="truncate">
                            {service.assignedStaff
                              .map((st) => st.user.fullName || st.user.phone)
                              .join("، ")}
                          </span>
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>

                  <div className="flex shrink-0 items-center gap-1 pt-3.5 sm:pt-0">
                    {permissions.canCreate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenNewSubService(service)}
                        className="h-8 shrink-0 gap-1 text-xs"
                      >
                        <Plus className="size-3.5" />
                        زیرسرویس
                      </Button>
                    )}

                    {/* دسکتاپ: آیکون‌های مستقیم ویرایش و حذف */}
                    <div className="hidden items-center gap-1 sm:flex">
                      {permissions.canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditService(service)}
                          className="size-8 shrink-0"
                          title="ویرایش خدمت"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {permissions.canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteTarget({
                              type: "service",
                              id: service.id,
                              title: service.title,
                            })
                          }
                          className="size-8 shrink-0 text-destructive hover:text-destructive"
                          title="حذف خدمت"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* موبایل: منوی سه‌نقطه برای جلوگیری از بیرون‌زدگی و فشردگی */}
                    {hasServiceMenuActions && (
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                aria-label="عملیات خدمت"
                              />
                            }
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" dir="rtl">
                            {permissions.canEdit && (
                              <DropdownMenuItem
                                onClick={() => handleEditService(service)}
                              >
                                <Pencil className="ml-2 size-3.5" />
                                ویرایش خدمت
                              </DropdownMenuItem>
                            )}
                            {permissions.canEdit && permissions.canDelete && (
                              <DropdownMenuSeparator />
                            )}
                            {permissions.canDelete && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "service",
                                    id: service.id,
                                    title: service.title,
                                  })
                                }
                              >
                                <Trash2 className="ml-2 size-3.5" />
                                حذف خدمت
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>

                <AccordionContent className="pt-1 pb-4">
                  {service.subServices.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      هنوز زیرسرویسی برای این خدمت تعریف نشده است.{" "}
                      {permissions.canCreate && (
                        <button
                          type="button"
                          onClick={() => handleOpenNewSubService(service)}
                          className="font-medium text-primary underline underline-offset-4"
                        >
                          افزودن اولین زیرسرویس
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-right">
                              عنوان زیرسرویس
                            </TableHead>
                            <TableHead className="text-right">
                              تعرفه (مبنای فاکتور)
                            </TableHead>
                            <TableHead className="text-right">
                              زمان‌بندی
                            </TableHead>
                            <TableHead className="text-right">مشخصه‌ها</TableHead>
                            <TableHead className="text-right">
                              مصرفی دیفالت
                            </TableHead>
                            {(permissions.canEdit || permissions.canDelete) && (
                              <TableHead className="w-16 text-left sm:w-24">
                                عملیات
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {service.subServices.map((sub) => {
                            const attrs = Array.isArray(sub.attributes)
                              ? (sub.attributes as ServiceAttributeItem[])
                              : [];
                            const effMode = sub.timingMode ?? service.timingMode;
                            const effIsSplit =
                              effMode === ServiceTimingMode.SPLIT_STAGE;
                            const effLabel = effIsSplit
                              ? `چندمرحله‌ای (${(
                                  sub.stage1Minutes ?? service.stage1Minutes
                                ).toLocaleString("fa-IR")}د + ${(
                                  sub.freeGapMinutes ?? service.freeGapMinutes
                                ).toLocaleString("fa-IR")}د آزاد + ${(
                                  sub.stage2Minutes ?? service.stage2Minutes
                                ).toLocaleString("fa-IR")}د)`
                              : `${(
                                  sub.durationMinutes ?? service.durationMinutes
                                ).toLocaleString("fa-IR")} دقیقه`;

                            return (
                              <TableRow key={sub.id}>
                                <TableCell className="font-medium">
                                  {sub.title}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 font-semibold tabular-nums">
                                    {sub.price.toLocaleString("fa-IR")}
                                    <TomanIcon className="size-3.5 text-muted-foreground" />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      sub.timingMode ? "secondary" : "outline"
                                    }
                                    className="text-xs font-normal"
                                  >
                                    {effLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {attrs.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {attrs.map((a, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="text-xs font-normal"
                                        >
                                          {a.key}: {a.value}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {sub.defaultProducts.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {sub.defaultProducts.map((dp) => (
                                        <Badge
                                          key={dp.id}
                                          variant="outline"
                                          className="gap-1 text-xs font-normal"
                                        >
                                          <Package className="size-3 text-muted-foreground" />
                                          {dp.clinicProduct.name} (
                                          {dp.quantity.toLocaleString("fa-IR")}{" "}
                                          {dp.clinicProduct.unit})
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                                {(permissions.canEdit ||
                                  permissions.canDelete) && (
                                  <TableCell className="text-left">
                                    {/* دسکتاپ */}
                                    <div className="hidden items-center justify-end gap-1 sm:flex">
                                      {permissions.canEdit && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            handleEditSubService(service, sub)
                                          }
                                          className="size-8"
                                        >
                                          <Pencil className="size-3.5" />
                                        </Button>
                                      )}
                                      {permissions.canDelete && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            setDeleteTarget({
                                              type: "subService",
                                              id: sub.id,
                                              title: sub.title,
                                            })
                                          }
                                          className="size-8 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      )}
                                    </div>

                                    {/* موبایل */}
                                    <div className="flex justify-end sm:hidden">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger
                                          render={
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="size-8"
                                              aria-label="عملیات زیرسرویس"
                                            />
                                          }
                                        >
                                          <MoreVertical className="size-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="start"
                                          dir="rtl"
                                        >
                                          {permissions.canEdit && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleEditSubService(service, sub)
                                              }
                                            >
                                              <Pencil className="ml-2 size-3.5" />
                                              ویرایش زیرسرویس
                                            </DropdownMenuItem>
                                          )}
                                          {permissions.canEdit &&
                                            permissions.canDelete && (
                                              <DropdownMenuSeparator />
                                            )}
                                          {permissions.canDelete && (
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive"
                                              onClick={() =>
                                                setDeleteTarget({
                                                  type: "subService",
                                                  id: sub.id,
                                                  title: sub.title,
                                                })
                                              }
                                            >
                                              <Trash2 className="ml-2 size-3.5" />
                                              حذف زیرسرویس
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <ServiceFormDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        editingService={editingService}
        activeStaff={activeStaff}
        clinicProducts={clinicProducts}
      />

      {targetService && (
        <SubServiceFormDialog
          open={subDialogOpen}
          onOpenChange={setSubDialogOpen}
          serviceId={targetService.id}
          serviceTitle={targetService.title}
          editingSubService={editingSubService}
          clinicProducts={clinicProducts}
        />
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "service"
                ? "حذف خدمت اصلی"
                : "حذف زیرسرویس"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف <strong>«{deleteTarget?.title}»</strong>{" "}
              {deleteTarget?.type === "service" &&
                "و تمام زیرسرویس‌های زیرمجموعه آن "}
              مطمئن هستید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تایید و حذف
            </AlertDialogAction>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}