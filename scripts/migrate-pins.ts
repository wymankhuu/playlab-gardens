import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID!;

async function migrate() {
  console.log('Migrating pinned apps to new Collection Order system...');

  let cursor: string | undefined;
  let pinnedApps: { id: string; name: string; order: number }[] = [];

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: { property: 'Homepage', checkbox: { equals: true } },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      const props = (page as any).properties;
      const name = props['App Name']?.title?.map((t: any) => t.plain_text).join('') || 'Unknown';
      const order = props['Homepage Order']?.number ?? 999;
      pinnedApps.push({ id: page.id, name, order });
    }

    cursor = response.has_more ? response.next_cursor! : undefined;
  } while (cursor);

  console.log(`Found ${pinnedApps.length} pinned apps to migrate.`);

  for (const app of pinnedApps) {
    try {
      await notion.pages.update({
        page_id: app.id,
        properties: {
          'Collection Order': { number: app.order },
          'Homepage Hidden': { checkbox: false },
        },
      });
      console.log(`  ✓ ${app.name} → order ${app.order}`);
    } catch (err) {
      console.error(`  ✗ ${app.name}: ${err}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
