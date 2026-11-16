"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const MAX = 1000;

/** Range slider 0–1000+. Ends mean "no limit": 0 sends no min, 1000 sends no max. */
export function PriceSlider({ min, max }: { min: number | null; max: number | null }) {
  const [v, setV] = useState<number[]>([Math.min(min ?? 0, MAX), Math.min(max ?? MAX, MAX)]);
  return (
    <div className="flex flex-col gap-3 px-2">
      <input type="hidden" name="min" value={v[0] > 0 ? v[0] : ""} />
      <input type="hidden" name="max" value={v[1] < MAX ? v[1] : ""} />
      <Slider
        min={0}
        max={MAX}
        step={50}
        value={v}
        onValueChange={(n) => setV(n as number[])}
        aria-label="Price range"
      />
      <p className="text-center text-lg font-semibold">
        ₹{v[0]} – ₹{v[1]}
        {v[1] >= MAX && "+"}
      </p>
    </div>
  );
}
