# Migration Guide: Unified Research System

**Last Updated:** 2025-10-21
**Deprecation Date:** 2025-10-21
**Removal Timeline:** TBD (backward compatibility maintained)

---

## Overview

The AI Brainstorm Platform has unified its research capabilities by combining **LiveResearchAgent**, **DocumentResearchAgent**, and **ResearchSuggestionAgent** into a single **UnifiedResearchAgent**.

This migration guide helps you transition from the old separate research systems to the new unified approach.

---

## What Changed?

### Before (3 Separate Systems)

**1. LiveResearchAgent** - Web research only
```typescript
POST /api/research/query
{
  query: "React best practices",
  projectId: "...",
  userId: "...",
  maxSources: 5
}
```

**2. DocumentResearchAgent** - Document discovery only
```typescript
POST /api/research/document-research/start
{
  projectId: "...",
  userId: "...",
  initialMessage: "What docs do I need?"
}
```

**3. ResearchSuggestionAgent** - Gap analysis only
```typescript
GET /api/research/suggestions/:projectId
```

### After (1 Unified System)

**UnifiedResearchAgent** - All research in one place
```typescript
POST /api/research/unified
{
  query: "React best practices",
  projectId: "...",
  userId: "...",
  sources: "auto",  // or "web", "documents", "all"
  intent: "research",  // or "document_discovery", "gap_analysis"
  maxWebSources: 5,
  maxDocumentSources: 10
}
```

---

## Migration Steps

### Step 1: Identify Your Use Case

Determine which intent matches your current usage:

| Old System | New Intent | Source Mode |
|-----------|-----------|-------------|
| LiveResearchAgent | `research` | `web` or `auto` |
| DocumentResearchAgent | `document_discovery` | `web` or `auto` |
| ResearchSuggestionAgent | `gap_analysis` | `documents` |
| Custom combination | `research` | `all` |

### Step 2: Update API Calls

#### Migration Example 1: Web Research

**Old (LiveResearchAgent):**
```typescript
import { liveResearchApi } from '@/services/api';

const result = await liveResearchApi.submitQuery({
  query: "React Server Components best practices",
  projectId: projectId,
  userId: userId,
  maxSources: 5
});
```

**New (UnifiedResearchAgent):**
```typescript
import { unifiedResearchApi } from '@/services/api';

const result = await unifiedResearchApi.submitQuery({
  query: "React Server Components best practices",
  projectId: projectId,
  userId: userId,
  sources: 'web',  // or 'auto' to let AI decide
  intent: 'research',
  maxWebSources: 5
});
```

#### Migration Example 2: Document Discovery

**Old (DocumentResearchAgent):**
```typescript
import { documentResearchApi } from '@/services/api';

// Start session
const session = await documentResearchApi.startSession({
  projectId: projectId,
  userId: userId,
  initialMessage: "What documentation do I need for my healthcare app?"
});

// Send message
const response = await documentResearchApi.sendMessage({
  sessionId: session.sessionId,
  message: "It handles patient data",
  projectId: projectId
});
```

**New (UnifiedResearchAgent):**
```typescript
import { unifiedResearchApi } from '@/services/api';

const result = await unifiedResearchApi.submitQuery({
  query: "What documentation do I need for my healthcare app that handles patient data?",
  projectId: projectId,
  userId: userId,
  sources: 'web',  // Research industry standards
  intent: 'document_discovery',  // Get document suggestions
  maxWebSources: 5
});

// Result includes suggestedDocuments array with templateId, reasoning, priority
```

#### Migration Example 3: Gap Analysis

**Old (ResearchSuggestionAgent via orchestrator):**
```typescript
// Was typically called internally, not directly accessible
```

**New (UnifiedResearchAgent):**
```typescript
import { unifiedResearchApi } from '@/services/api';

const result = await unifiedResearchApi.submitQuery({
  query: "What's missing from our API documentation?",
  projectId: projectId,
  userId: userId,
  sources: 'documents',  // Analyze existing project docs
  intent: 'gap_analysis',  // Identify gaps
  maxDocumentSources: 10
});

// Result includes identifiedGaps array with area, description, suggestedAction
```

### Step 3: Handle Response Format Changes

#### Old LiveResearchAgent Response:
```typescript
{
  success: true,
  queryId: "query_123",
  message: "Research started..."
}

// Then poll for results:
const query = await liveResearchApi.getQuery(queryId);
```

#### New UnifiedResearchAgent Response:
```typescript
{
  success: true,
  queryId: "query_123",
  message: "Unified research started..."
}

// Poll for results (same way):
const query = await unifiedResearchApi.getQuery(queryId);

// Result structure:
{
  query: "...",
  intent: "research",
  sourcesUsed: ["web", "documents"],
  webSources: [...],
  documentSources: [...],
  synthesis: "...",
  suggestedDocuments: [...],  // if intent='document_discovery'
  identifiedGaps: [...],  // if intent='gap_analysis'
  metadata: {
    totalSources: 8,
    webSourcesCount: 5,
    documentSourcesCount: 3,
    duration: 12500,
    searchStrategy: "Web + Documents (AI recommended)"
  }
}
```

### Step 4: Update UI Components

#### Old Component Structure:
```typescript
// Separate tabs/components for each research type
<ResearchHubPage>
  <Tab>Live Web Research</Tab>
  <Tab>Document Research</Tab>
  {/* ResearchSuggestion not directly accessible */}
</ResearchHubPage>
```

#### New Component Structure:
```typescript
// Single unified interface with mode selection
<ResearchHubPage>
  <Tab>Unified Research (DEFAULT)</Tab>  {/* New unified interface */}
  <Tab>References</Tab>
  <Tab>Live Web Research (legacy)</Tab>
  <Tab>Document Research (legacy)</Tab>
</ResearchHubPage>

// In Unified Research tab:
<UnifiedResearchInterface>
  <SourceSelector>Auto | Web | Documents | Both</SourceSelector>
  <IntentSelector>Research | Find Docs | Find Gaps</IntentSelector>
  <QueryInput />
  <Results>
    <WebSources />
    <DocumentSources />
    <Synthesis />
    <SuggestedDocuments />  {/* if document_discovery */}
    <IdentifiedGaps />  {/* if gap_analysis */}
  </Results>
</UnifiedResearchInterface>
```

---

## API Comparison

### Backend Endpoints

| Old Endpoint | New Endpoint | Status |
|-------------|-------------|---------|
| `POST /api/research/query` | `POST /api/research/unified` | Old endpoint still works |
| `POST /api/research/document-research/start` | `POST /api/research/unified` | Deprecated - use new |
| `POST /api/research/document-research/chat` | `POST /api/research/unified` | Deprecated - use new |
| `GET /api/research/suggestions/:projectId` | `POST /api/research/unified` | Deprecated - use new |

### Frontend API Methods

| Old API | New API | Notes |
|---------|---------|-------|
| `liveResearchApi.submitQuery()` | `unifiedResearchApi.submitQuery()` | Old still works |
| `documentResearchApi.startSession()` | `unifiedResearchApi.submitQuery()` | Use intent='document_discovery' |
| `documentResearchApi.sendMessage()` | `unifiedResearchApi.submitQuery()` | Single query, no session needed |
| N/A (internal only) | `unifiedResearchApi.submitQuery()` | Use intent='gap_analysis' |

---

## Feature Mapping

### LiveResearchAgent Features

| Feature | Unified Equivalent |
|---------|-------------------|
| Web search | `sources: 'web'` |
| URL crawling | Automatic with web search |
| Source analysis | `includeAnalysis: true` (default) |
| Save results | `saveResults: true` (default) |

### DocumentResearchAgent Features

| Feature | Unified Equivalent |
|---------|-------------------|
| Conversational discovery | Single query with full context |
| Document suggestions | `intent: 'document_discovery'` |
| Auto-fill documents | Generate from suggested templates |
| Template search | Use suggested `templateId` |

### ResearchSuggestionAgent Features

| Feature | Unified Equivalent |
|---------|-------------------|
| Gap detection | `intent: 'gap_analysis'` |
| Priority scoring | Included in `identifiedGaps` |
| Coverage score | Included in response metadata |
| Contextual suggestions | Based on query and project state |

---

## Breaking Changes

### None!

All old endpoints and APIs remain functional for backward compatibility. You can migrate at your own pace.

### Deprecation Warnings

When using deprecated endpoints, you'll see:
- **Response Header:** `X-Deprecated-Endpoint: Use POST /api/research/unified`
- **Response Header:** `X-Deprecation-Date: 2025-10-21`
- **Response Header:** `X-Migration-Guide: See MIGRATION_UNIFIED_RESEARCH.md`

---

## Benefits of Migration

### For Developers

✅ **Single API** - One endpoint for all research needs
✅ **Simpler Code** - No need to manage multiple agents
✅ **Better DX** - Unified interface with clear options
✅ **Type Safety** - Better TypeScript support

### For Users

✅ **More Powerful** - Search web + documents simultaneously
✅ **AI-Powered** - Auto source selection based on query
✅ **Comprehensive** - Unified synthesis across all sources
✅ **Actionable** - Document suggestions and gap analysis in one place

### For the System

✅ **Maintainable** - Single agent to update
✅ **Efficient** - Reduced code duplication
✅ **Extensible** - Easy to add new intents/sources
✅ **Optimized** - Better caching and performance

---

## Migration Timeline

### Phase 1: Now (2025-10-21)
- ✅ UnifiedResearchAgent available
- ✅ Old agents marked as deprecated
- ✅ All endpoints functional
- ✅ Migration guide available

### Phase 2: TBD (Future)
- New features only in UnifiedResearchAgent
- Deprecation warnings more prominent
- Encourage migration

### Phase 3: TBD (Far Future)
- Potential removal of old endpoints
- Advanced notice will be provided
- Migration assistance available

---

## Common Migration Patterns

### Pattern 1: Simple Web Research

**Before:**
```typescript
const research = await liveResearchApi.submitQuery({
  query: "TypeScript best practices",
  projectId, userId, maxSources: 5
});
```

**After:**
```typescript
const research = await unifiedResearchApi.submitQuery({
  query: "TypeScript best practices",
  projectId, userId,
  sources: 'web',
  intent: 'research',
  maxWebSources: 5
});
```

### Pattern 2: Project-Specific Research

**Before:**
```typescript
// Not easily possible - had to use LiveResearch and manually filter
```

**After:**
```typescript
const research = await unifiedResearchApi.submitQuery({
  query: "What did we decide about authentication?",
  projectId, userId,
  sources: 'documents',  // Search only project documents
  intent: 'research'
});
```

### Pattern 3: Comprehensive Analysis

**Before:**
```typescript
// Had to make multiple separate API calls and combine manually
```

**After:**
```typescript
const research = await unifiedResearchApi.submitQuery({
  query: "Compare our architecture to industry best practices",
  projectId, userId,
  sources: 'all',  // Search both web and project documents
  intent: 'research',
  maxWebSources: 5,
  maxDocumentSources: 10
});
// Automatically synthesizes findings from all sources!
```

---

## Troubleshooting

### Issue: Old API returns deprecation warnings

**Solution:** This is expected. Migrate to `unifiedResearchApi` when convenient.

### Issue: Need conversational document discovery

**Solution:** Use single query with full context instead of multi-turn conversation:
```typescript
// Instead of multiple messages, include all context in one query
const research = await unifiedResearchApi.submitQuery({
  query: "What documentation do I need for a healthcare app that handles patient data, uses OAuth, and needs HIPAA compliance?",
  intent: 'document_discovery'
});
```

### Issue: Missing features from old agents

**Solution:** All features are available in UnifiedResearchAgent. Check feature mapping table above.

### Issue: Don't know which source mode to use

**Solution:** Use `sources: 'auto'` - AI will determine optimal sources based on your query.

---

## Support

For questions or issues:
1. Check [AGENTS_DOCUMENTATION.md](AGENTS_DOCUMENTATION.md) for detailed agent docs
2. Review [UNIFIED_RESEARCH_COMPLETE.md](UNIFIED_RESEARCH_COMPLETE.md) for implementation details
3. Open an issue on GitHub
4. Contact the development team

---

## Examples

### Example 1: Migrate Document Discovery

**Old Code:**
```typescript
// Step 1: Start session
const session = await documentResearchApi.startSession({
  projectId, userId,
  initialMessage: "What docs do I need?"
});

// Step 2: Send context
await documentResearchApi.sendMessage({
  sessionId: session.sessionId,
  message: "It's a SaaS product",
  projectId
});

// Step 3: Send more context
const result = await documentResearchApi.sendMessage({
  sessionId: session.sessionId,
  message: "With subscription billing",
  projectId
});
```

**New Code:**
```typescript
// Single query with all context
const result = await unifiedResearchApi.submitQuery({
  query: "What documentation do I need for a SaaS product with subscription billing?",
  projectId, userId,
  sources: 'web',
  intent: 'document_discovery'
});

// Result.suggestedDocuments will include:
// - Privacy Policy (high priority)
// - Terms of Service (high priority)
// - SLA Agreement (medium priority)
// etc.
```

### Example 2: Migrate Gap Analysis

**Old Code:**
```typescript
// Was only accessible via orchestrator, not direct API
```

**New Code:**
```typescript
const result = await unifiedResearchApi.submitQuery({
  query: "What's missing from our project documentation?",
  projectId, userId,
  sources: 'documents',  // Analyze existing docs
  intent: 'gap_analysis',
  maxDocumentSources: 20
});

// Result.identifiedGaps will include:
// - {area: "API docs", description: "No auth flow", suggestedAction: "..."}
// - {area: "README", description: "No setup guide", suggestedAction: "..."}
// etc.
```

### Example 3: Combine Web + Documents

**Old Code:**
```typescript
// Impossible - had to make two separate calls and combine manually
const webResults = await liveResearchApi.submitQuery({
  query: "microservices best practices",
  projectId, userId
});

// Wait for completion, then manually check project docs
// No automatic synthesis
```

**New Code:**
```typescript
const result = await unifiedResearchApi.submitQuery({
  query: "Compare our microservices architecture to industry best practices",
  projectId, userId,
  sources: 'all',  // Search BOTH web and project documents
  intent: 'research'
});

// Result.synthesis automatically combines:
// - Industry best practices from web
// - Your current architecture from project docs
// - Recommendations based on comparison
```

---

## Summary

The UnifiedResearchAgent provides:
- **Simpler API** - One endpoint instead of three
- **More Powerful** - Search multiple sources simultaneously
- **AI-Powered** - Intelligent source selection
- **Backward Compatible** - Old APIs still work
- **Better UX** - Unified interface for all research needs

**Recommendation:** Start new features with `unifiedResearchApi`, migrate existing features gradually.

---

**Questions? See [AGENTS_DOCUMENTATION.md](AGENTS_DOCUMENTATION.md) or [UNIFIED_RESEARCH_COMPLETE.md](UNIFIED_RESEARCH_COMPLETE.md)**
