import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StreamPreview } from './components/StreamPreview';
import { StreamControls } from './components/StreamControls';
import { DeviceScanner } from './components/DeviceScanner';
import { ConnectModal } from './components/ConnectModal';
import { castManager } from './engine/castManager';
import type { CastDevice, StreamConfig, StreamStats } from './types';
import { Sparkles, Tv, ShieldCheck, Cpu, Wifi } from 'lucide-react';

export const App: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
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
          // Find first WiFi / En0 or standard private IP (192.168.x.x / 10.x.x.x)
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

  const handleStartStream = async () => {
    try {
      await castManager.startCapture(config);
    } catch (err) {
      console.error('Error starting stream:', err);
    }
  };

  const handleStopStream = () => {
    castManager.stopCapture();
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
            onStartStream={handleStartStream}
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
    </div>
  );
};
export default App;
