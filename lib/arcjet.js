import arcjet, { tokenBucket } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // Track based on Clerk userId
  rules: [
    // Rate limiting specifically for collection creation
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // 10 collections
      interval: 3600, // per hour
      capacity: 10, // maximum burst capacity
    }),
  ],
});

// Separate, roomier bucket for AI chat — protects the Gemini quota without
// sharing limits with journal/collection/upload actions
export const ajChat = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 30, // 30 messages
      interval: 600, // per 10 minutes
      capacity: 30,
    }),
  ],
});

// Exports are expensive in a way nothing else here is: each one streams every
// photo in the space back out of R2, so a loop of them bills real egress. A
// handful a day is far more than anyone legitimately needs — you download your
// data when you're leaving, not repeatedly — while still never standing between
// someone and their own history.
export const ajExport = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // 5 exports
      interval: 3600, // per hour
      capacity: 5,
    }),
  ],
});

export default aj;
