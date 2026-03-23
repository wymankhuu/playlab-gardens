# Admin Dashboard Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the admin dashboard with tag management, collection ordering, homepage curation, bulk operations, and a tabbed management interface.

**Architecture:** Notion-native data model with two new properties (`Homepage Hidden`, `Collection Order`) and `notionId` for reliable writes. New API routes for tag CRUD, hide/show, ordering, and bulk ops. Tabbed admin dashboard (Apps Table, Collection Manager, Missing Fields) with reusable TagEditor component.

**Tech Stack:** Next.js 16, React 19, Notion API (@notionhq/client), TypeScript, Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-23-admin-dashboard-upgrade-design.md`

**Note:** This project has no test infrastructure. Steps focus on implementation and manual verification.

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/admin-tags/route.ts` | GET available tags, POST add/remove tag on app |
| `src/app/api/admin-tags/create/route.ts` | POST create new collection tag |
| `src/app/api/admin-hide/route.ts` | POST toggle Homepage Hidden on apps |
| `src/app/api/admin-collection-order/route.ts` | POST save collection ordering |
| `src/app/api/admin-bulk/route.ts` | POST bulk tag/hide operations |
| `src/app/api/admin-apps/route.ts` | GET paginated app list for admin table |
| `src/components/TagEditor.tsx` | Reusable tag add/remove/create component |
| `src/components/BulkTagModal.tsx` | Modal for bulk tag operations |
| `src/components/AdminDashboard.tsx` | Tabbed dashboard container |
| `src/components/AdminAppsTable.tsx` | Searchable/filterable/sortable apps table |
| `src/components/AdminCollectionManager.tsx` | Per-collection drag-and-drop reorder + hide/show |
| `src/components/AdminMissingFields.tsx` | Extracted missing fields report |
| `scripts/migrate-pins.ts` | One-time migration from pins to new system |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/notion.ts` | Add `notionId`, `homepageHidden`, `collectionOrder` to App type; update `parseRow`; rewrite `pickPreview` |
| `src/components/AdminPanel.tsx` | Add TagEditor below existing fields |
| `src/components/HomePage.tsx` | Use new sorting/filtering logic in CollectionSection |
| `src/app/admin/page.tsx` | Replace with AdminDashboard |
| `src/app/api/admin-pin/route.ts` | Add missing `revalidatePath('/')` call |

---

## Task 1: Data Model — Update App Interface and parseRow

**Files:**
- Modify: `src/lib/notion.ts:8-22` (App interface)
- Modify: `src/lib/notion.ts:259-301` (parseRow function)

- [ ] **Step 1: Update App interface**

In `src/lib/notion.ts`, add three new fields to the App interface (after `tags: string[]`):

```typescript
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
```

- [ ] **Step 2: Update parseRow to extract new fields**

The `parseRow` function currently takes only `props` (Notion page properties). It needs the Notion page ID too. Update the function signature and add new field extraction.

Change `parseRow` (currently at line 259) from:
```typescript
function parseRow(props: any): (App & { tags?: string[] }) | null {
```
to:
```typescript
function parseRow(props: any, pageId?: string): (App & { tags?: string[] }) | null {
```

Add after `homepageOrder` extraction (after line 284):
```typescript
    notionId: pageId || '',
    homepageHidden: !!props['Homepage Hidden']?.checkbox,
    collectionOrder: props['Collection Order']?.number ?? 999,
```

- [ ] **Step 3: Update fetchCollections to pass page ID to parseRow**

In `fetchCollections` (around line 335), find where `parseRow` is called. Currently it's called like:
```typescript
const app = parseRow(props);
```

(where `props` was extracted from `row.properties` on the line above). Change to:
```typescript
const app = parseRow(props, row.id);
```

The `row` variable is available from the for-of loop and has the `.id` property (the Notion page UUID).

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`
Expected: Build succeeds with no type errors related to App interface.

- [ ] **Step 5: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/lib/notion.ts
git commit -m "feat: add notionId, homepageHidden, collectionOrder to App type"
```

---

## Task 2: Rewrite pickPreview with New Sorting Logic

**Files:**
- Modify: `src/lib/notion.ts:200-257` (pickPreview function)

- [ ] **Step 1: Replace pickPreview function**

Replace the entire `pickPreview` function (lines 200-257) with new logic:

```typescript
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/lib/notion.ts
git commit -m "feat: rewrite pickPreview with collectionOrder + homepageHidden logic"
```

---

## Task 3: Shared Admin Helpers

**Files:**
- Modify: `src/lib/notion.ts` (add helper exports)

The admin API routes share common patterns: password checking, CORS headers, Notion client access, and sequential batch execution. Currently each route reimports these independently. Add shared helpers to `notion.ts`.

- [ ] **Step 1: Add admin helper functions**

Add at the end of `src/lib/notion.ts` (before the closing exports section):

```typescript
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/lib/notion.ts
git commit -m "feat: add shared admin helper functions to notion.ts"
```

---

## Task 4: API Route — GET/POST /api/admin-tags

**Files:**
- Create: `src/app/api/admin-tags/route.ts`

- [ ] **Step 1: Create the admin-tags route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  getNotionClient,
  getMasterDbId,
  findAppByNotionId,
  updateNotionPage,
} from '@/lib/notion';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  const password = req.nextUrl.searchParams.get('password');
  if (!password || !checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  try {
    const notion = getNotionClient();
    const db = await notion.databases.retrieve({ database_id: getMasterDbId() });
    const collectionProp = (db.properties as any)['Collection'];
    if (!collectionProp || collectionProp.type !== 'multi_select') {
      return NextResponse.json({ error: 'Collection property not found' }, { status: 500, headers });
    }

    const tags = collectionProp.multi_select.options.map((opt: any) => ({
      name: opt.name,
      color: opt.color,
    }));

    return NextResponse.json({ tags }, { headers });
  } catch (err) {
    console.error('Error fetching tags:', err);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  try {
    const body = await req.json();
    const { password, notionId, action, tag } = body;

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    if (!notionId || !action || !tag) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    // Get current page to read existing tags
    const page = await findAppByNotionId(notionId);
    const currentTags: { name: string }[] = (page as any).properties['Collection']?.multi_select || [];

    let newTags: { name: string }[];
    if (action === 'add') {
      // Don't add duplicate
      if (currentTags.some(t => t.name.toLowerCase() === tag.toLowerCase())) {
        return NextResponse.json({ error: 'Tag already exists on app' }, { status: 400, headers });
      }
      newTags = [...currentTags.map(t => ({ name: t.name })), { name: tag }];
    } else if (action === 'remove') {
      newTags = currentTags
        .filter(t => t.name.toLowerCase() !== tag.toLowerCase())
        .map(t => ({ name: t.name }));
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }

    await updateNotionPage(notionId, {
      Collection: { multi_select: newTags },
    });

    revalidatePath('/');
    return NextResponse.json({ success: true, tags: newTags.map(t => t.name) }, { headers });
  } catch (err) {
    console.error('Error updating tags:', err);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-tags/route.ts
git commit -m "feat: add GET/POST /api/admin-tags for tag management"
```

---

## Task 5: API Route — POST /api/admin-tags/create

**Files:**
- Create: `src/app/api/admin-tags/create/route.ts`

- [ ] **Step 1: Create the admin-tags/create route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  getNotionClient,
  getMasterDbId,
} from '@/lib/notion';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  try {
    const body = await req.json();
    const { password, tagName } = body;

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    if (!tagName || !tagName.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400, headers });
    }

    const trimmedName = tagName.trim();
    const notion = getNotionClient();

    // Check if tag already exists (case-insensitive)
    const db = await notion.databases.retrieve({ database_id: getMasterDbId() });
    const collectionProp = (db.properties as any)['Collection'];
    const existingOptions = collectionProp?.multi_select?.options || [];
    const alreadyExists = existingOptions.some(
      (opt: any) => opt.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400, headers });
    }

    // Update database schema to add new multi_select option
    await notion.databases.update({
      database_id: getMasterDbId(),
      properties: {
        Collection: {
          multi_select: {
            options: [...existingOptions, { name: trimmedName }],
          },
        },
      },
    });

    revalidatePath('/');
    return NextResponse.json({ success: true, tagName: trimmedName }, { headers });
  } catch (err) {
    console.error('Error creating tag:', err);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-tags/create/route.ts
git commit -m "feat: add POST /api/admin-tags/create for new tag creation"
```

---

## Task 6: API Route — POST /api/admin-hide

**Files:**
- Create: `src/app/api/admin-hide/route.ts`

- [ ] **Step 1: Create the admin-hide route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  sequentialUpdate,
} from '@/lib/notion';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  try {
    const body = await req.json();
    const { password, apps } = body;

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json({ error: 'Apps array is required' }, { status: 400, headers });
    }

    const updates = apps.map((app: { notionId: string; hidden: boolean }) => ({
      notionId: app.notionId,
      properties: {
        'Homepage Hidden': { checkbox: app.hidden },
      },
    }));

    await sequentialUpdate(updates);

    revalidatePath('/');
    return NextResponse.json({ success: true, updated: apps.length }, { headers });
  } catch (err) {
    console.error('Error updating homepage hidden:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-hide/route.ts
git commit -m "feat: add POST /api/admin-hide for homepage visibility toggle"
```

---

## Task 7: API Route — POST /api/admin-collection-order

**Files:**
- Create: `src/app/api/admin-collection-order/route.ts`

- [ ] **Step 1: Create the admin-collection-order route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  sequentialUpdate,
} from '@/lib/notion';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  try {
    const body = await req.json();
    const { password, collection, appOrder } = body;

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    if (!appOrder || !Array.isArray(appOrder) || appOrder.length === 0) {
      return NextResponse.json({ error: 'appOrder array is required' }, { status: 400, headers });
    }

    const updates = appOrder.map((item: { notionId: string; order: number }) => ({
      notionId: item.notionId,
      properties: {
        'Collection Order': { number: item.order },
      },
    }));

    await sequentialUpdate(updates);

    revalidatePath('/');
    return NextResponse.json({
      success: true,
      collection: collection || 'global',
      updated: appOrder.length,
    }, { headers });
  } catch (err) {
    console.error('Error updating collection order:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-collection-order/route.ts
git commit -m "feat: add POST /api/admin-collection-order for app ordering"
```

---

## Task 8: API Route — POST /api/admin-bulk

**Files:**
- Create: `src/app/api/admin-bulk/route.ts`

- [ ] **Step 1: Create the admin-bulk route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  checkAdminPassword,
  getAdminCorsHeaders,
  findAppByNotionId,
  updateNotionPage,
} from '@/lib/notion';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  try {
    const body = await req.json();
    const { password, notionIds, action, tag } = body;

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    if (!notionIds || !Array.isArray(notionIds) || notionIds.length === 0) {
      return NextResponse.json({ error: 'notionIds array is required' }, { status: 400, headers });
    }

    if (!['addTag', 'removeTag', 'hide', 'show'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers });
    }

    if ((action === 'addTag' || action === 'removeTag') && !tag) {
      return NextResponse.json({ error: 'Tag is required for tag operations' }, { status: 400, headers });
    }

    let updated = 0;
    for (const notionId of notionIds) {
      try {
        if (action === 'addTag') {
          const page = await findAppByNotionId(notionId);
          const currentTags: { name: string }[] = (page as any).properties['Collection']?.multi_select || [];
          if (!currentTags.some(t => t.name.toLowerCase() === tag.toLowerCase())) {
            await updateNotionPage(notionId, {
              Collection: {
                multi_select: [...currentTags.map(t => ({ name: t.name })), { name: tag }],
              },
            });
          }
        } else if (action === 'removeTag') {
          const page = await findAppByNotionId(notionId);
          const currentTags: { name: string }[] = (page as any).properties['Collection']?.multi_select || [];
          const newTags = currentTags
            .filter(t => t.name.toLowerCase() !== tag.toLowerCase())
            .map(t => ({ name: t.name }));
          await updateNotionPage(notionId, {
            Collection: { multi_select: newTags },
          });
        } else if (action === 'hide') {
          await updateNotionPage(notionId, {
            'Homepage Hidden': { checkbox: true },
          });
        } else if (action === 'show') {
          await updateNotionPage(notionId, {
            'Homepage Hidden': { checkbox: false },
          });
        }
        updated++;
        // Rate limit delay
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error processing ${notionId}:`, err);
      }
    }

    revalidatePath('/');
    return NextResponse.json({ success: true, updated }, { headers });
  } catch (err) {
    console.error('Error in bulk operation:', err);
    return NextResponse.json({ error: 'Failed to process bulk operation' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-bulk/route.ts
git commit -m "feat: add POST /api/admin-bulk for bulk tag/hide operations"
```

---

## Task 9: API Route — GET /api/admin-apps

**Files:**
- Create: `src/app/api/admin-apps/route.ts`

- [ ] **Step 1: Create the admin-apps route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, getAdminCorsHeaders, getCollections } from '@/lib/notion';
import type { App } from '@/lib/notion';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = getAdminCorsHeaders(origin);

  const password = req.nextUrl.searchParams.get('password');
  if (!password || !checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const search = (req.nextUrl.searchParams.get('search') || '').toLowerCase().trim();
  const collectionFilter = req.nextUrl.searchParams.get('collection') || '';
  const statusFilter = req.nextUrl.searchParams.get('status') || '';
  const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50');

  try {
    const collections = await getCollections();

    // Flatten and deduplicate apps by ID, collecting all tags
    const appMap = new Map<string, App & { allTags: string[]; missing: string[] }>();
    for (const col of collections) {
      if (col.type === 'seed') continue; // Exclude seed apps
      for (const app of col.apps) {
        const existing = appMap.get(app.id);
        if (existing) {
          // Merge tags
          if (!existing.allTags.includes(col.name)) {
            existing.allTags.push(col.name);
          }
        } else {
          const missing: string[] = [];
          if (!app.description) missing.push('description');
          if (!app.usage) missing.push('usage');
          if (!app.impact) missing.push('impact');
          if (!app.creator) missing.push('creator');

          appMap.set(app.id, {
            ...app,
            allTags: [col.name],
            missing,
          });
        }
      }
    }

    let apps = Array.from(appMap.values());

    // Apply search filter
    if (search) {
      apps = apps.filter(app =>
        app.name.toLowerCase().includes(search) ||
        app.creator.toLowerCase().includes(search) ||
        app.description.toLowerCase().includes(search) ||
        app.allTags.some(t => t.toLowerCase().includes(search))
      );
    }

    // Apply collection filter
    if (collectionFilter) {
      apps = apps.filter(app =>
        app.allTags.some(t => t.toLowerCase() === collectionFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter === 'missing') {
      apps = apps.filter(app => app.missing.length > 0);
    } else if (statusFilter === 'hidden') {
      apps = apps.filter(app => app.homepageHidden);
    }

    // Sort by sessions descending
    apps.sort((a, b) => b.sessions - a.sessions);

    const totalApps = apps.length;
    const totalPages = Math.ceil(totalApps / pageSize);
    const paged = apps.slice((page - 1) * pageSize, page * pageSize);

    // Map to response format
    const responseApps = paged.map(app => ({
      notionId: app.notionId,
      name: app.name,
      id: app.id,
      creator: app.creator,
      role: app.role,
      description: app.description,
      usage: app.usage,
      impact: app.impact,
      url: app.url,
      tags: app.allTags,
      sessions: app.sessions,
      iterations: app.iterations,
      homepageHidden: app.homepageHidden,
      collectionOrder: app.collectionOrder,
      missing: app.missing,
    }));

    return NextResponse.json({
      apps: responseApps,
      totalApps,
      page,
      totalPages,
    }, { headers });
  } catch (err) {
    console.error('Error fetching admin apps:', err);
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(origin) });
}
```

**Note:** `getCollections()` filters out seed collections (type `'seed'`) and hidden collections (`HIDDEN_COLLECTIONS`), which is the desired behavior per the spec. The `pageSize` query param defaults to 50 but can be overridden (used by AdminCollectionManager which needs all apps in a collection).

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-apps/route.ts
git commit -m "feat: add GET /api/admin-apps for paginated admin app listing"
```

---

## Task 10: Shared Tag Colors Utility + TagEditor Component

**Files:**
- Create: `src/lib/tagColors.ts`
- Create: `src/components/TagEditor.tsx`

- [ ] **Step 0: Create shared tag colors utility**

Create `src/lib/tagColors.ts` — shared by TagEditor and AdminAppsTable:

```typescript
export const TAG_COLORS = [
  { bg: '#e8f5e9', text: '#2e7d32' },
  { bg: '#e3f2fd', text: '#1565c0' },
  { bg: '#fff3e0', text: '#e65100' },
  { bg: '#f3e5f5', text: '#7b1fa2' },
  { bg: '#e0f2f1', text: '#00695c' },
  { bg: '#fce4ec', text: '#c62828' },
  { bg: '#fff8e1', text: '#f57f17' },
  { bg: '#e8eaf6', text: '#283593' },
  { bg: '#efebe9', text: '#4e342e' },
  { bg: '#f1f8e9', text: '#33691e' },
];

export function getTagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
```

- [ ] **Step 1: Create the TagEditor component**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { getTagColor } from '@/lib/tagColors';

interface TagEditorProps {
  appNotionId: string;
  currentTags: string[];
  password: string;
  onTagsChanged: (newTags: string[]) => void;
}

export default function TagEditor({ appNotionId, currentTags, password, onTagsChanged }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available tags on mount
  useEffect(() => {
    fetch(`/api/admin-tags?password=${encodeURIComponent(password)}`)
      .then(r => r.json())
      .then(data => {
        if (data.tags) {
          setAvailableTags(data.tags.map((t: { name: string }) => t.name));
        }
      })
      .catch(err => console.error('Failed to fetch tags:', err));
  }, [password]);

  // Update local state when prop changes
  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredTags = availableTags
    .filter(t => !tags.some(ct => ct.toLowerCase() === t.toLowerCase()))
    .filter(t => !searchValue || t.toLowerCase().includes(searchValue.toLowerCase()));

  const showCreateOption = searchValue.trim() &&
    !availableTags.some(t => t.toLowerCase() === searchValue.trim().toLowerCase());

  async function handleAddTag(tagName: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, notionId: appNotionId, action: 'add', tag: tagName }),
      });
      const data = await res.json();
      if (data.success) {
        const newTags = [...tags, tagName];
        setTags(newTags);
        onTagsChanged(newTags);
        setSearchValue('');
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
    setLoading(false);
  }

  async function handleRemoveTag(tagName: string) {
    setRemoving(tagName);
    try {
      const res = await fetch('/api/admin-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, notionId: appNotionId, action: 'remove', tag: tagName }),
      });
      const data = await res.json();
      if (data.success) {
        const newTags = tags.filter(t => t.toLowerCase() !== tagName.toLowerCase());
        setTags(newTags);
        onTagsChanged(newTags);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
    setRemoving(null);
  }

  async function handleCreateTag(tagName: string) {
    // Warn user: creating a new tag creates a new collection page on the site
    if (!window.confirm(`Create "${tagName}" as a new tag? This will create a new collection page on the site.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin-tags/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, tagName }),
      });
      const data = await res.json();
      if (data.success) {
        setAvailableTags(prev => [...prev, tagName]);
        // Now add the tag to this app
        await handleAddTag(tagName);
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26', marginBottom: 8 }}>
        Collection Tags
      </div>

      {/* Current tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {tags.map(tag => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              style={{
                background: color.bg,
                color: color.text,
                padding: '3px 8px',
                borderRadius: 12,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={removing === tag}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: color.text,
                  opacity: removing === tag ? 0.3 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={`Remove ${tag}`}
              >
                {removing === tag ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            </span>
          );
        })}
      </div>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={e => {
            setSearchValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search or create tag..."
          disabled={loading}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #d4d0c8',
            borderRadius: 6,
            fontSize: 13,
            background: '#fff',
            color: '#333',
            boxSizing: 'border-box',
          }}
        />

        {/* Dropdown */}
        {showDropdown && (filteredTags.length > 0 || showCreateOption) && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #d4d0c8',
              borderRadius: 6,
              marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 10,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filteredTags.map(tag => (
              <div
                key={tag}
                onClick={() => handleAddTag(tag)}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#333',
                  borderBottom: '1px solid #f0ece4',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#f5f3ef')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                {tag}
              </div>
            ))}
            {showCreateOption && (
              <div
                onClick={() => handleCreateTag(searchValue.trim())}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#6b9e5a',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#f5f3ef')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Plus size={14} /> Create "{searchValue.trim()}" as new tag
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 11, color: '#999', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Loader2 size={12} className="animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/TagEditor.tsx
git commit -m "feat: add TagEditor component with search, add, remove, and create"
```

---

## Task 11: BulkTagModal Component

**Files:**
- Create: `src/components/BulkTagModal.tsx`

- [ ] **Step 1: Create the BulkTagModal component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface BulkTagModalProps {
  action: 'addTag' | 'removeTag';
  selectedCount: number;
  selectedNotionIds: string[];
  password: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function BulkTagModal({
  action,
  selectedCount,
  selectedNotionIds,
  password,
  onComplete,
  onClose,
}: BulkTagModalProps) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/admin-tags?password=${encodeURIComponent(password)}`)
      .then(r => r.json())
      .then(data => {
        if (data.tags) {
          setAvailableTags(data.tags.map((t: { name: string }) => t.name));
        }
      })
      .catch(err => console.error('Failed to fetch tags:', err));
  }, [password]);

  const filteredTags = availableTags.filter(
    t => !searchValue || t.toLowerCase().includes(searchValue.toLowerCase())
  );

  async function handleConfirm() {
    if (!selectedTag) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          notionIds: selectedNotionIds,
          action,
          tag: selectedTag,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onComplete();
      }
    } catch (err) {
      console.error('Bulk operation failed:', err);
    }
    setLoading(false);
  }

  const actionLabel = action === 'addTag' ? 'Add' : 'Remove';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 400,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#2d2a26', fontSize: 16 }}>
            {actionLabel} Tag — {selectedCount} app{selectedCount !== 1 ? 's' : ''}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            <X size={20} />
          </button>
        </div>

        {!confirming ? (
          <>
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Search tags..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d4d0c8',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {filteredTags.map(tag => (
                <div
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setConfirming(true);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#333',
                    borderRadius: 6,
                    marginBottom: 2,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f5f3ef')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {tag}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 14, color: '#333', marginBottom: 20 }}>
              {actionLabel} "<strong>{selectedTag}</strong>" {action === 'addTag' ? 'to' : 'from'}{' '}
              <strong>{selectedCount}</strong> app{selectedCount !== 1 ? 's' : ''}?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #d4d0c8',
                  borderRadius: 8,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#666',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#6b9e5a',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Processing...' : `${actionLabel} Tag`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/BulkTagModal.tsx
git commit -m "feat: add BulkTagModal component for bulk tag operations"
```

---

## Task 12: AdminMissingFields Component (Extract from current admin page)

**Files:**
- Create: `src/components/AdminMissingFields.tsx`

- [ ] **Step 1: Extract the missing fields UI into its own component**

Move the main content from `src/app/admin/page.tsx` (the table, filters, stats) into a standalone component. The component receives `password` as a prop (authentication is handled by the parent AdminDashboard).

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface MissingApp {
  name: string;
  id: string;
  sessions: number;
  creator: string;
  url: string;
  missing: string[];
  collections: string[];
}

interface AdminMissingFieldsProps {
  password: string;
  onOpenApp?: (appId: string, collectionId: string) => void;
}

const FIELD_FILTERS = ['description', 'usage', 'impact', 'creator'];

export default function AdminMissingFields({ password, onOpenApp }: AdminMissingFieldsProps) {
  const [apps, setApps] = useState<MissingApp[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFieldFilters, setActiveFieldFilters] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin-missing?password=${encodeURIComponent(password)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setApps(data.apps || []);
          setTotalApps(data.totalApps || 0);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [password]);

  const toggleFilter = (field: string) => {
    setActiveFieldFilters(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const filteredApps = activeFieldFilters.length > 0
    ? apps.filter(app => activeFieldFilters.some(f => app.missing.includes(f)))
    : apps;

  const completion = totalApps > 0 ? Math.round(((totalApps - apps.length) / totalApps) * 100) : 100;

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading missing fields report...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#c53030' }}>{error}</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 10, padding: '12px 20px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2d2a26' }}>{apps.length}</div>
          <div style={{ fontSize: 12, color: '#999' }}>Apps Missing Fields</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 10, padding: '12px 20px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2d2a26' }}>{totalApps}</div>
          <div style={{ fontSize: 12, color: '#999' }}>Total Apps</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e4dc', borderRadius: 10, padding: '12px 20px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: completion >= 80 ? '#2e7d32' : '#e65100' }}>{completion}%</div>
          <div style={{ fontSize: 12, color: '#999' }}>Complete</div>
        </div>
      </div>

      {/* Field filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FIELD_FILTERS.map(field => (
          <button
            key={field}
            onClick={() => toggleFilter(field)}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              border: '1px solid #d4d0c8',
              background: activeFieldFilters.includes(field) ? '#6b9e5a' : 'transparent',
              color: activeFieldFilters.includes(field) ? '#fff' : '#666',
              cursor: 'pointer',
              fontSize: 12,
              textTransform: 'capitalize',
            }}
          >
            {field}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e8e4dc', color: '#999', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px' }}>App Name</th>
              <th style={{ padding: '10px 8px' }}>Sessions</th>
              <th style={{ padding: '10px 8px' }}>Missing Fields</th>
              <th style={{ padding: '10px 8px' }}>Collections</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map(app => (
              <tr
                key={app.id}
                style={{ borderBottom: '1px solid #f0ece4', cursor: 'pointer' }}
                onClick={() => {
                  if (onOpenApp && app.collections.length > 0) {
                    onOpenApp(app.id, app.collections[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }
                }}
              >
                <td style={{ padding: '10px 8px', color: '#2d2a26', fontWeight: 500 }}>{app.name}</td>
                <td style={{ padding: '10px 8px', color: '#999' }}>{app.sessions.toLocaleString()}</td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {app.missing.map(field => (
                      <span
                        key={field}
                        style={{
                          background: '#fff3e0',
                          color: '#e65100',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {app.collections.slice(0, 3).map(col => (
                      <span
                        key={col}
                        style={{
                          background: '#e3f2fd',
                          color: '#1565c0',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        {col}
                      </span>
                    ))}
                    {app.collections.length > 3 && (
                      <span style={{ fontSize: 11, color: '#999' }}>+{app.collections.length - 3}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredApps.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
          {apps.length === 0 ? 'All apps have complete fields!' : 'No apps match the selected filters.'}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/AdminMissingFields.tsx
git commit -m "feat: extract AdminMissingFields component from admin page"
```

---

## Task 13: AdminAppsTable Component

**Files:**
- Create: `src/components/AdminAppsTable.tsx`

- [ ] **Step 1: Create the AdminAppsTable component**

This is the largest new component. It fetches from `/api/admin-apps` and renders a paginated, searchable, filterable table with checkboxes for bulk operations.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import BulkTagModal from './BulkTagModal';
import { getTagColor } from '@/lib/tagColors';
import type { App } from '@/lib/notion';

interface AdminApp {
  notionId: string;
  name: string;
  id: string;
  creator: string;
  role: string;
  description: string;
  usage: string;
  impact: string;
  url: string;
  tags: string[];
  sessions: number;
  iterations: number;
  homepageHidden: boolean;
  collectionOrder: number;
  missing: string[];
}

interface AdminAppsTableProps {
  password: string;
  collections: string[];
  onOpenApp: (app: AdminApp) => void;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  teacher: { bg: '#e8f5e9', text: '#2e7d32' },
  student: { bg: '#f3e5f5', text: '#7b1fa2' },
  coach: { bg: '#e3f2fd', text: '#1565c0' },
  admin: { bg: '#fff3e0', text: '#e65100' },
};

export default function AdminAppsTable({ password, collections, onOpenApp }: AdminAppsTableProps) {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<'addTag' | 'removeTag' | null>(null);
  const [sortBy, setSortBy] = useState<'sessions' | 'name'>('sessions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      password,
      page: page.toString(),
      ...(search && { search }),
      ...(collectionFilter && { collection: collectionFilter }),
      ...(statusFilter && { status: statusFilter }),
    });

    try {
      const res = await fetch(`/api/admin-apps?${params}`);
      const data = await res.json();
      if (data.apps) {
        setApps(data.apps);
        setTotalApps(data.totalApps);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    }
    setLoading(false);
  }, [password, page, search, collectionFilter, statusFilter]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleSelect = (notionId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(notionId)) next.delete(notionId);
      else next.add(notionId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === apps.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(apps.map(a => a.notionId)));
    }
  };

  async function handleBulkHide(hidden: boolean) {
    const notionIds = Array.from(selected);
    try {
      await fetch('/api/admin-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          notionIds,
          action: hidden ? 'hide' : 'show',
        }),
      });
      setSelected(new Set());
      fetchApps();
    } catch (err) {
      console.error('Bulk hide failed:', err);
    }
  }

  return (
    <div>
      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search apps..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              border: '1px solid #d4d0c8',
              borderRadius: 6,
              fontSize: 13,
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={collectionFilter}
          onChange={e => { setCollectionFilter(e.target.value); setPage(1); }}
          style={{
            padding: '6px 10px',
            border: '1px solid #d4d0c8',
            borderRadius: 6,
            fontSize: 13,
            background: '#fff',
            color: '#333',
          }}
        >
          <option value="">All Collections</option>
          {collections.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: '6px 10px',
            border: '1px solid #d4d0c8',
            borderRadius: 6,
            fontSize: 13,
            background: '#fff',
            color: '#333',
          }}
        >
          <option value="">All Statuses</option>
          <option value="missing">Missing Fields</option>
          <option value="hidden">Hidden from Homepage</option>
        </select>

        <div style={{ flex: 1 }} />

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#666' }}>{selected.size} selected:</span>
            <button
              onClick={() => setBulkModal('addTag')}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#333' }}
            >
              Add Tag
            </button>
            <button
              onClick={() => setBulkModal('removeTag')}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#333' }}
            >
              Remove Tag
            </button>
            <button
              onClick={() => handleBulkHide(true)}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#333' }}
            >
              <EyeOff size={12} style={{ marginRight: 4 }} /> Hide
            </button>
            <button
              onClick={() => handleBulkHide(false)}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#333' }}
            >
              <Eye size={12} style={{ marginRight: 4 }} /> Show
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={16} className="animate-spin" /> Loading apps...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e4dc', color: '#999', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', width: 30 }}>
                  <input type="checkbox" checked={selected.size === apps.length && apps.length > 0} onChange={toggleSelectAll} />
                </th>
                <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => { if (sortBy === 'name') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('name'); setSortDir('asc'); } }}>App Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 8px' }}>Creator</th>
                <th style={{ padding: '10px 8px' }}>Role</th>
                <th style={{ padding: '10px 8px' }}>Collections</th>
                <th style={{ padding: '10px 8px', cursor: 'pointer' }} onClick={() => { if (sortBy === 'sessions') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('sessions'); setSortDir('desc'); } }}>Sessions {sortBy === 'sessions' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...apps].sort((a, b) => {
                const dir = sortDir === 'asc' ? 1 : -1;
                if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
                return dir * (a.sessions - b.sessions);
              }).map(app => (
                <tr
                  key={app.notionId}
                  style={{
                    borderBottom: '1px solid #f0ece4',
                    cursor: 'pointer',
                    opacity: app.homepageHidden ? 0.6 : 1,
                  }}
                  onClick={() => onOpenApp(app)}
                  onMouseOver={e => (e.currentTarget.style.background = '#faf9f6')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(app.notionId)}
                      onChange={() => toggleSelect(app.notionId)}
                    />
                  </td>
                  <td style={{ padding: '10px 8px', color: '#2d2a26', fontWeight: 500 }}>
                    {app.name}
                    {app.homepageHidden && (
                      <span style={{ background: '#fde2e2', color: '#c53030', padding: '1px 6px', borderRadius: 4, fontSize: 10, marginLeft: 6 }}>
                        Hidden
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', color: app.creator ? '#333' : '#ccc', fontStyle: app.creator ? 'normal' : 'italic' }}>
                    {app.creator || '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {app.role ? (
                      <span style={{
                        background: (ROLE_COLORS[app.role.toLowerCase()] || { bg: '#f5f5f5' }).bg,
                        color: (ROLE_COLORS[app.role.toLowerCase()] || { text: '#666' }).text,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                      }}>
                        {app.role}
                      </span>
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {app.tags.slice(0, 3).map(tag => {
                        const color = getTagColor(tag);
                        return (
                          <span key={tag} style={{ background: color.bg, color: color.text, padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                            {tag}
                          </span>
                        );
                      })}
                      {app.tags.length > 3 && (
                        <span style={{ fontSize: 11, color: '#999' }}>+{app.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#999' }}>
                    {app.sessions.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {app.missing.length > 0 ? (
                      <span style={{ color: '#e65100', fontSize: 11 }}>
                        Missing: {app.missing.join(', ')}
                      </span>
                    ) : (
                      <span style={{ color: '#2e7d32', fontSize: 11 }}>Complete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 12, color: '#999' }}>
            Showing {((page - 1) * 50) + 1}-{Math.min(page * 50, totalApps)} of {totalApps}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: page === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: '4px 10px', fontSize: 12, color: '#666' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '4px 10px', border: '1px solid #d4d0c8', borderRadius: 6, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 12, opacity: page === totalPages ? 0.5 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {bulkModal && (
        <BulkTagModal
          action={bulkModal}
          selectedCount={selected.size}
          selectedNotionIds={Array.from(selected)}
          password={password}
          onComplete={() => {
            setBulkModal(null);
            setSelected(new Set());
            fetchApps();
          }}
          onClose={() => setBulkModal(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/AdminAppsTable.tsx
git commit -m "feat: add AdminAppsTable component with search, filter, sort, and bulk ops"
```

---

## Task 14: AdminCollectionManager Component

**Files:**
- Create: `src/components/AdminCollectionManager.tsx`

- [ ] **Step 1: Create the AdminCollectionManager component**

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ManagerApp {
  notionId: string;
  name: string;
  id: string;
  sessions: number;
  homepageHidden: boolean;
  collectionOrder: number;
}

interface AdminCollectionManagerProps {
  password: string;
  collections: string[];
}

export default function AdminCollectionManager({ password, collections }: AdminCollectionManagerProps) {
  const [selectedCollection, setSelectedCollection] = useState(collections[0] || '');
  const [apps, setApps] = useState<ManagerApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<ManagerApp[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchApps = useCallback(async () => {
    if (!selectedCollection) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        password,
        page: '1',
        collection: selectedCollection,
      });
      // Fetch enough apps — use a large page or all
      const res = await fetch(`/api/admin-apps?${params}&pageSize=200`);
      const data = await res.json();
      if (data.apps) {
        const sorted = data.apps
          .map((a: any) => ({
            notionId: a.notionId,
            name: a.name,
            id: a.id,
            sessions: a.sessions,
            homepageHidden: a.homepageHidden,
            collectionOrder: a.collectionOrder,
          }))
          .sort((a: ManagerApp, b: ManagerApp) => {
            // Visible first, then hidden
            if (a.homepageHidden !== b.homepageHidden) return a.homepageHidden ? 1 : -1;
            // Then by collectionOrder
            if (a.collectionOrder !== b.collectionOrder) return a.collectionOrder - b.collectionOrder;
            // Then by sessions
            return b.sessions - a.sessions;
          });
        setApps(sorted);
        setOriginalOrder(sorted);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to fetch collection apps:', err);
    }
    setLoading(false);
  }, [password, selectedCollection]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const visibleApps = apps.filter(a => !a.homepageHidden);
  const hiddenApps = apps.filter(a => a.homepageHidden);

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;

    const visible = [...visibleApps];
    const draggedApp = visible.splice(dragItem.current, 1)[0];
    visible.splice(dragOverItem.current, 0, draggedApp);

    setApps([...visible, ...hiddenApps]);
    setHasChanges(true);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function handleToggleHidden(notionId: string, hidden: boolean) {
    try {
      await fetch('/api/admin-hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          apps: [{ notionId, hidden }],
        }),
      });

      setApps(prev =>
        prev.map(a => a.notionId === notionId ? { ...a, homepageHidden: hidden } : a)
      );
      setHasChanges(true);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  }

  async function handleSaveOrder() {
    setSaving(true);
    try {
      const appOrder = visibleApps.map((app, i) => ({
        notionId: app.notionId,
        order: i + 1,
      }));

      await fetch('/api/admin-collection-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          collection: selectedCollection,
          appOrder,
        }),
      });

      setHasChanges(false);
      setOriginalOrder([...apps]);
    } catch (err) {
      console.error('Failed to save order:', err);
    }
    setSaving(false);
  }

  function handleReset() {
    setApps(originalOrder);
    setHasChanges(false);
  }

  return (
    <div>
      {/* Collection Picker */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <select
          value={selectedCollection}
          onChange={e => setSelectedCollection(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d4d0c8',
            borderRadius: 8,
            fontSize: 14,
            background: '#fff',
            color: '#333',
            fontWeight: 500,
          }}
        >
          {collections.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {hasChanges && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              style={{
                background: '#6b9e5a',
                color: '#fff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Order'}
            </button>
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                color: '#999',
                border: '1px solid #d4d0c8',
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : (
        <>
          {/* Visible Apps (draggable) */}
          <div style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
            Homepage Order — drag to reorder
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {visibleApps.map((app, index) => (
              <div
                key={app.notionId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid #e8e4dc',
                  borderRadius: 8,
                  cursor: 'grab',
                }}
              >
                <GripVertical size={16} style={{ color: '#ccc', flexShrink: 0 }} />
                <span style={{ color: '#999', fontSize: 12, width: 20, flexShrink: 0 }}>{index + 1}</span>
                <span style={{ fontSize: 13, color: '#2d2a26', flex: 1, fontWeight: 500 }}>{app.name}</span>
                <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{app.sessions.toLocaleString()} sessions</span>
                <button
                  onClick={e => { e.stopPropagation(); handleToggleHidden(app.notionId, true); }}
                  title="Hide from homepage"
                  style={{ background: 'none', border: '1px solid #d4d0c8', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#999', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <EyeOff size={12} /> Hide
                </button>
              </div>
            ))}
            {visibleApps.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
                No visible apps in this collection.
              </div>
            )}
          </div>

          {/* Hidden Apps */}
          {hiddenApps.length > 0 && (
            <>
              <div style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
                Hidden from homepage ({hiddenApps.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {hiddenApps.map(app => (
                  <div
                    key={app.notionId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: '#fafaf8',
                      border: '1px dashed #d4d0c8',
                      borderRadius: 8,
                      opacity: 0.6,
                    }}
                  >
                    <GripVertical size={16} style={{ color: '#eee', flexShrink: 0 }} />
                    <span style={{ color: '#999', fontSize: 12, width: 20, flexShrink: 0 }}>—</span>
                    <span style={{ fontSize: 13, color: '#999', flex: 1 }}>{app.name}</span>
                    <span style={{ fontSize: 11, color: '#ccc', flexShrink: 0 }}>{app.sessions.toLocaleString()} sessions</span>
                    <button
                      onClick={() => handleToggleHidden(app.notionId, false)}
                      style={{ background: 'none', border: '1px solid #d4d0c8', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#6b9e5a', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Eye size={12} /> Show
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Summary */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e8e4dc', fontSize: 12, color: '#999' }}>
            {visibleApps.length} visible on homepage &middot; {hiddenApps.length} hidden
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/AdminCollectionManager.tsx
git commit -m "feat: add AdminCollectionManager with drag-and-drop reorder and hide/show"
```

---

## Task 15: AdminDashboard Component (Tabbed Container)

**Files:**
- Create: `src/components/AdminDashboard.tsx`

- [ ] **Step 1: Create the AdminDashboard component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, FolderOpen, AlertCircle, Download, RefreshCw, LogOut } from 'lucide-react';
import AdminAppsTable from './AdminAppsTable';
import AdminCollectionManager from './AdminCollectionManager';
import AdminMissingFields from './AdminMissingFields';
import type { App } from '@/lib/notion';

interface AdminDashboardProps {
  password: string;
  onOpenApp: (app: any) => void;
  onExitAdmin: () => void;
}

type Tab = 'apps' | 'collections' | 'missing';

export default function AdminDashboard({ password, onOpenApp, onExitAdmin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('apps');
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available collection names for filters and manager
  useEffect(() => {
    fetch(`/api/admin-tags?password=${encodeURIComponent(password)}`)
      .then(r => r.json())
      .then(data => {
        if (data.tags) {
          setCollections(data.tags.map((t: { name: string }) => t.name).sort());
        }
      })
      .catch(err => console.error('Failed to fetch collections:', err))
      .finally(() => setLoading(false));
  }, [password]);

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'apps', label: 'Apps', icon: LayoutGrid },
    { id: 'collections', label: 'Collections', icon: FolderOpen },
    { id: 'missing', label: 'Missing Fields', icon: AlertCircle },
  ];

  async function handleRefresh() {
    try {
      await fetch('/api/revalidate', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e8e4dc',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2d2a26' }}>
            Apps Manager
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`/api/export-csv?password=${encodeURIComponent(password)}`}
            style={{
              padding: '6px 12px',
              border: '1px solid #d4d0c8',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              color: '#333',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download size={14} /> Export CSV
          </a>
          <button
            onClick={handleRefresh}
            style={{
              padding: '6px 12px',
              border: '1px solid #d4d0c8',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={onExitAdmin}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: 6,
              background: '#c53030',
              cursor: 'pointer',
              fontSize: 12,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <LogOut size={14} /> Exit Admin
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e8e4dc',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#2d2a26' : '#999',
                borderBottom: isActive ? '2px solid #6b9e5a' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {activeTab === 'apps' && (
          <AdminAppsTable
            password={password}
            collections={collections}
            onOpenApp={onOpenApp}
          />
        )}
        {activeTab === 'collections' && (
          <AdminCollectionManager
            password={password}
            collections={collections}
          />
        )}
        {activeTab === 'missing' && (
          <AdminMissingFields password={password} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/AdminDashboard.tsx
git commit -m "feat: add AdminDashboard tabbed container component"
```

---

## Task 16: Update Admin Page to Use New Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Rewrite the admin page**

Replace the entire content of `src/app/admin/page.tsx` with:

```typescript
'use client';

import { useState } from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import AppDrawer from '@/components/AppDrawer';
import type { App } from '@/lib/notion';

const ADMIN_PWD_KEY = 'playlab-admin-pwd';
const ADMIN_MODE_KEY = 'playlab-admin-mode';

function PasswordModal({ onSuccess }: { onSuccess: (pwd: string) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    const res = await fetch(`/api/admin-missing?password=${encodeURIComponent(input)}`);
    if (res.ok) {
      sessionStorage.setItem(ADMIN_PWD_KEY, input);
      sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
      onSuccess(input);
    } else {
      setError('Invalid password');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f7f4',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 32,
        width: 360,
        border: '1px solid #e8e4dc',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 8px', color: '#2d2a26', fontSize: 20 }}>Admin Dashboard</h2>
        <p style={{ margin: '0 0 20px', color: '#999', fontSize: 13 }}>Enter the admin password to continue</p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #d4d0c8',
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        {error && <p style={{ color: '#c53030', fontSize: 12, margin: '0 0 12px' }}>{error}</p>}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '10px',
            background: '#6b9e5a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ADMIN_PWD_KEY);
    }
    return null;
  });
  const [drawerApp, setDrawerApp] = useState<App | null>(null);

  function handleExitAdmin() {
    sessionStorage.removeItem(ADMIN_PWD_KEY);
    sessionStorage.removeItem(ADMIN_MODE_KEY);
    setPassword(null);
  }

  function handleOpenApp(app: any) {
    // Map admin app response to App type for AppDrawer
    setDrawerApp({
      id: app.id,
      name: app.name,
      description: app.description || '',
      url: app.url || '',
      creator: app.creator || '',
      role: app.role || '',
      usage: app.usage || '',
      impact: app.impact || '',
      sessions: app.sessions || 0,
      iterations: app.iterations || 0,
      pinned: false,
      homepageOrder: 999,
      tags: app.tags || [],
      notionId: app.notionId || '',
      homepageHidden: app.homepageHidden || false,
      collectionOrder: app.collectionOrder || 999,
    });
  }

  if (!password) {
    return <PasswordModal onSuccess={setPassword} />;
  }

  return (
    <>
      <AdminDashboard
        password={password}
        onOpenApp={handleOpenApp}
        onExitAdmin={handleExitAdmin}
      />
      <AppDrawer
        app={drawerApp}
        allApps={[]}
        onClose={() => setDrawerApp(null)}
        onAppUpdated={(app, fields) => {
          setDrawerApp(prev => prev ? { ...prev, ...fields } : null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/admin/page.tsx
git commit -m "feat: replace admin page with new tabbed AdminDashboard"
```

---

## Task 17: Add TagEditor to AdminPanel

**Files:**
- Modify: `src/components/AdminPanel.tsx:103-312`

- [ ] **Step 1: Import TagEditor**

At the top of `src/components/AdminPanel.tsx`, add the import:

```typescript
import TagEditor from './TagEditor';
```

- [ ] **Step 2: Add TagEditor to AdminEditPanel render**

In the `AdminEditPanel` component, add the TagEditor after the existing form fields (before the Save/Pin buttons section). You'll need to pass the app's `notionId`, `tags`, the admin password, and a callback for when tags change.

Find the pin button section in AdminEditPanel and add before it:

```typescript
{/* Tag Editor */}
{app.notionId && (
  <TagEditor
    appNotionId={app.notionId}
    currentTags={app.tags || []}
    password={sessionStorage.getItem('playlab-admin-pwd') || ''}
    onTagsChanged={(newTags) => {
      onAppUpdated({ tags: newTags });
    }}
  />
)}
```

Note: The `app.notionId` guard ensures the TagEditor only renders for apps that have the new field. Apps loaded from older cached data without `notionId` will gracefully skip the tag editor.

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/AdminPanel.tsx
git commit -m "feat: add TagEditor to AdminPanel for per-app tag management"
```

---

## Task 18: Fix admin-pin Missing revalidatePath

**Files:**
- Modify: `src/app/api/admin-pin/route.ts`

- [ ] **Step 1: Add revalidatePath to admin-pin**

Add the import at the top of the file:
```typescript
import { revalidatePath } from 'next/cache';
```

Then add `revalidatePath('/')` after the successful `notion.pages.update()` call, before the return statement.

- [ ] **Step 2: Also add revalidatePath to admin-save**

Similarly, `src/app/api/admin-save/route.ts` is missing `revalidatePath`. Add the same import and call after the successful `notion.pages.update()`.

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/app/api/admin-pin/route.ts src/app/api/admin-save/route.ts
git commit -m "fix: add missing revalidatePath to admin-pin and admin-save endpoints"
```

---

## Task 19: Update HomePage Sorting Logic

**Files:**
- Modify: `src/components/HomePage.tsx:81-343` (CollectionSection component)

- [ ] **Step 1: Update CollectionSection to use new pickPreview**

The `CollectionSection` component in `HomePage.tsx` currently calls `pickPreview` at around line 150. The function signature hasn't changed (`pickPreview(apps, count, collectionName)`), so the call site should still work after the Task 2 rewrite.

However, verify that `pickPreview` is being called correctly. The key change is that `pickPreview` now uses `homepageHidden` and `collectionOrder` instead of `pinned` and `homepageOrder`. Since the data comes from Notion and is parsed by `parseRow`, the new fields should flow through automatically.

Check that the drag-and-drop reorder in `CollectionSection` (lines 152-214) still works. The existing drag-and-drop calls `/api/admin-reorder` which uses the old `Homepage Order` field. This needs to be updated to use `/api/admin-collection-order` with `notionId` instead of `appName`.

Find the save order handler in CollectionSection (around line 172) and update:

Old pattern:
```typescript
const res = await fetch('/api/admin-reorder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: sessionStorage.getItem('playlab-admin-pwd'),
    appOrder: orderedApps.map((app, i) => ({ appName: app.name, order: i + 1 })),
  }),
});
```

New pattern:
```typescript
const res = await fetch('/api/admin-collection-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: sessionStorage.getItem('playlab-admin-pwd'),
    collection: collection.name,
    appOrder: orderedApps.map((app, i) => ({ notionId: app.notionId, order: i + 1 })),
  }),
});
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`

- [ ] **Step 3: Test locally**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run dev`

Verify:
- Homepage loads and shows collections
- Apps appear in correct order (ordered apps first, then by sessions)
- Admin mode drag-and-drop still works

- [ ] **Step 4: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add src/components/HomePage.tsx
git commit -m "feat: update HomePage to use new collection-order API endpoint"
```

---

## Task 20: Migration Script

**Files:**
- Create: `scripts/migrate-pins.ts`

- [ ] **Step 1: Create the migration script**

This one-time script reads all apps with `Homepage = true` and copies their `Homepage Order` to `Collection Order`, and ensures `Homepage Hidden = false`.

```typescript
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_MASTER_DB_ID!;

async function migrate() {
  console.log('Migrating pinned apps to new Collection Order system...');

  // Fetch all pages with Homepage = true
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

  // Update each app
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
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

- [ ] **Step 2: Run the migration**

First, ensure the `Homepage Hidden` and `Collection Order` properties exist in the Notion database. You may need to create them manually in Notion first, or they'll be auto-created on first write.

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npx tsx scripts/migrate-pins.ts`

Expected: Each pinned app gets updated with its order number.

- [ ] **Step 3: Commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add scripts/migrate-pins.ts
git commit -m "feat: add one-time migration script for pin → collectionOrder"
```

---

## Task 21: End-to-End Verification

- [ ] **Step 1: Start dev server and verify all features**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run dev`

Verify each feature:

1. **Homepage** — loads, apps display in correct order, hidden apps not shown
2. **Admin login** — enter password, toolbar appears
3. **Admin dashboard** (`/admin`) — three tabs load
4. **Apps Table** — search works, filters work, pagination works
5. **Click app row** — AppDrawer opens with edit panel
6. **TagEditor in drawer** — shows current tags, can add/remove tags
7. **Bulk select** — check multiple apps, bulk action buttons appear
8. **Bulk add tag** — modal appears, confirm adds tag to all selected
9. **Collection Manager** — pick collection, apps listed, drag to reorder
10. **Save order** — persists to Notion, page refreshes
11. **Hide/Show** — toggle visibility, hidden apps move to bottom
12. **Missing Fields tab** — shows report, filters work

- [ ] **Step 2: Build for production**

Run: `cd /Users/wymankhuu/Desktop/Projects/playlab-gardens && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit**

```bash
cd /Users/wymankhuu/Desktop/Projects/playlab-gardens
git add -A
git commit -m "feat: admin dashboard upgrade — complete implementation"
```
