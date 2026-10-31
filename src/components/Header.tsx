import React from 'react';
import { Tv, Wifi, Radio, Cast, ShieldCheck, Sparkles } from 'lucide-react';
import type { CastDevice } from '../types';

interface HeaderProps {
  isStreaming: boolean;
  connectedDevices: CastDevice[];
  localIp: string;
  onOpenConnectModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isStreaming,
  connectedDevices,
  localIp,
  onOpenConnectModal,
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between select-none">
      {/* Brand & Window Drag Area */}
      <div className="flex items-center space-x-3.5 pl-14">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
          <Cast className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>OS Cast</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PRO
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400">Transmisión universal a Fire TV, Smart TVs y Web</p>
        </div>
      </div>

      {/* Center Status Pill */}
      <div className="flex items-center space-x-3">
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all ${
            isStreaming
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span>{isStreaming ? 'TRANSMITIENDO EN VIVO' : 'HUB LOCAL LISTO'}</span>
        </div>

        {localIp && (
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full font-mono">
            <Wifi className="w-3.5 h-3.5 text-indigo-400" />
            <span>{localIp}:8765</span>
          </div>
        )}
      </div>

      {/* Connected TVs & Connect Button */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenConnectModal}
          className="flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition transform active:scale-95"
        >
          <Tv className="w-4 h-4 text-indigo-200" />
          <span>Conectar TV / QR</span>
          {connectedDevices.length > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">
              {connectedDevices.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
