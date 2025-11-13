# Selective Image Recording Implementation

## Overview
This feature allows users to selectively record parts of image analysis (colors, layout, typography, etc.) instead of auto-recording everything.

## Implementation Status

### ✅ Completed - Backend

#### 1. Structured Analysis Method
**File:** `backend/src/agents/referenceAnalysis.ts`
- Added `analyzeImageStructured()` method
- Returns JSON format with selectable sections:
  - `colors`: Array of {hex, name, confidence}
  - `typography`: Array of {font, usage, confidence}
  - `layout`: {style, description, confidence}
  - `components`: Array of {name, description, confidence}
  - `insights`: Array of {insight, category, confidence}
  - `summary`: Brief overview

#### 2. Backend Route Updates
**File:** `backend/src/routes/references.ts`
- Modified `analyzeFileInBackground()` to generate structured analysis for images
- Stores both markdown analysis AND structured analysis in metadata
- Stores `imageUrl` for displaying thumbnails

### 🔨 TODO - Frontend

#### 1. Create ImageAnalysisCard Component
**Path:** `frontend/src/components/chat/ImageAnalysisCard.tsx`

**Features:**
- Displays image thumbnail
- Shows collapsed summary by default
- "View Analysis" button to expand
- Checkbox sections for each category (colors, typography, layout, components, insights)
- "Confirm Selected" button
- Natural language detection (user can also say "record the colors")

**Props:**
```typescript
interface ImageAnalysisCardProps {
  imageUrl: string;
  structuredAnalysis: {
    colors: Array<{hex: string; name: string; confidence: number}>;
    typography: Array<{font: string; usage: string; confidence: number}>;
    layout: {style: string; description: string; confidence: number};
    components: Array<{name: string; description: string; confidence: number}>;
    insights: Array<{insight: string; category: string; confidence: number}>;
    summary: string;
  };
  referenceId: string;
  onConfirmSelection: (selected: SelectedAnalysis) => void;
  isDarkMode: boolean;
}

interface SelectedAnalysis {
  colors?: Array<{hex: string; name: string}>;
  typography?: Array<{font: string; usage: string}>;
  layout?: string;
  components?: Array<{name: string; description: string}>;
  insights?: Array<{insight: string; category: string}>;
}
```

#### 2. Update MessageBubble Component
**File:** `frontend/src/components/chat/MessageBubble.tsx`

Add logic to detect image analysis in message metadata:
```typescript
// Check if message has image analysis
const hasImageAnalysis = message.metadata?.structuredAnalysis;

{hasImageAnalysis && (
  <ImageAnalysisCard
    imageUrl={message.metadata.imageUrl}
    structuredAnalysis={message.metadata.structuredAnalysis}
    referenceId={message.metadata.referenceId}
    onConfirmSelection={handleConfirmSelection}
    isDarkMode={isDarkMode}
  />
)}
```

#### 3. Update Conversation Agent Integration
**File:** `backend/src/agents/conversation.ts`

Add detection for selection phrases:
```typescript
// Detect user selecting specific sections
const selectionPhrases = {
  colors: ['colors', 'color palette', 'hex codes'],
  typography: ['fonts', 'typography', 'text styles'],
  layout: ['layout', 'structure', 'arrangement'],
  components: ['components', 'UI elements', 'buttons'],
  insights: ['insights', 'analysis', 'observations']
};
```

#### 4. Create Recording Endpoint
**File:** `backend/src/routes/conversations.ts` (or new endpoint)

Add endpoint to handle selective recording:
```typescript
POST /api/conversations/:conversationId/record-image-analysis
Body: {
  referenceId: string,
  selectedAnalysis: {
    colors: [...],
    typography: [...],
    layout: string,
    components: [...],
    insights: [...]
  }
}
```

#### 5. Update Recorder Agent
**File:** `backend/src/agents/recorder.ts`

Add method to handle structured image recording:
```typescript
async recordImageAnalysis(
  selectedAnalysis: SelectedAnalysis,
  referenceId: string,
  projectState: ProjectState
): Promise<AgentResponse>
```

This method should:
- Format selected items for canvas
- Add reference to image source
- Create canvas items in "decided" or "exploring" state

## User Flow

1. **User uploads image** → Backend analyzes and generates:
   - Markdown analysis (for display)
   - Structured JSON (for selection)

2. **Conversation agent displays** → ImageAnalysisCard shows:
   - Collapsed by default with summary
   - "View Analysis" button

3. **User expands and selects** → Two methods:
   - **Visual**: Check boxes next to sections
   - **Natural language**: "Record the blue colors and layout"

4. **User confirms** → Either:
   - Clicks "Confirm Selected" button
   - Says "yes" or "record that"

5. **Recorder saves** → Creates canvas items:
   - "Color palette: #3498db (Primary Blue), #FFFFFF (White)"
   - "Layout: Grid-based with sidebar navigation"
   - Each with reference link to original image

## Data Flow

```
Upload Image
    ↓
Extract base64 + metadata
    ↓
ReferenceAnalysisAgent.analyze() → Markdown
ReferenceAnalysisAgent.analyzeImageStructured() → JSON
    ↓
Store in references.metadata:
  - analysis (markdown)
  - structuredAnalysis (JSON)
  - imageUrl (for thumbnail)
    ↓
Conversation agent includes in message metadata
    ↓
Frontend MessageBubble detects structuredAnalysis
    ↓
Renders ImageAnalysisCard (collapsed)
    ↓
User expands + selects items
    ↓
User confirms → POST to record endpoint
    ↓
Recorder creates canvas items
```

## Next Steps

1. **Create ImageAnalysisCard component** with:
   - Thumbnail display
   - Collapsible sections
   - Checkbox selection
   - Confirm button

2. **Update MessageBubble** to detect and render ImageAnalysisCard

3. **Add recording endpoint** to handle selections

4. **Update Recorder agent** to format and save selected items

5. **Test full flow** with real image upload

## Example UI Structure

```
┌─────────────────────────────────────────┐
│ 📷 Image Analysis                  [▼]  │
├─────────────────────────────────────────┤
│ [Thumbnail Image]                       │
│                                         │
│ Modern website with blue color scheme  │
│ and grid-based layout.                 │
│                                         │
│ [View Full Analysis]                   │
└─────────────────────────────────────────┘

(When expanded)

┌─────────────────────────────────────────┐
│ 📷 Image Analysis                  [▲]  │
├─────────────────────────────────────────┤
│ [Thumbnail Image]                       │
│                                         │
│ ☑ Colors                               │
│   • #3498db - Primary Blue (95%)      │
│   • #FFFFFF - White (100%)            │
│                                         │
│ ☐ Typography                           │
│   • Inter - Headings (85%)            │
│   • Roboto - Body text (80%)          │
│                                         │
│ ☑ Layout                               │
│   Grid-based with sidebar (90%)       │
│                                         │
│ ☐ Components                           │
│   • Navigation bar (95%)              │
│   • Card layout (90%)                 │
│                                         │
│ [Confirm Selected (2)]                 │
└─────────────────────────────────────────┘
```

## Notes

- Backend is ready to generate structured analysis
- Frontend needs ImageAnalysisCard component
- Natural language detection can leverage existing conversation agent patterns
- Recorder needs update to handle structured format
