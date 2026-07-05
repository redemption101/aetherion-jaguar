import { useEffect, useState } from "react";
import { 
  Zap, 
  Cpu, 
  Terminal, 
  Shield, 
  RefreshCw, 
  Flame, 
  Layers, 
  Compass, 
  Server, 
  CheckCircle,
  Clock,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ThreeCanvas from "./components/ThreeCanvas";
import { SystemStateResponse, TelemetryData, ActorStatus, ActorLog } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "propulsion" | "ai" | "structural" | "actions" | "mnesia">("dashboard");
  const [systemState, setSystemState] = useState<SystemStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [localClock, setLocalClock] = useState<string>("--:--:--");
  const [mnesiaTable, setMnesiaTable] = useState<"globalEntities" | "influentialActors" | "familyNetwork">("globalEntities");
  const [dbSearch, setDbSearch] = useState("");

  // Live clock tracker (same as the HTML implementation)
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setLocalClock(d.toTimeString().slice(0, 8));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend telemetry state every 1000ms
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) throw new Error("Backend connection offline");
        const data: SystemStateResponse = await res.json();
        setSystemState(data);
        setError(null);
      } catch (err: any) {
        console.error("Fetch state error:", err);
        setError(err.message || "Failed to sync with sovereign actor core");
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Send asynchronous action command to backend actors
  const triggerAction = async (actionName: string) => {
    setActionPending(actionName);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      await res.json();
      
      // Instantly trigger state refetch to make UI responsive
      const stateRes = await fetch("/api/state");
      if (stateRes.ok) {
        const updatedData = await stateRes.json();
        setSystemState(updatedData);
      }
    } catch (err) {
      console.error("Action trigger failed:", err);
    } finally {
      setTimeout(() => setActionPending(null), 500);
    }
  };

  if (loading && !systemState) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center text-zinc-900 p-6 font-sans">
        <div className="w-10 h-10 bg-zinc-900 rounded flex items-center justify-center text-white font-mono text-xs font-bold animate-pulse shadow-sm">Ξ</div>
        <p className="mt-4 font-mono text-xs tracking-widest text-zinc-500 uppercase">Booting Aetherion Core / ACTORS ALIVE</p>
        <p className="text-[10px] text-zinc-400 mt-1 font-mono">Simulating Erlang, Rust & Pony safety constraints...</p>
      </div>
    );
  }

  // Safe variables with server fallbacks if database gets disrupted during a crash restart
  const telemetry: TelemetryData = systemState?.telemetry || {
    batteryPct: 94,
    gearboxActive: 2,
    torque: 3.2,
    threatLevel: 0.12,
    mach: 0.82,
    drag: 0.14,
    gForce: 1.8,
    coolingMargin: 112,
    yieldStrength: 620,
    isSupervising: true,
    activeBorrows: []
  };

  const actors: ActorStatus[] = systemState?.actors || [];
  const logs: ActorLog[] = systemState?.logs || [];

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#18181B] p-4 md:p-8 font-sans antialiased selection:bg-zinc-900/10 selection:text-zinc-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <header className="flex flex-wrap justify-between items-center bg-white border border-zinc-200 rounded-xl px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-zinc-900 rounded flex items-center justify-center text-white font-mono text-xs font-bold shadow-sm">Ξ</div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase flex items-center gap-1.5">
                AETHERION <span className="text-zinc-400 font-normal">/ Supersonic Actor Core</span>
              </h1>
              <p className="hidden md:block text-[10px] text-zinc-400 font-mono tracking-wider">
                JAGUAR · SUPERSONIC CHASSIS · AL-CU ALLOY
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono mt-2 sm:mt-0">
            {error ? (
              <span className="flex items-center gap-1.5 text-rose-700 font-medium bg-rose-50 px-2.5 py-1 rounded border border-rose-200 shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5" /> Core Offline
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> BEAM VM Active
              </span>
            )}
            <span className="h-4 w-[1px] bg-zinc-200"></span>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{localClock}</span>
            </div>
          </div>
        </header>

        {/* CORE NAVIGATION TABS */}
        <nav className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-3">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "dashboard" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            ⚡ Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("propulsion")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "propulsion" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            ⚙️ Propulsion
          </button>
          <button 
            onClick={() => setActiveTab("ai")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "ai" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            🧠 AI & V2X Core
          </button>
          <button 
            onClick={() => setActiveTab("structural")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "structural" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            🔩 Structural MMC
          </button>
          <button 
            onClick={() => setActiveTab("actions")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "actions" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            🎮 Action Sandbox
          </button>
          <button 
            onClick={() => setActiveTab("mnesia")}
            className={`text-xs font-semibold px-4 py-2 rounded transition-all duration-150 cursor-pointer ${
              activeTab === "mnesia" 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            🗄️ Mnesia DB Registry
          </button>
        </nav>

        {/* MAIN VIEWPORT LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* WORKER VIEWS (Left/Middle column: Cols 1-8) */}
          <div className="xl:col-span-8 space-y-6">
            
            <AnimatePresence mode="wait">
              
              {/* TAB CONTENT: DASHBOARD */}
              {activeTab === "dashboard" && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* 3D Visualizer Panel */}
                  <div className="bg-white rounded-2xl overflow-hidden relative h-80 md:h-96 border border-zinc-200 shadow-sm">
                    <ThreeCanvas 
                      mach={telemetry.mach} 
                      drag={telemetry.drag} 
                      torque={telemetry.torque}
                      gForce={telemetry.gForce}
                    />
                    
                    {/* Floating overlay indicators */}
                    <div className="absolute bottom-4 left-5 flex gap-2 text-[11px] font-mono">
                      <span className="bg-white/90 px-3 py-1.5 rounded border border-zinc-200 text-zinc-800 font-medium flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
                        <span>M {telemetry.mach.toFixed(2)}</span>
                      </span>
                      <span className="bg-white/90 px-3 py-1.5 rounded border border-zinc-200 text-zinc-800 font-medium flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>{telemetry.drag.toFixed(2)} Cd</span>
                      </span>
                      {telemetry.activeBorrows.length > 0 && (
                        <span className="bg-amber-50/90 px-3 py-1.5 rounded border border-amber-200 text-amber-800 font-medium flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                          <Shield className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>{telemetry.activeBorrows.length} Active Borrow</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="absolute top-4 right-4 flex gap-1.5">
                      <span className="bg-white/90 px-3 py-1 rounded border border-zinc-200 text-[10px] font-mono text-emerald-700 shadow-sm backdrop-blur-sm">
                        LIDAR 800m
                      </span>
                      <span className="bg-white/90 px-3 py-1 rounded border border-zinc-200 text-[10px] font-mono text-zinc-600 shadow-sm backdrop-blur-sm">
                        Sears-Haack Area Rule
                      </span>
                    </div>
                  </div>

                  {/* Grid of Real-time telemetry cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    
                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diamond Isotope</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>{telemetry.batteryPct}</span>
                        <span className="text-xs text-zinc-500 font-normal">%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                          style={{ width: `${telemetry.batteryPct}%` }}
                        ></div>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-1.5">14C · Beta-voltaic</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dual Gearbox</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>{telemetry.gearboxActive || "OFF"}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">/ OD</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 font-mono">Planetary</span>
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Torque Vector</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>{telemetry.torque.toFixed(1)}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">kNm</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-2.5">Asymmetric dynamic</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Threat</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>{telemetry.threatLevel.toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">%</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-2.5">V2X track clear</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Supersonic G</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>{telemetry.gForce.toFixed(1)}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">G</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-2.5">Al-Cu Core chassis</div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Engine Range</div>
                      <div className="text-2xl font-light tracking-tight text-zinc-900 flex items-baseline gap-1 mt-1">
                        <span>∞</span>
                        <span className="text-[10px] text-zinc-500 font-normal">km</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-2.5">Isotope decade cycle</div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: PROPULSION */}
              {activeTab === "propulsion" && (
                <motion.div 
                  key="propulsion"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-zinc-600" /> Dual-Gearbox Architecture
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Designed with an Erlang supervisor process monitoring two critical mechanical coordinators. 
                      Actuator state transitions run as isolated thread loops.
                    </p>
                    
                    <div className="space-y-3 pt-2 font-mono text-xs">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                        <span className="text-zinc-500">Gearbox 1 · Planetary (3-speed)</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 text-[10px] font-semibold">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                          ENGAGED
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                        <span className="text-zinc-500">Gearbox 2 · Dog-Overdrive (2-speed)</span>
                        <span className="text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 flex items-center gap-1 text-[10px] font-semibold">
                          <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></span>
                          ACTIVE
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-700">
                        <span className="text-zinc-500">Clutch Handoff Speed</span>
                        <span className="font-semibold">12 ms (Magnetic)</span>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 space-y-1">
                      <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Asymmetric Torque Vectoring</div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-zinc-900">{telemetry.torque.toFixed(2)} kNm</span>
                        <span className="text-xs text-zinc-500 font-mono">evasive yaw G: {telemetry.gForce.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-zinc-600" /> Diamond Isotope Battery (14C)
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      A beta-voltaic nuclear battery operating with deep thermal cooling margins. 
                      Writing updates to this actor requires the Pony reference capability <code className="text-zinc-800 font-bold px-1 py-0.5 bg-zinc-100 rounded">iso</code> (Isolated) to prevent read/write conflicts.
                    </p>

                    <div className="space-y-2 pt-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Core Thermal Output</span>
                        <span className="text-zinc-800 font-semibold">450 W</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Active Cooling Margin</span>
                        <span className="text-emerald-700 font-bold">{telemetry.coolingMargin}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Safety Headroom</span>
                        <span className="text-zinc-800">112% Limit Cap</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Expected Decades Lifespan</span>
                        <span className="text-zinc-800 font-semibold">25+ Years Continuous</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, telemetry.coolingMargin)}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: AI */}
              {activeTab === "ai" && (
                <motion.div 
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-zinc-600" /> Cognitive Sovereign Core
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Sovereign navigation node operating over quantum-safe V2X protocol. Logs and threat evaluations are treated as Pony <code className="text-zinc-800 font-bold px-1 py-0.5 bg-zinc-100 rounded">val</code> (globally immutable shared memory). No thread can write to them once evaluated.
                    </p>

                    <div className="space-y-2.5 pt-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">LiDAR Precision Boundary</span>
                        <span className="text-zinc-800">800 Meters Spherical</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">V2X Packet Guard</span>
                        <span className="text-emerald-700">Quantum-Safe AES-GCM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Active Obstacle Count</span>
                        <span className="text-zinc-800">37 Verified Tracks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Cognitive Tick Cycle</span>
                        <span className="text-zinc-800">100Hz Main Bus</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-zinc-600" /> Autonomous Evasive System
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      When active threats are detected, the autonomous core performs low-latency calculations. The actor sends high-priority messages directly to the propulsion unit.
                    </p>

                    <div className="space-y-2.5 pt-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Estimated Threat Level</span>
                        <span className="text-zinc-800 font-semibold">{telemetry.threatLevel.toFixed(4)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Computed Intercept Ratio</span>
                        <span className="text-zinc-800">{(telemetry.threatLevel * 0.7).toFixed(4)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Autonomous Max Handoff</span>
                        <span className="text-zinc-800">5.2 Gs lateral</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Decision-to-Actuator latency</span>
                        <span className="text-emerald-700 font-semibold font-mono">12 ms response</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: STRUCTURAL */}
              {activeTab === "structural" && (
                <motion.div 
                  key="structural"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-600" /> Al-Cu Metal Matrix Composite
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Chassis constructed using Al-Li-Cu micro-alloyed composite. Backed by self-repairing micro-twinning mechanisms that activate at supersonic G-stress levels.
                    </p>

                    <div className="space-y-2 pt-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Alloy Composition ratio</span>
                        <span className="text-zinc-800">90% Al-Li / 10% Cu</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Yield Strength Limit</span>
                        <span className="text-zinc-800">{telemetry.yieldStrength} MPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Density weight index</span>
                        <span className="text-zinc-800">2.68 g/cm³</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Energy absorption density</span>
                        <span className="text-emerald-700 font-semibold">43 kJ/kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-zinc-600" /> Aerodynamics & Sears-Haack Area Rule
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      To maintain low wave drag across supersonic transition, the vehicle body follows Sears-Haack equations. Active boundary layer systems reduce skin friction.
                    </p>

                    <div className="space-y-2 pt-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Aerodynamic Drag index</span>
                        <span className="text-zinc-800 font-semibold">{telemetry.drag.toFixed(2)} Cd</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Wave Drag Sears-Haack</span>
                        <span className="text-emerald-700 font-semibold">✓ COMPLIANT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Skin friction bleeding</span>
                        <span className="text-zinc-800">Active Boundary layer</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: ACTIONS & SAFETY SANDBOX */}
              {activeTab === "actions" && (
                <motion.div 
                  key="actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Standard System Operations */}
                  <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-800">System Command Controls</h3>
                    <p className="text-xs text-zinc-500">
                      Interact directly with the supersonic vehicle. Each button triggers an asynchronous actor message payload routed through the Express gateway.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <button 
                        onClick={() => triggerAction("boost")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Zap className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Boost Torque</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">+0.8 kNm</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("evade")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Compass className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Evasion Maneuver</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">+1.2G Lateral</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("scan")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Terminal className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Deep LiDAR Scan</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">Audit V2X node</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("cool")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Flame className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Thermal Cool</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">Cooling Margin +20%</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("aero")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Layers className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Active Aero</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">Optimize Drag</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("mnesia_transact")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-white border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <Server className="w-6 h-6 text-zinc-700 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-800">Mnesia Transact</span>
                        <span className="text-[9px] text-zinc-400 font-mono mt-1">Commit RAM writes</span>
                      </button>

                      <button 
                        onClick={() => triggerAction("reset")}
                        disabled={actionPending !== null}
                        className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800 rounded-xl transition-all duration-150 group cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-6 h-6 text-white mb-1 group-hover:rotate-45 transition-transform" />
                        <span className="text-xs font-bold">Supervisor Reset</span>
                        <span className="text-[9px] text-zinc-300 font-mono mt-1">Reboot All Actors</span>
                      </button>
                    </div>
                  </div>

                  {/* THE RUST & PONY SAFETY VIOLATION SANDBOX */}
                  <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <h3 className="text-sm font-bold text-rose-900 font-mono">Pony & Rust Safety Violations Sandbox</h3>
                    </div>
                    <p className="text-xs text-rose-800/80 leading-relaxed">
                      Test the compiler-like guards built into the Aetherion backend! 
                      Triggering these commands purposefully violates memory ownership or capability boundaries. 
                      <strong> The associated actor will immediately panic and crash, and Erlang's supervisor will automatically restart it</strong>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      
                      {/* RUST BORROW COLLISION */}
                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-rose-700 font-bold bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200">RUST CRASH</span>
                          <h4 className="text-xs font-bold text-zinc-800 mt-2">Simulate Borrow Collision</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            Attempts to borrow the <code>cooling_loop</code> as mutable (&mut) while an immutable read borrow (&) is active. 
                            Violates Rust aliasing rules!
                          </p>
                        </div>
                        <button 
                          onClick={() => triggerAction("violation_borrow")}
                          className="mt-4 text-xs font-mono bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Fire Aliasing Conflict
                        </button>
                      </div>

                      {/* PONY REFERENCE CAPABILITY VIOLATION */}
                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-rose-700 font-bold bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200">PONY CRASH</span>
                          <h4 className="text-xs font-bold text-zinc-800 mt-2">Leak Thread-Local `ref`</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            Attempts to send a local thread-unsafe mutable <code>ref</code> state object to another actor. 
                            Pony reference capabilities reject this to prevent data races.
                          </p>
                        </div>
                        <button 
                          onClick={() => triggerAction("violation_pony_ref")}
                          className="mt-4 text-xs font-mono bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Leak Thread-Local ref
                        </button>
                      </div>

                      {/* PONY VAL IMMUTABILITY VIOLATION */}
                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-rose-700 font-bold bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200">PONY CRASH</span>
                          <h4 className="text-xs font-bold text-zinc-800 mt-2">Write to Globally `val`</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            Attempts to write directly to a shared variable assigned with <code>val</code> capability. 
                            Val represents globally immutable values!
                          </p>
                        </div>
                        <button 
                          onClick={() => triggerAction("violation_pony_val")}
                          className="mt-4 text-xs font-mono bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Violate Immutability
                        </button>
                      </div>

                      {/* MNESIA TRANSACTION VIOLATION */}
                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-rose-700 font-bold bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200">MNESIA CRASH</span>
                          <h4 className="text-xs font-bold text-zinc-800 mt-2">Bypass Security Sign</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            Sends an unauthenticated transaction write to the Mnesia database actor without the Sovereign key signature. 
                            Triggers a state panic!
                          </p>
                        </div>
                        <button 
                          onClick={() => triggerAction("violation_mnesia")}
                          className="mt-4 text-xs font-mono bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Violate Mnesia Sign
                        </button>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: MNESIA DATABASE REGISTRY */}
              {activeTab === "mnesia" && (
                <motion.div 
                  key="mnesia"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* SOVEREIGN ARCHITECTS & COUNCIL HERO BANNER */}
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl p-6 border border-zinc-800 shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 font-bold tracking-wider">
                          <Server className="w-3.5 h-3.5 text-zinc-400" />
                          <span>MNESIA REPLICATED DB NODE : ONLINE</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Sovereign Architecture Core</h2>
                        <p className="text-xs text-zinc-400 max-w-xl">
                          Sovereignly governed, memory-safe database managing global entities, stock markets, and influential networks under Erlang/OTP fault isolation principles.
                        </p>
                      </div>
                      
                      <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 min-w-[240px] shadow-inner font-mono text-xs space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sovereign Authority</div>
                        <div className="text-sm font-extrabold text-zinc-100">Mandlenkosi Vundla</div>
                        <div className="text-[9px] text-zinc-400 mt-2 border-t border-zinc-800 pt-1.5 font-bold uppercase tracking-wider">Advisory Council</div>
                        <div className="text-[10px] text-zinc-300">Sempi Mvala (Co-Founder & Advisor)</div>
                        <div className="text-[10px] text-zinc-300 font-medium">Mrs Codex (Co-Founder & Advisor)</div>
                        <div className="text-[10px] text-zinc-300 font-medium font-sans">Theodore Swarts (Co-Founder & Advisor)</div>
                      </div>
                    </div>
                  </div>

                  {/* INTERNAL MNESIA TABLES COMPARTMENT */}
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Filter controls and Sub-table tabs */}
                    <div className="bg-zinc-50/80 border-b border-zinc-200 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                      <div className="flex gap-1.5 flex-wrap w-full md:w-auto">
                        <button
                          onClick={() => { setMnesiaTable("globalEntities"); setDbSearch(""); }}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded transition-all cursor-pointer ${
                            mnesiaTable === "globalEntities"
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          📊 Global Entities & Markets ({systemState?.mnesia?.tables?.globalEntities?.length || 15})
                        </button>
                        <button
                          onClick={() => { setMnesiaTable("influentialActors"); setDbSearch(""); }}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded transition-all cursor-pointer ${
                            mnesiaTable === "influentialActors"
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          👑 Global VIPs & Lists ({systemState?.mnesia?.tables?.influentialActors?.length || 11})
                        </button>
                        <button
                          onClick={() => { setMnesiaTable("familyNetwork"); setDbSearch(""); }}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded transition-all cursor-pointer ${
                            mnesiaTable === "familyNetwork"
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          🤝 Family & Spiritual Circle ({systemState?.mnesia?.tables?.familyNetwork?.length || 34})
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full md:w-72">
                        <input
                          type="text"
                          placeholder="Query registry records..."
                          value={dbSearch}
                          onChange={(e) => setDbSearch(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Table display */}
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-50/50 border-b border-zinc-200 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Key / UID</th>
                            <th className="py-3 px-4">Record Name</th>
                            <th className="py-3 px-4">Inherent Classification</th>
                            <th className="py-3 px-4">Operational Specifics</th>
                            <th className="py-3 px-4 text-right">Mnesia Metric</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-mono">
                          {(() => {
                            const rawRecords = systemState?.mnesia?.tables?.[mnesiaTable] || [];
                            const filtered = rawRecords.filter((rec) => 
                              rec.name.toLowerCase().includes(dbSearch.toLowerCase()) ||
                              rec.id.toLowerCase().includes(dbSearch.toLowerCase()) ||
                              rec.category.toLowerCase().includes(dbSearch.toLowerCase()) ||
                              rec.details.toLowerCase().includes(dbSearch.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-zinc-400 font-mono italic">
                                    &gt; No Mnesia records matched your search query filter.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((rec) => (
                              <tr key={rec.id} className="hover:bg-zinc-50/40 transition-colors">
                                <td className="py-3 px-4 text-zinc-900 font-semibold text-[11px]">
                                  {rec.id}
                                </td>
                                <td className="py-3 px-4 text-zinc-800 font-sans font-bold text-[12px]">
                                  {rec.name}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 font-sans">
                                    {rec.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-zinc-500 font-sans text-xs leading-tight">
                                  {rec.details}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {rec.resiliencySignal !== undefined ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[10px] font-sans">
                                      {(rec.resiliencySignal * 100).toFixed(1)}% Resilient
                                    </span>
                                  ) : rec.influenceFactor !== undefined ? (
                                    <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold text-[10px] font-sans">
                                      Influence {rec.influenceFactor}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-bold text-[10px] font-sans">
                                      Sovereign Trust
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-zinc-50/50 border-t border-zinc-200 px-4 py-2.5 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                      <span>Node Type: distributed_ram_copies</span>
                      <span>Mnesia Version: Erlang/OTP 25+ Compliant</span>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* DIAGNOSTIC ACTIVE BORROW CHECKS PANEL */}
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span> Active Rust Borrow Registry
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Continuous check</span>
              </div>
              
              {telemetry.activeBorrows.length === 0 ? (
                <p className="text-xs font-mono text-zinc-400 italic py-1">
                  &gt; No active borrows found. Memory is safe and dereferenced.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {telemetry.activeBorrows.map((b, i) => (
                    <div key={i} className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-600">Key: <span className="text-zinc-900 font-bold">{b.resource}</span></span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                        {b.type === "write" ? "&mut (Exclusive Write)" : "& (Shared Read)"}
                      </span>
                      <span className="text-zinc-400">By: {b.borrowedBy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* DIAGNOSTICS & LOGS (Right column: Cols 9-12) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* ACTOR SYSTEM STATUS CARD (Erlang + Pony Diagnostics) */}
            <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-800">Erlang Supervisor Monitor</h3>
              </div>
              
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Real-time worker micro-processes registered under the Aetherion Supervisor. 
                Restart counts are handled via <code>one_for_one</code> isolation.
              </p>

              <div className="space-y-3.5 pt-2">
                {actors.map((actor) => (
                  <div key={actor.id} className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          {actor.name}
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-mono tracking-wider font-semibold ${
                            actor.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : actor.status === "crashed" 
                              ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse" 
                              : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                          }`}>
                            {actor.status}
                          </span>
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono mt-1">ID: {actor.id}</p>
                      </div>
                      
                      <div className="text-right text-[10px] font-mono">
                        <div className="text-zinc-500">Restarts: <span className="text-zinc-950 font-bold">{actor.restartsCount}</span></div>
                        <div className="text-zinc-400 mt-0.5">Mailbox: {actor.mailboxSize} msgs</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {/* Pony Reference Capability */}
                      <span className={`text-[8px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                        actor.refCapability === "iso" 
                          ? "bg-sky-50 text-sky-700 border-sky-200" 
                          : actor.refCapability === "val" 
                          ? "bg-purple-50 text-purple-700 border-purple-200" 
                          : actor.refCapability === "ref" 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        Pony Cap: {actor.refCapability.toUpperCase()}
                      </span>

                      {/* Rust Borrow state */}
                      <span className={`text-[8px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                        actor.borrowState === "exclusive_write" 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : actor.borrowState === "shared_read" 
                          ? "bg-sky-50 text-sky-700 border-sky-200" 
                          : "bg-zinc-100 text-zinc-400 border-zinc-200"
                      }`}>
                        Rust Borrow: {actor.borrowState === "none" ? "SAFE" : actor.borrowState.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COGNITIVE CORE LOG (Actor Logs) */}
            <div className="bg-zinc-900 rounded-xl p-5 flex flex-col font-mono shadow-md border border-zinc-800">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                <div className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Cognitive Core Tracing</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                </div>
              </div>

              <div className="h-56 overflow-y-auto pr-1 text-xs space-y-2 font-mono scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-zinc-500 italic">&gt; Listening for telemetry...</div>
                ) : (
                  logs.map((log) => {
                    let colorClass = "text-zinc-400";
                    if (log.type === "error") colorClass = "text-rose-400 font-bold";
                    else if (log.type === "warn") colorClass = "text-amber-400";
                    else if (log.type === "success") colorClass = "text-emerald-400";
                    else if (log.actorId === "supervisor") colorClass = "text-purple-300 font-semibold";
                    else if (log.actorId === "client") colorClass = "text-sky-400";

                    return (
                      <div key={log.id} className={`${colorClass} leading-relaxed pb-1`}>
                        <span className="text-[10px] text-zinc-600 mr-1.5">[{log.timestamp.slice(11, 19)}]</span>
                        <span className="text-zinc-500 font-semibold mr-1">[{log.actorId.toUpperCase()}]</span>
                        <span>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[9px] text-zinc-500 pt-2.5 mt-2 border-t border-zinc-800 flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Z3 verified invariants
                </span>
                <span>100Hz</span>
              </div>
            </div>

          </div>

        </div>

        {/* FOOTER SECTION */}
        <footer className="mt-8 text-[10px] text-zinc-500 border-t border-zinc-200 pt-4 flex flex-wrap justify-between items-center gap-2 font-mono">
          <span className="uppercase tracking-wider">
            ⚡ Aetherion · Actor-Based Telemetry · Diamond Isotope · Al-Cu MMC Alloy · Z3 invariants verified
          </span>
          <span className="bg-zinc-800 text-white px-2 py-0.5 rounded">
            Master Console
          </span>
        </footer>

      </div>
    </div>
  );
}
