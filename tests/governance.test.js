import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const definitions = JSON.parse(readFileSync(new URL('../.github/rulesets.json', import.meta.url)));
const owners = readFileSync(new URL('../.github/CODEOWNERS', import.meta.url), 'utf8');

test('main PR and GitHub Actions CI requirements have no bypass actors', () => {
  const gate = definitions.find(set => set.rules.some(rule => rule.type === 'required_status_checks'));
  assert.equal(gate.enforcement, 'active');
  assert.deepEqual(gate.conditions.ref_name, { include: ['refs/heads/main'], exclude: [] });
  assert.deepEqual(gate.bypass_actors, []);
  assert.ok(gate.rules.some(rule => rule.type === 'pull_request'));
  assert.ok(gate.rules.some(rule => rule.type === 'deletion'));
  assert.ok(gate.rules.some(rule => rule.type === 'non_fast_forward'));
  const checks = gate.rules.find(rule => rule.type === 'required_status_checks').parameters;
  assert.equal(checks.strict_required_status_checks_policy, true);
  assert.deepEqual(checks.required_status_checks, [{ context: 'verify', integration_id: 15368 }]);
});

test('only j8d can bypass restricted main updates, only by PR; owner review remains default', () => {
  const owner = definitions.find(set => set.rules.some(rule => rule.type === 'update'));
  assert.deepEqual(owner.bypass_actors, [{ actor_id: 4845675, actor_type: 'User', bypass_mode: 'pull_request' }]);
  assert.equal(owner.enforcement, 'active');
  assert.deepEqual(owner.conditions.ref_name, { include: ['refs/heads/main'], exclude: [] });
  const review = owner.rules.find(rule => rule.type === 'pull_request').parameters;
  assert.equal(review.required_approving_review_count, 1);
  assert.equal(review.require_code_owner_review, true);
  assert.equal(review.dismiss_stale_reviews_on_push, true);
  assert.deepEqual(owners.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#')), ['* @j8d']);
});
