const { app, BrowserWindow, shell, Menu, ipcMain, desktopCapturer, session, systemPreferences } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

// Hardware Acceleration & Zero Background Throttling for macOS Screen Mirroring
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
let httpServer = null;
let wss = null;
const HTTP_PORT = 8765;
let connectedReceivers = new Map();
let mjpegClients = new Set();
let latestFrame = null;

// Helper to get local IPv4 addresses (WiFi / Ethernet)
function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address,
        });
      }
    }
  }
  return addresses;
}

// Generate the HTML for the TV Receiver (Amazon Fire TV Silk browser / Smart TVs)
function getTvReceiverHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>OS Cast Pro — Receptor TV</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    #stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      z-index: 10;
    }
    #screenCanvas, #mjpgImg, #remoteVideo {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }
    #splashScreen {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1e1b4b 0%, #020617 100%);
      z-index: 30;
      transition: opacity 0.3s ease;
      padding: 32px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(129, 140, 248, 0.3);
      border-radius: 999px;
      color: #818cf8;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 1.15rem;
      max-width: 580px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .device-card {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(51, 65, 85, 0.8);
      border-radius: 20px;
      padding: 24px 36px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .device-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .btn-fs {
      margin-top: 28px;
      background: #6366f1;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 14px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      transition: all 0.2s;
    }
    .btn-fs:focus, .btn-fs:hover {
      background: #4338ca;
      transform: scale(1.05);
      outline: 3px solid #818cf8;
    }
    #statusOverlay {
      position: absolute;
      top: 24px;
      right: 24px;
      z-index: 50;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 8px 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #audioPrompt {
      position: absolute;
      bottom: 24px;
      z-index: 40;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(99, 102, 241, 0.4);
      padding: 10px 20px;
      border-radius: 12px;
      color: #cbd5e1;
      font-size: 13px;
      display: none;
    }
  </style>
</head>
<body>
  <div id="statusOverlay">
    <div class="pulse-dot"></div>
    <span id="statusOverlayText">Transmitiendo en vivo</span>
  </div>

  <div id="stage">
    <video id="remoteVideo" autoplay playsinline style="display: none;"></video>
    <canvas id="screenCanvas" style="display: none;"></canvas>
    <img id="mjpgImg" style="display: none;" />
  </div>

  <div id="audioPrompt">🔊 Presiona OK en el control para activar el audio</div>

  <div id="splashScreen">
    <div class="badge">
      <div class="pulse-dot"></div>
      RECEPTOR TV CONECTADO
    </div>
    <h1>OS Cast Pro TV</h1>
    <p>Este televisor está enlazado a tu Mac / PC. Cuando inicies la transmisión en la app de tu computadora, la verás aquí en vivo a pantalla completa.</p>
    
    <div class="device-card">
      <div class="device-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
      </div>
      <div style="text-align: left;">
        <div style="font-weight: 700; font-size: 19px; color: #f8fafc;" id="detectedTVName">Amazon Fire TV</div>
        <div style="font-size: 13px; color: #10b981; font-weight: 600; margin-top: 4px;">● Esperando señal de transmisión...</div>
      </div>
    </div>

    <button class="btn-fs" id="fsBtn" onclick="activateFullscreenAndAudio()">Pantalla Completa (Presiona OK en control remoto)</button>
  </div>

  <script>
    const splash = document.getElementById('splashScreen');
    const remoteVideo = document.getElementById('remoteVideo');
    const canvas = document.getElementById('screenCanvas');
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    const mjpgImg = document.getElementById('mjpgImg');
    const statusOverlay = document.getElementById('statusOverlay');
    const detectedTVName = document.getElementById('detectedTVName');
    const audioPrompt = document.getElementById('audioPrompt');

    // Web Audio Context with Timeline Scheduling for TV
    let audioCtx = null;
    let nextAudioTime = 0;
    const JITTER_BUFFER = 0.045; // 45ms jitter cushion: eliminates clicks, pops, and metallic phase lag

    function ensureAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      audioPrompt.style.display = 'none';
    }

    // Play incoming 16-bit PCM Audio (AU02 format)
    function handleAudioPacketAU02(buffer) {
      if (!audioCtx || audioCtx.state !== 'running') return;

      try {
        const view = new DataView(buffer);
        const sampleRate = view.getUint32(4, true);
        const channels = view.getUint16(8, true);
        const int16Samples = new Int16Array(buffer, 10);
        const frameCount = Math.floor(int16Samples.length / channels);

        if (frameCount <= 0) return;

        const audioBuffer = audioCtx.createBuffer(channels, frameCount, sampleRate);
        for (let ch = 0; ch < channels; ch++) {
          const channelData = audioBuffer.getChannelData(ch);
          for (let i = 0; i < frameCount; i++) {
            channelData[i] = int16Samples[i * channels + ch] / 32768.0;
          }
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (nextAudioTime < now) {
          nextAudioTime = now + JITTER_BUFFER;
        }

        source.start(nextAudioTime);
        nextAudioTime += audioBuffer.duration;
      } catch (e) {
        console.warn('Audio decode error:', e);
      }
    }

    // Play incoming Float32 PCM Audio (AU01 format)
    function handleAudioPacketLegacy(buffer) {
      if (!audioCtx || audioCtx.state !== 'running') return;
      try {
        const floatData = new Float32Array(buffer.slice(4));
        const audioBuffer = audioCtx.createBuffer(1, floatData.length, 44100);
        audioBuffer.copyToChannel(floatData, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (nextAudioTime < now) {
          nextAudioTime = now + JITTER_BUFFER;
        }

        source.start(nextAudioTime);
        nextAudioTime += audioBuffer.duration;
      } catch (e) {}
    }

    // GPU-accelerated Zero-Lag Frame Renderer
    let isDrawing = false;
    let latestBlob = null;

    async function renderFrame() {
      if (isDrawing || !latestBlob) return;
      isDrawing = true;
      const blob = latestBlob;
      latestBlob = null; // Automatically drop stale frames when GPU is busy

      try {
        if (window.createImageBitmap) {
          const bitmap = await createImageBitmap(blob);
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            if (ctx) ctx.imageSmoothingEnabled = false;
          }
          if (ctx) ctx.drawImage(bitmap, 0, 0);
          bitmap.close(); // Immediate zero-leak release of GPU surface
        } else {
          await new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              if (ctx) ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        }
      } catch (err) {
        // Drop corrupted frame
      } finally {
        isDrawing = false;
        if (latestBlob) {
          requestAnimationFrame(renderFrame);
        }
      }
    }

    // Detect browser / device
    const ua = navigator.userAgent;
    if (ua.includes('AFT') || ua.includes('Silk')) {
      detectedTVName.innerText = 'Amazon Fire TV (Silk Browser)';
    } else if (ua.includes('CrKey') || ua.includes('GoogleTV')) {
      detectedTVName.innerText = 'Chromecast con Google TV';
    } else if (ua.includes('Roku')) {
      detectedTVName.innerText = 'Roku TV';
    } else if (ua.includes('LG') || ua.includes('Web0S')) {
      detectedTVName.innerText = 'LG Smart TV (webOS)';
    } else if (ua.includes('Tizen') || ua.includes('Samsung')) {
      detectedTVName.innerText = 'Samsung Smart TV (Tizen)';
    }

    function activateFullscreenAndAudio() {
      ensureAudio();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        remoteVideo.play().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Select') {
        activateFullscreenAndAudio();
      }
    });

    document.body.addEventListener('click', () => {
      ensureAudio();
    });

    let isStreaming = false;
    let peerConnection = null;

    function showLiveStream() {
      if (!isStreaming) {
        isStreaming = true;
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        statusOverlay.style.opacity = '1';
      }
    }

    function hideLiveStream() {
      isStreaming = false;
      splash.style.opacity = '1';
      splash.style.pointerEvents = 'auto';
      statusOverlay.style.opacity = '0';
      canvas.style.display = 'none';
      remoteVideo.style.display = 'none';
      mjpgImg.style.display = 'none';
      mjpgImg.src = '';
    }

    // WebSocket Connection to Local Server
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = wsProto + '//' + window.location.host + '/ws';
    let ws = null;

    function initWebSocket() {
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'register-receiver',
          userAgent: navigator.userAgent,
          name: detectedTVName.innerText
        }));
      };

      ws.onmessage = async (event) => {
        // 1. Binary payload: Audio or Video Frame
        if (event.data instanceof ArrayBuffer) {
          const u8 = new Uint8Array(event.data);
          
          // Check if JPEG image frame (starts with 0xFF 0xD8)
          if (u8.length > 4 && u8[0] === 0xFF && u8[1] === 0xD8) {
            showLiveStream();
            if (remoteVideo.style.display !== 'block') {
              canvas.style.display = 'block';
            }

            latestBlob = new Blob([event.data], { type: 'image/jpeg' });
            if (!isDrawing) {
              renderFrame();
            }
            return;
          }

          // Check if High-Fidelity Audio PCM buffer (AU02)
          if (u8.length >= 10 && u8[0] === 0x41 && u8[1] === 0x55 && u8[2] === 0x30 && u8[3] === 0x32) {
            handleAudioPacketAU02(event.data);
            return;
          }

          // Check if Audio PCM buffer (starts with magic header 'AU01')
          if (u8.length > 4 && u8[0] === 0x41 && u8[1] === 0x55 && u8[2] === 0x30 && u8[3] === 0x31) {
            handleAudioPacketLegacy(event.data);
            return;
          }
          return;
        }

        // 2. Text / JSON messages
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'stream-started') {
            showLiveStream();
          } else if (msg.type === 'stream-stopped') {
            hideLiveStream();
          } else if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
          } else if (msg.type === 'webrtc-offer') {
            await handleWebRtcOffer(msg.offer);
          } else if (msg.type === 'ice-candidate') {
            if (peerConnection && msg.candidate) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setTimeout(initWebSocket, 2000);
      };
    }

    async function handleWebRtcOffer(offer) {
      try {
        peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peerConnection.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.style.display = 'block';
          canvas.style.display = 'none';
          mjpgImg.style.display = 'none';
          showLiveStream();
          remoteVideo.play().catch(e => {
            audioPrompt.style.display = 'block';
          });
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            }));
          }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: 'webrtc-answer',
          answer: answer
        }));
      } catch (err) {
        console.warn('WebRTC negotiation failed, falling back to Canvas/MJPEG:', err);
      }
    }

    initWebSocket();
  </script>
</body>
</html>`;
}

// Start embedded HTTP & WebSocket server
function startEmbeddedServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/' || req.url === '/tv') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getTvReceiverHtml());
      return;
    }

    // Live MJPEG Stream endpoint - universally supported by all TVs
    if (req.url === '/stream.mjpg') {
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });

      mjpegClients.add(res);

      // If we already have a frame, send it immediately
      if (latestFrame) {
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${latestFrame.length}\r\n\r\n`);
        res.write(latestFrame);
        res.write('\r\n');
      }

      req.on('close', () => {
        mjpegClients.delete(res);
      });
      return;
    }

    if (req.url === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'OS Cast Pro Hub',
        version: '1.0.0',
        platform: process.platform,
        receiversCount: connectedReceivers.size,
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = `tv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let clientInfo = {
      id: clientId,
      ip: req.socket.remoteAddress,
      name: 'Receptor TV',
      connectedAt: Date.now(),
    };

    ws.on('message', (data) => {
      try {
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          const text = data.toString();
          if (text.startsWith('{')) {
            const msg = JSON.parse(text);
            if (msg.type === 'register-receiver') {
              ws.isReceiver = true; // Flag this socket as a TV receiver (never echo back to Mac sender!)
              clientInfo.name = msg.name || 'Dispositivo TV';
              clientInfo.userAgent = msg.userAgent || '';
              connectedReceivers.set(clientId, { ws, info: clientInfo });
              if (mainWindow) {
                mainWindow.webContents.send('receiver-connected', clientInfo);
              }
            } else if (msg.type === 'webrtc-answer' || msg.type === 'ice-candidate') {
              // Forward WebRTC signals from TV to Mac app
              if (mainWindow) {
                mainWindow.webContents.send('webrtc-from-tv', msg);
              }
            } else if (msg.type === 'pong') {
              if (mainWindow) {
                mainWindow.webContents.send('receiver-pong', msg);
              }
            }
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      connectedReceivers.delete(clientId);
      if (mainWindow && ws.isReceiver) {
        mainWindow.webContents.send('receiver-disconnected', clientInfo);
      }
    });
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[OS Cast Hub] Servidor local corriendo en http://0.0.0.0:${HTTP_PORT}`);
  });
}

function broadcastFrameToReceivers(buffer) {
  latestFrame = buffer;

  // 1. Send to all MJPEG HTTP clients (if any third-party browser requested /stream.mjpg)
  if (mjpegClients.size > 0) {
    const header = Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${buffer.length}\r\n\r\n`);
    const footer = Buffer.from('\r\n');
    for (const client of mjpegClients) {
      try {
        client.write(header);
        client.write(buffer);
        client.write(footer);
      } catch (e) {
        mjpegClients.delete(client);
      }
    }
  }

  // 2. Send via WebSockets ONLY to registered TV receivers with backpressure protection
  if (wss) {
    wss.clients.forEach((client) => {
      // Never echo frames back to the Mac app itself!
      if (client.isReceiver && client.readyState === WebSocket.OPEN) {
        // If the TV's Wi-Fi network buffer is backed up > 192KB, drop this frame so latency stays at 0ms!
        if (client.bufferedAmount < 192 * 1024) {
          try {
            client.send(buffer);
          } catch {}
        }
      }
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'OS Cast Pro',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Prevents macOS background throttling so stream runs at full 60 FPS even when minimized!
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = 'http://localhost:5174';

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: 'OS Cast Pro',
            submenu: [
              { role: 'about', label: 'Acerca de OS Cast Pro' },
              { type: 'separator' },
              { role: 'services', label: 'Servicios' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar OS Cast Pro' },
              { role: 'hideOthers', label: 'Ocultar otros' },
              { role: 'unhide', label: 'Mostrar todos' },
              { type: 'separator' },
              { role: 'quit', label: 'Salir' },
            ],
          },
        ]
      : []),
    {
      label: 'Archivo',
      submenu: [isMac ? { role: 'close', label: 'Cerrar ventana' } : { role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restablecer zoom' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front', label: 'Traer al frente' }]
          : [{ role: 'close', label: 'Cerrar' }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC Handlers
ipcMain.handle('get-local-ips', async () => {
  return getLocalIPv4Addresses();
});

ipcMain.handle('get-desktop-sources', async (event, options) => {
  const sources = await desktopCapturer.getSources(options || { types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});

ipcMain.handle('check-screen-permission', async () => {
  if (process.platform === 'darwin' && systemPreferences.getMediaAccessStatus) {
    return systemPreferences.getMediaAccessStatus('screen');
  }
  return 'granted';
});

ipcMain.handle('open-screen-settings', async () => {
  if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  }
});

// Broadcast messages to all connected TV receivers
ipcMain.on('stream-status', (event, status) => {
  if (!wss) return;
  const payload = JSON.stringify(status);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

// Broadcast video frames (binary JPEG) from Mac screen to all TVs
ipcMain.on('send-frame', (event, buffer) => {
  broadcastFrameToReceivers(Buffer.from(buffer));
});

// Forward WebRTC signals from Mac app to TVs
ipcMain.on('send-webrtc-signal', (event, signal) => {
  if (!wss) return;
  const payload = JSON.stringify(signal);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

app.whenReady().then(() => {
  // Allow navigator.mediaDevices.getDisplayMedia in Electron
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      if (sources && sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    }).catch((err) => {
      console.error('DisplayMediaRequestHandler error:', err);
      callback({});
    });
  });

  startEmbeddedServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
