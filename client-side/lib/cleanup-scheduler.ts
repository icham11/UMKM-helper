/**
 * Image Cleanup Scheduler
 * Runs cleanup every 5 minutes to delete expired images
 */

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the cleanup scheduler
 */
export function startCleanupScheduler() {
  if (cleanupInterval) {
    return;
  }

  // Run first cleanup after 30 seconds (let the server fully start)
  setTimeout(() => runCleanup(), 30_000);

  // Then run every 5 minutes
  cleanupInterval = setInterval(() => {
    runCleanup();
  }, 5 * 60 * 1000);

  console.log('Image cleanup scheduler started (runs every 5 minutes)');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Run cleanup with timeout and error handling
 */
async function runCleanup() {
  try {
    const cronSecret = process.env.CRON_SECRET || 'development-secret';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000); // 25s timeout

    const response = await fetch(`${baseUrl}/api/cleanup-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Cleanup] HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const result = await response.json();
    if (result.deleted > 0) {
      console.log(`[Cleanup] Deleted ${result.deleted} expired files`);
    }
  } catch (error) {
    // Silently ignore abort/network errors — they're expected during build or cold start
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Cleanup] Request timed out, will retry next cycle');
    } else {
      console.warn('[Cleanup] Skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Auto-start in Node.js environment
if (typeof window === 'undefined') {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_CLEANUP === 'true') {
    startCleanupScheduler();
  }
}

