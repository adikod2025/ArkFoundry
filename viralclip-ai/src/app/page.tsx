import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, Zap, Scissors, BarChart3, Share2 } from "lucide-react";

export default function LandingPage() {
  const { userId } = auth();
  if (userId) redirect("/dashboard");

  const features = [
    {
      icon: Zap,
      title: "AI viral detection",
      desc: "A real multi-agent graph engine scores every moment for viral potential.",
    },
    {
      icon: Scissors,
      title: "Auto-editing",
      desc: "Captions, hooks, and platform-optimized formatting done automatically.",
    },
    {
      icon: BarChart3,
      title: "Viral scoring",
      desc: "Each clip gets a 0-100 viral score so you know what to post first.",
    },
    {
      icon: Share2,
      title: "Multi-platform",
      desc: "One upload. TikTok, Reels, Shorts, LinkedIn, and Twitter formats.",
    },
  ];

  const pricing = [
    { name: "Free", price: "$0", clips: "3 clips/mo", features: ["Watermarked", "Basic captions"] },
    { name: "Starter", price: "$29", clips: "20 clips/mo", features: ["No watermark", "All platforms", "Auto-scheduling"] },
    { name: "Pro", price: "$49", clips: "Unlimited", features: ["API access", "Priority processing", "Team seats"] },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg">ViralClip AI</span>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
          Turn one video into <span className="text-neutral-400">10 viral clips</span>
        </h1>
        <p className="text-lg text-neutral-500 mb-8 max-w-xl mx-auto">
          Upload a long-form video. Our multi-agent AI engine finds the viral
          moments, edits them with captions and hooks, and formats them for every
          platform.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Start free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            See demo
          </Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f) => (
            <div key={f.title} className="space-y-3">
              <f.icon className="w-6 h-6 text-neutral-700" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-12">Simple pricing</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((plan) => (
            <div key={plan.name} className="p-6 rounded-xl border hover:border-neutral-400 transition-colors">
              <div className="text-sm font-medium text-neutral-500 mb-2">{plan.name}</div>
              <div className="text-3xl font-semibold mb-1">{plan.price}</div>
              <div className="text-sm text-neutral-500 mb-6">{plan.clips}</div>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-neutral-400">
        ViralClip AI — Built with Graph Engineering
      </footer>
    </div>
  );
}
