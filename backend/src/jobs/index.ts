import { getLogger } from '../utils/logger.js';
import {
  startPriceAggregatorJob,
  stopPriceAggregatorJob,
  isPriceAggregatorJobRunning,
} from './priceAggregator.job.js';

/**
 * Start all background jobs
 */
export function startAllJobs(): void {
  const logger = getLogger();
  logger.info('Starting background jobs...');

  startPriceAggregatorJob();

  logger.info('All background jobs started');
}

/**
 * Stop all background jobs
 */
export function stopAllJobs(): void {
  const logger = getLogger();
  logger.info('Stopping background jobs...');

  stopPriceAggregatorJob();

  logger.info('All background jobs stopped');
}

/**
 * Get status of all background jobs
 */
export function getJobsStatus(): Record<string, boolean> {
  return {
    priceAggregator: isPriceAggregatorJobRunning(),
  };
}

// Re-export individual job functions for granular control
export {
  startPriceAggregatorJob,
  stopPriceAggregatorJob,
  isPriceAggregatorJobRunning,
} from './priceAggregator.job.js';
