// `pnpm release <major|minor|patch> [--no-git] [--dry-run]` (ADR 0022).
// Raises the `version` of the root package.json, turns docs/releases/NEXT.md (the draft
// of the next release) into docs/releases/X.Y.Z.md, commits and tags vX.Y.Z.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const KINDS = ['major', 'minor', 'patch'];

export const NEXT_TEMPLATE = `---
title:
---

<!-- Kind: New | Improved | Fixed. Area: Statistics | Admin | Players | Community | Design | Access. -->
- **New** (Area) What changed for a player or an administrator. [S0.0](../backlog/README.md)
`;

export function bumpVersion(version, kind) {
  if (!KINDS.includes(kind)) {
    throw new Error(
      `kind "${kind}" is unknown, expected major, minor or patch`,
    );
  }
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`version "${version}" is not X.Y.Z`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function setPackageVersion(text, version) {
  const pattern = /^(\s{2}"version":\s*")[^"]*(")/m;
  if (!pattern.test(text))
    throw new Error('package.json has no top-level "version"');
  return text.replace(pattern, `$1${version}$2`);
}

export function planRelease({ current, kind, now, next, exists }) {
  const version = bumpVersion(current, kind);
  const file = `docs/releases/${version}.md`;
  if (exists(file)) throw new Error(`${file} already exists`);

  const draft = next ?? NEXT_TEMPLATE;
  const parts = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(draft);
  if (!parts) throw new Error('the draft has no front matter (--- title ---)');
  const title = /^title:[ \t]*(.*)$/m.exec(parts[1])?.[1].trim();
  if (next !== undefined && !title) {
    throw new Error(
      'the draft has an empty title: fill in "title:" in docs/releases/NEXT.md',
    );
  }

  if (next !== undefined && !/^- /m.test(parts[2])) {
    throw new Error(
      'the draft has no changes: add lines "- **New** (Area) ..." to docs/releases/NEXT.md',
    );
  }

  const date = now.toISOString().slice(0, 10);
  const content = `---\nversion: ${version}\ndate: ${date}\ntitle: ${title ?? ''}\n---\n${parts[2]}`;
  return {
    version,
    file,
    tag: `v${version}`,
    commitMessage: `chore(release): ${version}`,
    content,
  };
}

function main(argv) {
  const [kind, ...flags] = argv;
  const dryRun = flags.includes('--dry-run');
  const noGit = flags.includes('--no-git');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const at = path => `${root}${path}`;
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

  const packageText = readFileSync(at('package.json'), 'utf8');
  const current = JSON.parse(packageText).version;
  const nextPath = 'docs/releases/NEXT.md';
  const next = existsSync(at(nextPath))
    ? readFileSync(at(nextPath), 'utf8')
    : undefined;

  const plan = planRelease({
    current,
    kind,
    now: new Date(),
    next,
    exists: p => existsSync(at(p)),
  });
  console.log(`${current} -> ${plan.version} (${plan.file})`);
  if (dryRun) {
    console.log('dry run: nothing written');
    return;
  }
  if (!noGit) {
    if (git('status', '--porcelain'))
      throw new Error('the working tree is not clean: commit or stash first');
    if (git('tag', '--list', plan.tag))
      throw new Error(`tag ${plan.tag} already exists`);
  }

  writeFileSync(
    at('package.json'),
    setPackageVersion(packageText, plan.version),
  );
  writeFileSync(at(plan.file), plan.content);
  if (next !== undefined) rmSync(at(nextPath));

  if (noGit) {
    console.log('written without git: review, commit and tag yourself');
    return;
  }
  git(
    'add',
    'package.json',
    plan.file,
    ...(next === undefined ? [] : [nextPath]),
  );
  git('commit', '-m', plan.commitMessage);
  git('tag', '-a', plan.tag, '-m', `Release ${plan.version}`);
  console.log(
    `committed and tagged ${plan.tag}; push with: git push --follow-tags`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`release: ${error.message}`);
    process.exit(1);
  }
}
