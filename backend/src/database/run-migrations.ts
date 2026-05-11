import dataSource from './data-source';

async function runMigrations() {
  console.log('[migrations] initializing data source');
  await dataSource.initialize();

  try {
    const migrations = await dataSource.runMigrations();
    console.log(
      `[migrations] completed, applied ${migrations.length} migration(s)`,
    );
  } finally {
    await dataSource.destroy();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('[migrations] failed', error);
  process.exit(1);
});
