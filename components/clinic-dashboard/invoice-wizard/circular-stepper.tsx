// components/clinic-dashboard/invoice-wizard/circular-stepper.tsx
"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CircularStepperProps {
  currentStep: 1 | 2 | 3;
  onExit: () => void;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

const STEPS: { id: 1 | 2 | 3; title: string; subtitle: string }[] = [
  { id: 1, title: "تعریف سرویس", subtitle: "اطلاعات و خدمات" },
  { id: 2, title: "پرداختی", subtitle: "تسویه و اقساط" },
  { id: 3, title: "نمایش جزئیات", subtitle: "رسید و چاپ" },
];

export function CircularStepper({
  currentStep,
  onExit,
  onStepClick,
}: CircularStepperProps) {
  return (
    <div className="flex flex-col gap-4 border-b bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center justify-between sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          className="gap-1.5 rounded-lg"
        >
          <X className="size-4" />
          خروج
        </Button>
      </div>

      {/* استپر دایره‌ای مرکزی مطابق طرح */}
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const canNavigate = onStepClick && step.id < currentStep;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onStepClick(step.id)}
                className="group flex flex-col items-center gap-1.5 text-center disabled:cursor-default"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-background text-primary ring-4 ring-primary/15"
                      : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-5" />
                  ) : (
                    step.id.toLocaleString("fa-IR")
                  )}
                </div>
                <div className="space-y-0.5">
                  <div
                    className={`text-xs font-bold ${
                      isCurrent || isCompleted
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="hidden text-[10px] text-muted-foreground sm:block">
                    {step.subtitle}
                  </div>
                </div>
              </button>

              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${
                    currentStep > step.id ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden w-20 sm:block" />
    </div>
  );
}