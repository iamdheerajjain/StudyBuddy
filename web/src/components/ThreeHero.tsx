"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import React, { Suspense, useMemo, useRef } from "react";
import { Mesh } from "three";

function NeuralTutor() {
  const orbitCount = 10;
  const orbiters = useRef<Mesh[]>([]);
  const indices = useMemo(
    () => Array.from({ length: orbitCount }, (_, i) => i),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    indices.forEach((i) => {
      const speed = 0.6 + i * 0.05;
      const radius = 0.6 + (i % 3) * 0.18;
      const phase = t * speed + i * 0.7;
      const yWave = Math.sin(t * 0.8 + i) * 0.08;
      const x = Math.cos(phase) * radius;
      const z = Math.sin(phase) * (radius * 0.8 + 0.1 * Math.sin(t + i));
      const y = 0.12 + yWave;
      const m = orbiters.current[i];
      if (m) m.position.set(x, y, z);
    });
  });

  const orbColor = "#b7a770"; // accent gold
  const nodeColor = "#6d7b6a"; // accent-alt
  const capBoardColor = "#1f1e1b"; // ink
  const capBandColor = "#2b2a26";

  return (
    <group rotation={[0.05, 0.25, 0]} scale={[1.3, 1.3, 1.3]}>
      {/* Central glowing knowledge orb */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial
          color={orbColor}
          metalness={0.35}
          roughness={0.25}
          emissive={orbColor}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Orbiting concept nodes */}
      {indices.map((i) => (
        <mesh
          key={`orb-${i}`}
          ref={(el) => {
            if (el) orbiters.current[i] = el;
          }}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[0.07 + (i % 3) * 0.015, 24, 24]} />
          <meshStandardMaterial
            color={nodeColor}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Graduation cap (mortarboard) */}
      <group
        position={[0, 0.72, 0]}
        rotation={[0.1, 0.25, 0]}
        castShadow
        receiveShadow
      >
        {/* Board */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.04, 1.2]} />
          <meshStandardMaterial
            color={capBoardColor}
            metalness={0.1}
            roughness={0.8}
          />
        </mesh>
        {/* Band */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.28, 24]} />
          <meshStandardMaterial
            color={capBandColor}
            metalness={0.15}
            roughness={0.7}
          />
        </mesh>
        {/* Tassel */}
        <group position={[0.46, -0.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 16]} />
            <meshStandardMaterial
              color={orbColor}
              metalness={0.4}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color={orbColor}
              metalness={0.4}
              roughness={0.4}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function ThreeHero() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] h-[340px] sm:h-[440px] md:h-[520px] scale-in"
      data-animate
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        aria-label="Animated book scene"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 6, 8]} intensity={0.9} />
        <Suspense fallback={null}>
          <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.6}>
            <NeuralTutor />
          </Float>
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(183,167,112,0.10),transparent)]"
        aria-hidden="true"
      />
      {/* Reduced motion hint overlay is handled via CSS global rule */}
    </div>
  );
}
