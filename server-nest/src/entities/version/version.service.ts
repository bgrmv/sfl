import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * The version of the product (ADR 0022): `APP_VERSION` of the environment (an image has no
 * root package.json), otherwise the `version` of the root package.json above this file.
 */
@Injectable()
export class VersionService {
  readonly version = readVersion();
}

function readVersion(): string {
  const fromEnv = process.env.APP_VERSION;
  if (fromEnv) return fromEnv;

  for (let dir = __dirname; dirname(dir) !== dir; dir = dirname(dir)) {
    const file = join(dir, 'package.json');
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
      name?: string;
      version?: string;
    };
    if (pkg.name === 'sfl' && pkg.version && SEMVER.test(pkg.version)) {
      return pkg.version;
    }
  }
  return 'unknown';
}
