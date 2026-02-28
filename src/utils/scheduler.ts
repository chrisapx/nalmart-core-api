import { InventoryService } from '../services/inventory.service';
import logger from './logger';

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function startScheduler(): void {
  logger.info('⏰ Scheduler started — cart reservation cleanup every 15 minutes');

  // Run once immediately on startup to clear any leftovers
  InventoryService.releaseExpiredCartReservations().catch((err) =>
    logger.error('Scheduler: initial cleanup failed', err)
  );

  setInterval(async () => {
    try {
      await InventoryService.releaseExpiredCartReservations();
    } catch (err) {
      logger.error('Scheduler: cleanup error', err);
    }
  }, INTERVAL_MS);
}
