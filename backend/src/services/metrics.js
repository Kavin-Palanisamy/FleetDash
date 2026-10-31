// Rolling sample size for p95 latency calculation
const MAX_LATENCY_SAMPLES = 1000;
const latencySamples = [];

const counters = {
  eventsReceived: 0,
  eventsProcessed: 0,
  eventsIgnored: 0,
  eventsRejected: 0,
  errors: 0,
  droppedEvents: 0,
};

let activeSocketsCount = 0;

export const metrics = {
  incrementReceived: () => { counters.eventsReceived += 1; },
  incrementProcessed: () => { counters.eventsProcessed += 1; },
  incrementIgnored: () => { counters.eventsIgnored += 1; },
  incrementRejected: () => { counters.eventsRejected += 1; },
  incrementErrors: () => { counters.errors += 1; },
  incrementDropped: (count = 1) => { counters.droppedEvents += count; },

  setSocketCount: (count) => { activeSocketsCount = Math.max(0, count); },
  incrementSockets: () => { activeSocketsCount += 1; },
  decrementSockets: () => { activeSocketsCount = Math.max(0, activeSocketsCount - 1); },

  recordProcessingTime: (ms) => {
    if (typeof ms !== 'number' || !Number.isFinite(ms)) return;
    if (latencySamples.length >= MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }
    latencySamples.push(ms);
  },

  getMetrics: (extra = {}) => {
    // Calculate average and p95 from rolling window
    let avg = 0;
    let p95 = 0;
    if (latencySamples.length > 0) {
      const sum = latencySamples.reduce((a, b) => a + b, 0);
      avg = Number((sum / latencySamples.length).toFixed(2));

      const sorted = [...latencySamples].sort((a, b) => a - b);
      const p95Index = Math.min(
        sorted.length - 1,
        Math.floor(sorted.length * 0.95)
      );
      p95 = Number(sorted[p95Index].toFixed(2));
    }

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      counters: { ...counters },
      processingTimeMs: {
        avg,
        p95,
        samplesCount: latencySamples.length,
      },
      bufferSize: extra.bufferSize ?? 0,
      connectedSockets: activeSocketsCount,
      memory: {
        rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
        heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        heapTotalMb: Number((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)),
      },
    };
  },

  resetMetrics: () => {
    counters.eventsReceived = 0;
    counters.eventsProcessed = 0;
    counters.eventsIgnored = 0;
    counters.eventsRejected = 0;
    counters.errors = 0;
    counters.droppedEvents = 0;
    activeSocketsCount = 0;
    latencySamples.length = 0;
  },
};
