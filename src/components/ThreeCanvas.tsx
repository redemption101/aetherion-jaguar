import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ThreeCanvasProps {
  mach: number;
  drag: number;
  torque: number;
  gForce: number;
}

export default function ThreeCanvas({ mach, drag, torque, gForce }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 400;

    // ─── SCENE & CAMERA ──────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f5);
    scene.fog = new THREE.Fog(0xf4f4f5, 10, 30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(5.5, 2.8, 9);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // ─── RENDERER ───────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    
    // Clear any previous canvas inside container
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── CONTROLS ───────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enableZoom = true;
    controls.target.set(0, 0.4, 0);
    controls.maxPolarAngle = Math.PI / 2.2;
    controlsRef.current = controls;

    // ─── LIGHTS ─────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x30305a, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xbfd1ff, 1.8);
    keyLight.position.set(3, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4a6cf7, 0.9);
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x00ccff, 1.2, 14);
    rimLight.position.set(-1, 3, 6);
    scene.add(rimLight);

    const tailLight = new THREE.PointLight(0xff3344, 0.8, 10);
    tailLight.position.set(0, 0.5, -4);
    scene.add(tailLight);

    // ─── GRID HELPER ────────────────────────────────────────────
    const grid = new THREE.GridHelper(16, 28, 0xd4d4d8, 0xe4e4e7);
    grid.position.y = -0.3;
    scene.add(grid);

    // ─── SUPERSONIC VEHICLE (AETHERION JAGUAR) ─────────────────
    const car = new THREE.Group();
    
    // Sleek Main Fuselage
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8aacd0,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0f2038,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 4.4), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Aerodynamic Cockpit Canopy
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x2299ff,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
      emissive: 0x004488,
      emissiveIntensity: 0.2
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 1.2), cabinMat);
    cabin.position.set(0, 0.8, -0.1);
    cabin.castShadow = true;
    car.add(cabin);

    // Supersonic Front Wing/Splitter (Area Rule Compliant)
    const splitterMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Amber/Orange
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x5a2300,
      emissiveIntensity: 0.3
    });
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.5), splitterMat);
    splitter.position.set(0, 0.1, 2.2);
    car.add(splitter);

    // Rear Aero Diffuser
    const diffMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.3
    });
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.5), diffMat);
    diffuser.position.set(0, 0.15, -2.25);
    car.add(diffuser);

    // Rear Jet Exhaust Cone
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff4400,
      emissiveIntensity: 0.5
    });
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.6, 12), exhaustMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0.4, -2.3);
    car.add(exhaust);

    // Cybernetic Wheel Arches
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: 0x0f172a,
      emissiveIntensity: 0.3
    });
    const archPositions = [
      [-1.15, 0.25, 1.3],
      [1.15, 0.25, 1.3],
      [-1.15, 0.25, -1.3],
      [1.15, 0.25, -1.3]
    ];
    archPositions.forEach(([x, y, z]) => {
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 12), archMat);
      arch.position.set(x, y, z);
      arch.rotation.x = Math.PI / 2;
      car.add(arch);
    });

    // High-performance Alloy Wheels with Underglow rims
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.4
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan
      emissive: 0x0891b2,
      emissiveIntensity: 0.4
    });
    const wheelPositions = [
      [-1.15, 0.2, 1.3],
      [1.15, 0.2, 1.3],
      [-1.15, 0.2, -1.3],
      [1.15, 0.2, -1.3]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 16), wheelMat);
      wheel.position.set(x, y, z);
      wheel.rotation.x = Math.PI / 2;
      wheel.castShadow = true;
      car.add(wheel);
      
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), rimMat);
      rim.position.set(x, y, z);
      rim.rotation.x = Math.PI / 2;
      car.add(rim);
    });

    // Neon Ground-Effect Underglow
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.6), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.015;
    car.add(glow);

    scene.add(car);
    carRef.current = car;

    // ─── PARTICLE SYSTEM (Aero Boundary Layer Flows) ────────────
    const pCount = 220;
    const pGeometry = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 16;
      pPositions[i + 1] = Math.random() * 2;
      pPositions[i + 2] = (Math.random() - 0.5) * 16;
    }
    pGeometry.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    
    const pMaterial = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(pGeometry, pMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // ─── ANIMATION LOOP ─────────────────────────────────────────
    let animationFrameId: number;
    let t = 0;

    const animate = () => {
      t += 0.006;
      animationFrameId = requestAnimationFrame(animate);

      // Simple hovering physics float
      if (carRef.current) {
        carRef.current.position.y = Math.sin(t * 1.5) * 0.035;
        // Pitch/roll with speed fluctuations
        carRef.current.rotation.z = Math.sin(t) * 0.015;
        carRef.current.rotation.x = Math.cos(t * 2) * 0.008;
      }

      // Animate boundary layer flow particles based on mach speed & drag
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const currentMach = mach;
        
        for (let i = 0; i < positions.length; i += 3) {
          // Flow backward based on speed
          positions[i + 2] -= (0.04 + currentMach * 0.08) * (1 + Math.random() * 0.2);
          
          // Random vibration side-to-side
          positions[i] += (Math.random() - 0.5) * 0.01;
          positions[i + 1] += (Math.random() - 0.5) * 0.005;

          // Wrap particles around bounds
          if (positions[i + 2] < -8) {
            positions[i + 2] = 8;
            positions[i] = (Math.random() - 0.5) * 3;
            positions[i + 1] = Math.random() * 1.5;
          }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // ─── RESIZE HANDLING ────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !cameraRef.current || !rendererRef.current) return;
      const entry = entries[0];
      const { width: entryWidth, height: entryHeight } = entry.contentRect;
      
      cameraRef.current.aspect = entryWidth / entryHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(entryWidth, entryHeight);
    });
    
    resizeObserver.observe(containerRef.current);

    // ─── CLEANUP ────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update dynamic properties when prop updates
  useEffect(() => {
    if (carRef.current) {
      // Dynamic underglow color based on torque and speed
      const intensity = Math.min(1.0, Math.max(0.1, torque / 5));
      const material = (carRef.current.children[carRef.current.children.length - 1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (material) {
        material.color.setHex(gForce > 4.5 ? 0xff4400 : 0x0088ff);
        material.opacity = 0.15 + intensity * 0.25;
      }
    }
  }, [mach, drag, torque, gForce]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full min-h-[300px]" id="threeCanvasDiv" />
    </div>
  );
}
