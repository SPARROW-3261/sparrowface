/**
 * Native OS Desktop Cursor Bridge Modal
 * Instructions and scripts to control the physical desktop cursor outside the browser
 */

import React, { useState } from 'react';
import { NativeBridgeStatus } from '../types';
import { nativeBridge, PYTHON_AGENT_SCRIPT } from '../services/nativeBridge';
import { Terminal, Download, Copy, Check, ExternalLink, X, ShieldAlert, MonitorCheck, Radio } from 'lucide-react';

interface NativeBridgeModalProps {
  status: NativeBridgeStatus;
  port: number;
  onUpdatePort: (port: number) => void;
  onClose: () => void;
}

export const NativeBridgeModal: React.FC<NativeBridgeModalProps> = ({
  status,
  port,
  onUpdatePort,
  onClose,
}) => {
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'python' | 'node'>('python');

  const copyScript = () => {
    navigator.clipboard.writeText(PYTHON_AGENT_SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyCmd = () => {
    navigator.clipboard.writeText('pip install pyautogui websockets && python sparrow_desktop.py');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <MonitorCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Host OS Desktop Cursor Control</h3>
              <p className="text-xs text-neutral-400">
                Move and click your actual computer cursor in Windows, macOS, or Linux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="my-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                status.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-600'
              }`}
            />
            <div>
              <span className="font-semibold text-white">
                {status.connected ? 'Bridge Connected & Active' : 'Waiting for Desktop Agent...'}
              </span>
              <span className="text-neutral-500 block text-[11px]">
                {status.connected
                  ? `${status.packetsSent} motion packets sent to host OS`
                  : `Listening on ws://localhost:${port}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => nativeBridge.connect(port)}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-colors flex items-center gap-1"
            >
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Retry Connect</span>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4">
            <h4 className="font-semibold text-neutral-200 mb-2 flex items-center gap-1.5">
              <span>Quick 2-Step Setup</span>
            </h4>
            <p className="text-neutral-400 leading-relaxed mb-3">
              Due to web browser sandbox security, a webpage cannot move the OS cursor outside its window directly. Running this lightweight helper script connects your webcam tracking directly to <code className="text-cyan-300 font-mono">pyautogui</code>!
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-900/60 text-cyan-300 font-mono flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">Download or Save the Agent Script</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nativeBridge.downloadPythonScript()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download sparrow_desktop.py</span>
                    </button>
                    <button
                      onClick={copyScript}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors border border-neutral-700"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Copied' : 'Copy Python Code'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-900/60 text-cyan-300 font-mono flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">Run in Terminal / Command Prompt</div>
                  <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-2 font-mono text-[11px] text-neutral-300">
                    <span className="truncate">pip install pyautogui websockets && python sparrow_desktop.py</span>
                    <button
                      onClick={copyCmd}
                      className="p-1 hover:text-cyan-400 transition-colors ml-2 shrink-0"
                      title="Copy command"
                    >
                      {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety feature notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-950/40 border border-neutral-800 text-[11px] text-neutral-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-amber-300 font-medium">Built-in Fail-Safe: </span>
              If you ever need to instantly stop cursor control on your desktop, simply slam your mouse to any of the 4 corners of your screen. PyAutoGUI's built-in emergency fail-safe will immediately halt control.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
          <div className="text-neutral-500">
            Port: <span className="font-mono text-neutral-400">{port}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
