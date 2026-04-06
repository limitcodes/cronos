import Link from "next/link";
import { IBM_Plex_Mono, Source_Serif_4, Space_Grotesk } from "next/font/google";
import { ArrowRightIcon } from "lucide-react";
import styles from "./landing-page.module.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
});

const steps = [
  {
    title: "Chat",
    body: "Start with a plain-language request inside one thread.",
  },
  {
    title: "Act",
    body: "Cronos discovers the right connected tool before taking action.",
  },
  {
    title: "Schedule",
    body: "If the work belongs later, it can return to the same chat on time.",
  },
];

export default function LandingPage() {
  return (
    <main className={`${styles.page} ${display.className}`}>
      <header className={styles.nav}>
        <div className={`${styles.shell} flex h-16 items-center justify-between gap-6`}>
          <Link href="/" className={`text-lg font-medium ${styles.brand}`}>
            Cronos
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-[rgba(230,229,224,0.68)] transition-colors hover:text-[#e04a6f]"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-[rgba(230,229,224,0.1)] bg-[#2a2922] px-4 py-2 text-sm transition-colors hover:text-[#e04a6f]"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <section className={`${styles.shell} grid gap-12 px-6 pb-18 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-24`}>
        <div>
          <p className={`${styles.eyebrow} ${mono.className}`}>App-connected AI assistant</p>
          <h1 className="mt-4 max-w-4xl text-[3.5rem] leading-[0.95] tracking-[-0.08em] md:text-[5rem] lg:text-[6rem]">
            Talk to Cronos.
            <br />
            It handles the next step.
          </h1>
          <p className={`${serif.className} mt-6 max-w-lg text-[1.18rem] leading-[1.6] text-[rgba(230,229,224,0.62)] md:text-[1.28rem]`}>
            Chat, connected app actions, and scheduled follow-through in the same thread.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#e6e5e0] px-5 py-3 text-sm text-[#1a1915] transition-opacity hover:opacity-85"
            >
              Start using Cronos
              <ArrowRightIcon className="size-4" />
            </Link>
            <p className={`${mono.className} text-xs uppercase tracking-[0.18em] text-[rgba(230,229,224,0.38)]`}>
              Chat history + app actions + scheduled tasks
            </p>
          </div>
        </div>

        <div className={`rounded-[24px] p-5 sm:p-6 ${styles.heroVisual}`}>
          <div className={`rounded-[18px] p-4 sm:p-5 ${styles.terminal}`}>
            <div className="mb-4 flex items-center gap-2 text-xs text-[rgba(236,232,223,0.55)]">
              <span className="size-2 rounded-full bg-[#dfa88f]" />
              <span className="size-2 rounded-full bg-[#c08532]" />
              <span className="size-2 rounded-full bg-[#9fc9a2]" />
              <span className={`${mono.className} ml-2`}>cronos.runtime</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className={`${mono.className} text-[11px] uppercase tracking-[0.18em] text-[rgba(236,232,223,0.45)]`}>
                  Request
                </div>
                <p className={`${serif.className} mt-2 text-[1rem] leading-7 text-[rgba(236,232,223,0.92)]`}>
                  &ldquo;Send the update today. If nobody replies, remind me tomorrow at 9.&rdquo;
                </p>
              </div>

              <div className={`${mono.className} space-y-2 text-sm text-[rgba(236,232,223,0.7)]`}>
                <div className="flex items-center justify-between">
                  <span>chat context loaded</span>
                  <span className="text-[#dfa88f]">thinking</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>tool discovered</span>
                  <span className="text-[#9fc9a2]">connected app</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>task scheduled</span>
                  <span className="text-[#c0a8dd]">tomorrow 09:00</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 text-sm leading-6 text-[rgba(236,232,223,0.62)]">
                One conversation can trigger work now and bring the follow-up back later.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.process} py-18`}>
        <div className={`${styles.shell} px-6`}>
          <p className={`${styles.eyebrow} ${mono.className}`}>How Cronos works</p>
          <div className="mt-6 max-w-2xl">
            <h2 className="text-[2.35rem] leading-[1.02] tracking-[-0.05em] md:text-[3rem]">
              Fewer promises. Clearer product.
            </h2>
            <p className={`${serif.className} mt-4 text-[1.12rem] leading-8 text-[rgba(230,229,224,0.62)]`}>
              Cronos is a practical assistant: conversation first, app execution when authorized, and scheduled follow-through when the task belongs later.
            </p>
          </div>

          <div className={`${styles.steps} mt-12`}>
            {steps.map((step, index) => (
              <div key={step.title} className={styles.step}>
                <div className={`${mono.className} text-[11px] uppercase tracking-[0.18em] text-[rgba(230,229,224,0.38)]`}>
                  0{index + 1}
                </div>
                <h3 className="mt-3 text-[1.7rem] leading-[1.05] tracking-[-0.04em]">
                  {step.title}
                </h3>
                <p className={`${serif.className} mt-3 max-w-sm text-[1.04rem] leading-7 text-[rgba(230,229,224,0.62)]`}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.cta} py-18`}>
        <div className={`${styles.shell} px-6`}>
          <div className="flex max-w-3xl flex-col gap-6">
            <h2 className="text-[2.2rem] leading-[1.02] tracking-[-0.05em] md:text-[2.8rem]">
              Built for work that should actually get done.
            </h2>
            <p className={`${serif.className} max-w-2xl text-[1.12rem] leading-8 text-[rgba(230,229,224,0.62)]`}>
              Open a chat, connect the apps you need, and let Cronos carry the thread forward.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#e6e5e0] px-5 py-3 text-sm text-[#1a1915] transition-opacity hover:opacity-85"
              >
                Open Cronos
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
