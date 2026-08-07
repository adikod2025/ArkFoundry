"use client";

// Minimal toast store (shadcn's useToast, trimmed). In a full build, run
// `npx shadcn-ui@latest add toast` to replace this with the complete component.
import * as React from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  for (const l of listeners) l([...toasts]);
}

export function toast(t: Omit<Toast, "id">) {
  const id = String(++counter);
  toasts = [...toasts, { id, ...t }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, 4000);
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts);
  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return { toast, toasts: state };
}
