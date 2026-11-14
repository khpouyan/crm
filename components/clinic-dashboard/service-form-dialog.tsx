// components/clinic-dashboard/service-form-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import{DirectionProvider} from "@/components/ui/direction"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogDescription,
  ResponsiveDialogDesktopOnly,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogPanel,
  ResponsiveDialogPopup,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger
} from "@/components/ui/responsive-dialog";
import { upsertServiceAction } from "@/app/clinic-dashboard/(dashboard)/services/actions";
import { toast } from "sonner";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService?: {
    id: string;
    title: string;
    assignedStaff: { id: string }[];
  } | null;
  activeStaff: {
    id: string;
    user: { fullName: string | null; phone: string };
    role: { name: string };
  }[];
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  editingService,
  activeStaff,
}: ServiceFormDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editingService?.title ?? "");
      setSelectedStaffIds(
        editingService?.assignedStaff.map((s) => s.id) ?? []
      );
    }
  }, [open, editingService]);

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("لطفاً عنوان خدمت را وارد کنید");
      return;
    }

    setIsPending(true);
    const res = await upsertServiceAction({
      id: editingService?.id,
      title,
      assignedStaffIds: selectedStaffIds,
    });
    setIsPending(false);

    if (res.success) {
      toast.success(
        editingService ? "خدمت با موفقیت ویرایش شد" : "خدمت جدید ایجاد شد"
      );
      onOpenChange(false);
    } else {
      toast.error(res.error || "خطایی رخ داد");
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} drawerPosition="bottom" >
      <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>
      <ResponsiveDialogPopup className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {editingService ? "ویرایش خدمت" : "افزودن خدمت جدید"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            خدمت اصلی دسته‌بندی کلان است و قیمت‌گذاری روی زیرسرویس‌های آن انجام می‌شود.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit}>
          <ResponsiveDialogPanel className="flex flex-col gap-5 ">
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-title">عنوان خدمت *</Label>
              <Input
                id="service-title"
                placeholder="مثلاً: لیزر موهای زائد، تزریق بوتاکس..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Label className="flex items-center gap-1.5">
                <Users className="size-4 text-muted-foreground" />
                پرسنل و اپراتورهای مرتبط با این خدمت
              </Label>
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {activeStaff.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">
                    پرسنل فعالی ثبت نشده است.
                  </p>
                ) : (
                  activeStaff.map((staff) => {
                    const checked = selectedStaffIds.includes(staff.id);
                    return (
                      <label
                        key={staff.id}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStaff(staff.id)}
                          />
                          <div className="text-sm">
                            <div className="font-medium">
                              {staff.user.fullName || staff.user.phone}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {staff.role.name}
                            </div>
                          </div>
                        </div>
                        {checked && <Check className="size-4 text-primary" />}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </ResponsiveDialogPanel>

          <ResponsiveDialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
              {editingService ? "ذخیره تغییرات" : "ایجاد خدمت"}
            </Button>
            <ResponsiveDialogDesktopOnly>
              <ResponsiveDialogClose
                render={
                  <Button type="button" variant="outline" disabled={isPending}>
                    انصراف
                  </Button>
                }
              />
            </ResponsiveDialogDesktopOnly>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogPopup>
    </ResponsiveDialog>
  );
}