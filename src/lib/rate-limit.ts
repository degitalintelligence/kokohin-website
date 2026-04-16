type RateLimiterOptions = {
    windowSeconds: number;
    maxRequests: number;
    prefix: string;
};

type RateState = {
    count: number;
    resetAt: number;
};

type RateLimiter = {
    check(key: string): Promise<boolean>;
};

const buckets = new Map<string, RateState>();

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    const windowMs = options.windowSeconds * 1000;
    return {
        async check(key: string): Promise<boolean> {
            const now = Date.now();
            const bucketKey = `${options.prefix}:${key || 'anonymous'}`;
            const current = buckets.get(bucketKey);
            if (!current || current.resetAt <= now) {
                buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
                return true;
            }
            if (current.count >= options.maxRequests) {
                return false;
            }
            current.count += 1;
            buckets.set(bucketKey, current);
            return true;
        },
    };
}

