import "dotenv/config";

export const config = {
  port: process.env.PORT || 8000,
  jwtSecret: process.env.JWT_SECRET || "your_secret_key",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
