import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRateLimiter, rateLimitKey } from './shared/utils/rateLimit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite hasta maxPerWindow llamadas y luego bloquea', () => {
    const limiter = createRateLimiter(3);
    expect(limiter.check('u1')).toBe(true);
    expect(limiter.check('u1')).toBe(true);
    expect(limiter.check('u1')).toBe(true);
    expect(limiter.check('u1')).toBe(false);
  });

  it('las keys son independientes entre usuarios', () => {
    const limiter = createRateLimiter(1);
    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('b')).toBe(true);
    expect(limiter.check('a')).toBe(false);
  });

  it('rehabilita después de pasar la ventana', () => {
    const limiter = createRateLimiter(2);
    limiter.check('u1');
    limiter.check('u1');
    expect(limiter.check('u1')).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(limiter.check('u1')).toBe(true);
  });

  it('la ventana es deslizante: llamadas viejas expiran individualmente', () => {
    const limiter = createRateLimiter(2);
    limiter.check('u1');
    vi.advanceTimersByTime(30_000);
    limiter.check('u1');
    expect(limiter.check('u1')).toBe(false);
    vi.advanceTimersByTime(31_000);
    expect(limiter.check('u1')).toBe(true);
  });
});

describe('rateLimitKey', () => {
  it('deriva keys estables y distintas por prefijo/token', () => {
    expect(rateLimitKey('dt', 'abc')).toBe(rateLimitKey('dt', 'abc'));
    expect(rateLimitKey('dt', 'abc')).not.toBe(rateLimitKey('gem', 'abc'));
    expect(rateLimitKey('dt', 'abc')).not.toBe(rateLimitKey('dt', 'abd'));
    expect(rateLimitKey('dt', null)).toBe(rateLimitKey('dt', null));
  });

  it('no filtra el token crudo en la key', () => {
    const secret = 'token-super-secreto-123';
    expect(rateLimitKey('dt', secret)).not.toContain(secret);
  });
});
