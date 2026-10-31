# OS Cast Pro 📺⚡

> Transmisor universal de pantalla y audio de ultra-baja latencia para Amazon Fire TV, Smart TVs (Samsung, LG, Roku), Chromecast y Navegadores Web.

---

## 🌟 Características Principales

* 🆓 **100% Gratuito y de Código Abierto (MIT):** Reemplazo directo para aplicaciones de pago costosas como *AirBeamTV Mirror for Fire TV*.
* 🚀 **Cero Instalación en TV:** No necesitas descargar ni comprar apps en la tienda de Amazon Fire TV. Solo abre el navegador Amazon Silk (o escanea el código QR) y la transmisión comienza inmediatamente en pantalla completa.
* ⚡ **Ultra Baja Latencia (~95 ms):** Basado en WebSockets y WebRTC de alto rendimiento a 60 FPS.
* 🔊 **Transmisión de Audio y Video:** Envía tanto la imagen como el sonido de tu Mac o PC en tiempo real.
* 🎯 **Herramientas de Presentación:** Puntero láser interactivo, indicador de FPS, medidor de bitrate y HUD de latencia.
* 🔒 **100% Local y Privado:** No pasa por la nube; la transmisión se ejecuta de forma directa y segura en tu red WiFi local.

---

## 🛠️ Requisitos e Instalación

### Modo Desarrollo
```bash
git clone https://github.com/jesusobregon453-cmyk/OS-Cast.git
cd os-cast
npm install
npm run electron:dev
```

### Compilación para macOS / Windows / Linux
```bash
# Para macOS (DMG y ZIP)
npm run electron:build:mac

# Para Windows (.exe instalador y portable)
npm run electron:build:win

# Para Linux (AppImage y .deb)
npm run electron:build:linux
```

---

## 📺 Cómo conectar tu Amazon Fire TV

1. Abre **OS Cast Pro** en tu Mac.
2. En tu Amazon Fire TV Stick, abre el navegador **Amazon Silk**.
3. Escribe la dirección que te muestra la app (ej. `http://192.168.1.XX:8765`) o escanea el código QR.
4. Presiona el botón central (OK) de tu control remoto de Fire TV para poner la transmisión en pantalla completa.

---

## 📄 Licencia

Licencia MIT — Libre para uso personal, educativo y comercial.
