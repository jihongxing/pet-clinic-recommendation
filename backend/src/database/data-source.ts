import { existsSync } from 'fs';
import { resolve } from 'path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

const envCandidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const port = Number(process.env.DB_PORT ?? 5432);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number.isNaN(port) ? 5432 : port,
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres_password',
  database: process.env.DB_DATABASE ?? 'pet_clinic_recommendation',
  entities: [resolve(__dirname, 'entities/*{.ts,.js}')],
  migrations: [resolve(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
});
