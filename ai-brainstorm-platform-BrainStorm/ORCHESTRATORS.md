# Page-Specific Orchestrators Architecture

## Overview

The BrainStorm platform implements a **Hybrid Architecture** with page-specific orchestrators that coordinate agent workflows while keeping shared agents reusable. This architecture provides:

- **Page-specific coordination** without duplicating agent logic
- **Quality control** with verification and assumption detection
- **Context-aware processing** that separates new vs. existing information
- **Two operational modes**: Quick (fast) vs. Verify (quality-checked)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND PAGES                           │
├─────────────┬─────────────┬──────────────┬─────────────────┤
│  ChatPage   │ DocumentsPage│ ResearchPage │  SandboxPage   │
└──────┬──────┴──────┬──────┴──────┬───────┴───────┬─────────┘
       │             │             │               │
       ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              PAGE-SPECIFIC ORCHESTRATORS                    │
├─────────────┬─────────────┬──────────────┬─────────────────┤
│    Chat     │  Document   │   Research   │    Sandbox      │
│ Orchestrator│ Orchestrator│ Orchestrator │  Orchestrator   │
└──────┬──────┴──────┬──────┴──────┬───────┴───────┬─────────┘
       │             │             │               │
       └─────────────┴─────────────┴───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SHARED AGENTS                            │
├─────────────────────────────────────────────────────────────┤
│ • ContextManagerAgent      • QualityAuditorAgent            │
│ • IntegrationOrchestrator  • UnifiedResearchAgent           │
│ • ConversationAgent        • StrategicPlannerAgent          │
│ • PersistenceManagerAgent  • ResourceManagerAgent           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                        │
└─────────────────────────────────────────────────────────────┘
```

## Orchestrators

### 1. ChatOrchestrator

**File:** `backend/src/orchestrators/ChatOrchestrator.ts`

**Purpose:** Coordinates conversational brainstorming workflows with intent-based routing.

**Key Features:**
- Intent classification (brainstorming, deciding, exploring, etc.)
- Workflow determination and execution
- Project state management
- Next step suggestions

**Methods:**
```typescript
class ChatOrchestrator {
  // Main entry point
  async processChatMessage(message: string, context: ChatContext): Promise<ChatResponse>

  // Internal helpers
  private async getProjectState(projectId: string): Promise<ProjectState>
  private getNextStepsForIntent(intent: string): string[]
}
```

**Usage:**
```typescript
const orchestrator = new ChatOrchestrator();
const result = await orchestrator.processChatMessage(
  "I've decided to use React for the frontend",
  {
    projectId: "uuid",
    conversationHistory: [...],
    userId: "user-id"
  }
);
// Returns: { response, metadata: { intent, qualityChecks, nextSteps } }
```

---

### 2. DocumentOrchestrator

**File:** `backend/src/orchestrators/DocumentOrchestrator.ts`

**Purpose:** Auto-generates professional documents from project items with optional quality verification.

**Key Features:**
- Multiple document types (PRD, Technical Spec, User Stories, Roadmap)
- Two modes: Quick Generate vs. Verify & Generate
- Gap detection and completeness scoring
- Quality checks (assumptions, conflicts, issues)

**Methods:**
```typescript
class DocumentOrchestrator {
  // Main entry point
  async generateDocument(context: DocumentContext): Promise<DocumentResult>

  // Mode shortcuts
  async quickGenerate(context: DocumentContext): Promise<DocumentResult>
  async verifyAndGenerate(context: DocumentContext): Promise<DocumentResult>

  // Analysis
  async analyzeDocumentGaps(projectId: string, documentId: string): Promise<GapAnalysis>

  // Document generators
  private generatePRD(decided: Item[], exploring: Item[]): string
  private generateTechnicalSpec(decided: Item[]): string
  private generateUserStories(decided: Item[], exploring: Item[]): string
  private generateRoadmap(decided: Item[], exploring: Item[], parked: Item[]): string

  // Quality verification
  private async verifyDocument(projectId: string, content: string, items: Item[]): Promise<QualityReport>
}
```

**API Endpoints:**
- `POST /api/generated-documents/quick-generate` - Fast generation
- `POST /api/generated-documents/verify-and-generate` - Quality-checked
- `GET /api/generated-documents/:id/analyze-gaps` - Gap analysis

**Usage:**
```typescript
const orchestrator = new DocumentOrchestrator();

// Quick mode
const quickResult = await orchestrator.quickGenerate({
  projectId: "uuid",
  documentType: "prd",
  userId: "user-id"
});

// Verified mode
const verifiedResult = await orchestrator.verifyAndGenerate({
  projectId: "uuid",
  documentType: "technical_spec",
  userId: "user-id"
});
// Returns: { documentId, content, metadata, qualityReport? }
```

---

### 3. ResearchOrchestrator

**File:** `backend/src/orchestrators/ResearchOrchestrator.ts`

**Purpose:** Performs research with context awareness, separating new ideas from already-decided items.

**Key Features:**
- New vs. decided item separation using semantic similarity
- Multi-source research (web, documents, references)
- Quality verification for research documents
- Duplicate detection with 70% similarity threshold

**Methods:**
```typescript
class ResearchOrchestrator {
  // Main entry point
  async processResearchQuery(context: ResearchContext): Promise<ResearchResult>

  // Document generation
  async generateResearchDocument(
    projectId: string,
    documentType: string,
    researchContext: string,
    verify?: boolean
  ): Promise<{ document: string; qualityReport?: any }>

  // Internal helpers
  private extractResearchItems(result: any): ResearchItem[]
  private separateNewVsDecided(items: ResearchItem[], project: Item[]): Separation
  private findBestMatch(item: ResearchItem, projectItems: Item[]): Match
  private calculateTextSimilarity(text1: string, text2: string): number
  private synthesizeWithContext(query: string, new: Item[], decided: Item[], original: string): string
}
```

**API Endpoints:**
- `POST /api/research/with-context` - Research with separation
- `POST /api/research/generate-document` - Research-based document generation

**Usage:**
```typescript
const orchestrator = new ResearchOrchestrator();
const result = await orchestrator.processResearchQuery({
  projectId: "uuid",
  query: "What are best practices for user authentication?",
  userId: "user-id",
  includeWeb: true,
  includeDocuments: true
});
// Returns: { synthesis, newIdeas, alreadyDecided, metadata }
```

---

### 4. SandboxOrchestrator

**File:** `backend/src/orchestrators/SandboxOrchestrator.ts`

**Purpose:** Validates sandbox idea extraction to prevent duplicates and conflicts from entering the main project.

**Key Features:**
- Duplicate detection with similarity scoring
- Conflict analysis with project decisions
- Two modes: Quick Extract vs. Verify & Extract
- Extraction recommendations (skip, merge, extract_anyway)

**Methods:**
```typescript
class SandboxOrchestrator {
  // Main entry point
  async extractIdeas(context: ExtractionContext): Promise<ExtractionResult>

  // Mode shortcuts
  async quickExtract(context: ExtractionContext): Promise<ExtractionResult>
  async verifyAndExtract(context: ExtractionContext): Promise<ExtractionResult>

  // Analysis
  async analyzeSandboxConflicts(context: SandboxContext): Promise<ConflictAnalysis>
  async generateContextAwareIdeas(projectId: string, generationContext: any): Promise<IdeaGeneration>

  // Internal helpers
  private detectDuplicates(sandbox: Idea[], project: Item[]): DuplicateMatch[]
  private calculateTextSimilarity(text1: string, text2: string): number
  private getRecommendation(similarity: number, itemState: string): Recommendation
  private verifyExtraction(ideas: Idea[], items: Item[], duplicates: Match[], projectId: string): ValidationReport
  private filterDuplicates(ideas: Idea[], duplicates: Match[], report: any): Idea[]
  private convertToProjectItem(idea: Idea, sandbox: any): ProjectItem
  private addItemsToProject(projectId: string, items: Item[]): Promise<void>
}
```

**API Endpoints:**
- `POST /api/sandbox/quick-extract` - Fast extraction
- `POST /api/sandbox/verify-and-extract` - Quality-checked extraction
- `GET /api/sandbox/:id/analyze-conflicts` - Pre-extraction analysis

**Usage:**
```typescript
const orchestrator = new SandboxOrchestrator();

// Quick extraction
const quickResult = await orchestrator.quickExtract({
  sandboxId: "uuid",
  projectId: "uuid",
  selectedIdeaIds: ["idea-1", "idea-2"]
});

// Verified extraction
const verifiedResult = await orchestrator.verifyAndExtract({
  sandboxId: "uuid",
  projectId: "uuid",
  selectedIdeaIds: ["idea-1", "idea-2"]
});
// Returns: { extractedItems, validationReport?, metadata }
```

---

## Quality Control System

All orchestrators integrate with the **QualityAuditorAgent** for:

### 1. Verification
```typescript
await qualityAuditor.verify(data, userMessage)
// Returns: { approved, confidence, issues, reasoning, recommendation }
```

### 2. Assumption Scanning
```typescript
await qualityAuditor.scan(data)
// Returns: { assumptionsDetected, assumptions[], approved, reasoning }
```

### 3. Consistency Checking
```typescript
await qualityAuditor.checkConsistency(newData, projectState, projectReferences)
// Returns: { conflicts[], approved, reasoning }
```

---

## Similarity Detection

Both ResearchOrchestrator and SandboxOrchestrator use **semantic similarity** for duplicate detection:

```typescript
private calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size; // Jaccard similarity
}
```

**Thresholds:**
- **> 80%**: Skip (very high duplicate probability)
- **65-80%**: Merge recommendation
- **50-65%**: Extract anyway with warning
- **< 50%**: Unique content

---

## Database Integration

All orchestrators use **Supabase** for database operations:

```typescript
import { supabase } from '../services/supabase';

// Query example
const { data: project, error } = await supabase
  .from('projects')
  .select('items')
  .eq('id', projectId)
  .single();

// Update example
const { error: updateError } = await supabase
  .from('projects')
  .update({ items: updatedItems, updated_at: new Date().toISOString() })
  .eq('id', projectId);
```

---

## Frontend Integration

### DocumentsPage Example

```typescript
// Document generation with orchestrator
const handleGenerateDocument = async (mode: 'quick' | 'verify') => {
  const endpoint = mode === 'quick'
    ? `${API_URL}/api/generated-documents/quick-generate`
    : `${API_URL}/api/generated-documents/verify-and-generate`;

  const response = await axios.post(endpoint, {
    projectId: currentProject.id,
    documentType: selectedDocType,
    userId: user.id,
  });

  if (response.data.success) {
    setGeneratedDocument(response.data);
    // Display quality report if verified mode
    if (response.data.qualityReport) {
      showQualityReport(response.data.qualityReport);
    }
  }
};
```

---

## Error Handling

All orchestrators follow consistent error handling:

```typescript
async processRequest(context: Context): Promise<Result> {
  try {
    console.log('[OrchestratorName] Processing request:', context);

    // ... processing logic ...

    console.log('[OrchestratorName] Request complete:', metadata);
    return result;
  } catch (error) {
    console.error('[OrchestratorName] Error processing request:', error);
    throw error;
  }
}
```

---

## Best Practices

1. **Always use orchestrators for page-specific workflows** - Don't call agents directly from routes
2. **Choose the right mode** - Quick for speed, Verify for quality
3. **Monitor quality reports** - Address assumptions and conflicts before they become issues
4. **Use similarity thresholds appropriately** - Adjust based on project needs
5. **Log orchestrator activities** - All orchestrators include comprehensive logging

---

## Future Enhancements

1. **Embedding-based similarity** - Replace word overlap with vector embeddings
2. **Machine learning recommendations** - Learn from user extraction patterns
3. **Real-time collaboration** - Multi-user orchestrator coordination
4. **Performance optimization** - Caching and batch processing
5. **Additional orchestrators** - TimelineOrchestrator, CollaborationOrchestrator
