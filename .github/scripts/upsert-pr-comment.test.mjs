import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { upsertPrComment } from './upsert-pr-comment.mjs';

const marker = '<!-- test-report -->';
const body = `${marker}\nReport contents`;

function reportContext(t, prNumber = 42) {
  const directory = mkdtempSync(join(tmpdir(), 'modern-charts-report-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const eventPath = join(directory, 'event.json');
  writeFileSync(eventPath, JSON.stringify({ pull_request: { number: prNumber } }));
  return {
    GITHUB_TOKEN: 'test-token',
    GITHUB_REPOSITORY: 'example/modern-charts',
    GITHUB_EVENT_PATH: eventPath
  };
}

test('updates only a matching Actions bot comment with a valid ID', async (t) => {
  const comments = [
    { id: 51, body, user: { login: 'contributor' } },
    { id: 'invalid', body, user: { login: 'github-actions[bot]' } },
    { id: 52, body: `Quoted report: ${body}`, user: { login: 'github-actions[bot]' } },
    { id: 53, body, user: { login: 'github-actions[bot]' } }
  ];
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) =>
    options.method ? new Response(null, { status: 200 }) : Response.json(comments)
  );

  await upsertPrComment(marker, body, reportContext(t));
  const calls = fetch.mock.calls.map(({ arguments: [url, options] }) =>
    [url.href, options.method ?? 'GET', options.redirect]
  );
  assert.deepEqual(calls, [
    ['https://api.github.com/repos/example/modern-charts/issues/42/comments?per_page=100', 'GET', 'error'],
    ['https://api.github.com/repos/example/modern-charts/issues/comments/53', 'PATCH', 'error']
  ]);
  assert.equal(fetch.mock.calls[1].arguments[1].body, JSON.stringify({ body }));
});

test('creates a report when there is no matching bot comment', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (_url, options) =>
    options.method ? new Response(null, { status: 201 }) : Response.json([])
  );

  await upsertPrComment(marker, body, reportContext(t));
  const [url, options] = fetch.mock.calls[1].arguments;
  assert.equal(url.href, 'https://api.github.com/repos/example/modern-charts/issues/42/comments');
  assert.equal(options.method, 'POST');
});

test('rejects invalid repository and pull request identifiers before making requests', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected GitHub request'));
  const invalidRepo = { ...reportContext(t), GITHUB_REPOSITORY: 'invalid repo' };

  await upsertPrComment(marker, body, invalidRepo);
  await upsertPrComment(marker, body, reportContext(t, 'invalid number'));
  assert.equal(fetch.mock.callCount(), 0);
});
