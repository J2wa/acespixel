import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
process.env.PIXEL_DATA_DIR ||= process.env.PIXEL_PACKAGED_DATA;
process.env.PIXEL_CODEX_BIN = process.env.PIXEL_PACKAGED_CODEX;
process.env.HOST ||= '127.0.0.1';
process.env.PORT ||= '4317';
await import('../server/index.mjs');
