"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

function Atom({
  position,
  color,
  radius,
}: {
  position: [number, number, number];
  color: string;
  radius: number;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

function Bond({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);

  const { position, rotation, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().add(e).multiplyScalar(0.5);
    const dir = e.clone().sub(s);
    const len = dir.length();
    const orientation = new THREE.Quaternion();
    orientation.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    const euler = new THREE.Euler().setFromQuaternion(orientation);
    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.4} />
    </mesh>
  );
}

function WaterMolecule({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const oxygenPos: [number, number, number] = [0, 0, 0];
  const h1Pos: [number, number, number] = [0.76, 0.58, 0];
  const h2Pos: [number, number, number] = [-0.76, 0.58, 0];

  return (
    <group position={position} rotation={rotation}>
      <Atom position={oxygenPos} color="#ef4444" radius={0.35} />
      <Atom position={h1Pos} color="#e2e8f0" radius={0.22} />
      <Atom position={h2Pos} color="#e2e8f0" radius={0.22} />
      <Bond start={oxygenPos} end={h1Pos} />
      <Bond start={oxygenPos} end={h2Pos} />
    </group>
  );
}

function FloatingParticles({ count = 40 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#06b6d4"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#06b6d4" />
      <pointLight position={[-10, -5, 5]} intensity={0.3} color="#8b5cf6" />

      <group ref={groupRef}>
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <WaterMolecule position={[0, 0, 0]} />
        </Float>
        <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
          <WaterMolecule position={[2.2, 1.2, -0.5]} rotation={[0.5, 0.8, 0]} />
        </Float>
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
          <WaterMolecule position={[-1.8, -1.0, 0.8]} rotation={[1.2, 0.3, 0.6]} />
        </Float>
        <Float speed={1.0} rotationIntensity={0.4} floatIntensity={0.6}>
          <WaterMolecule position={[0.5, -1.8, -1.2]} rotation={[0.8, 1.5, 0.2]} />
        </Float>
        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.5}>
          <WaterMolecule position={[-2.0, 1.5, 1.0]} rotation={[2.0, 0.5, 1.0]} />
        </Float>
      </group>

      <FloatingParticles count={60} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

export default function MoleculeHero() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 2]}
      className="!absolute inset-0"
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
