"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  /** Carousel slides pass this to say when they are the visible one. Without it the video plays while it is ≥60% on screen. */
  active?: boolean;
  muted?: boolean;
};

// Save-Data users and people who asked for less motion get the still poster, which the parent renders under the video.
function mayAutoplay() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !conn?.saveData && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Loops silently over its parent's poster image. It downloads nothing until it should play (preload none, src set on demand),
 * and drops the file again when it stops, so scrolling a long list never pulls every video.
 */
export function AutoplayVideo({ src, className, active, muted = true }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seen, setSeen] = useState(false);
  const on = active ?? seen;

  useEffect(() => {
    const v = ref.current;
    if (active !== undefined || !v) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, [active]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (on && mayAutoplay()) {
      v.src = src;
      v.play().catch(() => {}); // blocked autoplay just leaves the poster showing
    } else {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [on, src]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  return <video ref={ref} muted loop playsInline preload="none" aria-hidden className={className} />;
}
