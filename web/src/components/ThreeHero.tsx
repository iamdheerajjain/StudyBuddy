"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import React, { Suspense } from "react";

function SpinningTorus() {
  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <mesh rotation={[0.3, 0.5, 0]}>
        <torusKnotGeometry args={[1.2, 0.35, 220, 36]} />
        <meshStandardMaterial color="#6EE7B7" metalness={0.6} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export default function ThreeHero() {
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <SpinningTorus />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(110,231,183,0.15),transparent)]" />
    </div>
  );
}
