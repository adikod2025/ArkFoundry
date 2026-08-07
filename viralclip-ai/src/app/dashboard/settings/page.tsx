"use client";

import { Button } from "@/components/ui/button";

const PLANS = [
  { name: "Starter", price: "$29/mo", env: "STRIPE_PRICE_STARTER" },
  { name: "Pro", price: "$49/mo", env: "STRIPE_PRICE_PRO" },
  { name: "Agency", price: "$199/mo", env: "STRIPE_PRICE_AGENCY" },
];

export default function SettingsPage() {
  async function upgrade(planName: string) {
    // The price IDs live server-side; in a full build this maps planName → priceId
    // via a server action or an API param. Left explicit here for clarity.
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planName }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your plan and billing.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div key={p.name} className="rounded-xl border p-5 space-y-3">
            <div className="font-medium">{p.name}</div>
            <div className="text-2xl font-semibold">{p.price}</div>
            <Button className="w-full" onClick={() => upgrade(p.name)}>
              Upgrade
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
