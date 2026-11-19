// Lightweight in-memory rate limiter with auto-cleanup
const rateLimit = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100,                  // max requests per windowMs
  message = "Too many requests from this IP, please try again later."
} = {}) => {
  const requests = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  if (timer.unref) {
    timer.unref();
  }

  return (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    const record = requests.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    requests.set(ip, record);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));

    if (record.count > max) {
      return res.status(429).json({ message });
    }

    next();
  };
};

module.exports = rateLimit;

