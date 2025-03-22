
import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { CheckCircle, AlertCircle } from "lucide-react";

export type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "complete" | "error";
  description?: string;
};

export interface ProgressStepsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  steps: ProgressStep[];
  activeStep: number;
  className?: string;
}

export const ProgressSteps = React.forwardRef<
  HTMLDivElement,
  ProgressStepsProps
>(({ steps, activeStep, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("w-full space-y-4", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        const isComplete = step.status === "complete";
        const isError = step.status === "error";
        const isProcessing = step.status === "processing";
        
        return (
          <div 
            key={step.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-all",
              isActive && !isError && "border-primary bg-primary/5",
              isComplete && "border-success-500 bg-success-50/30",
              isError && "border-danger-500 bg-danger-50/30",
              !isActive && !isComplete && !isError && "opacity-70"
            )}
          >
            <div className="flex-shrink-0 pt-1">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-success-500" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5 text-danger-500" />
              ) : isProcessing ? (
                <Spinner className="h-5 w-5 text-primary" />
              ) : (
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  isActive ? "border-primary" : "border-muted-foreground/30"
                )}>
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={cn(
                  "font-medium",
                  isActive && !isError && "text-primary",
                  isComplete && "text-success-700",
                  isError && "text-danger-700"
                )}>
                  {step.label}
                </p>
                {isProcessing && (
                  <span className="text-xs font-medium text-primary animate-pulse">
                    Processing...
                  </span>
                )}
              </div>
              {step.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

ProgressSteps.displayName = "ProgressSteps";
