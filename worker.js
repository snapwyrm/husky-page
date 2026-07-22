// husky-page worker: serves the static site from ./public and one same-origin
// API route. This project is a Workers-assets deployment (not classic Pages),
// so the API lives here instead of a functions/ directory.
//
// GET /api/contributions
//   Proxies the GitHub GraphQL contribution calendar for the site owner using
//   the GITHUB_TOKEN secret. Owner token means private-repo activity is
//   included as aggregated day-counts. No repo names, no code, nothing
//   sensitive passes through. Edge-cached ~6h.

const QUERY = `{
  viewer {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

function streaks(days) {
  // days ascending. The current streak tolerates today being 0 so a streak
  // does not look broken before the day's first commit.
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i < days.length - 1) break;
  }
  return { current, longest };
}

function json(obj, status, cacheControl) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': cacheControl || 'no-store' },
  });
}

async function contributions(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/contributions', request.url), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  // Errors are cached briefly too: without negative caching, a GitHub outage
  // amplifies one upstream request per visitor with the owner's token.
  const fail = (obj, status) => {
    const res = json(obj, status, 'public, s-maxage=120');
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  };

  if (!env.GITHUB_TOKEN) return fail({ error: 'unconfigured' }, 503);

  let gh, data;
  try {
    gh = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: 'bearer ' + env.GITHUB_TOKEN,
        'content-type': 'application/json',
        'user-agent': 'husky-page (husky.snapwyrm.com)',
      },
      body: JSON.stringify({ query: QUERY }),
    });
    if (!gh.ok) return fail({ error: 'upstream', status: gh.status }, 502);
    data = await gh.json();
  } catch (e) {
    // network-level failure or truncated body: keep the JSON error contract
    return fail({ error: 'network' }, 502);
  }
  const cal = data?.data?.viewer?.contributionsCollection?.contributionCalendar;
  if (!cal) return fail({ error: 'shape' }, 502);

  const flat = cal.weeks.flatMap((w) => w.contributionDays);
  const days = {};
  for (const d of flat) if (d.contributionCount > 0) days[d.date] = d.contributionCount;
  const s = streaks(flat.map((d) => ({ date: d.date, count: d.contributionCount })));

  const res = json({
    asOf: flat.length ? flat[flat.length - 1].date : new Date().toISOString().slice(0, 10),
    total: cal.totalContributions,
    currentStreak: s.current,
    longestStreak: s.longest,
    days,
  }, 200, 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contributions') {
      if (request.method !== 'GET') return new Response('method not allowed', { status: 405 });
      return contributions(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/')) return new Response('not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
