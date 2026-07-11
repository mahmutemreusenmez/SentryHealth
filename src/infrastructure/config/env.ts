import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  ANONYMIZATION_KEY: process.env.ANONYMIZATION_KEY || 'default-secret-key',
};
