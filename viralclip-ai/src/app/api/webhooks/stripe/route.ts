import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // NB: Stripe signature verification needs the RAW body — do not JSON.parse first.
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;

    let plan: "STARTER" | "PRO" | "AGENCY" = "STARTER";
    if (priceId === process.env.STRIPE_PRICE_PRO) plan = "PRO";
    if (priceId === process.env.STRIPE_PRICE_AGENCY) plan = "AGENCY";

    await prisma.user.update({
      where: { stripeCustomerId: customerId },
      data: { plan, stripeSubscriptionId: subscriptionId, creditsUsed: 0 },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await prisma.user.update({
      where: { stripeSubscriptionId: subscription.id },
      data: { plan: "FREE", creditsUsed: 0 },
    });
  }

  return NextResponse.json({ received: true });
}
