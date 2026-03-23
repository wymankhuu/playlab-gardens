import { Client } from '@notionhq/client';
import { unstable_cache } from 'next/cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  creator: string;
  role: string;
  usage: string;
  impact: string;
  sessions: number;
  iterations: number;
  pinned: boolean;
  homepageOrder: number;
  tags: string[];
  notionId: string;
  homepageHidden: boolean;
  collectionOrder: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  type: 'topic' | 'org' | 'seed';
  iconColor: string;
  iconEmoji: string | null;
  appCount: number;
  apps: App[];
}

export interface Seed {
  id: string;
  name: string;
  description: string;
  remixUrl: string;
  tags: string[];
  creator: string;
  seedCollection: string;
}

export interface SeedCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  apps: Seed[];
}

export interface Cultivator {
  name: string;
  role: string;
  organization: string;
  about: string;
  usage: string;
  impact: string;
  blogLink: string;
  headshotUrl: string;
  month: string;
  apps: { name: string; url: string; id: string }[];
}

// ---------------------------------------------------------------------------
// Notion client
// ---------------------------------------------------------------------------

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MASTER_DB_ID = process.env.NOTION_MASTER_DB_ID!;
const SEEDS_DB_ID = '32aa9d3778c58188ab27fe250c849732';
const CULTIVATORS_DB_ID = '32aa9d3778c580958a83fb9a78a86021';

// ---------------------------------------------------------------------------
// Collection descriptions
// ---------------------------------------------------------------------------

const COLLECTION_DESCRIPTIONS: Record<string, string> = {
  'AI Assistants': 'Educators are reimagining what a teaching assistant can be. These AI-powered tools handle everything from lesson scaffolding to real-time student support, each one reflecting a different vision of how intelligence can serve the classroom.',
  'Amplify': 'Amplify educators have taken their deep curriculum knowledge and built something new with it. These apps extend and personalize the Amplify experience in ways only the people closest to the work could imagine.',
  'Arts & Design': 'Where creativity meets craft. Educators and students have built tools that open up visual arts, design thinking, and creative expression, proving that art education thrives when learners can shape their own tools.',
  'Assessment & Feedback': 'The community has built dozens of different approaches to understanding what students know. From quick formative checks to deep rubric-based feedback, each tool reflects a different classroom reality and a different philosophy of assessment.',
  'Business & Economics': 'Financial literacy, entrepreneurship, economic reasoning, educators across contexts have built tools that bring the complexity of the business world into classrooms in accessible, student-centered ways.',
  'CA Community Colleges': 'California\'s community college educators are building for a student population unlike any other, working adults, first-generation learners, career changers. These apps reflect that diversity and the creativity it demands.',
  'CIOB': 'CIOB district educators have channeled their knowledge of their communities into tools that serve their specific students. What started as individual experiments has become a growing library of locally-rooted innovation.',
  'Career & Vocational': 'From resume builders to industry simulations, educators are helping students see a future beyond the classroom. These tools connect academic learning to real-world career paths in ways that feel personal and practical.',
  'Creative & Engagement': 'Some of the most inventive work in the community lives here. These apps use storytelling, play, and surprise to pull students in, reminding us that engagement isn\'t a trick, it\'s a design challenge.',
  'Cultural Studies': 'Educators have built tools that honor the richness of human culture, from indigenous traditions to diaspora histories. Each app opens a window into a different community\'s story, told with care and nuance.',
  'Data-Driven Instruction': 'What happens when teachers can see patterns in student learning in real time? These tools turn data into something actionable, helping educators adjust their practice with clarity rather than guesswork.',
  'Differentiation & Access': 'Every learner arrives differently. These apps are built by educators who know that firsthand, tools that flex, adapt, and meet students where they actually are, not where a pacing guide says they should be.',
  'ELA & Literacy': 'Reading and writing look different in every classroom. This collection captures that range, from phonics coaches to literary analysis partners, each app shaped by an educator\'s unique understanding of how literacy grows.',
  'ELL / ESL': 'Language learning is deeply personal work. These tools were built by educators who understand the particular challenges and joys of supporting multilingual students, bridging languages, cultures, and confidence.',
  'ELL & Multilingual': 'Language learning is deeply personal work. These tools were built by educators who understand the particular challenges and joys of supporting multilingual students, bridging languages, cultures, and confidence.',
  'Elementary': 'Teaching young learners requires a special kind of imagination. These apps are playful, patient, and purposeful, built by educators who understand that the early years set the foundation for everything that follows.',
  'Fairfax': 'More than 1,100 Fairfax County Public Schools students from 25 high schools designed AI-powered solutions to real-world problems as part of the Seize the Moment Student AI Innovation Challenge, shaping the future of their communities one app at a time.',
  'Family & Community': 'Learning doesn\'t stop at the school door. These tools help families participate in their children\'s education, bridging the gap between home and classroom with warmth and practical support.',
  'Flowers': 'See how individuals across the Playlab community are building to reflect their unique contexts, roles, and goals. Each app here tells a different story, a teacher solving a problem no one else saw, a student reimagining how learning could work, a coach finding new ways to support their team.',
  'Gamified Learning': 'Points, quests, narratives, challenges, educators have found countless ways to make learning feel like play. These apps prove that rigor and fun aren\'t opposites; they\'re collaborators.',
  'Ghana': 'Ghana\'s educator community has embraced app-building with remarkable energy. From curriculum-aligned subject tools to creative student projects, these apps represent one of the most vibrant collections on the platform.',
  'Health & PE': 'Bodies, minds, nutrition, movement, health education covers enormous ground. These apps reflect educators who see wellness holistically, building tools that meet students in the fullness of who they are.',
  'High School': 'High school students are ready for complexity. These tools rise to that, offering sophisticated support for advanced coursework, college prep, and the social-emotional challenges of adolescence.',
  'Higher Ed': 'College and university educators are building for a different kind of learner, self-directed, time-pressed, and hungry for depth. These apps bring AI into higher education with the rigor the context demands.',
  'Illustrative Mathematics': 'IM educators know their curriculum inside and out. These apps extend that expertise into new territory, interactive practice, lesson internalization, and student support that stays true to the IM philosophy.',
  'KIPP': 'KIPP educators build with urgency and heart. These apps carry that energy, tools designed for specific schools, specific grade levels, and the specific belief that every student deserves an excellent education.',
  'Leading Educators': 'The Leading Educators community brings a coaching lens to everything they build. These apps support not just students but the professional growth of the educators who serve them.',
  'Lesson Planning': 'Behind every great lesson is a plan. These tools help educators think through sequence, differentiation, and timing, turning the invisible work of preparation into something more structured and shareable.',
  'Math': 'Math education is a space of enormous creativity right now. From visual models to AI tutors to curriculum-aligned practice, this collection captures the community\'s many approaches to helping students think mathematically.',
  'Middle School': 'Middle schoolers are figuring out who they are. These tools meet that energy, engaging, age-appropriate, and built by educators who understand the unique developmental moment of early adolescence.',
  'Music & Performing Arts': 'Music theory, performance practice, creative composition, educators in the arts are proving that AI tools can enhance rather than replace the deeply human experience of making music and art together.',
  'NYC': 'New York City\'s educators bring the energy and diversity of the city into everything they build. These apps reflect classrooms where dozens of languages, cultures, and perspectives converge every day.',
  'Niche & Emerging': 'The edges are where innovation happens. These apps explore topics that don\'t fit neatly into traditional categories, unusual subjects, experimental formats, and ideas that might define tomorrow\'s classrooms.',
  'Operations and Management': 'The work that keeps schools running rarely gets the spotlight. These tools tackle scheduling, communications, HR, and the thousand small decisions that shape whether a school day runs smoothly, built by the people who live that complexity every day.',
  'Professional Development': 'Educators building tools for other educators. These apps support coaching, reflection, and growth, the kind of professional learning that actually changes practice, not just checks a compliance box.',
  'Project-Based Learning': 'PBL demands a different kind of tool, one that supports open-ended inquiry, student agency, and real-world connection. These apps help educators and students design projects that matter.',
  'Reading Intervention': 'When a student struggles to read, the stakes are high. These tools are built by educators who feel that urgency, targeted, evidence-informed approaches to helping every student become a reader.',
  'Religious Studies': 'Faith, ethics, scripture, and theology, educators in religious communities have built tools that honor the depth and sensitivity of spiritual education while embracing what technology makes newly possible.',
  'SEL / Wellbeing': 'Social-emotional learning isn\'t a curriculum add-on; it\'s the foundation. These tools help students develop self-awareness, empathy, and resilience, built by educators who know that wellbeing comes first.',
  'SEL & Wellbeing': 'Social-emotional learning isn\'t a curriculum add-on; it\'s the foundation. These tools help students develop self-awareness, empathy, and resilience, built by educators who know that wellbeing comes first.',
  'School Leadership': 'Principals, coaches, and district leaders are building too. These tools tackle the operational and strategic challenges of running schools, from observation protocols to data dashboards to communication aids.',
  'Science / STEM': 'From biology to physics to engineering design, STEM educators are building tools that make abstract concepts tangible. The range here is extraordinary, reflecting the breadth of scientific curiosity itself.',
  'Science & STEM': 'From biology to physics to engineering design, STEM educators are building tools that make abstract concepts tangible. The range here is extraordinary, reflecting the breadth of scientific curiosity itself.',
  'Social Studies / History': 'History is never just one story. These apps help students engage with primary sources, multiple perspectives, and the messy complexity of how societies work, past and present.',
  'Social Studies & History': 'History is never just one story. These apps help students engage with primary sources, multiple perspectives, and the messy complexity of how societies work, past and present.',
  'Special Education': 'Every IEP tells a different story. These tools are built by educators who write those stories every day, apps that flex to meet individual needs with patience, precision, and genuine care.',
  'Student-Built Apps': 'When students become builders, something shifts. These apps were created by learners themselves, proof that the best way to understand technology is to make something meaningful with it.',
  'Study Partners': 'Late nights, tough concepts, upcoming exams, these AI companions meet students in their moments of need. Each one offers a slightly different approach to the ancient art of studying together.',
  'Teacher Tools': 'The largest collection in the garden, and for good reason. Educators are prolific builders when given the right tools. From admin shortcuts to pedagogical experiments, this is where teacher ingenuity lives.',
  'Texas': 'Everything\'s bigger in Texas, including the ambition of its educators. These apps span subjects, grade levels, and contexts, a snapshot of one state\'s growing community of builder-teachers.',
  'Tutoring & Practice': 'Practice makes permanent, not perfect, and these tools know the difference. Each one offers patient, adaptive support that meets students where they are and helps them build fluency through repetition that feels purposeful rather than punishing.',
  'World Languages': 'Language connects us. These apps help students learn Spanish, French, Mandarin, Arabic, and more, each one reflecting a different pedagogical tradition and a shared belief in the power of multilingualism.',
  'Writing Coaches': 'Writing is thinking made visible. These AI coaches help students at every stage of the writing process, brainstorming, drafting, revising, while preserving the student\'s own voice and ideas.',
};

// Colors drawn from the Playlab Gardens illustrations
const ICON_COLORS = [
  '#3347B8', '#FE6A2E', '#2D7A3A', '#E8785A', '#8B9E2A',
  '#C06EB4', '#D4A843', '#5B8DC9', '#D1576A', '#4A9E6D',
];

// Seed collection metadata
const SEED_COLLECTION_META: Record<string, { id: string; image: string; color: string; description: string }> = {
  'Classroom Essentials': { id: 'classroom-essentials', image: 'images/seed-1.webp', color: '#e74c3c', description: 'Starter templates for the tools teachers reach for every day, lesson plans, exit tickets, bellringers, sub plans, and newsletter drafts that save hours of prep time.' },
  'Coaching and Feedback': { id: 'coaching-feedback', image: 'images/seed-2.webp', color: '#9b59b6', description: 'Templates for instructional coaches and school leaders to prepare observation debriefs, write actionable teacher feedback, and plan structured coaching conversations.' },
  'Operations and Management': { id: 'operations-management', image: 'images/seed-4.webp', color: '#f1c40f', description: 'Starter apps for the behind-the-scenes work that keeps schools running, onboarding guides, meeting agendas, policy drafters, event planners, and grant proposals.' },
  'Student Facing Apps': { id: 'student-facing', image: 'images/seed-3.webp', color: '#2654d4', description: 'Templates students use directly, study partners, homework helpers, career explorers, and practice tools across math, science, reading, and writing.' },
  'The Whole Child': { id: 'whole-child', image: 'images/seed-5.webp', color: '#e84393', description: 'Seeds focused on the complete student experience, SEL check-ins, digital citizenship, health and wellness, parent conference prep, and community resource connectors.' },
};

const SEED_COLLECTION_ORDER = [
  'Classroom Essentials',
  'Coaching and Feedback',
  'Student Facing Apps',
  'Operations and Management',
  'The Whole Child',
];

// Collections to hide from the Gardens page
const HIDDEN_COLLECTIONS = ['religious studies'];

// Collections allowed to show Y1/Y2/Ghana apps
const GHANA_ALLOWED = ['ghana', 'flowers'];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function richTextToString(prop: any): string {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map((t: any) => t.plain_text).join('').trim();
}

export function generateCollectionId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function inferType(name: string): 'topic' | 'org' {
  const lower = name.toLowerCase();
  if (
    lower.includes('showcase') || lower.includes('district') || lower.includes('ciob') ||
    lower.includes('kipp') || lower.includes('leading educators') || lower.includes('amplify') ||
    lower.includes('ghana') || lower.includes('nyc') || lower.includes('texas') ||
    lower.includes('fairfax') || lower.includes('california')
  ) {
    return 'org';
  }
  return 'topic';
}

export function isGhanaApp(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('ghana')) return true;
  if (lower.startsWith('y1') || lower.startsWith('y2')) return true;
  if (lower.startsWith('year 1') || lower.startsWith('year 2')) return true;
  return false;
}

export function pickPreview(apps: App[], count: number, collectionName: string): App[] {
  const lowerName = collectionName.toLowerCase();
  const ghanaAllowed = GHANA_ALLOWED.includes(lowerName);

  // Filter: remove hidden apps and Ghana apps (unless allowed)
  let eligible = apps.filter(app => {
    if (app.homepageHidden) return false;
    if (!ghanaAllowed && isGhanaApp(app.name)) return false;
    return true;
  });

  // Split into ordered (has explicit collectionOrder < 999) and unordered
  const ordered = eligible
    .filter(a => a.collectionOrder < 999)
    .sort((a, b) => a.collectionOrder - b.collectionOrder);

  const unordered = eligible
    .filter(a => a.collectionOrder >= 999);

  // For unordered: apply creator diversity (max 1 per creator), sort by sessions
  const seenCreators = new Set(ordered.map(a => a.creator.toLowerCase()).filter(c => c));
  const diverseUnordered: App[] = [];
  const remainingUnordered: App[] = [];

  const sortedBySession = [...unordered].sort((a, b) => b.sessions - a.sessions);
  for (const app of sortedBySession) {
    const creatorKey = app.creator.toLowerCase();
    if (!creatorKey || !seenCreators.has(creatorKey)) {
      diverseUnordered.push(app);
      if (creatorKey) seenCreators.add(creatorKey);
    } else {
      remainingUnordered.push(app);
    }
  }

  // Combine: ordered first, then diverse unordered, then remaining
  const result = [...ordered, ...diverseUnordered, ...remainingUnordered];
  return result.slice(0, count);
}

function parseRow(props: any, pageId?: string): (App & { tags?: string[] }) | null {
  // App name (title)
  const nameArr = props['App Name']?.title || [];
  const name = nameArr.map((t: any) => t.plain_text).join('').trim();
  if (!name) return null;

  // URL
  const url: string = props['URL']?.url || '';

  // Extract app ID from URL
  let appId = '';
  if (url) {
    const match = url.match(/\/project\/([a-zA-Z0-9]+)/);
    if (match) appId = match[1];
  }

  // Fields
  const creator = richTextToString(props['Creator']);
  const role = richTextToString(props['Role']);
  const description = richTextToString(props['Description']);
  const usage = richTextToString(props["How It's Being Used"]);
  const impact = richTextToString(props['Impact']);
  const sessions = props['Sessions']?.number || 0;
  const iterations = props['Iterations']?.number || 0;
  const pinned = !!props['Homepage']?.checkbox;
  const homepageOrder = props['Homepage Order']?.number ?? 999;
  const notionId = pageId || '';
  const homepageHidden = !!props['Homepage Hidden']?.checkbox;
  const collectionOrder = props['Collection Order']?.number ?? 999;

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
    homepageOrder,
    tags: [],
    notionId,
    homepageHidden,
    collectionOrder,
  };
}

// ---------------------------------------------------------------------------
// Notion data-fetching helpers (paginated)
// ---------------------------------------------------------------------------

async function fetchAllRows(databaseId: string, filter?: any): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      ...(filter ? { filter } : {}),
    });
    rows.push(...response.results);
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return rows;
}

// ---------------------------------------------------------------------------
// Core fetching logic (uncached)
// ---------------------------------------------------------------------------

async function fetchCollections(): Promise<Collection[]> {
  const rows = await fetchAllRows(MASTER_DB_ID);

  // Group apps by collection tag
  const collectionMap: Record<string, { apps: App[]; hasFeatured: boolean }> = {};

  for (const row of rows) {
    const props = row.properties;
    const app = parseRow(props, row.id);
    if (!app) continue;

    const collections = (props['Collection']?.multi_select || []).map((s: any) => s.name);
    if (collections.length === 0) continue;

    app.tags = collections;

    for (const colName of collections) {
      if (!collectionMap[colName]) {
        collectionMap[colName] = { apps: [], hasFeatured: false };
      }
      collectionMap[colName].apps.push({ ...app });
    }
  }

  // Build collections array
  const collectionNames = Object.keys(collectionMap).sort();

  const result: Collection[] = collectionNames.map((name, index) => {
    let { apps } = collectionMap[name];

    // Deduplicate by app ID, keeping the entry with the longest content
    const appByKey: Record<string, App> = {};
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
    const appByName: Record<string, App> = {};
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

    return {
      id: generateCollectionId(name),
      name,
      description: COLLECTION_DESCRIPTIONS[name] || '',
      type: inferType(name),
      iconColor: ICON_COLORS[index % ICON_COLORS.length],
      iconEmoji: null,
      appCount: apps.length,
      apps,
    };
  });

  // Fetch and merge seed collections
  const seedCollections = await fetchSeedCollections();
  for (const sc of seedCollections) {
    const apps: App[] = sc.apps.map((s) => ({
      id: s.name.toLowerCase().replace(/\s+/g, '-'),
      name: s.name,
      url: s.remixUrl || '',
      creator: s.creator || 'Seed App',
      role: '',
      description: s.description,
      usage: '',
      impact: '',
      sessions: 0,
      iterations: 0,
      pinned: false,
      homepageOrder: 999,
      tags: s.tags || [],
      notionId: '',
      homepageHidden: false,
      collectionOrder: 999,
    }));
    result.push({
      id: sc.id,
      name: sc.name,
      description: sc.description || '',
      type: 'seed',
      iconColor: sc.color,
      iconEmoji: '🌱',
      appCount: apps.length,
      apps,
    });
  }

  return result;
}

async function fetchSeedCollections(): Promise<SeedCollection[]> {
  // Check if Active filter exists on the database
  let filter: any = undefined;
  try {
    const db = await notion.databases.retrieve({ database_id: SEEDS_DB_ID });
    if ((db as any).properties['Active']) {
      filter = { property: 'Active', checkbox: { equals: true } };
    }
  } catch {
    // ignore, proceed without filter
  }

  const rows = await fetchAllRows(SEEDS_DB_ID, filter);

  const seeds: Seed[] = rows
    .map((row) => {
      const props = row.properties;
      const nameArr = props['App Name']?.title || props['Name']?.title || [];
      const name = nameArr.map((t: any) => t.plain_text).join('').trim();
      if (!name) return null;

      const description = (props['Description']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const remixUrl: string = props['Remix URL']?.url || '';
      const tags = (props['Tags']?.multi_select || []).map((s: any) => s.name);
      const creator = (props['Creator']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      // Note: the Notion property has a trailing space
      const seedCollection = props['Seed Collection ']?.select?.name || '';

      return { id: row.id, name, description, remixUrl, tags, creator, seedCollection };
    })
    .filter(Boolean) as Seed[];

  // Group seeds by Seed Collection field
  const collectionMap: Record<string, SeedCollection> = {};
  for (const seed of seeds) {
    if (!seed.seedCollection) continue;
    if (!collectionMap[seed.seedCollection]) {
      const meta = SEED_COLLECTION_META[seed.seedCollection] || {
        id: seed.seedCollection.toLowerCase().replace(/\s+/g, '-'),
        image: 'images/seed-1.webp',
        color: '#2D7A3A',
        description: '',
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
  const result: SeedCollection[] = SEED_COLLECTION_ORDER
    .filter((name) => collectionMap[name])
    .map((name) => collectionMap[name]);

  // Add any unlisted collections at the end
  for (const name of Object.keys(collectionMap)) {
    if (!SEED_COLLECTION_ORDER.includes(name)) {
      result.push(collectionMap[name]);
    }
  }

  return result;
}

async function fetchCultivators(): Promise<Cultivator[]> {
  const rows = await fetchAllRows(CULTIVATORS_DB_ID);

  const cultivators: Cultivator[] = rows
    .map((row) => {
      const props = row.properties;
      const name = (props['Name']?.title || []).map((t: any) => t.plain_text).join('').trim();
      if (!name) return null;

      const role = (props['Role']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const org = (props['Organization']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const about = (props['About']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const usage = (props["How It's Used"]?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const impact = (props['Impact']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const blogLink = (props['Link to Blog']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();
      const month = (props['Month']?.rich_text || []).map((t: any) => t.plain_text).join('').trim();

      // Headshot, get the URL from files property
      let headshotUrl = '';
      const headshot = props['Headshot']?.files || [];
      if (headshot.length > 0) {
        const file = headshot[0];
        headshotUrl = file.file?.url || file.external?.url || '';
      }

      return {
        name,
        role,
        organization: org,
        about,
        usage,
        impact,
        blogLink,
        headshotUrl,
        month,
        apps: [] as { name: string; url: string; id: string }[],
      };
    })
    .filter(Boolean) as Cultivator[];

  // Match cultivators to their apps from the master collections
  const collections = await getCachedCollections();

  const appsByCreator: Record<string, Record<string, { name: string; url: string; id: string }>> = {};
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

  return cultivators;
}

// ---------------------------------------------------------------------------
// Cached exports
// ---------------------------------------------------------------------------

const getCachedCollections = unstable_cache(
  async () => fetchCollections(),
  ['collections'],
  { revalidate: 3600 }
);

const getCachedSeeds = unstable_cache(
  async () => fetchSeedCollections(),
  ['seeds'],
  { revalidate: 3600 }
);

const getCachedCultivators = unstable_cache(
  async () => fetchCultivators(),
  ['cultivators'],
  { revalidate: 3600 }
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches all apps from the Master DB, groups by Collection multi_select,
 * deduplicates, sorts by sessions descending. Cached for 1 hour.
 */
export async function getCollections(): Promise<Collection[]> {
  const all = await getCachedCollections();
  // Filter out hidden and seed collections for the public listing
  return all.filter((col) => {
    if (col.type === 'seed') return false;
    if (HIDDEN_COLLECTIONS.includes(col.name.toLowerCase())) return false;
    return true;
  });
}

/**
 * Returns a single collection by its slug ID, or null if not found.
 * Searches across all collections including seeds and hidden ones.
 */
export async function getCollection(id: string): Promise<Collection | null> {
  const all = await getCachedCollections();
  return all.find((col) => col.id === id) ?? null;
}

/**
 * Fetches seed collections from the Seeds DB. Cached for 1 hour.
 */
export async function getSeeds(): Promise<SeedCollection[]> {
  return getCachedSeeds();
}

/**
 * Fetches cultivators from the Cultivators DB and matches them
 * to their apps. Cached for 1 hour.
 */
export async function getCultivators(): Promise<Cultivator[]> {
  return getCachedCultivators();
}

// --- Admin helpers ---

export function checkAdminPassword(password: string): boolean {
  const adminPwd = process.env.ADMIN_PASSWORD;
  return !!adminPwd && password === adminPwd;
}

export function getAdminCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin = origin && (origin.includes('playlabgardens.com') || origin.includes('localhost'))
    ? origin
    : 'https://playlabgardens.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function findAppByNotionId(notionId: string) {
  return notion.pages.retrieve({ page_id: notionId });
}

export async function updateNotionPage(notionId: string, properties: Record<string, any>) {
  return notion.pages.update({ page_id: notionId, properties });
}

export async function sequentialUpdate(
  items: Array<{ notionId: string; properties: Record<string, any> }>,
  delayMs = 200
) {
  const results = [];
  for (const item of items) {
    results.push(await updateNotionPage(item.notionId, item.properties));
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}

export function getNotionClient() {
  return notion;
}

export function getMasterDbId() {
  return MASTER_DB_ID;
}
