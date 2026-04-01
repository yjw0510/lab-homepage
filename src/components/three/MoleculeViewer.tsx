"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Environment } from "@react-three/drei";

function SimpleMolecule() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group>
        {/* Oxygen */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.1} />
        </mesh>
        {/* Hydrogen 1 */}
        <mesh position={[0.8, 0.6, 0]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
        </mesh>
        {/* Hydrogen 2 */}
        <mesh position={[-0.8, 0.6, 0]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
        </mesh>
        {/* Bonds */}
        <mesh position={[0.4, 0.3, 0]} rotation={[0, 0, -0.64]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-0.4, 0.3, 0]} rotation={[0, 0, 0.64]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
    </Float>
  );
}

export default function MoleculeViewer() {
  return (
    <div className="h-64 w-full rounded-xl overflow-hidden bg-card border border-border">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <SimpleMolecule />
        <OrbitControls enableZoom autoRotate autoRotateSpeed={1} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
