export type DeviceType = 'firetv' | 'chromecast' | 'roku' | 'smarttv' | 'browser' | 'apple_tv';

export interface CastDevice {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  connectedAt: number;
  status: 'connected' | 'streaming' | 'idle';
  userAgent?: string;
}

export type ResolutionPreset = '4k' | '1080p' | '720p';
export type FpsPreset = 30 | 60;
export type LatencyMode = 'ultra-low' | 'balanced' | 'high-quality';

export interface StreamConfig {
  resolution: ResolutionPreset;
  fps: FpsPreset;
  audioEnabled: boolean;
  systemAudio: boolean;
  micAudio: boolean;
  latencyMode: LatencyMode;
  maxBitrateKbps: number;
}

export interface StreamStats {
  fps: number;
  bitrateMbps: number;
  latencyMs: number;
  durationSeconds: number;
  packetsSent: number;
  resolution: string;
}

export interface CaptureSource {
  id: string;
  name: string;
  thumbnail: string;
  type: 'screen' | 'window';
}
