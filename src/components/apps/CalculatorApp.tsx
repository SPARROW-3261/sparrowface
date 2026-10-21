/**
 * Accessible Calculator App
 * Clean tactile buttons for face-controlled numerical computation
 */

import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import { sounds } from '../../services/soundEffects';

export const CalculatorApp: React.FC = () => {
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    sounds.playClick('left');
    if (display === '0' || isCalculated) {
      setDisplay(digit);
      setIsCalculated(false);
    } else {
      setDisplay((prev) => (prev.length < 12 ? prev + digit : prev));
    }
  };

  const handleOperator = (op: string) => {
    sounds.playClick('left');
    setEquation(`${display} ${op}`);
    setDisplay('0');
    setIsCalculated(false);
  };

  const handleEquals = () => {
    sounds.playClick('left');
    if (!equation) return;
    try {
      const parts = equation.trim().split(' ');
      const a = parseFloat(parts[0]);
      const op = parts[1];
      const b = parseFloat(display);

      let result = 0;
      if (op === '+') result = a + b;
      else if (op === '-') result = a - b;
      else if (op === '×' || op === '*') result = a * b;
      else if (op === '÷' || op === '/') result = b !== 0 ? a / b : 0;

      const formatted = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(6)).toString();

      setDisplay(formatted);
      setEquation('');
      setIsCalculated(true);
    } catch {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    sounds.playClick('left');
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    sounds.playClick('left');
    if (display.length > 1) {
      setDisplay((prev) => prev.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none p-4 max-w-xs mx-auto">
      {/* Display */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 mb-3 text-right shadow-inner">
        <div className="text-[11px] font-mono text-neutral-500 h-4">{equation}</div>
        <div className="text-2xl font-bold font-mono text-cyan-300 truncate tracking-wider">
          {display}
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-2 flex-1">
        <button
          onClick={handleClear}
          className="col-span-2 h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-400 font-semibold text-xs transition-colors"
        >
          AC / Clear
        </button>
        <button
          onClick={handleBackspace}
          className="h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-colors"
          title="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleOperator('÷')}
          className="h-11 rounded-lg bg-neutral-800 hover:bg-cyan-600/40 border border-neutral-700 text-cyan-400 font-bold text-base transition-colors"
        >
          ÷
        </button>

        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-base transition-colors"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator('×')}
          className="h-11 rounded-lg bg-neutral-800 hover:bg-cyan-600/40 border border-neutral-700 text-cyan-400 font-bold text-base transition-colors"
        >
          ×
        </button>

        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-base transition-colors"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator('-')}
          className="h-11 rounded-lg bg-neutral-800 hover:bg-cyan-600/40 border border-neutral-700 text-cyan-400 font-bold text-base transition-colors"
        >
          -
        </button>

        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-base transition-colors"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => handleOperator('+')}
          className="h-11 rounded-lg bg-neutral-800 hover:bg-cyan-600/40 border border-neutral-700 text-cyan-400 font-bold text-base transition-colors"
        >
          +
        </button>

        <button
          onClick={() => handleDigit('0')}
          className="col-span-2 h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-base transition-colors"
        >
          0
        </button>
        <button
          onClick={() => handleDigit('.')}
          className="h-11 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-bold text-base transition-colors"
        >
          .
        </button>
        <button
          onClick={handleEquals}
          className="h-11 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg transition-colors shadow-md shadow-cyan-600/20"
        >
          =
        </button>
      </div>
    </div>
  );
};
