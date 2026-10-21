/**
 * Performance Monitoring Logger Service
 * Periodically captures FPS, latency, and system jitter metrics to a downloadable JSON file.
 * Enables users to troubleshoot tracking lag, frame drops, or hardware bottlenecks.
 */

export interface PerformanceSample {
  timestamp: number; // epoch ms
  timeIso: string;
  fps: number;
  latencyMs: number;
  jitterIndex: number; // tremor/instability index in px/frame^2
  headX: number;
  headY: number;
  isFaceLocked: boolean;
  isCursorFrozen: boolean;
  frameDeltaMs: number;
  memoryHeapMb?: number | null;
}

export interface PerformanceSummary {
  sessionDurationSec: number;
  totalSamples: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  avgJitter: number;
  maxJitter: number;
  droppedFramesEstimate: number;
  bottleneckDiagnosis: {
    status: 'optimal' | 'moderate_lag' | 'severe_bottleneck';
    headline: string;
    description: string;
    recommendation: string;
  };
}

export interface ExportablePerfLog {
  app: string;
  version: string;
  exportedAt: string;
  system: {
    userAgent: string;
    screenResolution: string;
    devicePixelRatio: number;
    hardwareConcurrency: number;
  };
  summary: PerformanceSummary;
  samples: PerformanceSample[];
}

class PerformanceLoggerService {
  private samples: PerformanceSample[] = [];
  private maxSamples: number = 3600; // Store up to ~1 hour at 1Hz or ~30 mins at 2Hz
  private isRecording: boolean = true;
  private listeners: ((samples: PerformanceSample[], summary: PerformanceSummary) => void)[] = [];
  private lastSampleTime: number = 0;
  private sampleIntervalMs: number = 500; // Sample every 500ms by default
  private lastDeltaX: number = 0;
  private lastDeltaY: number = 0;
  private lastFrameTimestamp: number = performance.now();

  constructor() {
    this.lastSampleTime = Date.now();
  }

  public setRecording(enabled: boolean) {
    this.isRecording = enabled;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public setSampleInterval(intervalMs: number) {
    this.sampleIntervalMs = Math.max(100, Math.min(5000, intervalMs));
  }

  /**
   * Called by the tracking loop on each frame or state change
   */
  public recordFrame(data: {
    fps: number;
    latencyMs: number;
    cursorX: number;
    cursorY: number;
    deltaX: number;
    deltaY: number;
    rawNoseX: number;
    rawNoseY: number;
    hasFace: boolean;
    isCursorFrozen: boolean;
  }) {
    if (!this.isRecording) return;

    const now = Date.now();
    const frameNow = performance.now();
    const frameDelta = frameNow - this.lastFrameTimestamp;
    this.lastFrameTimestamp = frameNow;

    // Calculate motion jitter / jerk (second derivative of position delta)
    const jerkX = data.deltaX - this.lastDeltaX;
    const jerkY = data.deltaY - this.lastDeltaY;
    const currentJitter = Math.sqrt(jerkX * jerkX + jerkY * jerkY);
    this.lastDeltaX = data.deltaX;
    this.lastDeltaY = data.deltaY;

    // Throttle recording to sampling interval to prevent memory explosion while keeping high accuracy
    if (now - this.lastSampleTime < this.sampleIntervalMs) {
      return;
    }
    this.lastSampleTime = now;

    // Inspect browser heap memory if supported
    let memoryHeapMb: number | null = null;
    const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
    if (perfWithMemory && perfWithMemory.memory && typeof perfWithMemory.memory.usedJSHeapSize === 'number') {
      memoryHeapMb = Math.round((perfWithMemory.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    }

    const sample: PerformanceSample = {
      timestamp: now,
      timeIso: new Date(now).toISOString(),
      fps: Math.round(data.fps * 10) / 10,
      latencyMs: Math.round(data.latencyMs * 10) / 10,
      jitterIndex: Math.round(currentJitter * 100) / 100,
      headX: Math.round(data.rawNoseX * 1000) / 1000,
      headY: Math.round(data.rawNoseY * 1000) / 1000,
      isFaceLocked: data.hasFace,
      isCursorFrozen: data.isCursorFrozen,
      frameDeltaMs: Math.round(frameDelta * 10) / 10,
      memoryHeapMb,
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.notify();
  }

  public getSamples(): PerformanceSample[] {
    return [...this.samples];
  }

  public getRecentSamples(count: number = 60): PerformanceSample[] {
    return this.samples.slice(-count);
  }

  public clear() {
    this.samples = [];
    this.notify();
  }

  public getSummary(): PerformanceSummary {
    if (this.samples.length === 0) {
      return {
        sessionDurationSec: 0,
        totalSamples: 0,
        avgFps: 0,
        minFps: 0,
        maxFps: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        maxLatencyMs: 0,
        avgJitter: 0,
        maxJitter: 0,
        droppedFramesEstimate: 0,
        bottleneckDiagnosis: {
          status: 'optimal',
          headline: 'Waiting for Telemetry Samples',
          description: 'Keep face in camera frame to record tracking performance.',
          recommendation: 'Ensure camera is allowed and head is centered.',
        },
      };
    }

    const fpsValues = this.samples.map((s) => s.fps).filter((f) => f > 0);
    const latencyValues = this.samples.map((s) => s.latencyMs);
    const jitterValues = this.samples.map((s) => s.jitterIndex);

    const firstTime = this.samples[0].timestamp;
    const lastTime = this.samples[this.samples.length - 1].timestamp;
    const sessionDurationSec = Math.max(1, Math.round((lastTime - firstTime) / 1000));

    const avgFps = fpsValues.length > 0 ? Math.round((fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length) * 10) / 10 : 0;
    const minFps = fpsValues.length > 0 ? Math.min(...fpsValues) : 0;
    const maxFps = fpsValues.length > 0 ? Math.max(...fpsValues) : 0;

    const avgLatencyMs = latencyValues.length > 0 ? Math.round((latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length) * 10) / 10 : 0;
    const maxLatencyMs = latencyValues.length > 0 ? Math.max(...latencyValues) : 0;

    // P95 calculation for latency
    const sortedLatency = [...latencyValues].sort((a, b) => a - b);
    const p95Idx = Math.floor(sortedLatency.length * 0.95);
    const p95LatencyMs = sortedLatency[p95Idx] || avgLatencyMs;

    const avgJitter = jitterValues.length > 0 ? Math.round((jitterValues.reduce((a, b) => a + b, 0) / jitterValues.length) * 100) / 100 : 0;
    const maxJitter = jitterValues.length > 0 ? Math.max(...jitterValues) : 0;

    // Dropped frames estimate: samples where FPS dropped below 24fps or frameDelta > 50ms
    const droppedFramesEstimate = this.samples.filter((s) => s.fps < 24 || s.frameDeltaMs > 50).length;

    // Hardware & tracking diagnostic
    let status: 'optimal' | 'moderate_lag' | 'severe_bottleneck' = 'optimal';
    let headline = 'Optimal Hardware & Tracking Throughput';
    let description = 'Frame rate and latency are within high-fidelity real-time thresholds.';
    let recommendation = 'Tracking is smooth and responsive.';

    if (avgFps < 20 || p95LatencyMs > 75) {
      status = 'severe_bottleneck';
      headline = 'Hardware Inference Bottleneck Detected';
      description = `Average FPS is ${avgFps} (target: 30-60) and P95 latency is ${p95LatencyMs}ms.`;
      recommendation =
        'Close background GPU/CPU intensive browser tabs, adjust camera resolution to 480p, or increase tracking smoothing in Settings.';
    } else if (avgFps < 32 || p95LatencyMs > 45 || avgJitter > 18) {
      status = 'moderate_lag';
      if (avgJitter > 18) {
        headline = 'Micro-Jitter / Tremor Detected';
        description = `Cursor motion exhibits high acceleration jitter (avg: ${avgJitter}px).`;
        recommendation =
          'Increase the smoothing filter factor (EMA) in Settings or rest your chin slightly to stabilize head movements.';
      } else {
        headline = 'Minor Frame Latency Spikes';
        description = `Inference latency periodically spikes to ${maxLatencyMs}ms.`;
        recommendation =
          'Ensure adequate facial lighting so the computer vision model does not require extra exposure compensation.';
      }
    }

    return {
      sessionDurationSec,
      totalSamples: this.samples.length,
      avgFps,
      minFps,
      maxFps,
      avgLatencyMs,
      p95LatencyMs,
      maxLatencyMs,
      avgJitter,
      maxJitter,
      droppedFramesEstimate,
      bottleneckDiagnosis: {
        status,
        headline,
        description,
        recommendation,
      },
    };
  }

  public subscribe(listener: (samples: PerformanceSample[], summary: PerformanceSummary) => void): () => void {
    this.listeners.push(listener);
    listener(this.samples, this.getSummary());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const summary = this.getSummary();
    for (const listener of this.listeners) {
      listener(this.samples, summary);
    }
  }

  /**
   * Generates and triggers browser download of the diagnostic JSON report
   */
  public exportToJson(): { success: boolean; filename: string; sizeBytes: number } {
    const summary = this.getSummary();
    const exportData: ExportablePerfLog = {
      app: 'Sparrow Desktop Cursor System',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      system: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      },
      summary,
      samples: this.samples,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const filename = `sparrow-performance-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename,
      sizeBytes: blob.size,
    };
  }
}

export const performanceLogger = new PerformanceLoggerService();
