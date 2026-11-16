// The domain must stay portable (Edge Functions, client): no framework and no database.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = /^(@nestjs\/|@angular\/|mongoose|mongodb|express|rxjs)/;
const srcDir = __dirname;
const files = readdirSync(srcDir).filter(f => f.endsWith('.ts'));

describe('domain purity', () => {
  it.each(files)('%s imports no framework or database', file => {
    const source = readFileSync(join(srcDir, file), 'utf8');
    const imports = [
      ...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g),
    ].map(m => m[1]);
    expect(imports.filter(i => FORBIDDEN.test(i))).toEqual([]);
  });
});
