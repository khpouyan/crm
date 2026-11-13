// components/logout-button.tsx
"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/clinic-auth";

export function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleLogout}
      disabled={isPending}
      className={`gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 ${className ?? ""}`}
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