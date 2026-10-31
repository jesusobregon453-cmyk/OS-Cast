import React from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Mic,
  Gauge,
  Sliders,
  Sparkles,
  Zap,
  Film,
  Crosshair,
  PenTool,
  Layers,
} from 'lucide-react';
import type { StreamConfig, ResolutionPreset, FpsPreset } from '../types';

interface StreamControlsProps {
  config: StreamConfig;
  onChangeConfig: (newConfig: StreamConfig) => void;
  isStreaming: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
  isLaserActive: boolean;
  onToggleLaser: () => void;
}

export const StreamControls: React.FC<StreamControlsProps> = ({
  config,
  onChangeConfig,
  isStreaming,
  onStartStream,
  onStopStream,
  isLaserActive,
  onToggleLaser,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Configuración de Transmisión</h3>
            <p className="text-[11px] text-slate-400">Calidad de video, audio y herramientas en vivo</p>
          </div>
        </div>

        {/* Laser Pointer Presentation Tool */}
        <button
          onClick={onToggleLaser}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
            isLaserActive
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/20'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400'
          }`}
          title="Herramienta de puntero láser para presentaciones"
        >
          <Crosshair className={`w-3.5 h-3.5 ${isLaserActive ? 'animate-spin' : ''}`} />
          <span>Puntero Láser</span>
        </button>
      </div>

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Resolution selector */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resolución</label>
          <div className="grid grid-cols-3 gap-1">
            {(['720p', '1080p', '4k'] as ResolutionPreset[]).map((res) => (
              <button
                key={res}
                disabled={isStreaming}
                onClick={() => onChangeConfig({ ...config, resolution: res })}
                className={`py-1 px-2 rounded-lg text-xs font-semibold uppercase transition disabled:opacity-50 ${
                  config.resolution === res
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Framerate selector */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cuadros por Seg.</label>
          <div className="grid grid-cols-2 gap-1">
            {([30, 60] as FpsPreset[]).map((fps) => (
              <button
                key={fps}
                disabled={isStreaming}
                onClick={() => onChangeConfig({ ...config, fps })}
                className={`py-1 px-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                  config.fps === fps
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {fps} FPS
              </button>
            ))}
          </div>
        </div>

        {/* Audio Toggle & Source Selector */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fuente de Audio</label>
          <div className="grid grid-cols-2 gap-1">
            <button
              disabled={isStreaming}
              onClick={() => onChangeConfig({ ...config, audioEnabled: true, systemAudio: true, micAudio: false })}
              className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition disabled:opacity-50 ${
                config.audioEnabled && config.systemAudio
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
              title="Transmite el sonido de tu Mac (YouTube, películas, música, apps)"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Mac</span>
            </button>
            <button
              disabled={isStreaming}
              onClick={() => onChangeConfig({ ...config, audioEnabled: true, systemAudio: false, micAudio: true })}
              className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition disabled:opacity-50 ${
                config.audioEnabled && config.micAudio
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
              title="Transmite tu voz mediante el micrófono"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Micrófono</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Start / Stop Cast Button */}
      <div>
        {isStreaming ? (
          <button
            onClick={onStopStream}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/25 border border-rose-400/30 flex items-center justify-center space-x-2.5 transition transform active:scale-[0.99]"
          >
            <Square className="w-5 h-5 fill-white" />
            <span>Detener Transmisión a la TV</span>
          </button>
        ) : (
          <button
            onClick={onStartStream}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center space-x-2.5 transition transform active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Iniciar Transmisión a la TV</span>
          </button>
        )}
      </div>
    </div>
  );
};
