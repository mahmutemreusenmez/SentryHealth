import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function requireSecret(name: string, minLength: number): string {
  const value = process.env[name];
  if (!value || value.trim().length < minLength) {
    throw new Error(
      `${name} must be set to a strong value (at least ${minLength} characters). ` +
        `Configure it in your environment or .env file.`,
    );
  }
  return value;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const env = {
  NODE_ENV,
  isProduction,
  PORT: Number(process.env.PORT || 3000),
  ANONYMIZATION_KEY: requireSecret('ANONYMIZATION_KEY', 16),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'yönetici',
  ADMIN_PASSWORD: requireSecret('ADMIN_PASSWORD', 8),
  ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME || 'Sistem Yöneticisi',
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS),
};
