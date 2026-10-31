import React, { useRef, useEffect, useState } from 'react';
import {
  Monitor,
  Maximize2,
  Tv,
  Activity,
  Zap,
  Gauge,
  Clock,
  Radio,
  Eye,
} from 'lucide-react';
import type { StreamStats } from '../types';

interface StreamPreviewProps {
  stream: MediaStream | null;
  stats: StreamStats | null;
  isStreaming: boolean;
  isLaserActive: boolean;
  onOpenConnectModal: () => void;
}

export const StreamPreview: React.FC<StreamPreviewProps> = ({
  stream,
  stats,
  isStreaming,
  isLaserActive,
  onOpenConnectModal,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLaserActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLaserPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setLaserPos(null);
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center group"
    >
      {/* Live Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isStreaming ? 'opacity-100' : 'opacity-0 absolute'
        }`}
      />

      {/* Laser Pointer Presentation Overlay */}
      {isLaserActive && laserPos && (
        <div
          className="absolute pointer-events-none z-30 transition-transform duration-75"
          style={{
            left: `${laserPos.x}px`,
            top: `${laserPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-rose-500/30 animate-ping absolute" />
            <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_15px_#f43f5e] border-2 border-white" />
          </div>
        </div>
      )}

      {/* Live Stats HUD (Top-right overlay) */}
      {isStreaming && stats && (
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-3.5 py-2 rounded-2xl text-xs font-mono shadow-xl">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-bold">{stats.fps} FPS</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5 text-sky-400">
            <Zap className="w-3.5 h-3.5" />
            <span>{stats.latencyMs} ms</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5 text-amber-400">
            <Gauge className="w-3.5 h-3.5" />
            <span>{stats.bitrateMbps} Mbps</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(stats.durationSeconds)}</span>
          </div>
        </div>
      )}

      {/* Inactive Standby Screen */}
      {!isStreaming && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md z-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Monitor className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-white">Vista previa del transmisor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Haz clic en "Iniciar Transmisión a la TV" para seleccionar tu pantalla o ventana y comenzar a transmitir a tu Fire TV.
            </p>
          </div>
          <button
            onClick={onOpenConnectModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl flex items-center space-x-2 transition"
          >
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ver código QR para Fire TV</span>
          </button>
        </div>
      )}

      {/* Watermark / Badge bottom-left */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 bg-slate-950/70 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-xl text-[11px] text-slate-400">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="font-semibold text-slate-300">OS Cast Hub</span>
        <span>•</span>
        <span>Puerto 8765</span>
      </div>
    </div>
  );
};
