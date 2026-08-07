"use client";

import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-lg border px-4 py-3 shadow-md bg-white text-sm max-w-sm",
            t.variant === "destructive" && "border-red-500 bg-red-50 text-red-900"
          )}
        >
          {t.title && <div className="font-medium">{t.title}</div>}
          {t.description && <div className="text-neutral-500">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
