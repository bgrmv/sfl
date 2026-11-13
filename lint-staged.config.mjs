// Pre-commit (S11.7): only staged files, each package with its own ESLint config.
// Prettier and ESLint are installed in client/ and server-nest/, the root has none.
import { relative } from 'node:path';

const rel = f => relative(process.cwd(), f);
const quote = files => files.map(f => `'${f}'`).join(' ');
// lint-staged runs commands without a shell, and ESLint finds its config from the cwd
const inPackage = (dir, cmd) => `sh -c "cd ${dir} && ${cmd}"`;

// Not ours to format: skills, dumps and backups, certificates, generated files
const IGNORED = /^(\.claude|_dumps|_backups|ssl)\/|\.generated\.ts$|(^|\/)(dist|node_modules)\//;

const scoped = (dir, tool, args) => staged => {
  const files = staged.filter(f => !IGNORED.test(rel(f)) && rel(f).startsWith(`${dir}/`));
  return files.length ? [inPackage(dir, `./node_modules/.bin/${tool} ${args} ${quote(files)}`)] : [];
};

// The globs run in parallel. Server .ts files go through eslint-plugin-prettier,
// so Prettier skips them; client .ts files are fixed by ESLint, then formatted.
export default {
  'client/**/*.ts': files => [
    ...scoped('client', 'eslint', '--fix')(files),
    ...scoped('client', 'prettier', '--write')(files),
  ],
  'server-nest/**/*.ts': scoped('server-nest', 'eslint', '--fix'),
  '*.{html,scss,json,md}': staged => {
    const files = staged.filter(f => !IGNORED.test(rel(f)));
    return files.length ? [inPackage('client', `./node_modules/.bin/prettier --write ${quote(files)}`)] : [];
  },
};
