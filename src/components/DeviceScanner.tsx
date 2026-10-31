import React from 'react';
import { Tv, Radio, Monitor, Wifi, CheckCircle2, ChevronRight, Sparkles, Smartphone } from 'lucide-react';
import type { CastDevice } from '../types';

interface DeviceScannerProps {
  devices: CastDevice[];
  onOpenConnectModal: () => void;
  isStreaming: boolean;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({
  devices,
  onOpenConnectModal,
  isStreaming,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Dispositivos y Receptores</h3>
            <p className="text-[11px] text-slate-400">Televisores conectados en tu red WiFi local</p>
          </div>
        </div>

        <button
          onClick={onOpenConnectModal}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 transition"
        >
          <span>Añadir TV</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Device List or Empty State */}
      {devices.length === 0 ? (
        <div className="p-6 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/30">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-white">Buscando televisores...</p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
              Abre el navegador en tu Fire TV o escanea el código QR para comenzar.
            </p>
          </div>
          <button
            onClick={onOpenConnectModal}
            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs rounded-xl transition"
          >
            Ver QR y Dirección del Fire TV
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl hover:border-indigo-500/40 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white flex items-center space-x-1.5">
                    <span>{device.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {device.ip || 'Red Local'} • {isStreaming ? 'Transmitiendo' : 'Listo para transmitir'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Sincronizado</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
