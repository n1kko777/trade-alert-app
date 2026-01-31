import { getLogger } from '../utils/logger.js';
import {
  startPriceAggregatorJob,
  stopPriceAggregatorJob,
  isPriceAggregatorJobRunning,
} from './priceAggregator.job.js';
import {
  startPumpScannerJob,
  stopPumpScannerJob,
  isPumpScannerJobRunning,
} from './pumpScanner.job.js';
import {
  startSignalCheckerJob,
  stopSignalCheckerJob,
  isSignalCheckerJobRunning,
} from './signalChecker.job.js';

/**
 * Start all background jobs
 */
export function startAllJobs(): void {
  const logger = getLogger();
  logger.info('Starting background jobs...');

  startPriceAggregatorJob();
  startPumpScannerJob();
  startSignalCheckerJob();

  logger.info('All background jobs started');
}

/**
 * Stop all background jobs
 */
export function stopAllJobs(): void {
  const logger = getLogger();
  logger.info('Stopping background jobs...');

  stopPriceAggregatorJob();
  stopPumpScannerJob();
  stopSignalCheckerJob();

  logger.info('All background jobs stopped');
}

/**
 * Get status of all background jobs
 */
export function getJobsStatus(): Record<string, boolean> {
  return {
    priceAggregator: isPriceAggregatorJobRunning(),
    pumpScanner: isPumpScannerJobRunning(),
    signalChecker: isSignalCheckerJobRunning(),
  };
}

// Re-export individual job functions for granular control
export {
  startPriceAggregatorJob,
  stopPriceAggregatorJob,
  isPriceAggregatorJobRunning,
} from './priceAggregator.job.js';

export {
  startPumpScannerJob,
  stopPumpScannerJob,
  isPumpScannerJobRunning,
} from './pumpScanner.job.js';

export {
  startSignalCheckerJob,
  stopSignalCheckerJob,
  isSignalCheckerJobRunning,
} from './signalChecker.job.js';
