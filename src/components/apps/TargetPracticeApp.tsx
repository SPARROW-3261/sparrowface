/**
 * Target Practice & Precision Trainer App
 * Allows users to practice and benchmark their face cursor control precision,
 * measuring reaction times, accuracy, and score.
 */

import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '../../services/soundEffects';
import { Target, Trophy, RotateCcw, Zap, CheckCircle2 } from 'lucide-react';

interface TargetItem {
  id: number;
  x: number; // percentage 10% to 90%
  y: number; // percentage 15% to 85%
  size: number;
  spawnTime: number;
}

export const TargetPracticeApp: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [hits, setHits] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [currentTarget, setCurrentTarget] = useState<TargetItem | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  const targetSizes = {
    easy: 56,
    medium: 44,
    hard: 32,
  };

  const spawnTarget = () => {
    const margin = 12;
    const x = margin + Math.random() * (100 - margin * 2);
    const y = margin + Math.random() * (100 - margin * 2);
    setCurrentTarget({
      id: Date.now(),
      x,
      y,
      size: targetSizes[difficulty],
      spawnTime: performance.now(),
    });
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(30);
    setReactionTimes([]);
    spawnTarget();
  };

  const stopGame = () => {
    setIsPlaying(false);
    setIsGameOver(true);
    setCurrentTarget(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (hits > 5) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, hits]);

  const handleTargetHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTarget || !isPlaying) return;

    const reaction = Math.round(performance.now() - currentTarget.spawnTime);
    setReactionTimes((prev) => [...prev, reaction]);
    setHits((prev) => prev + 1);
    setScore((prev) => prev + Math.max(10, Math.round(10000 / Math.max(200, reaction))));
    sounds.playTargetHit();
    spawnTarget();
  };

  const handleArenaClick = () => {
    if (isPlaying) {
      setMisses((prev) => prev + 1);
    }
  };

  const avgReaction =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none">
      {/* Top Bar Stats */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-neutral-300">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>Target Practice</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-800/80 rounded px-2 py-0.5 font-mono text-[11px] text-neutral-300">
            <span>Time:</span>
            <span className="font-semibold text-cyan-300">{timeLeft}s</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-800/80 rounded px-2 py-0.5 font-mono text-[11px] text-neutral-300">
            <span>Score:</span>
            <span className="font-semibold text-amber-300">{score}</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-800/80 rounded px-2 py-0.5 font-mono text-[11px] text-neutral-300">
            <span>Avg Reaction:</span>
            <span className="font-semibold text-emerald-300">{avgReaction ? `${avgReaction}ms` : '--'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[11px]">
            {(['easy', 'medium', 'hard'] as const).map((lvl) => (
              <button
                key={lvl}
                disabled={isPlaying}
                onClick={() => setDifficulty(lvl)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  difficulty === lvl
                    ? 'bg-neutral-800 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 disabled:opacity-50'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {!isPlaying ? (
            <button
              onClick={startGame}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Start Drill</span>
            </button>
          ) : (
            <button
              onClick={stopGame}
              className="flex items-center gap-1 px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-medium rounded text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Arena */}
      <div
        onClick={handleArenaClick}
        className="relative flex-1 w-full h-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden cursor-crosshair"
      >
        {/* Arena subtle grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Active Target */}
        {isPlaying && currentTarget && (
          <button
            onClick={handleTargetHit}
            style={{
              position: 'absolute',
              left: `${currentTarget.x}%`,
              top: `${currentTarget.y}%`,
              width: `${currentTarget.size}px`,
              height: `${currentTarget.size}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="group rounded-full flex items-center justify-center p-0 border border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:scale-110 active:scale-95 transition-transform"
          >
            <div className="w-2/3 h-2/3 rounded-full border border-cyan-300 bg-cyan-400/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
            </div>
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-40 pointer-events-none" />
          </button>
        )}

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm p-6 text-center">
            {isGameOver ? (
              <div className="max-w-sm w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Drill Completed</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Great session! Here is how your face tracking precision performed:
                </p>

                <div className="grid grid-cols-3 gap-2 mb-5 text-left">
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Score</span>
                    <span className="text-base font-bold text-amber-400 font-mono">{score}</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Reaction</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {avgReaction ? `${avgReaction}ms` : '--'}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 uppercase block">Accuracy</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">{accuracy}%</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Practice Again</span>
                </button>
              </div>
            ) : (
              <div className="max-w-md">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 border border-cyan-500/30">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Face Cursor Precision Drill</h3>
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                  Move your head to steer the cursor over the target. Hold still to trigger dwell click,
                  or wink / open mouth to pop targets as quickly as possible.
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 mb-6">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>30 Seconds Round</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reaction Benchmarking</span>
                  </div>
                </div>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-lg shadow-cyan-600/30"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start Precision Test</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
