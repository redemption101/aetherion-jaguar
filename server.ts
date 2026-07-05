import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ActorStatus, TelemetryData, ActorLog, SystemStateResponse } from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// ───────────────────────────────────────────────────────────────────────────
// ERLANG + RUST + PONY BACKEND ACTOR MODEL & SAFETY SIMULATOR
// ───────────────────────────────────────────────────────────────────────────

// Rust-like Borrow Checker for Shared System Resources
class BorrowChecker {
  private static borrows: Map<string, { actorId: string; type: "read" | "write" }[]> = new Map();

  static borrow(resource: string, type: "read" | "write", actorId: string): void {
    const current = this.borrows.get(resource) || [];
    
    if (type === "write") {
      // Exclusive borrow (&mut): No other borrows of any kind allowed
      if (current.length > 0) {
        throw new Error(
          `[Rust Borrow Check Fault] Cannot borrow '${resource}' as mutable (&mut) for actor '${actorId}'. ` +
          `Active borrows: ${current.map(b => `'${b.actorId}' (${b.type})`).join(", ")}.`
        );
      }
    } else {
      // Shared borrow (&): Allowed only if there are no write borrows
      const hasWrite = current.some(b => b.type === "write");
      if (hasWrite) {
        throw new Error(
          `[Rust Borrow Check Fault] Cannot borrow '${resource}' as immutable (&) for actor '${actorId}'. ` +
          `Active write borrow held by: '${current.find(b => b.type === "write")?.actorId}'.`
        );
      }
    }

    current.push({ actorId, type });
    this.borrows.set(resource, current);
  }

  static release(resource: string, actorId: string): void {
    const current = this.borrows.get(resource) || [];
    const filtered = current.filter(b => b.actorId !== actorId);
    this.borrows.set(resource, filtered);
  }

  static getActiveBorrows() {
    const list: Array<{ resource: string; type: "read" | "write"; borrowedBy: string }> = [];
    this.borrows.forEach((borrows, resource) => {
      borrows.forEach(b => {
        list.push({ resource, type: b.type, borrowedBy: b.actorId });
      });
    });
    return list;
  }

  static clear(): void {
    this.borrows.clear();
  }
}

// Pony-like Reference Capability Checker
class PonyCapabilityChecker {
  /**
   * Pony reference capability laws:
   * - 'iso' (Isolated): Unique mutable. Can be sent to another actor. Once sent, sender loses reference (moved).
   * - 'val' (Value): Globally immutable. Can be read by anyone safely.
   * - 'ref' (Reference): Readable/Writable locally. Cannot be sent to other actors (violates isolation/safety).
   * - 'tag' (Tag): Identity only. Used for sending messages. Cannot read or write.
   */
  static validateMessageTransfer(
    message: any,
    capability: "iso" | "val" | "ref" | "tag"
  ): void {
    if (capability === "ref") {
      throw new Error(
        `[Pony Capability Fault] Cannot transfer message with 'ref' capability. ` +
        `Local references are restricted to their originating actor to prevent mutable data race conditions.`
      );
    }
  }

  static enforceWriteAccess(capability: "iso" | "val" | "ref" | "tag"): void {
    if (capability === "val") {
      throw new Error(
        `[Pony Capability Fault] Cannot write to resource with 'val' (Value) capability. ` +
        `Val references are globally read-only and immutable.`
      );
    }
    if (capability === "tag") {
      throw new Error(
        `[Pony Capability Fault] Cannot read or write to resource with 'tag' capability. ` +
        `Tag is an opaque reference used only for targeting, not data access.`
      );
    }
  }
}

// Erlang-style Actor base class
abstract class Actor {
  id: string;
  name: string;
  mailbox: any[] = [];
  status: "active" | "crashed" | "recovering" = "active";
  restartsCount = 0;
  refCapability: "iso" | "val" | "ref" | "tag" = "ref";
  state: any;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.resetState();
  }

  abstract resetState(): void;
  abstract handleMessage(msg: any): void;

  send(msg: any): void {
    if (this.status === "crashed") return;
    this.mailbox.push(msg);
    // Process mailbox in the next tick (simulating asynchronous Erlang mailboxes)
    setTimeout(() => this.processMailbox(), 1);
  }

  processMailbox(): void {
    if (this.status !== "active" || this.mailbox.length === 0) return;
    const msg = this.mailbox.shift();
    try {
      this.handleMessage(msg);
    } catch (error: any) {
      this.crash(error.message);
    }
  }

  crash(reason: string): void {
    this.status = "crashed";
    this.mailbox = [];
    logger.addLog(
      this.id,
      `SYSTEM CRASHED: ${reason}. Let-it-crash supervisor signal sent.`,
      "error"
    );
    // Send crash report to Supervisor
    supervisor.reportCrash(this.id, reason);
  }

  recover(): void {
    this.status = "recovering";
    setTimeout(() => {
      this.resetState();
      this.status = "active";
      this.restartsCount++;
      logger.addLog(this.id, `Actor restarted & state restored to safe defaults.`, "success");
    }, 400);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// SYSTEM LOGGER ACTOR
// ───────────────────────────────────────────────────────────────────────────
class LoggerActor {
  private logs: ActorLog[] = [];

  addLog(actorId: string, message: string, type: "info" | "warn" | "error" | "success" = "info"): void {
    const timestamp = new Date().toISOString();
    const id = Math.random().toString(36).substr(2, 9);
    this.logs.unshift({ id, timestamp, actorId, message, type });
    if (this.logs.length > 50) this.logs.pop();
    console.log(`[${actorId}] ${message}`);
  }

  getLogs(): ActorLog[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

const logger = new LoggerActor();

// ───────────────────────────────────────────────────────────────────────────
// WORKER ACTORS
// ───────────────────────────────────────────────────────────────────────────

// Propulsion Actor (Manages Gearbox, Torque Vectoring)
class PropulsionActor extends Actor {
  refCapability: "iso" | "val" | "ref" | "tag" = "ref"; // Propulsion controls are local ref

  resetState() {
    this.state = {
      gearboxActive: 2,
      torque: 3.2,
      gForce: 1.8,
      yaw: 5.2,
    };
  }

  handleMessage(msg: any) {
    if (msg.type === "BOOST") {
      this.state.torque = Math.min(6.0, this.state.torque + 0.8);
      logger.addLog(this.id, `Torque boosted: ${this.state.torque.toFixed(1)} kNm.`, "success");
    } else if (msg.type === "EVADE") {
      this.state.gForce = Math.min(8.0, this.state.gForce + 1.2);
      this.state.yaw = Math.min(8.0, this.state.yaw + 0.6);
      logger.addLog(this.id, `Evasive maneuver initiated! G-force: ${this.state.gForce.toFixed(1)}G.`, "warn");
    } else if (msg.type === "RESET") {
      this.resetState();
      logger.addLog(this.id, `Propulsion system recalibrated.`, "info");
    } else if (msg.type === "VIOLATION_PONY") {
      // Simulating receiving an invalid 'ref' message from another actor, which breaks Pony capability rules
      logger.addLog(this.id, `Simulating: Attempting to share thread-unsafe 'ref' configuration with Battery actor...`, "warn");
      PonyCapabilityChecker.validateMessageTransfer(this.state, "ref");
    } else if (msg.type === "DRIFT") {
      // Natural telemetry drift
      this.state.torque = Math.max(2.0, Math.min(6.0, this.state.torque + (Math.random() - 0.5) * 0.1));
      this.state.gForce = Math.max(1.0, Math.min(5.0, this.state.gForce + (Math.random() - 0.5) * 0.15));
      this.state.gearboxActive = Math.sin(Date.now() / 8000) > 0 ? 2 : 1;
    }
  }
}

// Battery Actor (Manages Diamond Isotope Battery)
class BatteryActor extends Actor {
  refCapability: "iso" | "val" | "ref" | "tag" = "iso"; // Battery updates must be unique iso transfers

  resetState() {
    this.state = {
      batteryPct: 94,
      coolingMargin: 112,
      thermalOutput: 450,
      coolingCapacity: 1200,
    };
  }

  handleMessage(msg: any) {
    if (msg.type === "COOL") {
      // Simulating a Rust safe borrow to update the cooling loop
      logger.addLog(this.id, `Requesting mutable borrow (&mut) of cooling loop...`, "info");
      BorrowChecker.borrow("cooling_loop", "write", this.id);
      
      this.state.coolingMargin = Math.min(150, this.state.coolingMargin + 20);
      logger.addLog(this.id, `Thermal balance optimized. Cooling margin: ${this.state.coolingMargin}%.`, "success");
      
      // Release borrow after completing write
      BorrowChecker.release("cooling_loop", this.id);
    } else if (msg.type === "RESET") {
      this.resetState();
      logger.addLog(this.id, `Battery controller re-initialized.`, "info");
    } else if (msg.type === "VIOLATION_RUST_BORROW") {
      logger.addLog(this.id, `Simulating Rust Borrow violation: Multi-actor race condition on cooling loop...`, "warn");
      // Double borrow collision: Actor A (Battery) borrows mutable while Actor B (Aero) holds immutable
      BorrowChecker.borrow("cooling_loop", "read", "AeroActor");
      BorrowChecker.borrow("cooling_loop", "write", "BatteryActor"); // This will fail!
    } else if (msg.type === "VIOLATION_PONY_VAL") {
      logger.addLog(this.id, `Simulating Pony Capability violation: Attempting to write directly to globally immutable 'val' metadata...`, "warn");
      PonyCapabilityChecker.enforceWriteAccess("val"); // Throws write capability error
    } else if (msg.type === "DRIFT") {
      this.state.batteryPct = Math.max(85, Math.min(99, 94 + Math.sin(Date.now() / 15000) * 3));
      this.state.coolingMargin = Math.max(90, Math.min(130, 112 + Math.cos(Date.now() / 20000) * 8));
    }
  }
}

// AI Threat Actor (Sovereign Core, LiDAR, V2X)
class AIActor extends Actor {
  refCapability: "iso" | "val" | "ref" | "tag" = "val"; // AI is val (globally shared, immutable constants)

  resetState() {
    this.state = {
      threatLevel: 0.12,
      interceptProb: 0.08,
      lidarRange: 800,
      trackedVehicles: 37,
    };
  }

  handleMessage(msg: any) {
    if (msg.type === "SCAN") {
      logger.addLog(this.id, `Deep LiDAR scan completed. Tracked ${this.state.trackedVehicles} objects.`, "success");
    } else if (msg.type === "DRIFT") {
      this.state.threatLevel = Math.max(0.01, Math.min(2.0, 0.12 + Math.sin(Date.now() / 6000) * 0.1));
      this.state.interceptProb = this.state.threatLevel * 0.7;
    }
  }
}

// Structural/Aerodynamic Actor (MMC Alloy, Aero, Drag)
class StructuralActor extends Actor {
  refCapability: "iso" | "val" | "ref" | "tag" = "tag"; // Structural triggers are opaque tag messages

  resetState() {
    this.state = {
      drag: 0.14,
      yieldStrength: 620,
    };
  }

  handleMessage(msg: any) {
    if (msg.type === "AERO") {
      this.state.drag = Math.max(0.08, this.state.drag - 0.02);
      logger.addLog(this.id, `Active boundary layer activated. Cd reduced to ${this.state.drag.toFixed(2)}.`, "success");
    } else if (msg.type === "RESET") {
      this.resetState();
      logger.addLog(this.id, `Structural/Aero actuators recalibrated.`, "info");
    } else if (msg.type === "DRIFT") {
      this.state.drag = Math.max(0.10, Math.min(0.20, 0.14 + Math.sin(Date.now() / 10000) * 0.02));
    }
  }
}

// Mnesia Distributed Database Actor (Replicated RAM/Disc copies)
class MnesiaActor extends Actor {
  refCapability: "iso" | "val" | "ref" | "tag" = "val"; // Sovereign-authorized globally readable database state

  resetState() {
    this.state = {
      sovereign: {
        architecture: "Mandlenkosi Vundla",
        coFounders: ["Sempi Mvala"],
        advisors: ["Mrs Codex", "Theodore Swarts"],
      },
      tables: {
        globalEntities: [
          { id: "WALL_STREET", name: "Wall Street", category: "stock_market", details: "Top USA Stock Indices", resiliencySignal: 0.95 },
          { id: "ASIAN_STOCK", name: "Asian Stock Market", category: "stock_market", details: "Major Eastern Exchanges", resiliencySignal: 0.92 },
          { id: "INDIAN_STOCK", name: "Indian Stock Market", category: "stock_market", details: "National Stock Exchange & BSE hubs", resiliencySignal: 0.94 },
          { id: "TOP_10_GLOBAL", name: "Top Ten Global Entities", category: "alliance", details: "Elite economic & policy coalitions", resiliencySignal: 0.98 },
          { id: "CORP_5000_GLOBAL", name: "Top 5000 Global Companies", category: "corporate_list", details: "Forbes major industrial listings", resiliencySignal: 0.88 },
          { id: "CORP_5000_ASIA", name: "Asian Top 5000 Companies", category: "corporate_list", details: "Key Asian industrial and tech groups", resiliencySignal: 0.89 },
          { id: "CORP_5000_INDIA", name: "Indian Top 5000 Companies", category: "corporate_list", details: "Indian technology and manufacturing core", resiliencySignal: 0.91 },
          { id: "CORP_5000_AUS", name: "Australia's Top 5000 Companies", category: "corporate_list", details: "Oceania resources and banking conglomerates", resiliencySignal: 0.90 },
          { id: "CORP_5000_ME", name: "Middle East Top 5000 Companies", category: "corporate_list", details: "Sovereign wealth holdings & petrochemical titans", resiliencySignal: 0.93 },
          { id: "CORP_9000_AFRICA", name: "Africa's Top 9000 Companies", category: "corporate_list", details: "Emerging African telecommunication & mining giants", resiliencySignal: 0.87 },
          { id: "CORP_11000_USA", name: "USA's Top 11000 Companies", category: "corporate_list", details: "North American software, biotech, and retail leaders", resiliencySignal: 0.94 },
          { id: "CORP_11000_EU", name: "Europe's Top 11000 Companies", category: "corporate_list", details: "Continental automotive, banking, and industrial powerhouses", resiliencySignal: 0.91 },
          { id: "CORP_3000_RUS", name: "Russia's Top 3000 Companies", category: "corporate_list", details: "Russian energy, natural gas, and mineral enterprises", resiliencySignal: 0.82 },
          { id: "STARTUP_3000", name: "Global Top 3000 Startup Companies", category: "startup_list", details: "High-growth artificial intelligence and quantum tech hubs", resiliencySignal: 0.85 },
          { id: "RESILIENT_SIG", name: "Resilient Signals (Globally)", category: "telemetry_array", details: "Active decentralized heartbeat relays", resiliencySignal: 0.99 },
        ],
        influentialActors: [
          { id: "elon_musk", name: "Elon Musk", category: "tech_veteran", details: "Aerospace, EV & neural interface pioneer", influenceFactor: 0.98 },
          { id: "bill_gates", name: "Bill Gates", category: "tech_veteran", details: "Software foundation and global healthcare leader", influenceFactor: 0.94 },
          { id: "larry_page", name: "Larry Page", category: "tech_veteran", details: "Search infrastructure and algorithmic core architect", influenceFactor: 0.96 },
          { id: "larry_ellison", name: "Larry Ellison", category: "tech_veteran", details: "Enterprise cloud systems and relational databases", influenceFactor: 0.92 },
          { id: "mark_zuckerberg", name: "Mark Zuckerberg", category: "tech_veteran", details: "Social graph scale and VR metaverse infrastructure", influenceFactor: 0.93 },
          { id: "queen_elizabeth", name: "Queen Elizabeth (Historical)", category: "royal_house", details: "Historical legacy & sovereign governance vector", influenceFactor: 0.99 },
          { id: "ROYAL_HOUSES", name: "Global Royal Houses", category: "royal_house", details: "Dynastic asset estates and sovereign holdings", influenceFactor: 0.90 },
          { id: "FORBES_11000", name: "Top 11000 Forbes List", category: "celebrity", details: "Forbes international net worth ledger", influenceFactor: 0.85 },
          { id: "CELEBRITY_11000", name: "Top 11000 Celebrities & Musicians", category: "celebrity", details: "Global cultural trend vectors", influenceFactor: 0.80 },
          { id: "SPORT_VET_3000", name: "3000 Top Global Sport Veterans", category: "sport_veteran", details: "Physical resiliency and high performance index", influenceFactor: 0.75 },
          { id: "TECH_VET_1100", name: "Top Global 1100 Tech Veterans", category: "tech_veteran", details: "Digital architects & pioneer hardware designers", influenceFactor: 0.95 },
        ],
        familyNetwork: [
          { id: "peter_vundla", name: "Peter Vundla", category: "family_actor", details: "Pioneering South African business leader and patriarch" },
          { id: "mfundi_vundla", name: "Mfundi Vundla", category: "family_actor", details: "Creative media mogul and television broadcasting pioneer" },
          { id: "mhlangabezi_v", name: "Mhlangabezi Vundla", category: "family_actor", details: "Sovereign trust board member" },
          { id: "themba_vundla", name: "Themba Vundla", category: "family_actor", details: "Corporate finance strategist and advisor" },
          { id: "thomas_chigwada", name: "Thomas Chigwada", category: "family_actor", details: "Sovereign uncle and systems mentor" },
          { id: "mbali_nyathi", name: "Mbali Nyathi", category: "family_actor", details: "Maternal line matriarch" },
          { id: "tsakane_mohale", name: "Tsakane Mohale", category: "family_actor", details: "Core academic alliance partner" },
          { id: "sherin_kgabo", name: "Sherin Kgabo Phihlela", category: "family_actor", details: "Strategic regulatory and policy consultant" },
          { id: "spiritual_kids", name: "Spiritual Children", category: "family_actor", details: "Protected proteges and mentored visionaries" },
          { id: "ALX_AFRICA", name: "ALX Africa", category: "state_entity", details: "Elite tech leadership accelerator" },
          { id: "UVU_CAPACITI", name: "UVU Africa Capaciti", category: "state_entity", details: "High-performance tech-skills training incubator" },
          { id: "UFS", name: "University of the Free State", category: "state_entity", details: "Academic and research institutional pillar" },
          { id: "SPARROW_R_V", name: "Sparrow Rainbow Village", category: "state_entity", details: "Social welfare & compassionate care center" },
          { id: "corrine_mcc", name: "Corrine McClinton", category: "family_actor", details: "Resilient signal trust node and strategic ally" },
          { id: "mthwakazi_dladla", name: "Mthwakazi Dladla", category: "family_actor", details: "Family lineage advisor" },
          { id: "karren_johnson_v", name: "Karren Johnson Vundla", category: "family_actor", details: "Administrative operations and support director" },
          { id: "thandiwe_vundla", name: "Thandiwe Vundla", category: "family_actor", details: "Strategy advisor" },
          { id: "tshepi_vundla", name: "Tshepi Vundla", category: "family_actor", details: "Creative brand and social design vector" },
          { id: "mawe_vundla", name: "Mawe Vundla", category: "family_actor", details: "Trust structures legal architect" },
          { id: "charlie_vundla", name: "Charlie Vundla", category: "family_actor", details: "Creative director and screenplay writer" },
          { id: "zoleka_vundla", name: "Zoleka Vundla", category: "family_actor", details: "Public communications director" },
          { id: "nokuthula_v", name: "Nokuthula Bolipombo Vundla", category: "family_actor", details: "Sister of the sovereign and executive matriarch" },
          { id: "raul_bolipombo", name: "Raul Bolipombo", category: "family_actor", details: "Global operations and logistics lead" },
          { id: "zaire_bolipombo", name: "Zaire Bolipombo", category: "family_actor", details: "Sovereign lineage nephew" },
          { id: "bolipombo_jr", name: "My unborn niece (Bolipombo Junior)", category: "family_actor", details: "Future sovereign lineage asset" },
          { id: "naniki_mthuzula", name: "Naniki Mthuzula", category: "family_actor", details: "Internal trust coordinator" },
          { id: "jackie", name: "Jackie", category: "family_actor", details: "Operational support" },
          { id: "wendy", name: "Wendy", category: "family_actor", details: "Strategic advisory associate" },
          { id: "khanyisane", name: "Khanyisane", category: "family_actor", details: "Spiritual support guide" },
          { id: "sergio", name: "Sergio", category: "family_actor", details: "Specialized systems engineer" },
          { id: "paris_london", name: "Paris London", category: "family_actor", details: "International branding consultant" },
          { id: "mshifiri", name: "Mshifiri", category: "family_actor", details: "Regional network liaison" },
          { id: "ibandla_friends", name: "Ibandla and Friends", category: "family_actor", details: "Congregation of advisors and trusted signals" },
          { id: "lance_mada", name: "Lance Mada", category: "family_actor", details: "Linchpin technical coordinator and hardware architect" }
        ]
      }
    };
  }

  handleMessage(msg: any) {
    if (msg.type === "TRANSACT") {
      logger.addLog(this.id, `Mnesia writing transaction committed: Node replication OK, Lock Type: &mut.`, "success");
    } else if (msg.type === "VIOLATION_MNESIA") {
      logger.addLog(this.id, `Unauthenticated transaction write attempt on Mnesia database actor state!`, "warn");
      throw new Error("[Mnesia Invariant Violation] Write transaction denied: Sovereign key signature verification failed.");
    } else if (msg.type === "DRIFT") {
      // Small simulation updates to resiliency signals
      const entities = this.state.tables.globalEntities;
      entities.forEach((ent: any) => {
        if (ent.id === "RESILIENT_SIG") {
          ent.resiliencySignal = Math.max(0.90, Math.min(1.0, 0.99 + (Math.random() - 0.5) * 0.01));
        }
      });
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// ERLANG-STYLE SUPERVISOR ACTOR
// ───────────────────────────────────────────────────────────────────────────
class AetherionSupervisor {
  workers: Map<string, Actor> = new Map();

  register(actor: Actor) {
    this.workers.set(actor.id, actor);
  }

  reportCrash(actorId: string, reason: string) {
    logger.addLog("supervisor", `SUPERVISOR RECEIVED CRASH REPORT from worker '${actorId}' due to: ${reason}`, "warn");
    
    // Clear active borrows of crashed actor to resolve any deadlocks
    BorrowChecker.release("cooling_loop", actorId);

    const worker = this.workers.get(actorId);
    if (worker) {
      logger.addLog("supervisor", `SUPERVISOR restarting worker '${actorId}' (Erlang restart strategy: 'one_for_one')...`, "info");
      worker.recover();
    }
  }

  rebootAll() {
    logger.addLog("supervisor", `Initiating complete emergency supervisor restart sequence ('one_for_all')...`, "warn");
    BorrowChecker.clear();
    this.workers.forEach(w => {
      w.recover();
    });
  }
}

// Instantiate actors
const propulsion = new PropulsionActor("propulsion", "Propulsion & Gears");
const battery = new BatteryActor("battery", "Diamond Isotope Battery");
const ai = new AIActor("ai", "Sovereign AI Core");
const structural = new StructuralActor("structural", "MMC Structure");
const mnesia = new MnesiaActor("mnesia", "Mnesia DB Registry");
const supervisor = new AetherionSupervisor();

supervisor.register(propulsion);
supervisor.register(battery);
supervisor.register(ai);
supervisor.register(structural);
supervisor.register(mnesia);

// Natural system loop (simulates continuous Erlang process scheduler ticks & state drift)
setInterval(() => {
  if (propulsion.status === "active") propulsion.send({ type: "DRIFT" });
  if (battery.status === "active") battery.send({ type: "DRIFT" });
  if (ai.status === "active") ai.send({ type: "DRIFT" });
  if (structural.status === "active") structural.send({ type: "DRIFT" });
  if (mnesia.status === "active") mnesia.send({ type: "DRIFT" });
}, 1500);

// Initialize with setup logging
logger.addLog("system", "Aetherion system core initializing...", "info");
logger.addLog("supervisor", "Erlang supervisor online. Monitoring registered actors.", "success");
logger.addLog("propulsion", "Actor initialized. Capability: ref (Local thread safety enforced).", "info");
logger.addLog("battery", "Actor initialized. Capability: iso (Isolated mutable ownership).", "info");
logger.addLog("ai", "Actor initialized. Capability: val (Shared globally read-only safely).", "info");
logger.addLog("structural", "Actor initialized. Capability: tag (Opaque messaging target).", "info");
logger.addLog("mnesia", "Actor initialized. Capability: val (Mnesia dynamic table mapping).", "info");

// ───────────────────────────────────────────────────────────────────────────
// EXPRESS API ROUTING
// ───────────────────────────────────────────────────────────────────────────

// Retrieve the integrated real-time state of our Erlang supervisor model
app.get("/api/state", (req, res) => {
  const telemetry: TelemetryData = {
    batteryPct: battery.status === "active" ? Math.round(battery.state.batteryPct) : 0,
    gearboxActive: propulsion.status === "active" ? propulsion.state.gearboxActive : 0,
    torque: propulsion.status === "active" ? propulsion.state.torque : 0,
    threatLevel: ai.status === "active" ? ai.state.threatLevel : 0,
    mach: 0.82 + Math.sin(Date.now() / 12000) * 0.12, // overall supersonic speed
    drag: structural.status === "active" ? structural.state.drag : 0.14,
    gForce: propulsion.status === "active" ? propulsion.state.gForce : 0,
    coolingMargin: battery.status === "active" ? battery.state.coolingMargin : 0,
    yieldStrength: structural.status === "active" ? structural.state.yieldStrength : 0,
    isSupervising: true,
    activeBorrows: BorrowChecker.getActiveBorrows()
  };

  const actors: ActorStatus[] = Array.from(supervisor.workers.values()).map(w => {
    let borrowState: "none" | "shared_read" | "exclusive_write" = "none";
    const activeBorrows = BorrowChecker.getActiveBorrows().filter(b => b.borrowedBy === w.id);
    if (activeBorrows.some(b => b.type === "write")) {
      borrowState = "exclusive_write";
    } else if (activeBorrows.length > 0) {
      borrowState = "shared_read";
    }

    return {
      id: w.id,
      name: w.name,
      mailboxSize: w.mailbox.length,
      refCapability: w.refCapability,
      state: w.state,
      status: w.status,
      restartsCount: w.restartsCount,
      borrowState,
      activeBorrowsCount: activeBorrows.length
    };
  });

  const response: SystemStateResponse = {
    telemetry,
    actors,
    logs: logger.getLogs(),
    mnesia: mnesia.status === "active" ? mnesia.state : undefined
  };

  res.json(response);
});

// Trigger asynchronous messages to actors
app.post("/api/action", (req, res) => {
  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ error: "Missing action parameter" });
  }

  logger.addLog("client", `Client triggered action request: '${action}'`, "info");

  switch (action) {
    case "boost":
      propulsion.send({ type: "BOOST" });
      res.json({ status: "queued", message: "Asymmetric Torque boost request sent to Propulsion actor." });
      break;
    case "evade":
      propulsion.send({ type: "EVADE" });
      res.json({ status: "queued", message: "Evasive maneuver coordinates sent to Propulsion actor." });
      break;
    case "scan":
      ai.send({ type: "SCAN" });
      res.json({ status: "queued", message: "LiDAR scan request sent to AI Core actor." });
      break;
    case "cool":
      battery.send({ type: "COOL" });
      res.json({ status: "queued", message: "Thermal optimization request sent to Battery actor." });
      break;
    case "aero":
      structural.send({ type: "AERO" });
      res.json({ status: "queued", message: "Active aerodynamics adjustment sent to Structural actor." });
      break;
    case "reset":
      supervisor.rebootAll();
      res.json({ status: "queued", message: "Supervisory reboot triggered for all worker actors." });
      break;

    // Intentional Violation Endpoints to demo Rust & Pony safety
    case "violation_borrow":
      battery.send({ type: "VIOLATION_RUST_BORROW" });
      res.json({ status: "queued", message: "Rust Borrow Violation sequence initiated." });
      break;
    case "violation_pony_ref":
      propulsion.send({ type: "VIOLATION_PONY" });
      res.json({ status: "queued", message: "Pony Reference Capability Violation sequence initiated." });
      break;
    case "violation_pony_val":
      battery.send({ type: "VIOLATION_PONY_VAL" });
      res.json({ status: "queued", message: "Pony Immutability Write Violation initiated." });
      break;

    case "mnesia_transact":
      mnesia.send({ type: "TRANSACT" });
      res.json({ status: "queued", message: "Sovereign-authorized Mnesia transaction committed safely." });
      break;

    case "violation_mnesia":
      mnesia.send({ type: "VIOLATION_MNESIA" });
      res.json({ status: "queued", message: "Unauthenticated transaction signature sent to Mnesia DB actor." });
      break;

    default:
      res.status(400).json({ error: "Invalid action" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// VITE CLIENT INTEGRATION
// ───────────────────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const docsPath = path.join(process.cwd(), "docs");
    app.use(express.static(docsPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(docsPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
