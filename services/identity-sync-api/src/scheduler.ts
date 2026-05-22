import type { LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';
import { syncLogtoUsers, type SyncResult } from './sync.js';

export interface SyncLogger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface SyncScheduler {
  start(): Promise<void>;
  stop(): Promise<void>;
  runNow(): Promise<SyncResult>;
  lastResult(): SyncResult | null;
}

export interface SyncSchedulerOptions {
  intervalMs: number;
  runOnStartup: boolean;
  logger: SyncLogger;
}

export function createSyncScheduler(
  importer: LogtoUserImporter,
  publisher: IdentityEventPublisher,
  options: SyncSchedulerOptions,
): SyncScheduler {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let last: SyncResult | null = null;
  let stopped = false;

  async function runOnce(reason: string): Promise<SyncResult> {
    if (running) {
      options.logger.warn({ reason }, 'identity_sync_skipped previous run still in progress');
      return (
        last ?? {
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          fetched: 0,
          published: 0,
          skipped: 0,
          error: 'previous run still in progress',
        }
      );
    }

    running = true;
    try {
      const result = await syncLogtoUsers(importer, publisher);
      last = result;
      if (result.error) {
        options.logger.error(
          { reason, ...result },
          'identity_sync_failed',
        );
      } else {
        options.logger.info({ reason, ...result }, 'identity_sync_completed');
      }
      return result;
    } finally {
      running = false;
    }
  }

  return {
    async start() {
      if (timer) return;
      if (options.runOnStartup) {
        await runOnce('startup');
      }
      timer = setInterval(() => {
        if (stopped) return;
        void runOnce('interval');
      }, options.intervalMs);
      // Don't keep the process alive solely because of this timer.
      timer.unref?.();
      options.logger.info(
        { intervalMs: options.intervalMs },
        'identity_sync_scheduler_started',
      );
    },

    async stop() {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },

    runNow() {
      return runOnce('manual');
    },

    lastResult() {
      return last;
    },
  };
}
