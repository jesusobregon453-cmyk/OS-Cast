import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StreamPreview } from './components/StreamPreview';
import { StreamControls } from './components/StreamControls';
import { DeviceScanner } from './components/DeviceScanner';
import { ConnectModal } from './components/ConnectModal';
import { SourcePickerModal } from './components/SourcePickerModal';
import { castManager } from './engine/castManager';
import type { CastDevice, StreamConfig, StreamStats, CaptureSource } from './types';
import { Sparkles, Tv, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState<boolean>(false);
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLaserActive, setIsLaserActive] = useState<boolean>(false);
  const [localIp, setLocalIp] = useState<string>('127.0.0.1');

  const [devices, setDevices] = useState<CastDevice[]>([]);

  const [config, setConfig] = useState<StreamConfig>({
    resolution: '1080p',
    fps: 60,
    audioEnabled: true,
    systemAudio: true,
    micAudio: false,
    latencyMode: 'ultra-low',
    maxBitrateKbps: 8000,
  });

  // Initialize network IP and event listeners
  useEffect(() => {
    // 1. Get local IPs from Electron if running as desktop app
    if ((window as any).electronAPI?.getLocalIPs) {
      (window as any).electronAPI.getLocalIPs().then((ips: any[]) => {
        if (ips && ips.length > 0) {
          const primary = ips.find((i) => i.ip.startsWith('192.168.') || i.ip.startsWith('10.')) || ips[0];
          setLocalIp(primary.ip);
        }
      });
    } else {
      setLocalIp(window.location.hostname || 'localhost');
    }

    // 2. Listen to TV receiver connection events from Electron
    if ((window as any).electronAPI?.onReceiverConnected) {
      const removeConnect = (window as any).electronAPI.onReceiverConnected((clientInfo: any) => {
        setDevices((prev) => {
          if (prev.some((d) => d.id === clientInfo.id)) return prev;
          return [
            ...prev,
            {
              id: clientInfo.id,
              name: clientInfo.name || 'Amazon Fire TV',
              type: 'firetv',
              ip: clientInfo.ip || '',
              connectedAt: Date.now(),
              status: 'connected',
            },
          ];
        });
      });

      const removeDisconnect = (window as any).electronAPI.onReceiverDisconnected((clientInfo: any) => {
        setDevices((prev) => prev.filter((d) => d.id !== clientInfo.id));
      });

      return () => {
        removeConnect?.();
        removeDisconnect?.();
      };
    }
  }, []);

  // Listen to CastEngine events
  useEffect(() => {
    const unsubStart = castManager.on('stream-started', (stream: MediaStream) => {
      setActiveStream(stream);
      setIsStreaming(true);
      setErrorMessage(null);
    });

    const unsubStop = castManager.on('stream-stopped', () => {
      setActiveStream(null);
      setIsStreaming(false);
      setStats(null);
    });

    const unsubStats = castManager.on('stats', (s: StreamStats) => {
      setStats(s);
    });

    return () => {
      unsubStart();
      unsubStop();
      unsubStats();
    };
  }, []);

  const handleStartStreamClick = async () => {
    setErrorMessage(null);
    setPermissionDenied(false);

    // If in Electron, check permissions & fetch desktop sources
    if ((window as any).electronAPI?.getDesktopSources) {
      try {
        if ((window as any).electronAPI?.checkScreenPermission) {
          const perm = await (window as any).electronAPI.checkScreenPermission();
          if (perm === 'denied') {
            setPermissionDenied(true);
            setIsSourcePickerOpen(true);
            return;
          }
        }

        const availableSources = await (window as any).electronAPI.getDesktopSources({
          types: ['screen', 'window'],
        });

        if (availableSources && availableSources.length > 0) {
          setSources(availableSources);
          setIsSourcePickerOpen(true);
          return;
        }
      } catch (err: any) {
        console.warn('Error fetching desktop sources:', err);
      }
    }

    // Direct start (in browser or fallback)
    try {
      await castManager.startCapture(config);
    } catch (err: any) {
      console.error('Error starting stream:', err);
      setErrorMessage(err.message || 'No se pudo iniciar la captura de pantalla. Verifica los permisos de macOS.');
    }
  };

  const handleSelectSource = async (sourceId: string) => {
    setIsSourcePickerOpen(false);
    try {
      await castManager.startCapture(config, sourceId);
    } catch (err: any) {
      console.error('Error starting stream with source:', err);
      setErrorMessage(err.message || 'Error al iniciar captura de la pantalla seleccionada.');
    }
  };

  const handleStopStream = () => {
    castManager.stopCapture();
  };

  const handleOpenSettings = () => {
    if ((window as any).electronAPI?.openScreenSettings) {
      (window as any).electronAPI.openScreenSettings();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        isStreaming={isStreaming}
        connectedDevices={devices}
        localIp={localIp}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
      />

      {/* Error / Permission Banner if active */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-300 text-xs">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={handleOpenSettings}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center space-x-1 transition"
            >
              <span>Ajustes de macOS</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stream Preview & Controls (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <StreamPreview
            stream={activeStream}
            stats={stats}
            isStreaming={isStreaming}
            isLaserActive={isLaserActive}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />

          <StreamControls
            config={config}
            onChangeConfig={setConfig}
            isStreaming={isStreaming}
            onStartStream={handleStartStreamClick}
            onStopStream={handleStopStream}
            isLaserActive={isLaserActive}
            onToggleLaser={() => setIsLaserActive(!isLaserActive)}
          />
        </div>

        {/* Right Column: Devices Scanner & Info (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <DeviceScanner
            devices={devices}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            isStreaming={isStreaming}
          />

          {/* Quick Advantage Card */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-slate-950 border border-indigo-500/20 rounded-3xl p-5 space-y-3.5">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">Ventajas de OS Cast Pro</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Cero Apps en tu TV:</strong> Se conecta al navegador Amazon Silk sin instalar nada.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Ultra Baja Latencia:</strong> ~95 ms de respuesta para presentaciones fluidas a 60 FPS.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Sin Suscripciones:</strong> 100% libre, sin compras in-app ni licencias bloqueadas.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Connect QR Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        localIp={localIp}
      />

      {/* Source Selection Modal (Screen / Window picker) */}
      <SourcePickerModal
        isOpen={isSourcePickerOpen}
        onClose={() => setIsSourcePickerOpen(false)}
        sources={sources}
        onSelectSource={handleSelectSource}
        permissionDenied={permissionDenied}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );
};
export default App;
