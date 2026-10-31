const { app, BrowserWindow, shell, Menu, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

let mainWindow = null;
let httpServer = null;
let wss = null;
const HTTP_PORT = 8765;
let connectedReceivers = new Map();

// Helper to get local IPv4 addresses (WiFi / Ethernet)
function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
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
    }
    #videoContainer {
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
    #remoteVideo, #canvasStream {
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
      z-index: 20;
      transition: opacity 0.4s ease;
      padding: 32px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(129, 140, 248, 0.3);
      border-radius: 999px;
      color: #818cf8;
      font-size: 14px;
      font-weight: 600;
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
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      transition: all 0.2s;
    }
    .btn-fs:hover {
      background: #4f46e5;
      transform: scale(1.04);
    }
    #statusOverlay {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 50;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
  </style>
</head>
<body>
  <div id="statusOverlay">
    <div class="pulse-dot"></div>
    <span id="statusOverlayText">Transmitiendo en vivo</span>
  </div>

  <div id="videoContainer">
    <video id="remoteVideo" autoplay playsinline muted></video>
    <canvas id="canvasStream" style="display: none;"></canvas>
  </div>

  <div id="splashScreen">
    <div class="badge">
      <div class="pulse-dot"></div>
      RECEPTOR TV CONECTADO
    </div>
    <h1>OS Cast Pro TV</h1>
    <p>Este televisor está sincronizado con tu Mac / PC. Inicia la transmisión en la aplicación para ver la pantalla aquí en tiempo real.</p>
    
    <div class="device-card">
      <div class="device-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
      </div>
      <div style="text-align: left;">
        <div style="font-weight: 700; font-size: 18px; color: #f8fafc;" id="detectedTVName">Amazon Fire TV / Smart TV</div>
        <div style="font-size: 13px; color: #10b981; font-weight: 600; margin-top: 4px;">● Listo para recibir pantalla y audio</div>
      </div>
    </div>

    <button class="btn-fs" id="fsBtn" onclick="toggleFullscreen()">Pantalla Completa (Presiona OK en control remoto)</button>
  </div>

  <script>
    const splash = document.getElementById('splashScreen');
    const remoteVideo = document.getElementById('remoteVideo');
    const canvas = document.getElementById('canvasStream');
    const ctx = canvas.getContext('2d');
    const statusOverlay = document.getElementById('statusOverlay');
    const detectedTVName = document.getElementById('detectedTVName');

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

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        remoteVideo.play().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    // Remote control Enter/OK key triggers fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        toggleFullscreen();
      }
    });

    // WebSocket Connection to Local Server
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = wsProto + '//' + window.location.host + '/ws';
    let ws = null;
    let peerConnection = null;

    function initWebSocket() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'register-receiver',
          userAgent: navigator.userAgent,
          name: detectedTVName.innerText
        }));
      };

      ws.onmessage = async (event) => {
        // Binary frame data (Canvas live fallback)
        if (event.data instanceof Blob) {
          const img = new Image();
          img.onload = () => {
            canvas.style.display = 'block';
            remoteVideo.style.display = 'none';
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            statusOverlay.style.opacity = '1';
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
          };
          img.src = URL.createObjectURL(event.data);
          return;
        }

        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'stream-started') {
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            statusOverlay.style.opacity = '1';
          } else if (msg.type === 'stream-stopped') {
            splash.style.opacity = '1';
            splash.style.pointerEvents = 'auto';
            statusOverlay.style.opacity = '0';
            canvas.style.display = 'none';
          } else if (msg.type === 'webrtc-offer') {
            await handleWebRtcOffer(msg.offer);
          } else if (msg.type === 'ice-candidate') {
            if (peerConnection) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
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
      peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.style.display = 'block';
        canvas.style.display = 'none';
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        statusOverlay.style.opacity = '1';
        remoteVideo.play().catch(e => console.log('Autoplay requires click:', e));
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
    }

    initWebSocket();
  </script>
</body>
</html>`;
}

// Start embedded HTTP & WebSocket server
function startEmbeddedServer() {
  httpServer = http.createServer((req, res) => {
    // Enable CORS
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

    connectedReceivers.set(clientId, { ws, info: clientInfo });

    ws.on('message', (data) => {
      try {
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          const text = data.toString();
          if (text.startsWith('{')) {
            const msg = JSON.parse(text);
            if (msg.type === 'register-receiver') {
              clientInfo.name = msg.name || 'Dispositivo TV';
              clientInfo.userAgent = msg.userAgent || '';
              if (mainWindow) {
                mainWindow.webContents.send('receiver-connected', clientInfo);
              }
            } else if (msg.type === 'webrtc-answer' || msg.type === 'ice-candidate') {
              // Forward to sender window
              if (mainWindow) {
                mainWindow.webContents.send('webrtc-from-tv', msg);
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
      if (mainWindow) {
        mainWindow.webContents.send('receiver-disconnected', clientInfo);
      }
    });

    if (mainWindow) {
      mainWindow.webContents.send('receiver-connected', clientInfo);
    }
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[OS Cast Hub] Servidor local corriendo en http://0.0.0.0:${HTTP_PORT}`);
  });
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
      sandbox: false, // Needed for desktopCapturer
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
  const sources = await desktopCapturer.getSources(options || { types: ['screen', 'window'] });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
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

app.whenReady().then(() => {
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
