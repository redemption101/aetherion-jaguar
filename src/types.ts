/**
 * Shared Type Definitions for the Aetherion Interactive Supersonic Dashboard.
 */

export interface ActorStatus {
  id: string;
  name: string;
  mailboxSize: number;
  refCapability: 'iso' | 'val' | 'ref' | 'tag';
  state: any;
  status: 'active' | 'crashed' | 'recovering';
  restartsCount: number;
  borrowState: 'none' | 'shared_read' | 'exclusive_write';
  activeBorrowsCount: number;
}

export interface TelemetryData {
  batteryPct: number;
  gearboxActive: number;
  torque: number;
  threatLevel: number;
  mach: number;
  drag: number;
  gForce: number;
  coolingMargin: number;
  yieldStrength: number;
  isSupervising: boolean;
  activeBorrows: Array<{ resource: string; type: 'read' | 'write'; borrowedBy: string }>;
}

export interface ActorLog {
  id: string;
  timestamp: string;
  actorId: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

export interface MnesiaRecord {
  id: string;
  name: string;
  category: string;
  details: string;
  resiliencySignal?: number;
  influenceFactor?: number;
}

export interface MnesiaState {
  sovereign: {
    architecture: string;
    coFounders: string[];
    advisors: string[];
  };
  tables: {
    globalEntities: MnesiaRecord[];
    influentialActors: MnesiaRecord[];
    familyNetwork: MnesiaRecord[];
  };
}

export interface SystemStateResponse {
  telemetry: TelemetryData;
  actors: ActorStatus[];
  logs: ActorLog[];
  mnesia?: MnesiaState;
}
