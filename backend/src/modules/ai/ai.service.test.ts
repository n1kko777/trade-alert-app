import { describe, it, expect } from 'vitest';
import { AI_RATE_LIMITS } from './ai.service.js';

/**
 * AI Service Unit Tests
 *
 * Note: The AI service is primarily tested through the controller integration tests
 * in ai.controller.test.ts which provide better coverage of the full request flow.
 *
 * This file contains only unit tests for exported constants and types.
 */
describe('AI Service', () => {
  describe('AI_RATE_LIMITS', () => {
    it('should have correct limits for pro tier', () => {
      expect(AI_RATE_LIMITS.pro).toBe(10);
    });

    it('should have correct limits for premium tier', () => {
      expect(AI_RATE_LIMITS.premium).toBe(50);
    });

    it('should have correct limits for vip tier', () => {
      expect(AI_RATE_LIMITS.vip).toBe(100);
    });

    it('should have increasing limits for higher tiers', () => {
      expect(AI_RATE_LIMITS.pro).toBeLessThan(AI_RATE_LIMITS.premium);
      expect(AI_RATE_LIMITS.premium).toBeLessThan(AI_RATE_LIMITS.vip);
    });
  });
});
