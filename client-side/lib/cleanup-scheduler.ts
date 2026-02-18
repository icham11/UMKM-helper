/**
 * Image Cleanup Scheduler
 * Runs cleanup every minute to delete expired images
 */

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the cleanup scheduler
 * Runs every minute to check for expired images
 */
export function startCleanupScheduler() {
  if (cleanupInterval) {
    console.log('Cleanup scheduler already running');
    return;
  }

  console.log('Starting image cleanup scheduler...');

  // Run immediately on start
  runCleanup();

  // Then run every minute
  cleanupInterval = setInterval(() => {
    runCleanup();
  }, 60 * 1000); // Every 1 minute

  console.log('Image cleanup scheduler started (runs every 1 minute)');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Image cleanup scheduler stopped');
  }
}

/**
 * Run cleanup manually
 */
async function runCleanup() {
  try {
    const cronSecret = process.env.CRON_SECRET || 'development-secret';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/cleanup-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cleanup failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.deleted > 0) {
      console.log(`[Cleanup] Deleted ${result.deleted} expired files`);
    }
  } catch (error) {
    console.error('[Cleanup] Error:', error);
  }
}

// Auto-start in Node.js environment
if (typeof window === 'undefined') {
  // Only start in production or if explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AUTO_CLEANUP === 'true') {
    startCleanupScheduler();
  }
}

