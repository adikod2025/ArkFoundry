import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const PLANS = {
  FREE: { name: "Free", price: 0, clips: 3, watermark: true },
  STARTER: { name: "Starter", price: 29, clips: 20, watermark: false },
  PRO: { name: "Pro", price: 49, clips: -1, watermark: false }, // -1 = unlimited
  AGENCY: { name: "Agency", price: 199, clips: -1, watermark: false },
} as const;
