# Admin Dashboard Upgrade — Design Spec

**Date:** 2026-03-23
**Status:** Draft

## Overview

Upgrade the Playlab Gardens admin dashboard from a missing-fields report to a full app management hub with tag management, collection ordering, homepage curation, and bulk operations.

## Goals

1. **Tag management** — add/remove existing collection tags per app, create new tags (which become new collection pages)
2. **Collection ordering** — control the order of apps within each collection on the homepage
3. **Homepage curation** — hide specific apps from the homepage while keeping them on collection detail pages
4. **Admin dashboard** — table view for bulk ops + drawer for detailed editing
5. **Creator fields** — name + role accessible from the admin table

## Data Model Changes

### New Notion Properties (Master DB)

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `Homepage Hidden` | Checkbox | `false` | When `true`, app is excluded from homepage gardens sections. Still visible on `/collection/[id]`. |
| `Collection Order` | Number | (empty) | Global sort weight across all collections on the homepage. Lower number = higher position. Empty = sort by session count. This is a single global value, not per-collection — an app at position 2 appears at position 2 in every collection it belongs to. |

### App Type Update (`src/lib/notion.ts`)

```typescript
interface App {
  // existing fields unchanged
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
  pinned: boolean;        // deprecated, kept for migration
  homepageOrder: number;  // deprecated, kept for migration
  tags: string[];

  // new fields
  notionId: string;       // Notion page ID for reliable write operations
  homepageHidden: boolean;
  collectionOrder: number;
}
```

**Key change: `notionId`** — All existing admin endpoints identify apps by `appName` using a Notion title query, which is fragile if two apps share the same name. The `notionId` (Notion page UUID) is already available during `fetchAllRows()` via `row.id`. All new endpoints use `notionId` for write operations (direct page update, no query step). Existing endpoints will be migrated to use `notionId` as well.

### Migration

Existing pinned apps get their `homepageOrder` values copied to `collectionOrder`. Apps with `Homepage = true` get `Homepage Hidden = false`. A one-time migration script handles this. After migration, the `Homepage` and `Homepage Order` fields are no longer used by the application (but remain in Notion for reference).

## API Routes

All new endpoints are password-protected using the existing `ADMIN_PASSWORD` pattern. All mutation endpoints call `revalidatePath('/')` after successful writes. All batch operations (bulk tag, reorder) use sequential Notion API calls with small delays (~200ms) to avoid 429 rate limit errors. The existing `admin-reorder` endpoint's `Promise.all` pattern must be refactored to sequential execution.

### New Endpoints

#### `GET /api/admin-tags`
Fetch all available collection tag names from the Notion database schema (multi-select options). Used to populate the TagEditor autocomplete.

```
GET /api/admin-tags?password=...
```

Response:
```json
{
  "tags": [
    { "name": "Math", "color": "blue" },
    { "name": "Science", "color": "green" },
    { "name": "ELA", "color": "orange" }
  ]
}
```

#### `POST /api/admin-tags`
Add or remove collection tags on a single app.

```json
{
  "password": "...",
  "notionId": "abc123-...",
  "action": "add" | "remove",
  "tag": "Science"
}
```

#### `POST /api/admin-tags/create`
Create a brand new collection tag (Notion multi-select option). This automatically creates a new collection page on the site since collections are derived from tag values.

```json
{
  "password": "...",
  "tagName": "Computer Science"
}
```

#### `POST /api/admin-hide`
Toggle `Homepage Hidden` on one or more apps.

```json
{
  "password": "...",
  "apps": [
    { "notionId": "abc123-...", "hidden": true },
    { "notionId": "def456-...", "hidden": true }
  ]
}
```

#### `POST /api/admin-collection-order`
Save global ordering for apps. The `collection` field is informational (for logging/debugging) — the `collectionOrder` value is a global sort weight stored on each app.

```json
{
  "password": "...",
  "collection": "Math",
  "appOrder": [
    { "notionId": "abc123-...", "order": 1 },
    { "notionId": "def456-...", "order": 2 },
    { "notionId": "ghi789-...", "order": 3 }
  ]
}
```

#### `POST /api/admin-bulk`
Bulk operations for multiple selected apps.

```json
{
  "password": "...",
  "notionIds": ["abc123-...", "def456-...", "ghi789-..."],
  "action": "addTag" | "removeTag" | "hide" | "show",
  "tag": "Science"
}
```

#### `GET /api/admin-apps`
Paginated, searchable, filterable list of all apps for the admin table. Returns the full App shape so the AppDrawer can work without a second fetch. Uses in-memory pagination over the cached `getCollections()` result (suitable for ~500 apps).

```
GET /api/admin-apps?password=...&page=1&search=math&collection=Math&status=missing
```

Response:
```json
{
  "apps": [
    {
      "notionId": "abc123-...",
      "name": "Math Problem Solver",
      "id": "math-problem-solver",
      "creator": "Jane Smith",
      "role": "Teacher",
      "description": "An AI tutor that helps students...",
      "usage": "Used in 5th grade classrooms...",
      "impact": "Students showed 20% improvement...",
      "url": "https://playlab.ai/project/...",
      "tags": ["Math", "Middle School"],
      "sessions": 1247,
      "iterations": 24,
      "homepageHidden": false,
      "collectionOrder": 1,
      "missing": []
    }
  ],
  "totalApps": 487,
  "page": 1,
  "totalPages": 10
}
```

### Deprecated Endpoints

- `/api/admin-pin` — replaced by `/api/admin-hide`
- `/api/admin-reorder` — replaced by `/api/admin-collection-order`

These continue to work during migration but are no longer called by the UI. The existing `admin-pin` endpoint should be updated to call `revalidatePath('/')` (currently missing).

## Admin Dashboard (`/admin`)

### Layout

Password-protected page with three tabs:

#### Tab 1: Apps Table (default)

- **Search bar** — full-text search across app names, creators, descriptions
- **Filter dropdowns** — Collection (all collections), Status (All / Missing Fields / Hidden)
- **Sortable columns** — App Name, Creator, Role, Collections, Sessions, Status
- **Checkboxes** — multi-select for bulk operations
- **Bulk action bar** — appears when apps are selected: Add Tag, Remove Tag, Hide from Homepage, Show on Homepage
- **Click row** — opens existing AppDrawer with AdminPanel for detailed editing (creator, role, description, usage, impact). The full App shape is available from the `/api/admin-apps` response, so no secondary fetch is needed.
- **Pagination** — 50 apps per page (in-memory over cached data)
- **Tags inline** — shown as colored pills matching existing site pill colors

#### Tab 2: Collection Manager

- **Collection dropdown** — pick which collection to manage
- **Draggable list** — all apps in the selected collection, sorted by current `collectionOrder`
  - Drag handle + position number + app name + session count
  - Hidden apps shown at bottom with dashed border, faded opacity, "Show" button
- **Save Order / Reset buttons** — persist ordering to Notion via `/api/admin-collection-order`
- **"Add app to homepage" button** — reveals hidden apps for re-inclusion
- **Summary line** — "6 visible on homepage, 3 hidden"
- **Note:** `collectionOrder` is a global sort weight. When reordering apps in one collection's view, the order numbers assigned are global. If an app belongs to multiple collections, changing its order here affects all collections.

#### Tab 3: Missing Fields

- Existing missing fields report (currently the entire `/admin` page)
- Apps sorted by session count with missing field indicators
- Filterable by missing field type (description, usage, impact, creator)
- Deep links to open the app in the drawer

### Theme

Matches existing Playlab Gardens earth-tone palette (warm greens, cream backgrounds, rounded corners). Same visual language as the rest of the site.

## Tag Editor Component

Reusable component that appears in two contexts:

### Single-App Mode (inside AdminPanel in AppDrawer)

- **Current tags** — displayed as colored pills with X button to remove
- **Search input** — filters existing Notion multi-select options as you type (fetched from `GET /api/admin-tags`)
- **Fuzzy matching** — typing "sci" shows "Science", "Social Studies"
- **Create option** — `+ Create "xyz" as new tag` shown when input doesn't match existing tags
- **Immediate save** — tag changes save on click (no separate save button)
- **Warning on new tag** — "This will create a new collection page on the site"

### Bulk Mode (modal from admin table)

- **Modal overlay** — triggered from bulk action bar when apps are selected
- **Same searchable dropdown** as single-app mode
- **Confirmation** — "Add 'Science' tag to 12 apps?" before executing
- **Batch API call** — uses `/api/admin-bulk` endpoint

### Tag Colors

Each tag gets a consistent color derived from its name (hash-based), matching the existing collection pill color system on the site.

## Homepage Display Logic

### Current Logic (being replaced)

1. Pinned apps first (sorted by `homepageOrder`)
2. Unpinned apps by session count (max 1 per creator for diversity)
3. Show 6 apps per collection (9 in admin mode)

### New Logic

1. Filter out apps where `homepageHidden === true`
2. Sort by `collectionOrder` ascending (lower number = first)
3. Apps without a `collectionOrder` value sort after ordered apps, by session count
4. "Max 1 per creator" diversity rule applies only to unordered apps (those without `collectionOrder`)
5. Show 6 apps per collection (9 in admin mode) — unchanged

The existing `pickPreview` function in `src/lib/notion.ts` is replaced by this new logic. The function will be rewritten to implement steps 1-5 above.

### Collection Detail Pages

No change. `/collection/[id]` continues showing ALL apps in the collection regardless of `homepageHidden` status.

### Seed Apps

Seed collection apps (type `'seed'`, from `SEEDS_DB_ID`) are **excluded** from the admin dashboard and from `homepageHidden`/`collectionOrder` logic. They come from a separate Notion database and lack these properties. The admin table only shows apps from the Master DB.

## Component Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AdminDashboard` | `src/components/AdminDashboard.tsx` | Main tabbed dashboard (client component) |
| `AdminAppsTable` | `src/components/AdminAppsTable.tsx` | Searchable/filterable/sortable apps table |
| `AdminCollectionManager` | `src/components/AdminCollectionManager.tsx` | Per-collection drag-and-drop reorder + hide/show |
| `AdminMissingFields` | `src/components/AdminMissingFields.tsx` | Extracted from current `/admin` page |
| `TagEditor` | `src/components/TagEditor.tsx` | Reusable tag add/remove/create component |
| `BulkTagModal` | `src/components/BulkTagModal.tsx` | Modal for bulk tag operations |

### Modified Components

| Component | Changes |
|-----------|---------|
| `AdminPanel` | Add `TagEditor` below existing fields |
| `HomePage` | Replace `pickPreview` with new sorting/filtering logic (`collectionOrder` + `homepageHidden`) |
| `src/lib/notion.ts` | Add `notionId`, `homepageHidden`, and `collectionOrder` to App type and fetch logic. Rewrite `pickPreview`. |
| `src/app/admin/page.tsx` | Replace with new `AdminDashboard` component |

### Unchanged Components

`AppDrawer`, `AdminToolbar`, `CollectionPage`, `PreviewAppCard`, `SearchOverlay` — no changes needed.

## Error Handling

- **Notion API rate limits** — all batch operations (bulk tag, reorder) use sequential API calls with ~200ms delays to avoid 429s. The existing `admin-reorder` endpoint's `Promise.all` pattern must be refactored to sequential execution.
- **Optimistic UI** — tag adds/removes and reordering update the UI immediately, revert on API failure
- **Stale data** — after any mutation, `revalidatePath('/')` is called to refresh the Next.js cache. The existing `admin-pin` endpoint is missing this and should be fixed.
- **New tag validation** — prevent creating duplicate tags (case-insensitive check against existing options)

## Non-Goals

- No new creator fields beyond name + role (kept simple for now)
- No per-collection ordering — `collectionOrder` is a global sort weight (same position in every collection the app belongs to)
- No app deletion from admin UI — apps are managed in Notion directly
- No role-based access control — single password for all admin features
- No admin management of seed apps — seeds come from a separate Notion database
