/**
 * Performance Monitoring Logger Application
 * Desktop window that visualizes real-time FPS, frame latency, and motion jitter metrics,
 * identifies tracking bottlenecks, and provides an instant .json export for hardware troubleshooting.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  performanceLogger,
  PerformanceSample,
  PerformanceSummary,
} from '../../services/performanceLogger';
import { sounds } from '../../services/soundEffects';
import {
  Activity,
  Download,
  Play,
  Pause,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Cpu,
  Clock,
  Zap,
  HelpCircle,
  FileJson,
  Layers,
} from 'lucide-react';

export const PerformanceLoggerApp: React.FC = () => {
  const [samples, setSamples] = useState<PerformanceSample[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary>(performanceLogger.getSummary());
  const [isRecording, setIsRecording] = useState<boolean>(performanceLogger.getIsRecording());
  const [sampleInterval, setSampleInterval] = useState<number>(500);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subscribe to performanceLogger updates
  useEffect(() => {
    const unsub = performanceLogger.subscribe((newSamples, newSummary) => {
      setSamples([...newSamples]);
      setSummary(newSummary);
    });
    return () => unsub();
  }, []);

  // Update canvas sparkline whenever samples change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;

    // 60 FPS line (top 15%)
    const y60 = height - (60 / 75) * height;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, y60);
    ctx.lineTo(width, y60);
    ctx.stroke();

    // 30 FPS line (mid 50%)
    const y30 = height - (30 / 75) * height;
    ctx.beginPath();
    ctx.moveTo(0, y30);
    ctx.lineTo(width, y30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid labels
    ctx.fillStyle = '#737373';
    ctx.font = '10px monospace';
    ctx.fillText('60 FPS', 8, y60 - 4);
    ctx.fillText('30 FPS', 8, y30 - 4);
    ctx.fillText('0 FPS', 8, height - 6);

    const recent = samples.slice(-60);
    if (recent.length < 2) {
      ctx.fillStyle = '#525252';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting real-time performance telemetry...', width / 2, height / 2);
      ctx.textAlign = 'start';
      return;
    }

    const stepX = width / Math.max(recent.length - 1, 1);

    // Draw Latency graph (Amber/Orange line)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    recent.forEach((s, idx) => {
      // Map 0-100ms to height
      const clampedLat = Math.min(s.latencyMs, 100);
      const y = height - (clampedLat / 100) * (height * 0.7);
      const x = idx * stepX;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw FPS graph (Cyan line)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    recent.forEach((s, idx) => {
      const clampedFps = Math.min(s.fps, 75);
      const y = height - (clampedFps / 75) * height;
      const x = idx * stepX;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw smooth gradient fill under FPS curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw current sample dot
    const lastSample = recent[recent.length - 1];
    const lastX = (recent.length - 1) * stepX;
    const lastY = height - (Math.min(lastSample.fps, 75) / 75) * height;

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [samples]);

  const handleExportJson = () => {
    sounds.playClick('left');
    const result = performanceLogger.exportToJson();
    if (result.success) {
      const sizeKb = Math.round((result.sizeBytes / 1024) * 10) / 10;
      setExportNotice(`Exported ${result.filename} (${sizeKb} KB)`);
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const handleToggleRecording = () => {
    sounds.playClick('left');
    const next = !isRecording;
    performanceLogger.setRecording(next);
    setIsRecording(next);
  };

  const handleClear = () => {
    sounds.playClick('left');
    performanceLogger.clear();
  };

  const handleIntervalChange = (val: number) => {
    setSampleInterval(val);
    performanceLogger.setSampleInterval(val);
  };

  const latestSample = samples[samples.length - 1];

  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-950 text-neutral-200 select-none overflow-y-auto">
      {/* Top Banner & Control Bar */}
      <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Performance & Telemetry Logger
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  isRecording ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {isRecording ? 'LIVE RECORDING' : 'PAUSED'}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Capturing tracking FPS, frame latency, and jitter variance for bottleneck diagnosis
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            onClick={handleToggleRecording}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              isRecording
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            {isRecording ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRecording ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-medium text-neutral-300 transition-colors"
            title="Clear all recorded samples"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Download JSON Log */}
          <button
            onClick={handleExportJson}
            disabled={samples.length === 0}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Log (.json)</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* FPS Card */}
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Frame Rate
              </span>
              <span className="text-[10px] font-mono">avg {summary.avgFps}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {latestSample ? latestSample.fps : '--'} <span className="text-xs font-normal text-neutral-500">FPS</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 flex justify-between font-mono">
              <span>min: {summary.minFps}</span>
              <span>max: {summary.maxFps}</span>
            </div>
          </div>

          {/* Latency Card */}
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Frame Latency
              </span>
              <span className="text-[10px] font-mono">P95 {summary.p95LatencyMs}ms</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {latestSample ? latestSample.latencyMs : '--'} <span className="text-xs font-normal text-neutral-500">ms</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 flex justify-between font-mono">
              <span>avg: {summary.avgLatencyMs}ms</span>
              <span>max: {summary.maxLatencyMs}ms</span>
            </div>
          </div>

          {/* Motion Jitter Card */}
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                Motion Jitter
              </span>
              <span className="text-[10px] font-mono">avg {summary.avgJitter}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {latestSample ? latestSample.jitterIndex : '--'}{' '}
              <span className="text-xs font-normal text-neutral-500">px/f²</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 flex justify-between font-mono">
              <span>
                {summary.avgJitter < 8 ? 'Very Smooth' : summary.avgJitter < 20 ? 'Moderate' : 'Twitchy'}
              </span>
              <span>max: {summary.maxJitter}</span>
            </div>
          </div>

          {/* Samples & Health Card */}
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Telemetry Pool
              </span>
              <span className="text-[10px] font-mono">{summary.sessionDurationSec}s</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {summary.totalSamples}{' '}
              <span className="text-xs font-normal text-neutral-500">pts</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-1 flex justify-between font-mono">
              <span>Drops: {summary.droppedFramesEstimate}</span>
              <span>{latestSample?.memoryHeapMb ? `${latestSample.memoryHeapMb} MB` : 'Browser JS'}</span>
            </div>
          </div>
        </div>

        {/* Real-Time Telemetry Sparkline Canvas */}
        <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-white">Live Tracking Telemetry Trace</div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> FPS Trace
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Latency Trace
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400">Sampling Rate:</span>
              <div className="flex rounded-md bg-neutral-950 p-0.5 border border-neutral-800 text-[10px]">
                {[
                  { label: '250ms', val: 250 },
                  { label: '500ms', val: 500 },
                  { label: '1s', val: 1000 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => handleIntervalChange(item.val)}
                    className={`px-2 py-0.5 rounded ${
                      sampleInterval === item.val
                        ? 'bg-cyan-600 text-white font-medium'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
            <canvas ref={canvasRef} width={640} height={160} className="w-full h-40 block" />
          </div>
        </div>

        {/* Diagnostic & Hardware Bottleneck Assistant */}
        <div
          className={`p-4 rounded-xl border ${
            summary.bottleneckDiagnosis.status === 'optimal'
              ? 'bg-emerald-950/20 border-emerald-800/50'
              : summary.bottleneckDiagnosis.status === 'moderate_lag'
              ? 'bg-amber-950/20 border-amber-800/50'
              : 'bg-rose-950/20 border-rose-800/50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                summary.bottleneckDiagnosis.status === 'optimal'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                  : summary.bottleneckDiagnosis.status === 'moderate_lag'
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                  : 'bg-rose-900/40 text-rose-400 border border-rose-700/50'
              }`}
            >
              {summary.bottleneckDiagnosis.status === 'optimal' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{summary.bottleneckDiagnosis.headline}</span>
                <span
                  className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-bold ${
                    summary.bottleneckDiagnosis.status === 'optimal'
                      ? 'bg-emerald-900/80 text-emerald-300'
                      : summary.bottleneckDiagnosis.status === 'moderate_lag'
                      ? 'bg-amber-900/80 text-amber-300'
                      : 'bg-rose-900/80 text-rose-300'
                  }`}
                >
                  {summary.bottleneckDiagnosis.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs text-neutral-300">{summary.bottleneckDiagnosis.description}</div>
              <div className="text-[11px] text-neutral-400 mt-1 bg-neutral-950/40 p-2 rounded-lg border border-neutral-800/60">
                <strong className="text-cyan-400">Optimization Tip: </strong>
                {summary.bottleneckDiagnosis.recommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Live Raw Samples Inspector Table */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <div className="p-3 border-b border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              Recent Telemetry Buffer ({samples.length} logged records)
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">Chronological order</span>
          </div>

          <div className="max-h-48 overflow-y-auto font-mono text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-950 text-neutral-400 sticky top-0 border-b border-neutral-800">
                <tr>
                  <th className="py-1.5 px-3">Time</th>
                  <th className="py-1.5 px-3">FPS</th>
                  <th className="py-1.5 px-3">Latency</th>
                  <th className="py-1.5 px-3">Jitter</th>
                  <th className="py-1.5 px-3">Head (X, Y)</th>
                  <th className="py-1.5 px-3">Face Lock</th>
                  <th className="py-1.5 px-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-neutral-500 font-sans">
                      No telemetry recorded yet. Move your head in front of the camera to begin.
                    </td>
                  </tr>
                ) : (
                  samples
                    .slice(-10)
                    .reverse()
                    .map((sample, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-1.5 px-3 text-neutral-400">{sample.timeIso.slice(11, 19)}</td>
                        <td className={`py-1.5 px-3 font-semibold ${sample.fps >= 40 ? 'text-emerald-400' : sample.fps >= 24 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {sample.fps}
                        </td>
                        <td className={`py-1.5 px-3 ${sample.latencyMs < 30 ? 'text-neutral-300' : sample.latencyMs < 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {sample.latencyMs}ms
                        </td>
                        <td className="py-1.5 px-3 text-purple-400">{sample.jitterIndex}</td>
                        <td className="py-1.5 px-3 text-neutral-400">
                          ({sample.headX.toFixed(2)}, {sample.headY.toFixed(2)})
                        </td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1 rounded text-[9px] ${sample.isFaceLocked ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                            {sample.isFaceLocked ? 'TRACKED' : 'LOST'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-neutral-400">
                          {sample.isCursorFrozen ? '⏸ Frozen' : '▶ Active'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
