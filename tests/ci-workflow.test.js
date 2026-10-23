import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

test('CI uses the official digest-pinned image matching the Playwright package', () => {
  const image = workflow.match(/image:\s*mcr\.microsoft\.com\/playwright:v([^\s@]+)-noble@sha256:([a-f0-9]{64})/);
  assert.ok(image, 'Expected official version-and-digest pinned Playwright container');
  assert.equal(image[1], packageJson.devDependencies['@playwright/test'], 'Update container and npm Playwright versions together');
  const verify = workflow.split('  verify:')[1].split('  deploy:')[0];
  assert.match(verify, /options:\s*--init --ipc=host/);
  assert.doesNotMatch(workflow, /run:\s*.*(?:playwright install|apt-get)/, 'CI must use preinstalled browsers and OS dependencies');
});

test('container optimization preserves every verification and artifact deployment gate', () => {
  const verify = workflow.split('  verify:')[1].split('  deploy:')[0];
  for (const command of ['npm ci', 'npm audit --audit-level=moderate', 'npm test', 'npm run build', 'npm run test:e2e']) {
    assert.ok(verify.includes(`run: ${command}`), `Missing required gate: ${command}`);
  }
  assert.match(verify, /actions\/upload-pages-artifact@/);
  assert.ok(verify.indexOf('run: npm run test:e2e') < verify.indexOf('actions/upload-pages-artifact@'));
  const upload = verify.slice(verify.indexOf('actions/upload-pages-artifact@'));
  const deploy = workflow.split('  deploy:')[1];
  assert.match(upload, /if: github\.ref == 'refs\/heads\/main'/, 'Artifact upload must remain main-only');
  assert.match(upload, /path: dist/);
  assert.match(deploy, /needs: verify/);
  assert.match(deploy, /if: github\.ref == 'refs\/heads\/main'/, 'Deployment must independently remain main-only');
  assert.match(workflow, /contents: read/);
});
