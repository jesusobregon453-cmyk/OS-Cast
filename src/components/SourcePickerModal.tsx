import React, { useState } from 'react';
import { X, Monitor, AppWindow, Play, ShieldAlert, ExternalLink } from 'lucide-react';
import type { CaptureSource } from '../types';

interface SourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: CaptureSource[];
  onSelectSource: (sourceId: string) => void;
  permissionDenied?: boolean;
  onOpenSettings?: () => void;
  onRelaunch?: () => void;
}

export const SourcePickerModal: React.FC<SourcePickerModalProps> = ({
  isOpen,
  onClose,
  sources,
  onSelectSource,
  permissionDenied,
  onOpenSettings,
  onRelaunch,
}) => {
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen');

  if (!isOpen) return null;

  const screens = sources.filter((s) => s.id.startsWith('screen') || !s.id.startsWith('window'));
  const windows = sources.filter((s) => s.id.startsWith('window'));

  const displayed = activeTab === 'screen' ? screens : windows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Selecciona qué deseas transmitir</h3>
              <p className="text-[11px] text-slate-400">Elige la pantalla completa o una ventana de tu Mac</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Alert (if macOS screen permission is denied) */}
        {permissionDenied && (
          <div className="m-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-rose-300">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-2 text-xs flex-1">
              <p className="font-bold text-white text-sm">Permiso de Grabación de Pantalla Requerido</p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                macOS requiere que otorgues permiso de grabación de pantalla a <strong>OS Cast Pro</strong>. Si ya lo activaste en Ajustes del Sistema, pulsa en "Reiniciar App" para que macOS aplique el permiso.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs shadow transition"
                  >
                    <span>Abrir Ajustes del Sistema &gt; Privacidad</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {onRelaunch && (
                  <button
                    onClick={onRelaunch}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 shadow transition"
                  >
                    <span>Reiniciar App</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Pantallas vs Ventanas */}
        <div className="px-6 pt-4 flex items-center space-x-2 border-b border-slate-800/60 pb-3">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'screen'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Pantalla Completa ({screens.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('window')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'window'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <AppWindow className="w-4 h-4" />
            <span>Ventanas de Apps ({windows.length})</span>
          </button>
        </div>

        {/* Source Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-slate-500 text-xs">
              No se detectaron fuentes disponibles.
            </div>
          ) : (
            displayed.map((source) => (
              <button
                key={source.id}
                onClick={() => onSelectSource(source.id)}
                className="group p-3 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/60 rounded-2xl text-left transition transform active:scale-[0.98] flex flex-col space-y-2.5"
              >
                <div className="w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80 relative">
                  {source.thumbnail ? (
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Monitor className="w-8 h-8" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition transform scale-90 group-hover:scale-100">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs text-slate-200 group-hover:text-white truncate max-w-[220px]">
                    {source.name}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold uppercase opacity-0 group-hover:opacity-100 transition">
                    Transmitir →
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Haz clic en cualquier pantalla o ventana para iniciar la transmisión a la TV</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
