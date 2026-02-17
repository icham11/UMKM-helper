
"use client";
import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

export default function AnimatedNumber({ value, duration = 1200, className = "" }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    const end = value;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.textContent = end.toLocaleString();
      }
    }
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span ref={ref} className={className}>{value}</span>;
}
