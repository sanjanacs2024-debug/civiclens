import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import CivicLensLogo from "./CivicLensLogo";

const HOLD_MS = 2000;
const FADE_MS = 600;

export default function SplashScreen({
  src = "/civiclens-logo.png",
  name = "CivicLens",
  tagline = "See It • Report It • Build a Better City",
  holdMs = HOLD_MS,
  fadeMs = FADE_MS,
  onFinish,
}) {
  const [leaving, setLeaving] = useState(false);
  const progressRef = useRef(null);

  const finish = useCallback(() => {
    if (onFinish) onFinish();
  }, [onFinish]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = prefersReducedMotion ? 0 : holdMs;
    const fade = prefersReducedMotion ? 0 : fadeMs;

    const leaveTimer = setTimeout(() => setLeaving(true), hold);
    const finishTimer = setTimeout(finish, hold + fade);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(finishTimer);
    };
  }, [holdMs, fadeMs, finish]);

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar || typeof bar.animate !== "function") return undefined;
    const animation = bar.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: holdMs, easing: "linear", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [holdMs]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${name}`}
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center",
        "px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        "transition-opacity ease-out motion-reduce:transition-none",
        leaving ? "opacity-0" : "opacity-100",
      ].join(" ")}
     style={{
  transitionDuration: `${fadeMs}ms`,
  background: "radial-gradient(ellipse at 50% 38%, #ffffff 0%, #f2f8f3 58%, #e6f0e7 100%)",
}}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative flex w-full items-center justify-center">
          <span className="absolute inset-0 -z-10 animate-ping rounded-[2rem] bg-[#126747]/12" aria-hidden="true" />
          <div className="flex max-h-[42vh] w-full items-center justify-center px-6 py-7 sm:px-8 sm:py-9">
            <CivicLensLogo
              src={src}
              alt={`${name} logo`}
              height={168}
              maxWidth={520}
              imageClassName="sm:!h-[196px]"
              fallback={
                <span className="flex items-center justify-center gap-2 text-[#006c49]">
                  <ShieldCheck size={52} strokeWidth={2} className="sm:hidden" />
                  <ShieldCheck size={72} strokeWidth={1.8} className="hidden sm:block" />
                </span>
              }
            />
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-black tracking-tight text-[#0b4935] sm:text-3xl">
          {name}
        </h1>
        <p className="mt-2 max-w-xs text-[11px] font-bold uppercase leading-relaxed tracking-[0.18em] text-[#126747] sm:text-xs">
          {tagline}
        </p>

        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-[#0b4935]/12" aria-hidden="true">
          <div ref={progressRef} className="h-full w-full origin-left scale-x-0 rounded-full bg-[#126747]" />
        </div>
      </div>
    </div>
  );
}
