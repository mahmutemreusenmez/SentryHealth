import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const DEFAULT_ANONYMIZATION_KEY = 'default-secret-key';
const ANONYMIZATION_KEY = process.env.ANONYMIZATION_KEY || DEFAULT_ANONYMIZATION_KEY;

if (ANONYMIZATION_KEY === DEFAULT_ANONYMIZATION_KEY) {
  const message =
    '[SentryHealth] ANONYMIZATION_KEY tanımlanmamış; güvensiz varsayılan anahtar kullanılıyor. ' +
    'KVKK gereği üretim ortamında güçlü bir ANONYMIZATION_KEY tanımlayın.';
  if (NODE_ENV === 'production') {
    throw new Error(message);
  }
  console.warn(message);
}

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT || 3000),
  ANONYMIZATION_KEY,
};
