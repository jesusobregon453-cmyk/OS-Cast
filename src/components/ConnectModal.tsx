import React, { useState, useEffect } from 'react';
import { X, Tv, QrCode, Copy, Check, ExternalLink, ShieldAlert, Sparkles, Smartphone, Monitor } from 'lucide-react';
import QRCode from 'qrcode';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  localIp: string;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, localIp }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const targetUrl = `http://${localIp || '192.168.1.100'}:8765`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Conectar Amazon Fire TV o Smart TV</span>
              </h3>
              <p className="text-[11px] text-slate-400">Sin instalar aplicaciones en el televisor (Modo Cero Instalación)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* QR Code and Quick URL Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-2xl shadow-xl flex-shrink-0">
                <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 rounded-xl" />
              </div>
            ) : (
              <div className="w-44 h-44 rounded-2xl bg-slate-800 animate-pulse flex-shrink-0" />
            )}

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Enlace Directo Receptor TV</span>
              </div>
              <h4 className="font-bold text-sm text-white">Escribe esta URL en tu Fire TV o Smart TV:</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={targetUrl}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-indigo-300 font-mono text-xs font-semibold select-all outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition"
                  title="Copiar URL"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tanto tu Mac como tu Fire TV deben estar conectados a la misma red WiFi local.
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Instrucciones para Amazon Fire TV:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <p className="font-semibold text-white text-[11px]">Abre Silk Browser</p>
                <p className="text-[10px] text-slate-400">En tu Fire TV Stick, abre la app de navegación web "Amazon Silk".</p>
              </div>

              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <p className="font-semibold text-white text-[11px]">Ingresa la dirección</p>
                <p className="text-[10px] text-slate-400">Escribe <code className="text-indigo-300">{targetUrl}</code> en la barra de direcciones.</p>
              </div>

              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <p className="font-semibold text-white text-[11px]">¡Listo!</p>
                <p className="text-[10px] text-slate-400">Tu Fire TV mostrará la pantalla en vivo a 60 FPS con audio sin cortes.</p>
              </div>
            </div>
          </div>

          {/* Other Devices Hint */}
          <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/50 rounded-xl flex items-center space-x-3 text-indigo-200">
            <Monitor className="w-5 h-5 flex-shrink-0 text-indigo-400" />
            <div className="text-[11px]">
              <span className="font-semibold text-white">¿Quieres usarlo en iPad, Tablet o Chromecast?</span>
              <p className="text-indigo-300/80 mt-0.5">
                Escanea el código QR con la cámara de tu teléfono, iPad o navegador web de cualquier televisor inteligente (Samsung Tizen, LG webOS o Roku).
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Transmisión cifrada punto a punto en tu red local</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
