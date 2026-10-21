/**
 * Accessibility Virtual On-Screen Keyboard
 * Type words, phrases, and speak them aloud using face cursor + dwell or wink clicks!
 */

import React, { useState } from 'react';
import { Volume2, Copy, Delete, RotateCcw, Check, MessageSquare } from 'lucide-react';
import { sounds } from '../../services/soundEffects';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '?', '!'],
];

const QUICK_PHRASES = [
  'Yes',
  'No',
  'Thank you',
  'Please help',
  'Good morning',
  'I am ready',
  'Water please',
];

export const VirtualKeyboardApp: React.FC = () => {
  const [text, setText] = useState<string>('Hello! I am controlling this cursor with my face.');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const handleKeyPress = (char: string) => {
    sounds.playClick('left');
    setText((prev) => prev + char);
  };

  const handleBackspace = () => {
    sounds.playClick('left');
    setText((prev) => prev.slice(0, -1));
  };

  const handleSpace = () => {
    sounds.playClick('left');
    setText((prev) => prev + ' ');
  };

  const handleClear = () => {
    sounds.playClick('left');
    setText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    sounds.playClick('left');
    setText((prev) => (prev ? prev + ' ' + phrase : phrase));
  };

  const handleSpeak = () => {
    if (!text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none p-4 overflow-y-auto">
      {/* Top Text Output Area */}
      <div className="mb-4 bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-inner flex flex-col justify-between min-h-[110px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Use head cursor to click keys and type here..."
          className="w-full bg-transparent resize-none text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none font-sans"
          rows={3}
        />

        {/* Action strip */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
          <div className="text-[11px] font-mono text-neutral-500">
            {words} words · {text.length} chars
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeak}
              disabled={!text.trim()}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                isSpeaking
                  ? 'bg-amber-500 text-black animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Speaking...' : 'Speak Aloud'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleClear}
              className="p-1 text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 rounded"
              title="Clear text"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Phrases Strip */}
      <div className="mb-3">
        <div className="text-[11px] text-neutral-400 mb-1.5 flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-cyan-400" />
          <span>Quick Responses:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_PHRASES.map((phrase) => (
            <button
              key={phrase}
              onClick={() => handleQuickPhrase(phrase)}
              className="whitespace-nowrap px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* Main Virtual Keyboard Grid */}
      <div className="flex flex-col gap-2 flex-1 justify-center max-w-2xl mx-auto w-full">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1.5">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="flex-1 max-w-[58px] h-12 rounded-lg bg-neutral-900 hover:bg-cyan-600/30 border border-neutral-800 hover:border-cyan-500/50 text-neutral-200 hover:text-cyan-300 font-semibold text-base flex items-center justify-center transition-all shadow-sm active:scale-95"
              >
                {key}
              </button>
            ))}
          </div>
        ))}

        {/* Bottom utility row */}
        <div className="flex justify-center gap-1.5">
          <button
            onClick={handleBackspace}
            className="w-24 h-12 rounded-lg bg-neutral-900 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-500/50 text-neutral-300 hover:text-rose-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Delete className="w-4 h-4" />
            <span>Del</span>
          </button>

          <button
            onClick={handleSpace}
            className="flex-1 max-w-[280px] h-12 rounded-lg bg-neutral-900 hover:bg-cyan-600/30 border border-neutral-800 hover:border-cyan-500/50 text-neutral-200 font-medium text-xs flex items-center justify-center transition-all shadow-sm active:scale-95 tracking-widest uppercase"
          >
            SPACE
          </button>

          <button
            onClick={() => handleKeyPress('\n')}
            className="w-24 h-12 rounded-lg bg-cyan-700/60 hover:bg-cyan-600 border border-cyan-500/40 text-white text-xs font-semibold flex items-center justify-center transition-all shadow-sm active:scale-95"
          >
            ENTER
          </button>
        </div>
      </div>
    </div>
  );
};
