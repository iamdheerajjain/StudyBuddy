"use client";

import dynamic from "next/dynamic";
import React from "react";

const ThreeHero = dynamic(() => import("@/components/ThreeHero"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-[color:var(--surface-border)] bg-[color:var(--surface)] h-[360px] sm:h-[460px] md:h-[520px]">
      <div className="absolute inset-0 grid place-items-center text-sm text-muted">
        Loading scene…
      </div>
    </div>
  ),
});

export default function ThreeHeroClient() {
  return <ThreeHero />;
}
