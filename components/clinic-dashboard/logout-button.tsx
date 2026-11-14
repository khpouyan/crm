// components/clinic-dashboard/logout-button.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/clinic-dashboard/(auth)/login/clinic-auth";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  /** زمانی که داخل DropdownMenuItem رندر می‌شود true باشد تا استایل دکمه دوگانه ایجاد نشود */
  inDropdownMenu?: boolean;
}

export function LogoutButton({
  className,
  inDropdownMenu = true,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  if (inDropdownMenu) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 text-start text-destructive disabled:opacity-50",
          className
        )}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        <span>خروج از حساب</span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleLogout}
      disabled={isPending}
      className={cn(
        "gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span>خروج از حساب</span>
    </Button>
  );
}