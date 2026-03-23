/**
 * Export collection data from the "Showcase Apps Master" Notion database.
 * Groups apps by their "Collection" multi_select column.
 * Run locally: node scripts/export-notion.js
 * Requires .env with NOTION_API_KEY and NOTION_MASTER_DB_ID.
 */

try { require('dotenv/config'); } catch {}
const { Client } = require('@notionhq/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID;
if (!DATABASE_ID) { console.error('NOTION_MASTER_DB_ID is required in .env'); process.exit(1); }

// Collection descriptions — baked into the exported JSON for SEO and sharing
const COLLECTION_DESCRIPTIONS = {
  'AI Assistants': 'Educators are reimagining what a teaching assistant can be. These AI-powered tools handle everything from lesson scaffolding to real-time student support — each one reflecting a different vision of how intelligence can serve the classroom.',
  'Amplify': 'Amplify educators have taken their deep curriculum knowledge and built something new with it. These apps extend and personalize the Amplify experience in ways only the people closest to the work could imagine.',
  'Arts & Design': 'Where creativity meets craft. Educators and students have built tools that open up visual arts, design thinking, and creative expression — proving that art education thrives when learners can shape their own tools.',
  'Assessment & Feedback': 'The community has built dozens of different approaches to understanding what students know. From quick formative checks to deep rubric-based feedback, each tool reflects a different classroom reality and a different philosophy of assessment.',
  'Business / Economics': 'Financial literacy, entrepreneurship, economic reasoning — educators across contexts have built tools that bring the complexity of the business world into classrooms in accessible, student-centered ways.',
  'CA Community Colleges': 'California\'s community college educators are building for a student population unlike any other — working adults, first-generation learners, career changers. These apps reflect that diversity and the creativity it demands.',
  'CIOB': 'CIOB district educators have channeled their knowledge of their communities into tools that serve their specific students. What started as individual experiments has become a growing library of locally-rooted innovation.',
  'Career & Vocational': 'From resume builders to industry simulations, educators are helping students see a future beyond the classroom. These tools connect academic learning to real-world career paths in ways that feel personal and practical.',
  'Creative & Engagement': 'Some of the most inventive work in the community lives here. These apps use storytelling, play, and surprise to pull students in — reminding us that engagement isn\'t a trick, it\'s a design challenge.',
  'Cultural Studies': 'Educators have built tools that honor the richness of human culture — from indigenous traditions to diaspora histories. Each app opens a window into a different community\'s story, told with care and nuance.',
  'Data-Driven Instruction': 'What happens when teachers can see patterns in student learning in real time? These tools turn data into something actionable, helping educators adjust their practice with clarity rather than guesswork.',
  'Differentiation & Access': 'Every learner arrives differently. These apps are built by educators who know that firsthand — tools that flex, adapt, and meet students where they actually are, not where a pacing guide says they should be.',
  'ELA / Literacy': 'Reading and writing look different in every classroom. This collection captures that range — from phonics coaches to literary analysis partners, each app shaped by an educator\'s unique understanding of how literacy grows.',
  'ELL / ESL': 'Language learning is deeply personal work. These tools were built by educators who understand the particular challenges and joys of supporting multilingual students — bridging languages, cultures, and confidence.',
  'Elementary': 'Teaching young learners requires a special kind of imagination. These apps are playful, patient, and purposeful — built by educators who understand that the early years set the foundation for everything that follows.',
  'Fairfax': 'More than 1,100 Fairfax County Public Schools students from 25 high schools designed AI-powered solutions to real-world problems as part of the Seize the Moment Student AI Innovation Challenge — shaping the future of their communities one app at a time.',
  'Family & Community': 'Learning doesn\'t stop at the school door. These tools help families participate in their children\'s education — bridging the gap between home and classroom with warmth and practical support.',
  'Flowers': 'See how individuals across the Playlab community are building to reflect their unique contexts, roles, and goals. Each app here tells a different story — a teacher solving a problem no one else saw, a student reimagining how learning could work, a coach finding new ways to support their team.',
  'Gamified Learning': 'Points, quests, narratives, challenges — educators have found countless ways to make learning feel like play. These apps prove that rigor and fun aren\'t opposites; they\'re collaborators.',
  'Ghana': 'Ghana\'s educator community has embraced app-building with remarkable energy. From curriculum-aligned subject tools to creative student projects, these apps represent one of the most vibrant collections on the platform.',
  'Health & PE': 'Bodies, minds, nutrition, movement — health education covers enormous ground. These apps reflect educators who see wellness holistically, building tools that meet students in the fullness of who they are.',
  'High School': 'High school students are ready for complexity. These tools rise to that — offering sophisticated support for advanced coursework, college prep, and the social-emotional challenges of adolescence.',
  'Higher Ed': 'College and university educators are building for a different kind of learner — self-directed, time-pressed, and hungry for depth. These apps bring AI into higher education with the rigor the context demands.',
  'Illustrative Mathematics': 'IM educators know their curriculum inside and out. These apps extend that expertise into new territory — interactive practice, lesson internalization, and student support that stays true to the IM philosophy.',
  'KIPP': 'KIPP educators build with urgency and heart. These apps carry that energy — tools designed for specific schools, specific grade levels, and the specific belief that every student deserves an excellent education.',
  'Leading Educators': 'The Leading Educators community brings a coaching lens to everything they build. These apps support not just students but the professional growth of the educators who serve them.',
  'Lesson Planning': 'Behind every great lesson is a plan. These tools help educators think through sequence, differentiation, and timing — turning the invisible work of preparation into something more structured and shareable.',
  'Math': 'Math education is a space of enormous creativity right now. From visual models to AI tutors to curriculum-aligned practice, this collection captures the community\'s many approaches to helping students think mathematically.',
  'Middle School': 'Middle schoolers are figuring out who they are. These tools meet that energy — engaging, age-appropriate, and built by educators who understand the unique developmental moment of early adolescence.',
  'Music & Performing Arts': 'Music theory, performance practice, creative composition — educators in the arts are proving that AI tools can enhance rather than replace the deeply human experience of making music and art together.',
  'NYC': 'New York City\'s educators bring the energy and diversity of the city into everything they build. These apps reflect classrooms where dozens of languages, cultures, and perspectives converge every day.',
  'Niche & Emerging': 'The edges are where innovation happens. These apps explore topics that don\'t fit neatly into traditional categories — unusual subjects, experimental formats, and ideas that might define tomorrow\'s classrooms.',
  'Operations and Management': 'The work that keeps schools running rarely gets the spotlight. These tools tackle scheduling, communications, HR, and the thousand small decisions that shape whether a school day runs smoothly — built by the people who live that complexity every day.',
  'Professional Development': 'Educators building tools for other educators. These apps support coaching, reflection, and growth — the kind of professional learning that actually changes practice, not just checks a compliance box.',
  'Project-Based Learning': 'PBL demands a different kind of tool — one that supports open-ended inquiry, student agency, and real-world connection. These apps help educators and students design projects that matter.',
  'Reading Intervention': 'When a student struggles to read, the stakes are high. These tools are built by educators who feel that urgency — targeted, evidence-informed approaches to helping every student become a reader.',
  'Religious Studies': 'Faith, ethics, scripture, and theology — educators in religious communities have built tools that honor the depth and sensitivity of spiritual education while embracing what technology makes newly possible.',
  'SEL / Wellbeing': 'Social-emotional learning isn\'t a curriculum add-on; it\'s the foundation. These tools help students develop self-awareness, empathy, and resilience — built by educators who know that wellbeing comes first.',
  'School Leadership': 'Principals, coaches, and district leaders are building too. These tools tackle the operational and strategic challenges of running schools — from observation protocols to data dashboards to communication aids.',
  'Science / STEM': 'From biology to physics to engineering design, STEM educators are building tools that make abstract concepts tangible. The range here is extraordinary — reflecting the breadth of scientific curiosity itself.',
  'Social Studies / History': 'History is never just one story. These apps help students engage with primary sources, multiple perspectives, and the messy complexity of how societies work — past and present.',
  'Special Education': 'Every IEP tells a different story. These tools are built by educators who write those stories every day — apps that flex to meet individual needs with patience, precision, and genuine care.',
  'Student-Built Apps': 'When students become builders, something shifts. These apps were created by learners themselves — proof that the best way to understand technology is to make something meaningful with it.',
  'Study Partners': 'Late nights, tough concepts, upcoming exams — these AI companions meet students in their moments of need. Each one offers a slightly different approach to the ancient art of studying together.',
  'Teacher Tools': 'The largest collection in the garden, and for good reason. Educators are prolific builders when given the right tools. From admin shortcuts to pedagogical experiments, this is where teacher ingenuity lives.',
  'Texas': 'Everything\'s bigger in Texas, including the ambition of its educators. These apps span subjects, grade levels, and contexts — a snapshot of one state\'s growing community of builder-teachers.',
  'Tutoring & Practice': 'Practice makes permanent, not perfect — and these tools know the difference. Each one offers patient, adaptive support that meets students where they are and helps them build fluency through repetition that feels purposeful rather than punishing.',
  'World Languages': 'Language connects us. These apps help students learn Spanish, French, Mandarin, Arabic, and more — each one reflecting a different pedagogical tradition and a shared belief in the power of multilingualism.',
  'Writing Coaches': 'Writing is thinking made visible. These AI coaches help students at every stage of the writing process — brainstorming, drafting, revising — while preserving the student\'s own voice and ideas.',
};

// Colors drawn from the Playlab Gardens illustrations
const ICON_COLORS = [
  '#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A',
  '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D',
];

async function main() {
  console.log('Querying Showcase Apps Master database...');

  // 1. Fetch all rows from the database
  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`Fetched ${rows.length} apps from database.\n`);

  // 2. Parse each row into an app object and group by collection
  const collectionMap = {}; // collectionName → { apps: [], featured: false }

  for (const row of rows) {
    const props = row.properties;
    const app = parseRow(props);
    if (!app) continue;

    // Get collection tags
    const collections = (props['Collection']?.multi_select || []).map(s => s.name);
    if (collections.length === 0) continue;

    // Store collection tags on the app
    app.tags = collections;

    // Check featured flag
    const isFeatured = props['Featured']?.select?.name === 'Featured';

    for (const colName of collections) {
      if (!collectionMap[colName]) {
        collectionMap[colName] = { apps: [], hasFeatured: false };
      }
      // Clone app so each collection gets its own copy
      collectionMap[colName].apps.push({ ...app });
      if (isFeatured) collectionMap[colName].hasFeatured = true;
    }
  }

  // 3. Build collections array
  const collectionNames = Object.keys(collectionMap).sort();
  console.log(`Found ${collectionNames.length} collections:\n`);

  const collections = collectionNames.map((name, index) => {
    let { apps } = collectionMap[name];

    // Deduplicate by app ID and name, keeping the entry with the longest content
    const appByKey = {};
    for (const app of apps) {
      const key = app.id || app.name.toLowerCase().trim();
      const existing = appByKey[key];
      if (!existing) {
        appByKey[key] = app;
      } else {
        const existingLen = (existing.description || '').length + (existing.usage || '').length + (existing.impact || '').length;
        const newLen = (app.description || '').length + (app.usage || '').length + (app.impact || '').length;
        if (newLen > existingLen) {
          appByKey[key] = app;
        }
      }
    }
    // Also dedup by name (different IDs, same app)
    const appByName = {};
    for (const app of Object.values(appByKey)) {
      const nameKey = app.name.toLowerCase().trim();
      const existing = appByName[nameKey];
      if (!existing) {
        appByName[nameKey] = app;
      } else {
        const existingLen = (existing.description || '').length + (existing.usage || '').length + (existing.impact || '').length;
        const newLen = (app.description || '').length + (app.usage || '').length + (app.impact || '').length;
        if (newLen > existingLen) {
          appByName[nameKey] = app;
        }
      }
    }
    apps = Object.values(appByName);

    // Sort apps by sessions descending
    apps.sort((a, b) => (b.sessions || 0) - (a.sessions || 0));

    const col = {
      id: generateCollectionId(name),
      name,
      description: COLLECTION_DESCRIPTIONS[name] || '',
      type: inferType(name),
      iconColor: ICON_COLORS[index % ICON_COLORS.length],
      iconEmoji: null,
      appCount: apps.length,
      apps,
    };

    console.log(`  ${name}: ${apps.length} apps (${col.type})`);
    return col;
  });

  // 4. Export Seeds (before writing collections, so we can merge)
  const seedCollections = await exportSeeds();

  // 5. Merge seed collections into main collections
  if (seedCollections && seedCollections.length > 0) {
    for (const sc of seedCollections) {
      // Convert seed apps to collection app format
      const apps = sc.apps.map(s => ({
        id: s.name.toLowerCase().replace(/\s+/g, '-'),
        name: s.name,
        url: s.remixUrl || '',
        creator: s.creator || '🌱 Seed App',
        role: '',
        description: s.description,
        usage: '',
        impact: '',
        sessions: 0,
        iterations: 0,
        tags: s.tags || [],
      }));
      collections.push({
        id: sc.id,
        name: sc.name,
        description: sc.description || '',
        type: 'seed',
        iconColor: sc.color,
        iconEmoji: '🌱',
        appCount: apps.length,
        apps,
        previewApps: apps.slice(0, 6),
      });
    }
  }

  // 6. Write to data/collections.json
  const outPath = path.join(__dirname, '..', 'data', 'collections.json');
  fs.writeFileSync(outPath, JSON.stringify(collections, null, 2));

  const totalApps = collections.reduce((sum, c) => sum + c.apps.length, 0);
  console.log(`\nExported ${collections.length} collections (${totalApps} app entries) to ${outPath}`);

  // 7. Export Cultivators
  await exportCultivators();

  // 8. Regenerate sitemap from updated collections data
  console.log('\nRegenerating sitemap...');
  execSync('node ' + path.join(__dirname, 'generate-sitemap.js'), { stdio: 'inherit' });
}

async function exportCultivators() {
  const CULTIVATORS_DB_ID = '32aa9d3778c580958a83fb9a78a86021';
  console.log('\nFetching cultivators...');

  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: CULTIVATORS_DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  const cultivators = rows.map(row => {
    const props = row.properties;
    const name = (props['Name']?.title || []).map(t => t.plain_text).join('').trim();
    if (!name) return null;

    const role = (props['Role']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const org = (props['Organization']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const about = (props['About']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const usage = (props['How It\'s Used']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const impact = (props['Impact']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const blogLink = (props['Link to Blog']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const month = (props['Month']?.rich_text || []).map(t => t.plain_text).join('').trim();

    // Headshot — get the URL from files property (will be downloaded below)
    let headshotNotionUrl = '';
    const headshot = props['Headshot']?.files || [];
    if (headshot.length > 0) {
      const file = headshot[0];
      headshotNotionUrl = file.file?.url || file.external?.url || '';
    }

    return {
      name,
      role,
      organization: org,
      about,
      usage,
      impact,
      blogLink,
      headshotNotionUrl,
      headshotUrl: '',
      month,
    };
  }).filter(Boolean);

  // Download headshot images to images/ folder
  const imagesDir = path.join(__dirname, '..', 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  for (const c of cultivators) {
    if (!c.headshotNotionUrl) continue;
    // Extract original filename from the Notion URL (before query params)
    const urlPath = new URL(c.headshotNotionUrl).pathname;
    const originalName = path.basename(urlPath);
    // Sanitize: replace spaces/underscores with hyphens
    const fileName = originalName.replace(/[_ ]+/g, '-');
    const destPath = path.join(imagesDir, fileName);

    try {
      console.log(`  Downloading headshot: ${fileName}`);
      await downloadFile(c.headshotNotionUrl, destPath);
      c.headshotUrl = `/images/${fileName}`;
    } catch (err) {
      console.warn(`  Warning: Could not download headshot for ${c.name}: ${err.message}`);
      // Check if local file already exists from a previous export
      if (fs.existsSync(destPath)) {
        c.headshotUrl = `/images/${fileName}`;
      }
    }
    delete c.headshotNotionUrl;
  }
  // Clean up any remaining headshotNotionUrl fields
  for (const c of cultivators) delete c.headshotNotionUrl;

  // Match cultivators to their apps from collections data
  const collectionsPath = path.join(__dirname, '..', 'data', 'collections.json');
  const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));

  // Build a deduplicated map of all apps by creator name
  const appsByCreator = {};
  for (const col of collections) {
    for (const app of col.apps) {
      if (!app.creator) continue;
      const creatorKey = app.creator.toLowerCase().trim();
      if (!appsByCreator[creatorKey]) appsByCreator[creatorKey] = {};
      appsByCreator[creatorKey][app.id] = { name: app.name, url: app.url, id: app.id };
    }
  }

  for (const c of cultivators) {
    const key = c.name.toLowerCase().trim();
    const matched = appsByCreator[key];
    c.apps = matched ? Object.values(matched) : [];
  }

  const outPath = path.join(__dirname, '..', 'data', 'cultivators.json');
  fs.writeFileSync(outPath, JSON.stringify(cultivators, null, 2));
  console.log(`Exported ${cultivators.length} cultivators to ${outPath}`);
}

async function exportSeeds() {
  const SEEDS_DB_ID = '32aa9d3778c58188ab27fe250c849732';
  console.log('\nFetching seeds...');

  const rows = [];
  let cursor;
  do {
    const response = await notion.databases.query({
      database_id: SEEDS_DB_ID,
      ...(await notion.databases.retrieve({ database_id: SEEDS_DB_ID }).then(db => db.properties['Active'] ? { filter: { property: 'Active', checkbox: { equals: true } } } : {}).catch(() => ({}))),
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  const seeds = rows.map(row => {
    const props = row.properties;
    // Try both 'App Name' and 'Name' as title field
    const nameArr = props['App Name']?.title || props['Name']?.title || [];
    const name = nameArr.map(t => t.plain_text).join('').trim();
    if (!name) return null;

    const description = (props['Description']?.rich_text || []).map(t => t.plain_text).join('').trim();
    const remixUrl = props['Remix URL']?.url || '';
    const tags = (props['Tags']?.multi_select || []).map(s => s.name);
    const creator = (props['Creator']?.rich_text || []).map(t => t.plain_text).join('').trim();

    // Seed Collection (select field)
    const seedCollection = props['Seed Collection ']?.select?.name || '';

    return { name, description, remixUrl, tags, creator, seedCollection };
  }).filter(Boolean);

  // Group seeds by Seed Collection field from Notion
  const SEED_COLLECTION_META = {
    'Classroom Essentials': { id: 'classroom-essentials', image: 'images/seed-1.webp', color: '#e74c3c', description: 'Starter templates for the tools teachers reach for every day — lesson plans, exit tickets, bellringers, sub plans, and newsletter drafts that save hours of prep time.' },
    'Coaching and Feedback': { id: 'coaching-feedback', image: 'images/seed-2.webp', color: '#9b59b6', description: 'Templates for instructional coaches and school leaders to prepare observation debriefs, write actionable teacher feedback, and plan structured coaching conversations.' },
    'Operations and Management': { id: 'operations-management', image: 'images/seed-4.webp', color: '#f1c40f', description: 'Starter apps for the behind-the-scenes work that keeps schools running — onboarding guides, meeting agendas, policy drafters, event planners, and grant proposals.' },
    'Student Facing Apps': { id: 'student-facing', image: 'images/seed-3.webp', color: '#2654d4', description: 'Templates students use directly — study partners, homework helpers, career explorers, and practice tools across math, science, reading, and writing.' },
    'The Whole Child': { id: 'whole-child', image: 'images/seed-5.webp', color: '#e84393', description: 'Seeds focused on the complete student experience — SEL check-ins, digital citizenship, health and wellness, parent conference prep, and community resource connectors.' },
  };

  // Build collections from actual data
  const collectionMap = {};
  for (const seed of seeds) {
    if (!seed.seedCollection) continue;
    if (!collectionMap[seed.seedCollection]) {
      const meta = SEED_COLLECTION_META[seed.seedCollection] || {
        id: seed.seedCollection.toLowerCase().replace(/\s+/g, '-'),
        image: 'images/seed-1.webp',
        color: '#2D7A3A',
      };
      collectionMap[seed.seedCollection] = {
        ...meta,
        name: seed.seedCollection,
        apps: [],
      };
    }
    collectionMap[seed.seedCollection].apps.push(seed);
  }

  // Order collections consistently
  const collectionOrder = ['Classroom Essentials', 'Coaching and Feedback', 'Student Facing Apps', 'Operations and Management', 'The Whole Child'];
  const seedCollections = collectionOrder
    .filter(name => collectionMap[name])
    .map(name => collectionMap[name]);

  // Add any unlisted collections at the end
  for (const name of Object.keys(collectionMap)) {
    if (!collectionOrder.includes(name)) seedCollections.push(collectionMap[name]);
  }

  const outPath = path.join(__dirname, '..', 'data', 'seeds.json');
  fs.writeFileSync(outPath, JSON.stringify({ seeds, collections: seedCollections }, null, 2));
  console.log(`Exported ${seeds.length} seeds in ${seedCollections.length} collections to ${outPath}`);
  return seedCollections;
}

function parseRow(props) {
  // App name (title)
  const nameArr = props['App Name']?.title || [];
  const name = nameArr.map(t => t.plain_text).join('').trim();
  if (!name) return null;

  // URL
  const url = props['URL']?.url || '';

  // Extract app ID from URL
  let appId = '';
  if (url) {
    const match = url.match(/\/project\/([a-zA-Z0-9]+)/);
    if (match) appId = match[1];
  }

  // Creator
  const creator = richTextToString(props['Creator']);

  // Role
  const role = richTextToString(props['Role']);

  // Description
  const description = richTextToString(props['Description']);

  // How It's Being Used
  const usage = richTextToString(props['How It\'s Being Used']);

  // Impact
  const impact = richTextToString(props['Impact']);

  // Sessions & Iterations (remixes)
  const sessions = props['Sessions']?.number || 0;
  const iterations = props['Iterations']?.number || 0;

  // Homepage pin flag
  const pinned = !!props['Homepage']?.checkbox;

  return {
    id: appId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description,
    url,
    creator,
    role,
    usage,
    impact,
    sessions,
    iterations,
    pinned,
  };
}

/**
 * Download a file from a URL and save it to disk.
 * Returns the local path relative to the project root (e.g. "/images/Foo.webp").
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

function richTextToString(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map(t => t.plain_text).join('').trim();
}

function generateCollectionId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function inferType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('showcase') || lower.includes('district') || lower.includes('ciob') ||
      lower.includes('kipp') || lower.includes('leading educators') || lower.includes('amplify') ||
      lower.includes('ghana') || lower.includes('nyc') || lower.includes('texas') ||
      lower.includes('fairfax') || lower.includes('california')) {
    return 'org';
  }
  return 'topic';
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
