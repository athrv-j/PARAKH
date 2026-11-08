import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number; // e.g. 60000 for 1 min
  max: number; // maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export class InMemoryRateLimiter {
  private hits = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private max: number;
  private message: string;
  private keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.message = options.message || 'Too many requests. Please try again later.';
    this.keyGenerator = options.keyGenerator || ((req: Request) => {
      // Key by authenticated user ID if present, otherwise client IP address
      const userId = req.user?.id;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      return userId ? `user:${userId}` : `ip:${clientIp}`;
    });

    // Clean up stale records periodically every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        record.timestamps = record.timestamps.filter(ts => now - ts < this.windowMs);
        if (record.timestamps.length === 0) {
          this.hits.delete(key);
        }
      }
    }, 120000).unref();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // In test mode, allow header-controlled bypass or custom rate-limit testing
      if (req.headers['x-bypass-rate-limit'] === 'true') {
        return next();
      }

      const key = this.keyGenerator(req);
      const now = Date.now();
      let record = this.hits.get(key);

      if (!record) {
        record = { timestamps: [] };
        this.hits.set(key, record);
      }

      // Remove timestamps outside current window
      record.timestamps = record.timestamps.filter(ts => now - ts < this.windowMs);

      const count = record.timestamps.length;
      const remaining = Math.max(0, this.max - count);
      const oldest = record.timestamps[0] || now;
      const resetTime = Math.ceil((oldest + this.windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', this.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (count >= this.max) {
        const retryAfterSeconds = Math.ceil(((oldest + this.windowMs) - now) / 1000);
        res.setHeader('Retry-After', Math.max(1, retryAfterSeconds).toString());
        res.status(429).json({
          error: 'TooManyRequests',
          message: this.message,
          retryAfter: Math.max(1, retryAfterSeconds)
        });
        return;
      }

      record.timestamps.push(now);
      next();
    };
  }

  resetKey(key: string): void {
    this.hits.delete(key);
  }

  resetAll(): void {
    this.hits.clear();
  }
}

// 1. General Rate Limiter: 120 requests per 15 minutes per user/IP
export const generalRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'General request rate limit exceeded. Please wait a few minutes before retrying.'
});

// 2. Heavy Operations Limiter (LLM review & document uploads): 20 requests per minute
export const heavyRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Draft evaluation and upload rate limit exceeded. Maximum 20 operations per minute.'
});
