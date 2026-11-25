import { existsSync, readFileSync } from 'node:fs';

export async function upsertPrComment(marker, body, env = process.env) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_EVENT_PATH: eventPath } = env;
  if (!token || !repo || !eventPath || !existsSync(eventPath)) {
    console.log(body);
    return;
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const prNumber = event.pull_request?.number;
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) return;

  const match = /^([a-z\d-]+)\/([a-z\d_.-]+)$/i.exec(repo);
  if (!match || match[2] === '.' || match[2] === '..') return;

  const base = new URL(`/repos/${match[1]}/${match[2]}/`, 'https://api.github.com');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const commentsUrl = new URL(`issues/${prNumber}/comments`, base);
  const listUrl = new URL(commentsUrl);
  listUrl.searchParams.set('per_page', '100');
  const listed = await fetch(listUrl, { headers, redirect: 'error' });
  if (!listed.ok) throw new Error('Could not list pull request comments.');

  const comments = await listed.json();
  const existing = Array.isArray(comments)
    ? comments.find((comment) =>
        comment?.user?.login === 'github-actions[bot]' &&
        typeof comment.body === 'string' &&
        comment.body.startsWith(marker) &&
        Number.isSafeInteger(comment.id) &&
        comment.id > 0
      )
    : undefined;
  const endpoint = existing
    ? new URL(`issues/comments/${Number(existing.id)}`, base)
    : commentsUrl;
  const saved = await fetch(endpoint, {
    method: existing ? 'PATCH' : 'POST',
    headers,
    redirect: 'error',
    body: JSON.stringify({ body })
  });
  if (!saved.ok) throw new Error('Could not save the pull request comment.');
  console.log(existing ? 'Updated pull request report.' : 'Posted pull request report.');
}
