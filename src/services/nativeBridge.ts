/**
 * Native Desktop Bridge Service
 * Connects this web app via WebSocket to a lightweight desktop daemon
 * allowing the user to move and click the actual host operating system cursor.
 */

import { NativeBridgeStatus } from '../types';

export const DEFAULT_BRIDGE_PORT = 8765;

export const PYTHON_AGENT_SCRIPT = `"""
Sparrow Desktop Cursor Agent
==============================
Run this script on your computer (Windows, macOS, or Linux) to enable
Sparrow to control your real desktop mouse cursor!

Requirements:
  pip install pyautogui websockets

How to Run:
  python sparrow_desktop.py
"""

import asyncio
import json
import sys

try:
    import pyautogui
    import websockets
except ImportError:
    print("Missing required libraries. Installing them now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyautogui", "websockets"])
    import pyautogui
    import websockets

# Configuration
PORT = 8765
HOST = "localhost"

# Disable pyautogui fail-safe delay for ultra-low latency cursor motion
pyautogui.FAILSAFE = True  # Move mouse to any corner of screen to abort!
pyautogui.PAUSE = 0.0001

screen_width, screen_height = pyautogui.size()
print(f"==================================================")
print(f"🚀 Sparrow Desktop Cursor Bridge Active!")
print(f"🖥️  Screen Resolution: {screen_width} x {screen_height}")
print(f"📡 Listening on ws://{HOST}:{PORT}")
print(f"⚠️  Emergency Abort: Slam cursor to any screen corner")
print(f"==================================================")

async def handler(websocket):
    print("✅ Sparrow Web App connected! Real cursor control is live.")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get("action")
                
                if action == "move":
                    px = data.get("percentX", 0.5)
                    py = data.get("percentY", 0.5)
                    
                    target_x = max(0, min(screen_width - 1, int(px * screen_width)))
                    target_y = max(0, min(screen_height - 1, int(py * screen_height)))
                    
                    pyautogui.moveTo(target_x, target_y, _pause=False)
                    
                elif action == "click":
                    button = data.get("button", "left")
                    pyautogui.click(button=button)
                    print(f"🖱️  Clicked: {button}")
                    
                elif action == "mouseDown":
                    button = data.get("button", "left")
                    pyautogui.mouseDown(button=button)
                    print("🖱️  Mouse Down")
                    
                elif action == "mouseUp":
                    button = data.get("button", "left")
                    pyautogui.mouseUp(button=button)
                    print("🖱️  Mouse Up")
                    
                elif action == "scroll":
                    dy = data.get("dy", 0)
                    pyautogui.scroll(int(dy))
                    
                elif action == "ping":
                    await websocket.send(json.dumps({"type": "pong", "screenWidth": screen_width, "screenHeight": screen_height}))
                    
            except Exception as e:
                pass
    except websockets.exceptions.ConnectionClosed:
        print("❌ AeroFace Web App disconnected.")

async def main():
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n🛑 AeroFace Bridge stopped.")
`;

export const NODE_AGENT_SCRIPT = `/**
 * AeroFace Desktop Cursor Agent (Node.js)
 * 
 * Requirements:
 *   npm install ws robotjs (or @nut-tree-fork/nut-js)
 * 
 * Run:
 *   node aeroface_desktop.js
 */

const WebSocket = require('ws');
// For cross-platform desktop control:
// npm install @nut-tree-fork/nut-js ws
const { mouse, straightTo, Point, Button } = require('@nut-tree-fork/nut-js');

const PORT = 8765;
const wss = new WebSocket.Server({ port: PORT });

console.log(\`AeroFace Desktop Bridge running on ws://localhost:\${PORT}\`);

wss.on('connection', (ws) => {
  console.log('AeroFace client connected!');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === 'move') {
        const screenW = 1920; // Or autodetect
        const screenH = 1080;
        const x = Math.round(data.percentX * screenW);
        const y = Math.round(data.percentY * screenH);
        await mouse.setPosition(new Point(x, y));
      } else if (data.action === 'click') {
        await mouse.click(data.button === 'right' ? Button.RIGHT : Button.LEFT);
      }
    } catch (err) {}
  });
});
`;

export class NativeBridgeService {
  private socket: WebSocket | null = null;
  private statusListeners: ((status: NativeBridgeStatus) => void)[] = [];
  private port: number = DEFAULT_BRIDGE_PORT;
  private reconnectTimer: number | null = null;
  private status: NativeBridgeStatus = {
    connected: false,
    connecting: false,
    error: null,
    packetsSent: 0,
    url: `ws://localhost:${DEFAULT_BRIDGE_PORT}`,
    lastMessageTime: null,
  };

  constructor() {}

  public subscribe(listener: (status: NativeBridgeStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.statusListeners.forEach((listener) => listener({ ...this.status }));
  }

  public connect(port: number = DEFAULT_BRIDGE_PORT) {
    this.port = port;
    const url = `ws://localhost:${port}`;
    this.status.url = url;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
    }

    this.status.connecting = true;
    this.status.error = null;
    this.notify();

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.status.connected = true;
        this.status.connecting = false;
        this.status.error = null;
        this.notify();

        // Send handshake
        this.send({ action: 'ping' });
      };

      this.socket.onmessage = () => {
        this.status.lastMessageTime = Date.now();
        this.notify();
      };

      this.socket.onclose = () => {
        this.status.connected = false;
        this.status.connecting = false;
        this.notify();
      };

      this.socket.onerror = () => {
        this.status.connected = false;
        this.status.connecting = false;
        this.status.error = 'Unable to reach local bridge. Run aeroface_desktop.py to enable real OS control.';
        this.notify();
      };
    } catch (e) {
      this.status.connected = false;
      this.status.connecting = false;
      this.status.error = String(e);
      this.notify();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.status.connected = false;
    this.status.connecting = false;
    this.notify();
  }

  public send(data: Record<string, unknown>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      this.status.packetsSent++;
      this.notify();
    }
  }

  public sendCursorMove(percentX: number, percentY: number) {
    this.send({
      action: 'move',
      percentX: Math.max(0, Math.min(1, percentX)),
      percentY: Math.max(0, Math.min(1, percentY)),
    });
  }

  public sendClick(button: 'left' | 'right' = 'left') {
    this.send({
      action: 'click',
      button,
    });
  }

  public sendMouseDown(button: 'left' | 'right' = 'left') {
    this.send({
      action: 'mouseDown',
      button,
    });
  }

  public sendMouseUp(button: 'left' | 'right' = 'left') {
    this.send({
      action: 'mouseUp',
      button,
    });
  }

  public sendScroll(dy: number) {
    this.send({
      action: 'scroll',
      dy,
    });
  }

  public downloadPythonScript() {
    const blob = new Blob([PYTHON_AGENT_SCRIPT], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aeroface_desktop.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const nativeBridge = new NativeBridgeService();
