const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

// Color cycle for collection icons
const ICON_COLORS = ['#FF98E0', '#FE6A2E', '#00983F', '#A5E0F9', '#3656EA', '#FFF46C'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all child blocks under the parent page
    const blocks = [];
    let cursor;
    do {
      const response = await notion.blocks.children.list({
        block_id: PARENT_PAGE_ID,
        start_cursor: cursor,
        page_size: 100,
      });
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const childPages = blocks.filter(b => b.type === 'child_page');

    // Fetch page details + first-level blocks for each collection (for description + app count)
    const collections = await Promise.all(
      childPages.map(async (block, index) => {
        try {
          const page = await notion.pages.retrieve({ page_id: block.id });
          const name = block.child_page.title;
          const type = inferType(name);

          // Fetch the collection's blocks to get description and count apps
          const childBlocks = [];
          let childCursor;
          do {
            const res = await notion.blocks.children.list({
              block_id: block.id,
              start_cursor: childCursor,
              page_size: 100,
            });
            childBlocks.push(...res.results);
            childCursor = res.has_more ? res.next_cursor : undefined;
          } while (childCursor);

          // First paragraph = description
          const firstParagraph = childBlocks.find(b => b.type === 'paragraph');
          const description = firstParagraph
            ? (firstParagraph.paragraph.rich_text || []).map(s => s.plain_text).join('')
            : '';

          // Count bulleted list items as apps
          const appCount = childBlocks.filter(
            b => b.type === 'bulleted_list_item' || b.type === 'numbered_list_item'
          ).length;

          return {
            id: block.id.replace(/-/g, ''),
            name,
            description,
            type,
            iconColor: ICON_COLORS[index % ICON_COLORS.length],
            iconEmoji: getPageEmoji(page),
            appCount,
          };
        } catch (err) {
          console.error(`Error fetching page ${block.id}:`, err.message);
          return null;
        }
      })
    );

    res.status(200).json(collections.filter(Boolean));
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

function getPageEmoji(page) {
  if (page.icon?.type === 'emoji') return page.icon.emoji;
  return null;
}

function inferType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('showcase') || lower.includes('district') || lower.includes('ciob') || lower.includes('kipp') || lower.includes('leading educators') || lower.includes('amplify')) {
    return 'org';
  }
  return 'topic';
}
