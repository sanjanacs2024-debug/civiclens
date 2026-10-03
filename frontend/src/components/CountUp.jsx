import { useEffect, useRef, useState } from "react";

const DURATION = 1400;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export default function CountUp({ value, duration = DURATION }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? target : 0));
  const [started, setStarted] = useState(prefersReducedMotion);
  const nodeRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (started) return undefined;

    const node = nodeRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setStarted(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setStarted(true);
      },
      { threshold: 0.6 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || duration <= 0) return undefined;

    const startedAt = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [started, target, duration]);

  return <span ref={nodeRef}>{display.toLocaleString()}</span>;
}
