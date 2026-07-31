#!/usr/bin/env node
/**
 * <meta name="nq-sha"> をデプロイ時に埋める（Nortiq Revise 設計 9.3）
 *
 * 修正依頼が「どのビルドに対して出されたか」を記録するために使う。
 * ウィジェットがこの meta を読み、依頼に site_sha として添える。
 *
 * このサイトはビルド工程が無いので、リポジトリには meta を置かず、
 * デプロイのたびにここで実際の SHA を入れる。
 * （リポジトリに埋め込むと、埋めた時点で SHA が変わってしまう）
 *
 *   GitHub Pages : Actions のステップで GITHUB_SHA が入る
 *   Vercel       : Build Command に指定すると VERCEL_GIT_COMMIT_SHA が入る
 *
 * SHA が取れない環境では何もしない（手元で開いても壊れない）。
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const sha =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.NQ_SHA || '';

if (!sha) {
  console.log('  nq-sha: SHA が取れないので何もしません');
  process.exit(0);
}

const SKIP = new Set(['node_modules', '.git', '.github', 'assets', '.vercel']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) files.push(p);
  }
})('.');

let touched = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let out;

  if (/<meta\s+name=["']nq-sha["'][^>]*>/i.test(src)) {
    out = src.replace(
      /<meta\s+name=["']nq-sha["'][^>]*>/i,
      `<meta name="nq-sha" content="${sha}" />`,
    );
  } else if (/<head[^>]*>/i.test(src)) {
    out = src.replace(/(<head[^>]*>)/i, `$1\n    <meta name="nq-sha" content="${sha}" />`);
  } else {
    continue;
  }

  if (out !== src) {
    writeFileSync(file, out, 'utf8');
    touched++;
  }
}

console.log(`  nq-sha: ${sha.slice(0, 7)} を ${touched} ファイルに埋めました`);
