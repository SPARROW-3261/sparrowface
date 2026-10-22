import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Play,
  Pause,
  MousePointer,
  FolderOpen,
  Sliders,
  CheckCircle2,
  X,
  Volume2,
  Terminal,
  Send,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface VoiceCheatsheetModalProps {
  isOpen: boolean;
  isListening: boolean;
  isSupported: boolean;
  voiceError: string | null;
  onClose: () => void;
  onToggleVoice: () => void;
  onSimulateCommand: (commandText: string) => void;
}

interface CommandItem {
  phrase: string;
  action: string;
  category: 'cursor' | 'apps' | 'system';
  icon: React.ReactNode;
}

const VOICE_COMMANDS: CommandItem[] = [
  // Cursor commands
  {
    phrase: 'Sparrow recenter',
    action: 'Recalibrates & snaps cursor to current head rest pose',
    category: 'cursor',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
  },
  {
    phrase: 'Sparrow stop',
    action: 'Freezes cursor position and halts tracking motion',
    category: 'cursor',
    icon: <Pause className="w-4 h-4 text-amber-400" />,
  },
  {
    phrase: 'Sparrow start',
    action: 'Resumes cursor motion and unfreezes head tracking',
    category: 'cursor',
    icon: <Play className="w-4 h-4 text-emerald-400" />,
  },
  {
    phrase: 'Sparrow click',
    action: 'Triggers a primary left click at virtual cursor position',
    category: 'cursor',
    icon: <MousePointer className="w-4 h-4 text-cyan-400" />,
  },
  {
    phrase: 'Sparrow right click',
    action: 'Triggers a secondary right click / context menu',
    category: 'cursor',
    icon: <MousePointer className="w-4 h-4 text-purple-400" />,
  },
  {
    phrase: 'Sparrow double click',
    action: 'Triggers a rapid double click at virtual cursor position',
    category: 'cursor',
    icon: <MousePointer className="w-4 h-4 text-blue-400" />,
  },

  // App commands
  {
    phrase: 'Sparrow open camera',
    action: 'Opens live face webcam sensor & tracking diagnostics',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-cyan-400" />,
  },
  {
    phrase: 'Sparrow open notes',
    action: 'Opens Quick Notes memo notepad application',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-amber-400" />,
  },
  {
    phrase: 'Sparrow open paint',
    action: 'Opens Face Paint canvas for head-drawing artwork',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-pink-400" />,
  },
  {
    phrase: 'Sparrow open calculator',
    action: 'Opens math calculator app for quick sums',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-emerald-400" />,
  },
  {
    phrase: 'Sparrow open keyboard',
    action: 'Opens accessibility on-screen virtual keyboard',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-blue-400" />,
  },
  {
    phrase: 'Sparrow open browser',
    action: 'Opens web navigator and reader app',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-cyan-400" />,
  },
  {
    phrase: 'Sparrow open settings',
    action: 'Opens tracking sensitivity, smoothing & deadzone dials',
    category: 'apps',
    icon: <Sliders className="w-4 h-4 text-orange-400" />,
  },
  {
    phrase: 'Sparrow open presets',
    action: 'Opens Profile & Environment Lighting presets manager',
    category: 'apps',
    icon: <Sliders className="w-4 h-4 text-indigo-400" />,
  },
  {
    phrase: 'Sparrow open logger',
    action: 'Opens Performance telemetry & jitter logger (JSON download)',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-emerald-400" />,
  },
  {
    phrase: 'Sparrow open target',
    action: 'Opens target practice aim training drill',
    category: 'apps',
    icon: <FolderOpen className="w-4 h-4 text-rose-400" />,
  },

  // System commands
  {
    phrase: 'Sparrow calibrate',
    action: 'Starts 5-Point Calibration Wizard for personalized range',
    category: 'system',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
  },
  {
    phrase: 'Sparrow host bridge',
    action: 'Opens Native Desktop OS Cursor Bridge connection modal',
    category: 'system',
    icon: <Terminal className="w-4 h-4 text-emerald-400" />,
  },
  {
    phrase: 'Sparrow login',
    action: 'Opens user sign-in & profile switching modal',
    category: 'system',
    icon: <Sliders className="w-4 h-4 text-blue-400" />,
  },
  {
    phrase: 'Sparrow mute',
    action: 'Mutes interactive audio chime feedback',
    category: 'system',
    icon: <Volume2 className="w-4 h-4 text-neutral-400" />,
  },
  {
    phrase: 'Sparrow unmute',
    action: 'Enables interactive audio chime feedback',
    category: 'system',
    icon: <Volume2 className="w-4 h-4 text-cyan-400" />,
  },
];

export const VoiceCheatsheetModal: React.FC<VoiceCheatsheetModalProps> = ({
  isOpen,
  isListening,
  isSupported,
  voiceError,
  onClose,
  onToggleVoice,
  onSimulateCommand,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cursor' | 'apps' | 'system'>('all');
  const [customInput, setCustomInput] = useState<string>('');
  const [lastSimulated, setLastSimulated] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCommands = VOICE_COMMANDS.filter((cmd) =>
    selectedCategory === 'all' ? true : cmd.category === selectedCategory
  );

  const handleRunCommand = (phrase: string) => {
    setLastSimulated(phrase);
    onSimulateCommand(phrase);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const phrase = customInput.toLowerCase().startsWith('sparrow')
      ? customInput.trim()
      : `Sparrow ${customInput.trim()}`;
    handleRunCommand(phrase);
    setCustomInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/40 shadow-sm shrink-0">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg"
                alt="Sparrow"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Sparrow Voice Command Engine</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                    isListening
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isListening ? 'bg-emerald-400' : 'bg-neutral-500'
                    }`}
                  />
                  {isListening ? 'Listening' : 'Muted'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Prefix commands with <span className="text-cyan-400 font-mono font-semibold">"Sparrow"</span> to execute actions hands-free
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleVoice}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                isListening
                  ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/50 shadow-md active:scale-95 animate-pulse'
              }`}
              title={isListening ? 'Click to Mute Voice Recognition' : 'Click to Unmute Voice & Request Microphone'}
            >
              {isListening ? (
                <>
                  <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Mute Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-white" />
                  <span>Unmute Mic</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Muted Guidance Banner */}
        {!isListening && !voiceError && (
          <div className="px-5 py-2.5 bg-cyan-950/40 border-b border-cyan-800/40 text-cyan-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MicOff className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice commands are currently muted. Say "Sparrow ..." or click unmute.</span>
            </div>
            <button
              onClick={onToggleVoice}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-[11px] shadow-sm transition-all"
            >
              Unmute Now
            </button>
          </div>
        )}

        {/* Browser Voice Notice or Error Banner */}
        {voiceError ? (
          <div className="px-5 py-2.5 bg-amber-950/40 border-b border-amber-800/40 text-amber-300 text-xs flex items-center justify-between">
            <span>{voiceError}</span>
            <button
              className="px-2 py-0.5 bg-amber-600/80 hover:bg-amber-500 text-white font-semibold rounded text-[11px]"
              onClick={() => onToggleVoice()}
            >
              Unmute & Retry
            </button>
          </div>
        ) : !isSupported ? (
          <div className="px-5 py-2.5 bg-blue-950/40 border-b border-blue-800/40 text-blue-300 text-xs">
            Web Speech API is not supported in this browser. You can use the instant test buttons below to trigger any voice intent!
          </div>
        ) : null}

        {/* Test Simulator Bar */}
        <div className="px-5 py-3 bg-neutral-950/40 border-b border-neutral-800 flex items-center gap-2">
          <form onSubmit={handleCustomSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Terminal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder='Type command to test (e.g. "Sparrow recenter", "Sparrow stop", "Sparrow open notes")'
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Test Intent</span>
            </button>
          </form>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-1.5 border-b border-neutral-800/60 bg-neutral-900/40">
          {(
            [
              { id: 'all', label: 'All Commands' },
              { id: 'cursor', label: 'Cursor & Tracking' },
              { id: 'apps', label: 'Open Apps' },
              { id: 'system', label: 'System & Tools' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Command List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filteredCommands.map((cmd) => (
            <div
              key={cmd.phrase}
              className="group flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-cyan-500/40 transition-all hover:bg-neutral-800/40"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700/60 flex items-center justify-center shrink-0">
                  {cmd.icon}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">
                      "{cmd.phrase}"
                    </span>
                    {lastSimulated === cmd.phrase && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 animate-in fade-in">
                        <CheckCircle2 className="w-3 h-3" /> Triggered!
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">{cmd.action}</div>
                </div>
              </div>

              <button
                onClick={() => handleRunCommand(cmd.phrase)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-cyan-600 text-neutral-300 hover:text-white text-xs font-medium transition-colors shrink-0 shadow-sm ml-2"
                title={`Simulate speaking "${cmd.phrase}"`}
              >
                Test Voice
              </button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Voice engine continuously monitors speech while mic is active.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
