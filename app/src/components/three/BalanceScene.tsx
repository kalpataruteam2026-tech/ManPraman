import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, RoundedBox } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import type { Group } from 'three';

/**
 * Tasteful 3D metrology hero (landing page only). Kept restrained and
 * professional per DESIGN_SPEC PART 13 — no external HDRI so it stays
 * offline-friendly; lighting is authored manually.
 */
function Platform() {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.5 + 0.4;
    }
  });

  return (
    <group ref={group}>
      {/* Base plate */}
      <RoundedBox args={[3.4, 0.35, 3.4]} radius={0.08} smoothness={4} position={[0, -0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#13294b" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      {/* Weighing pan */}
      <RoundedBox args={[2.7, 0.14, 2.7]} radius={0.06} smoothness={4} position={[0, 0.1, 0]} castShadow>
        <meshStandardMaterial color="#dfe7f2" metalness={0.85} roughness={0.22} />
      </RoundedBox>
      {/* Calibration weights */}
      <mesh position={[-0.6, 0.55, -0.3]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.8, 40]} />
        <meshStandardMaterial color="#0e7f92" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0.65, 0.42, 0.4]} castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.55, 40]} />
        <meshStandardMaterial color="#22d3ee" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.15, 0.34, -0.7]} castShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.38, 40]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function BalanceScene() {
  return (
    <Canvas shadows camera={{ position: [4.5, 3.2, 5], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={['#081527']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, 3, -3]} intensity={40} color="#22d3ee" />
      <pointLight position={[4, 2, 4]} intensity={20} color="#ffffff" />
      <Suspense fallback={null}>
        <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
          <Platform />
        </Float>
        <ContactShadows position={[0, -0.42, 0]} opacity={0.5} scale={12} blur={2.6} far={4} color="#000000" />
      </Suspense>
    </Canvas>
  );
}
