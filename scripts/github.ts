const API = process.env.GITHUB_API_URL ?? 'https://api.github.com';

export async function gh<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

interface Comment { id: number; body?: string }

/** Updates the comment carrying `marker`, or creates it. Re-runs therefore never add a second comment. */
export async function upsertComment(repo: string, prNumber: number, marker: string, body: string): Promise<void> {
  const base = `/repos/${repo}/issues`;

  // Walk every page so the marker is found even on long threads.
  let existing: Comment | undefined;
  for (let page = 1; !existing; page++) {
    const comments = await gh<Comment[]>('GET', `${base}/${prNumber}/comments?per_page=100&page=${page}`);
    existing = comments.find((c) => c.body?.includes(marker));
    if (comments.length < 100) break;
  }

  if (existing) {
    await gh('PATCH', `${base}/comments/${existing.id}`, { body });
    console.log(`Updated comment ${existing.id}`);
  } else {
    await gh('POST', `${base}/${prNumber}/comments`, { body });
    console.log('Created comment');
  }
}

export const STATUS_CONTEXT = 'Applitools Eyes';

export async function setCommitStatus(
  repo: string,
  sha: string,
  status: { state: 'success' | 'failure'; description: string; targetUrl: string },
): Promise<void> {
  await gh('POST', `/repos/${repo}/statuses/${sha}`, {
    state: status.state,
    description: status.description,
    context: STATUS_CONTEXT,
    target_url: status.targetUrl,
  });
  console.log(`Set status ${status.state} on ${sha.slice(0, 7)}`);
}
