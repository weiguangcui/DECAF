import type { APIRoute } from 'astro';
import { getAllEvents } from '../lib/events';

function escape(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const GET: APIRoute = async ({ site }) => {
  const events = await getAllEvents();

  const origin = site?.href?.replace(/\/$/, '') || '';
  const base = (import.meta as any).env?.BASE_URL || '/';
  const basePath = base.endsWith('/') ? base.slice(0, -1) : base;

  const feedItems = events.map((ev) => {
    const title = ev.title || ev.dir;
    const guid = ev.dir;
    const link = `${origin}${basePath}/blog#${encodeURIComponent(ev.dir)}`;
    const pubDate = ev.date ? new Date(ev.date) : undefined;
    const description = ev.excerpt || '';

    return `
      <item>
        <title>${escape(title)}</title>
        <link>${escape(link)}</link>
        <guid isPermaLink="false">${escape(guid)}</guid>
        ${pubDate && !isNaN(pubDate.getTime()) ? `<pubDate>${pubDate.toUTCString()}</pubDate>` : ''}
        ${description ? `<description>${escape(description)}</description>` : ''}
      </item>
    `;
  }).join('\n');

  const feedTitle = 'DeCAF Events';
  const feedLink = `${origin}${basePath}/feed.xml`;
  const feedDesc = 'Updates when new events are published.';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(feedTitle)}</title>
    <link>${escape(feedLink)}</link>
    <description>${escape(feedDesc)}</description>
    ${feedItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
