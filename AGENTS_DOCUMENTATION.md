# AI Agents Documentation

**System Version:** 2.0
**Last Updated:** 2025-10-21
**Total Agents:** 9 (consolidated from 17 original agents)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Agents (5)](#core-agents)
4. [Support Agents (4)](#support-agents)
5. [Agent Orchestration](#agent-orchestration)
6. [Intent Classification System](#intent-classification-system)
7. [Workflow Examples](#workflow-examples)
8. [API Integration](#api-integration)

---

## Executive Summary

The AI Brainstorm Platform uses a sophisticated multi-agent orchestration system with **9 specialized AI agents** that work together to provide intelligent project management, brainstorming, quality control, research, and strategic planning capabilities.

### Agent Categories

- **5 Core Agents:** Handle primary workflows (conversation, persistence, quality, strategy, context)
- **4 Support Agents:** Provide specialized utilities (reference analysis, review, resources, research)
- **1 Orchestrator:** Coordinates workflows and routes conversations

### Consolidation History

The system was optimized from **17 original agents** down to **9 agents** through intelligent consolidation:

- **17 Original Agents** → 5 Core + 4 Support = **9 Total Agents**
- Reduced complexity while maintaining all functionality
- Improved performance through parallel execution
- Enhanced maintainability with clearer responsibilities

---

## System Architecture

### Architecture Overview

```
User Message
     ↓
ContextManagerAgent (Intent Classification)
     ↓
IntegrationOrchestrator (Workflow Determination)
     ↓
Workflow Execution (Parallel/Sequential)
     ├─→ ConversationAgent
     ├─→ PersistenceManagerAgent
     ├─→ QualityAuditorAgent
     ├─→ StrategicPlannerAgent
     └─→ Support Agents
     ↓
AgentCoordinationService (State Updates)
     ↓
User Response(s)
```

### Agent Categorization

#### Core Agents (Primary Workflows)
1. **ConversationAgent** - User interaction & clarification
2. **PersistenceManagerAgent** - Recording & version control
3. **QualityAuditorAgent** - Quality assurance & consistency
4. **StrategicPlannerAgent** - Planning & prioritization
5. **ContextManagerAgent** - Intent classification & routing

#### Support Agents (Specialized Utilities)
6. **ReferenceAnalysisAgent** - File analysis & extraction
7. **ReviewerAgent** - Conversation & document QA
8. **ResourceManagerAgent** - Resource organization
9. **UnifiedResearchAgent** - Web & document research

---

## Core Agents

### 1. ConversationAgent

**Consolidates:** BrainstormingAgent + ClarificationEngine + GapDetection + Clarification + Questioner

**File:** [`backend/src/agents/conversation.ts`](backend/src/agents/conversation.ts)

#### Purpose
Acts as the user's conversational partner, providing reflective understanding, gap detection, and targeted clarification through natural dialogue.

#### Key Responsibilities

1. **Reflection & Understanding**
   - Demonstrates comprehension by restating user input
   - Organizes scattered thoughts into clear statements
   - Validates understanding before proceeding

2. **Gap Detection (Silent Analysis)**
   - Analyzes for missing specifications
   - Identifies ambiguous statements
   - Detects incomplete definitions
   - Returns structured data for orchestrator

3. **Clarification Questions**
   - Asks ONE targeted question when needed
   - Never asks multiple questions simultaneously
   - Only asks when truly necessary

4. **Correction Handling**
   - Detects correction signals ("no", "listen", "that's not what I meant")
   - Acknowledges misunderstandings appropriately
   - Restates corrected understanding

5. **Context Awareness**
   - Integrates uploaded references into responses
   - Considers project state in conversations
   - Maintains conversation history

#### Core Behavior Rules

**ALWAYS:**
- Start by reflecting what the user said
- Keep responses under 4 sentences
- Use phrases like "You're saying...", "You mentioned...", "You want..."

**NEVER:**
- Add suggestions or ideas beyond what was stated
- Ask multiple questions at once
- Use phrases like "you could", "what if", "this creates"
- Elaborate beyond explicit user statements
- Ask questions during corrections

#### Operating Modes

##### Active Mode (User-Facing)
```typescript
async respond(
  userMessage: string,
  conversationHistory: any[],
  projectState: any,
  projectReferences: any[]
): Promise<AgentResponse>
```
Returns conversational response with optional clarifying question.

##### Analysis Mode (Silent)
```typescript
async analyze(
  userMessage: string,
  projectState: any
): Promise<AgentResponse>
```
Returns structured gap analysis without user-facing message.

#### Response Format

```typescript
{
  agent: "ConversationAgent",
  message: "You want RGB lighting included. You're considering a transparent case as a possibility.",
  showToUser: true,
  metadata: {
    isCorrection: false,
    hasQuestion: false
  }
}
```

#### Gap Analysis Format

```json
{
  "gaps": [
    {
      "category": "specification|context|definition|detail",
      "description": "what's missing",
      "importance": "critical|high|medium|low",
      "question": "specific question to ask user"
    }
  ],
  "criticalCount": 1,
  "hasCriticalGaps": true,
  "priority": "critical"
}
```

#### Example Workflows

**Example 1: Simple Reflection**
```
User: "I want RGB lighting and maybe a transparent case"
Agent: "You want RGB lighting included. You're considering a transparent case as a possibility."
```

**Example 2: Clarification Question**
```
User: "I want 3 levels for the Create Your Own Story feature"
Agent: "You're creating a 'Create Your Own Story' feature with 3 levels. To clarify: Are these difficulty levels (beginner/intermediate/advanced) or different story types?"
```

**Example 3: Correction Handling**
```
User: "no! this is a new feature not part of the other modes"
Agent: "You're right, I misunderstood. The 'Create Your Own Story' feature is completely separate from Canon and Dynamic modes - it's a new feature for users to create interactive stories from scratch."
```

---

### 2. PersistenceManagerAgent

**Consolidates:** RecorderAgent + VersionControlAgent + VerificationAgent

**File:** [`backend/src/agents/persistenceManager.ts`](backend/src/agents/persistenceManager.ts)

#### Purpose
Unified recording, verification, and version control for all project information with 100% certainty requirement.

#### Key Responsibilities

1. **Pre-Record Verification**
   - Ensures 100% certainty before recording
   - Validates explicit user statements
   - Rejects ambiguous or assumed information
   - Context-aware approval detection

2. **State Classification**
   - **DECIDED:** Firm commitments and approvals
   - **EXPLORING:** Ideas being considered
   - **PARKED:** Items saved for later
   - **MODIFY:** Changes to existing decisions

3. **Automatic Version Tracking**
   - Maintains complete version history
   - Tracks all changes with reasoning
   - Records timestamps and confidence scores
   - Links to user citations

4. **Batch Recording**
   - Processes multiple items from ReviewerAgent
   - Handles conversation review findings
   - Maintains data integrity across batches

5. **Context-Aware Recording**
   - Recognizes affirmative responses to AI suggestions
   - "Yes", "love it", "perfect" after AI message = record AI's suggestion
   - Looks at conversation history for context

#### Recording Signals

##### DECIDED (Strong Commitment)
- **Affirmative:** "I want", "I need", "We need", "Let's use", "Let's add"
- **Approval:** "I like that", "Perfect", "Exactly", "Yes", "Definitely", "Love it"
- **Selection:** "I choose", "We'll use", "Go with", "Pick", "Select"

##### EXPLORING (Considering Options)
- **Tentative:** "What if", "Maybe", "Could we", "Thinking about", "Consider"
- **Questions:** "Should we", "Would it work", "How about"

##### PARKED (Save for Later)
- **Defer:** "Come back to", "Maybe later", "Pin that", "For later", "Not now"

##### MODIFY (Changing Previous)
- **Change:** "Change to", "Instead of X do Y", "Actually", "Switch to"

#### Verification Modes

##### Permissive Verification (Brainstorming/Exploring)
```
- APPROVE IF: User mentioned an idea, feature, requirement
- RECORD AS: "exploring" state by default
- Be LENIENT: Capture ideas even if not fully formed
- Only REJECT: Completely off-topic or no substance
```

##### Balanced Verification (Deciding/Modifying)
```
- APPROVE IF: User stated intent, direction, or preference clearly
- Look for decision signals
- RECORD AS: "decided" when strong commitment shown
- REJECT ONLY: Off-topic, pure question, no actionable content
```

#### Main Methods

##### Record with Verification
```typescript
async record(
  data: any,
  projectState: ProjectState,
  userMessage?: string,
  workflowIntent?: string,
  conversationHistory?: any[]
): Promise<AgentResponse>
```

**Returns:**
```typescript
{
  agent: "PersistenceManagerAgent",
  message: "✅ Recorded: Add payment system using Stripe",
  showToUser: true,
  metadata: {
    verified: true,
    shouldRecord: true,
    state: "decided",
    item: "Add payment system using Stripe",
    confidence: 95,
    reasoning: "User explicitly approved AI suggestion",
    versionInfo: {
      versionNumber: 1,
      changeType: "created"
    }
  }
}
```

##### Record from Review
```typescript
async recordFromReview(
  reviewFindings: any[],
  conversationHistory: any[],
  projectState: ProjectState
): Promise<AgentResponse>
```

Processes multiple items identified by ReviewerAgent and records them in batch.

##### Track Change
```typescript
async trackChange(
  item: any,
  changeType: string,
  reasoning: string,
  triggeredBy: string
): Promise<AgentResponse>
```

Creates version record for modifications to existing items.

#### Version Tracking

Every recorded item includes:
```json
{
  "versionInfo": {
    "versionNumber": 1,
    "changeType": "created|modified",
    "reasoning": "why this change",
    "timestamp": "ISO date",
    "triggeredBy": "user message or agent action"
  }
}
```

#### Example Workflows

**Example 1: Context-Aware Approval**
```
[Assistant]: "We could add a payment system using Stripe..."
[User]: "Yes I love it!"

→ Record: "Add payment system using Stripe" (state: decided, confidence: 95)
```

**Example 2: Permissive Recording**
```
Workflow: brainstorming
User: "Maybe we could have dark mode"

→ Verify: APPROVED (permissive mode)
→ Record: "Add dark mode option" (state: exploring, confidence: 75)
```

**Example 3: Strict Verification**
```
Workflow: deciding
User: "it should be fast"

→ Verify: REJECTED (ambiguous - how fast? where?)
→ Action: Trigger ClarificationEngine for specifics
```

---

### 3. QualityAuditorAgent

**Consolidates:** VerificationAgent + AssumptionBlockerAgent + AccuracyAuditorAgent + ConsistencyGuardianAgent

**File:** [`backend/src/agents/qualityAuditor.ts`](backend/src/agents/qualityAuditor.ts)

#### Purpose
Comprehensive quality control ensuring accuracy, consistency, and zero-assumption verification across all project information.

#### Key Responsibilities

1. **Pre-Record Verification (Gatekeeper)**
   - Checks if information is explicitly stated
   - Detects any ambiguity
   - Validates details are clear and specific
   - Identifies conflicts with existing information

2. **Assumption Scanning (Zero Tolerance)**
   - Flags ANYTHING not explicitly stated
   - No interpretations beyond exact words
   - No "logical" inferences (even obvious ones)
   - No reading between the lines
   - Blocks everything that isn't 100% explicit

3. **Accuracy Auditing (Continuous Verification)**
   - Verifies recorded info matches user statements exactly
   - Detects contradictions across records
   - Checks if context has changed requiring updates
   - Validates timestamps and citations
   - Confirms categorization accuracy

4. **Consistency Checking (Conflict Detection)**
   - Direct contradictions between statements
   - Reference conflicts (user vs. uploaded documents)
   - Cross-reference conflicts (document A vs. document B)
   - Incompatible decisions
   - Technical impossibilities

5. **Reference Alignment Analysis**
   - Compares uploaded documents against project decisions
   - Identifies CONFLICTS (reference contradicts decisions)
   - Identifies CONFIRMATIONS (reference supports decisions)
   - Identifies NEW INSIGHTS (valuable info not yet discussed)

#### Quality Control Modes

##### Mode 1: Pre-Record Verification
```typescript
async verify(data: any, userMessage: string): Promise<AgentResponse>
```

**Checklist:**
- ✓ Explicitly stated by user?
- ✓ Any ambiguity?
- ✓ All details clear and specific?
- ✓ Conflicts with existing information?
- ✓ User's intent clear?

**Returns:**
```json
{
  "approved": true/false,
  "confidence": 0-100,
  "issues": ["list of concerns"],
  "reasoning": "detailed explanation",
  "recommendation": "what should happen next"
}
```

##### Mode 2: Assumption Scanning
```typescript
async scan(data: any): Promise<AgentResponse>
```

**What Counts as Assumption:**
- Anything not explicitly stated
- Interpretations beyond exact words
- "Logical" inferences
- Reading between the lines
- Filling in "reasonable" details
- Common sense additions

**Example:**
```
✗ User: "Make it blue" → Assuming "a blue background"
  Issue: Which blue? Background or foreground? Navy, sky, royal blue?

✓ User: "Make the background navy blue" → This is explicit
```

**Returns:**
```json
{
  "assumptionsDetected": true/false,
  "assumptions": [
    {
      "detail": "what was assumed",
      "explicitStatement": "what user actually said",
      "severity": "critical|high|medium",
      "recommendation": "ask user to specify this"
    }
  ],
  "approved": true/false,
  "reasoning": "explanation"
}
```

##### Mode 3: Accuracy Auditing
```typescript
async audit(
  projectState: any,
  conversationHistory: any[]
): Promise<AgentResponse>
```

**Audit Checklist:**
1. Does recorded info match user statements exactly?
2. Are there contradictions across records?
3. Has context changed requiring updates?
4. Are timestamps and citations correct?
5. Is categorization (decided/exploring/parked) still accurate?
6. Is there any drift from original meaning?

**Returns:**
```json
{
  "overallStatus": "accurate|needs_review|has_errors",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "type": "contradiction|inaccuracy|miscategorization|drift",
      "description": "what's wrong",
      "affectedRecords": ["record IDs"],
      "recommendation": "how to fix"
    }
  ],
  "auditTimestamp": "ISO date",
  "recordsAudited": 42
}
```

##### Mode 4: Consistency Checking
```typescript
async checkConsistency(
  newData: any,
  projectState: any,
  projectReferences: any[]
): Promise<AgentResponse>
```

**Conflict Types Detected:**
- **Direct contradictions:** User said X, now says opposite
- **Reference conflicts:** User says X, uploaded PDF says Y
- **Cross-reference conflicts:** PDF A says X, PDF B says Y
- **Incompatible decisions:** Can't do both A and B
- **Timeline conflicts:** Contradictory schedules
- **Budget inconsistencies:** Conflicting cost estimates
- **Technical impossibilities:** Mutually exclusive technologies

**Returns:**
```json
{
  "conflictDetected": true/false,
  "conflicts": [
    {
      "type": "contradiction|incompatibility|impossibility|reference_conflict|cross_reference",
      "newItem": "what user just said",
      "conflictsWith": "existing record or reference content",
      "source": "user_statement|project_state|reference_file",
      "referenceFile": "filename if from reference",
      "severity": "critical|high|medium",
      "explanation": "why this is a conflict",
      "resolutionOptions": ["option1", "option2", "option3"]
    }
  ],
  "recommendation": "what should happen"
}
```

##### Mode 5: Reference Alignment
```typescript
async checkReferenceAgainstDecisions(
  referenceAnalysis: any,
  referenceName: string,
  projectState: { decided: any[]; exploring: any[]; parked: any[] }
): Promise<AgentResponse>
```

**Returns:**
```json
{
  "conflictDetected": true/false,
  "conflicts": [
    {
      "type": "reference_conflict",
      "decidedItem": "existing decision",
      "referenceContent": "what the reference says",
      "severity": "critical|high|medium",
      "explanation": "why this is a conflict",
      "resolutionOptions": [
        "Update decision to match reference",
        "Keep decision and note deviation",
        "Ask user to clarify intent"
      ]
    }
  ],
  "confirmations": [
    {
      "decidedItem": "existing decision",
      "referenceSupport": "how reference confirms it",
      "strengthensConfidence": true
    }
  ],
  "newInsights": [
    {
      "insight": "new information from reference",
      "category": "feature|constraint|preference|technical",
      "relevance": "high|medium|low",
      "suggestedAction": "decide|explore|park"
    }
  ],
  "summary": "overall assessment"
}
```

#### Comprehensive Quality Check
```typescript
async comprehensiveCheck(
  data: any,
  userMessage: string,
  projectState: any,
  conversationHistory: any[],
  projectReferences: any[]
): Promise<AgentResponse>
```

Runs all checks (verification, assumption scan, consistency, audit) and aggregates results.

#### Example Workflows

**Example 1: Assumption Detection**
```
User: "Make it blue"

Assumption Scan:
✗ Assumed: "Make the background blue"
✗ Assumed: "Use #0000FF"
✗ Assumed: "Apply to all pages"

Questions Needed:
- Which element should be blue?
- What shade of blue? (hex code or name)
- Where should this apply?
```

**Example 2: Reference Conflict**
```
Decided Item: "Use MySQL database"
Uploaded PDF (architecture.md): "System uses PostgreSQL"

Conflict Detection:
- Type: reference_conflict
- Severity: critical
- Resolution Options:
  1. Update to PostgreSQL (match reference)
  2. Keep MySQL (note deviation from doc)
  3. Ask user which is correct
```

**Example 3: Consistency Check**
```
Previous: "Budget is $50,000"
Current: "Add feature X, Y, Z (estimated $60,000)"

Consistency Check:
- Type: budget_inconsistency
- Severity: high
- Explanation: "New features exceed stated budget"
- Recommendation: "Ask user to prioritize or increase budget"
```

---

### 4. StrategicPlannerAgent

**Consolidates:** TranslationAgent + DevelopmentAgent + PrioritizationAgent

**File:** [`backend/src/agents/strategicPlanner.ts`](backend/src/agents/strategicPlanner.ts)

#### Purpose
Transform vision into actionable plans with vendor research, document generation, and strategic prioritization.

#### Key Responsibilities

1. **Vision Translation**
   - Converts creative vision → technical specifications
   - Translates user needs → feature requirements
   - Transforms concepts → implementation details
   - Defines goals → measurable criteria
   - Maintains traceability to original vision

2. **Vendor Research & Development**
   - Researches companies/vendors for project execution
   - Identifies best-fit partners based on expertise
   - Evaluates budget, timeline, quality factors
   - Presents options with pros/cons analysis
   - Generates professional documents (RFPs, specs, briefs)

3. **Prioritization & Sequencing**
   - Maps dependencies between items
   - Identifies critical path for completion
   - Suggests optimal decision sequence
   - Flags blockers preventing progress
   - Finds quick wins vs. complex tasks

#### Main Capabilities

##### 1. Vision Translation
```typescript
async translate(
  decidedItems: any[],
  projectContext: any
): Promise<AgentResponse>
```

**Generates Technical Specifications Document:**

```markdown
# Technical Specifications: [Project Title]

## Executive Summary
[Vision in business terms]

## Technical Requirements
[Specs and constraints based on decided items]

## Feature Breakdown
[What needs to be built, organized by category]

## Success Criteria
[Measurable outcomes to validate success]

## Implementation Notes
[Key considerations for development]
```

##### 2. Vendor Research
```typescript
async research(
  projectConcept: any,
  decidedItems: any[]
): Promise<AgentResponse>
```

**Returns Structured Vendor Analysis:**
```json
{
  "vendors": [
    {
      "name": "Company Name",
      "why": "Reasoning for recommendation",
      "pros": ["expertise in domain", "proven track record"],
      "cons": ["higher cost", "longer timeline"],
      "estimatedCost": "$50,000 - $75,000",
      "timeline": "3-4 months"
    }
  ],
  "requiredDocuments": ["RFP", "Technical Specs", "SOW"],
  "nextSteps": ["Generate RFP", "Schedule vendor calls"],
  "timeline": "6 months total"
}
```

##### 3. Document Generation

**Generate RFP:**
```typescript
async generateRFP(
  projectTitle: string,
  decidedItems: any[],
  requirements: any
): Promise<string>
```

**Generate Implementation Plan:**
```typescript
async generateImplementationPlan(
  projectTitle: string,
  decidedItems: any[],
  vendorRecommendations: any
): Promise<string>
```

##### 4. Prioritization Analysis
```typescript
async prioritize(projectState: any): Promise<AgentResponse>
```

**Returns Priority Analysis:**
```json
{
  "criticalPath": ["Define API architecture", "Choose auth method", "Select database"],
  "nextRecommended": "Define API architecture",
  "blockers": ["No budget approval", "Waiting on stakeholder decision"],
  "quickWins": ["Set up dev environment", "Create GitHub repo", "Initial README"],
  "reasoning": "API architecture blocks all feature development, so it must be done first. Quick wins can be done in parallel while waiting on decisions."
}
```

##### 5. Comprehensive Strategic Planning
```typescript
async createComprehensivePlan(
  projectTitle: string,
  decidedItems: any[],
  projectContext: any
): Promise<AgentResponse>
```

Combines translation, research, and prioritization into a single comprehensive plan.

#### Document Templates

**1. Request for Proposal (RFP)**
```markdown
# Request for Proposal: [Project]

## 1. Project Overview
## 2. Scope of Work
## 3. Technical Requirements
## 4. Timeline
## 5. Budget
## 6. Vendor Qualifications
## 7. Submission Requirements
## 8. Evaluation Criteria
## 9. Terms and Conditions
```

**2. Implementation Plan**
```markdown
# Implementation Plan: [Project]

## 1. Executive Summary
## 2. Project Phases
## 3. Milestones and Deliverables
## 4. Resource Requirements
## 5. Budget Breakdown
## 6. Risk Assessment
## 7. Success Criteria
## 8. Next Steps
```

#### Example Workflows

**Example 1: Vision to Technical Specs**
```
Decided Items:
- "Social media authentication"
- "Real-time notifications"
- "Mobile-first design"

Translation Output:
→ Technical Requirements:
  - OAuth 2.0 integration (Google, Facebook, Twitter)
  - WebSocket infrastructure for push notifications
  - Responsive CSS framework (Tailwind recommended)
  - PWA capabilities for mobile experience

→ Success Criteria:
  - <2s page load on mobile
  - 99.9% auth uptime
  - <500ms notification delivery
```

**Example 2: Priority Analysis**
```
Project State:
- 15 decided items
- 8 exploring items
- 3 parked items

Priority Analysis:
→ Critical Path:
  1. Database schema design (blocks everything)
  2. Authentication system (blocks user features)
  3. API architecture (blocks frontend work)

→ Blockers:
  - No decision on hosting provider
  - Budget not approved

→ Quick Wins:
  - Set up CI/CD pipeline
  - Create project README
  - Set up code style guide
```

---

### 5. ContextManagerAgent

**File:** [`backend/src/agents/contextManager.ts`](backend/src/agents/contextManager.ts)

#### Purpose
Classify user intent and manage conversation state to route workflows correctly through the orchestration system.

#### Key Responsibilities

1. **Intent Classification**
   - Determines what the user wants to accomplish
   - Analyzes message content and context
   - Returns classification with confidence score
   - Handles special commands

2. **State Management**
   - Tracks DECIDED, EXPLORING, PARKED states
   - Identifies state transitions
   - Detects conflicts and ambiguities

3. **Workflow Routing**
   - Directs conversations to appropriate agent workflows
   - Ensures correct agent sequence execution
   - Optimizes agent coordination

4. **Context Awareness**
   - Recognizes affirmative responses to AI suggestions
   - Analyzes conversation history for context
   - Detects approval and confirmation signals

#### Intent Classifications

##### 1. brainstorming
**Signals:** Generating/sharing new ideas, creative exploration
**Triggers:** "I'm thinking about...", "What if we...", "Let's explore..."
**Workflow:** Conversation → GapDetection → Recorder → Clarification (if gaps)

##### 2. deciding
**Signals:** Making firm decisions, approving suggestions
**Triggers:** "I want", "I need", "Let's use", "Yes", "Perfect", "Love it"
**Workflow:** Conversation → Recorder → Verification + AssumptionBlocker + ConsistencyGuardian → VersionControl

##### 3. modifying
**Signals:** Changing previously stated information
**Triggers:** "Change to", "Instead of", "Actually", "Switch to"
**Workflow:** Conversation → Verification + ConsistencyGuardian → VersionControl + AccuracyAuditor

##### 4. questioning
**Signals:** Asking for clarification or information
**Triggers:** "What about...", "How do we...", "Can you explain..."
**Workflow:** Conversation → (context-specific response)

##### 5. exploring
**Signals:** Thinking through options, considering possibilities
**Triggers:** "Maybe", "Could we", "What if", "Should we"
**Workflow:** Conversation + Questioner → Recorder

##### 6. parking
**Signals:** Saving something for later consideration
**Triggers:** "Come back to", "Maybe later", "Pin that", "For later"
**Workflow:** Conversation → Recorder (with parked state)

##### 7. reviewing
**Signals:** Checking current state, requesting conversation review
**Triggers:** "Review conversation", "What did we decide", "Show me what we have"
**Workflow:** Reviewer → Recorder → AccuracyAuditor + Prioritization

##### 8. development
**Signals:** Planning implementation, finding vendors, execution phase
**Triggers:** "What's next", "How do we build", "Find vendors", "Create RFP"
**Workflow:** Translation → Development → Reviewer

##### 9. document_research
**Signals:** Discovering/generating documentation
**Triggers:** "What documents do I need", "Generate documentation", "Create documents"
**Workflow:** DocumentResearch → QualityAuditor → Recorder

##### 10. general
**Signals:** Casual conversation, unclear intent
**Triggers:** Off-topic, greetings, acknowledgments
**Workflow:** Conversation → Recorder (if applicable)

#### Main Method

```typescript
async classifyIntent(
  userMessage: string,
  conversationHistory: any[]
): Promise<IntentClassification>
```

**Returns:**
```typescript
{
  type: "brainstorming" | "deciding" | "modifying" | ...,
  confidence: 0-100,
  conflicts: [],
  needsClarification: true/false,
  reasoning: "explanation of classification"
}
```

#### Special Command Detection

**Review Conversation:**
```
Input: "review conversation" or "?review conversation"
Output: { type: "reviewing", confidence: 100 }
```

#### Context-Aware Classification

**Affirmative Response Detection:**
```
[Assistant]: "We could add a payment system..."
[User]: "Yes!"

Classification: "deciding" (user is approving AI's suggestion)
```

**Signals for Decision Intent:**
- **Strong commitment:** "I want", "I need", "We need", "Let's use/add/include"
- **Approval after AI message:** "Yes", "Love it", "Perfect", "Definitely", "Exactly"
- **Selection:** "I choose", "Go with", "Pick that"

#### Example Classifications

```
User: "I'm thinking about adding dark mode"
→ Intent: exploring (confidence: 85%)

User: "Let's add dark mode!"
→ Intent: deciding (confidence: 95%)

User: "Actually, change that to light theme only"
→ Intent: modifying (confidence: 90%)

User: "What documents do I need for GDPR?"
→ Intent: document_research (confidence: 80%)

User: "Review conversation"
→ Intent: reviewing (confidence: 100%)
```

---

## Support Agents

### 6. ReferenceAnalysisAgent

**File:** [`backend/src/agents/referenceAnalysis.ts`](backend/src/agents/referenceAnalysis.ts)

#### Purpose
Analyze uploaded files (images, PDFs, videos, documents, URLs) to extract structured, actionable information for project planning.

#### Analysis Capabilities

1. **IMAGE ANALYSIS**
   - Design elements, colors (hex codes), layout, style, composition
   - Visual hierarchy and user interface patterns
   - Branding elements and style guides

2. **VIDEO ANALYSIS**
   - Key frames and visual sequences
   - Features and functionality demonstrations
   - User interactions and workflows

3. **PDF ANALYSIS**
   - Extract specifications, requirements, key information
   - Parse structured documents
   - Identify technical details and constraints

4. **WORD DOCUMENTS**
   - Full text extraction
   - Requirements and specifications parsing
   - Business rules and policies

5. **URL ANALYSIS**
   - Competitor features and design patterns
   - Functionality analysis
   - Best practices and approaches

6. **PRODUCT ANALYSIS**
   - Features, specifications, pricing
   - Pros/cons analysis
   - Competitive positioning

#### Structured Extraction

**Extracts:**
- **Requirements:** Features, capabilities, must-haves (with confidence 0-100)
- **Constraints:** Budget limits, timeline restrictions, technical limitations
- **Preferences:** Style choices, color schemes, approaches, patterns
- **Design Elements:** Specific colors (hex codes), typography, layouts
- **Business Rules:** Policies, workflows, processes
- **Technical Specs:** APIs, platforms, technologies, performance requirements

#### Output Format

Professional markdown with:
```markdown
# 📄 [Document Title/Type] Analysis

## 📋 Executive Summary
[2-3 sentence overview]

## ⭐ Key Features
- Feature 1
- Feature 2

## 📌 Requirements & Specifications

### 🎯 Core Features (High Confidence ≥80%)
| Feature | Confidence | Priority |
|---------|-----------|----------|
| OAuth authentication | 95% | High |
| Real-time sync | 85% | Medium |

### ⚠️ Constraints & Limitations
- **Technical:** Must support IE11
- **Timeline:** Launch by Q2 2025
- **Budget:** $50K maximum

### 💡 User Preferences
- Dark mode interface *(Confidence: 85%)*
- Minimal design aesthetic *(Confidence: 70%)*

## 🎨 Design Elements
**Color Palette:** `#1E3A8A`, `#3B82F6`, `#93C5FD`
**Typography:** Inter, Roboto
**Layout Style:** Card-based grid layout
**Visual Style:** Modern, clean, professional

## 🔧 Technical Specifications
**Target Platforms:**
- Web (Chrome, Firefox, Safari)
- iOS 14+
- Android 10+

**Technologies & Tools:**
- React 18 (UI framework)
- Node.js (Backend)
- PostgreSQL (Database)

## 💡 Key Insights & Analysis
> **Insight 1:** Mobile-first approach critical for target audience

> **Insight 2:** Strong emphasis on accessibility features

## 🚀 Actionable Recommendations
- [ ] Implement OAuth with Google and GitHub
- [ ] Create mobile prototype first
- [ ] Set up accessibility testing pipeline

## ❓ Questions to Consider
1. Should we support offline mode?
2. What's the data retention policy?
3. How do we handle API versioning?

---
*Analysis completed with PDF text extraction. Confidence levels indicate certainty of extracted information.*
```

#### Main Methods

##### Standard Analysis
```typescript
async analyze(
  referenceType: string,
  referenceData: any
): Promise<AgentResponse>
```

##### Context-Aware Analysis
```typescript
async analyzeWithContext(
  referenceType: string,
  referenceData: any,
  projectContext: {
    decidedItems: any[];
    exploringItems: any[];
    projectTitle: string;
  }
): Promise<AgentResponse>
```

Compares reference against project state to find conflicts, confirmations, and new insights.

##### Template-Based Analysis
```typescript
async analyzeWithTemplate(
  referenceType: string,
  referenceData: any,
  templateId: string
): Promise<AgentResponse>
```

Uses specialized templates for domain-specific extraction (API docs, business requirements, etc.).

#### Formatting Guidelines

- Use emojis sparingly for visual hierarchy (section headers only)
- Use tables for structured data with confidence scores
- Use blockquotes (>) for key insights
- Use checkboxes (- [ ]) for actionable items
- Use inline code backticks for technical terms, hex codes, file names
- Use bold (**text**) for emphasis on key terms
- Use italic (*text*) for confidence scores and metadata
- Keep sections concise but informative
- Omit sections that have no relevant data
- Be specific and actionable, not generic
- Extract exact values (colors, fonts, dimensions) when available
- Assign realistic confidence scores based on clarity of information

---

### 7. ReviewerAgent

**File:** [`backend/src/agents/reviewer.ts`](backend/src/agents/reviewer.ts)

#### Purpose
Perform comprehensive QA on conversations, documents, and project state to ensure completeness and accuracy.

#### Key Responsibilities

1. **Conversation Review**
   - Checks discussion flow and capture completeness
   - Identifies missing items that should be recorded
   - Verifies all decisions are documented
   - Ensures clarity and traceability

2. **Document Review**
   - Verifies generated documents for accuracy
   - Checks completeness of content
   - Validates formatting and structure
   - Ensures professional quality

3. **State Review**
   - Audits project state accuracy
   - Verifies categorization (decided/exploring/parked)
   - Checks for outdated or incorrect information
   - Ensures consistency across project

4. **Final Review**
   - Pre-delivery comprehensive check
   - Validates all requirements met
   - Ensures documentation is complete
   - Final quality gate before handoff

#### Review Types

##### 1. Conversation Review
```typescript
async review(
  reviewType: 'conversation',
  data: {
    conversation: any[];
    projectState: any;
    explicitReview: boolean;
  }
): Promise<AgentResponse>
```

**Checks:**
- What decisions/explorations have been discussed?
- What is currently recorded in project state?
- Any missing items that should be recorded?

**Output:**
```json
{
  "reviewType": "conversation",
  "status": "needs_revision",
  "score": 75,
  "findings": [
    {
      "category": "completeness",
      "severity": "high",
      "issue": "RGB lighting decision not recorded",
      "location": "Message #12",
      "recommendation": "Record 'Include RGB lighting' as decided"
    },
    {
      "category": "consistency",
      "severity": "medium",
      "issue": "Budget mentioned twice with different values",
      "location": "Messages #5 and #15",
      "recommendation": "Clarify correct budget amount"
    }
  ],
  "summary": "75% complete. 2 items need attention before proceeding."
}
```

##### 2. Document Review
```typescript
async review(
  reviewType: 'document',
  data: {
    document: string;
    documentType: string;
    requirements: any;
  }
): Promise<AgentResponse>
```

##### 3. State Review
```typescript
async review(
  reviewType: 'state',
  data: {
    projectState: any;
    expectedState: any;
  }
): Promise<AgentResponse>
```

##### 4. Final Review
```typescript
async review(
  reviewType: 'final',
  data: {
    project: any;
    deliverables: any[];
    requirements: any;
  }
): Promise<AgentResponse>
```

#### Review Checklist

**For All Reviews:**
- ✓ **Accuracy:** Does recorded info match conversations?
- ✓ **Completeness:** Is anything missing?
- ✓ **Consistency:** Any contradictions?
- ✓ **Clarity:** Is everything clearly stated?
- ✓ **Traceability:** Can we trace decisions to sources?

#### Finding Categories

- **accuracy:** Information doesn't match source
- **completeness:** Missing required information
- **consistency:** Contradictory information
- **clarity:** Ambiguous or unclear statements

#### Severity Levels

- **critical:** Blocks progress, must fix immediately
- **high:** Important issue, should fix soon
- **medium:** Notable issue, fix when convenient
- **low:** Minor issue, nice to fix

#### Special: Explicit Review Command

When user types "Review Conversation":
```typescript
explicitReview: true
```

**Behavior:**
1. Generate user-facing summary with missing items
2. Trigger PersistenceManagerAgent to record missing items
3. Provide clear action items for user

**User-Facing Output:**
```
📊 **Conversation Review Complete**

**Overall Score:** 75/100
**Status:** needs_revision

**Summary:** Your project has good foundational decisions, but some items mentioned in conversation haven't been recorded yet.

**⚠️ Missing Items (2):**
1. RGB lighting feature discussed but not recorded
   → Will record as: "Include RGB lighting in design" (decided)
2. Mobile app priority mentioned but not captured
   → Will record as: "Prioritize mobile app development" (exploring)

I'll attempt to record these missing items now.
```

#### Integration with PersistenceManager

When ReviewerAgent identifies missing items:
1. Returns findings with `category: "completeness"`
2. PersistenceManagerAgent receives findings
3. Calls `recordFromReview()` to batch-record items
4. Updates user with what was recorded

---

### 8. ResourceManagerAgent

**File:** [`backend/src/agents/resourceManager.ts`](backend/src/agents/resourceManager.ts)

#### Purpose
Organize and manage reference materials, research, and inspiration for easy retrieval and organization.

#### What It Manages

- **Reference links and sources:** URLs, articles, documentation
- **Competitor examples:** Competitor products, features, pricing
- **Inspiration materials:** Design inspiration, UI patterns
- **Research documents:** Market research, user research
- **Related projects:** Similar projects, case studies
- **Uploaded files:** Images, videos, PDFs, documents

#### Organization System

**Categorization:**
- Organized by project area (design, technical, business)
- Tagged with relevant keywords
- Linked to related decided items
- Tracked with timestamps (when/why added)

**Metadata:**
```typescript
{
  id: "resource_xxx",
  type: "url|image|video|pdf|document",
  category: "design|technical|business|research|inspiration",
  relatedItems: ["item_id_1", "item_id_2"],
  addedAt: "2025-10-21T10:30:00Z",
  tags: ["design", "inspiration", "mobile"],
  source: "user_upload|web_research|generated"
}
```

#### Main Capabilities

##### Organize Resource
```typescript
async organizeResource(
  resource: any,
  category: string,
  relatedItems: string[]
): Promise<AgentResponse>
```

**Returns:**
```typescript
{
  agent: "ResourceManagerAgent",
  message: "",
  showToUser: false,
  metadata: {
    id: "resource_xxx",
    category: "design",
    relatedItems: ["item_123", "item_456"],
    addedAt: "ISO date",
    tags: ["design", "technical", "inspiration"]
  }
}
```

##### Auto-Tag Extraction

Automatically extracts tags from resource content:
- Common tags: design, technical, inspiration, competitor, research, reference
- Analyzes content for keyword matches
- Suggests relevant tags based on context

#### Use Cases

**1. Link Management**
```
User uploads: "https://competitor.com/features"
→ Category: competitor
→ Tags: ["competitor", "research", "reference"]
→ Related: [feature_comparison_item]
```

**2. Design Inspiration**
```
User uploads: design-mockup.png
→ Category: design
→ Tags: ["design", "inspiration"]
→ Related: [ui_design_item, color_scheme_item]
```

**3. Research Documents**
```
User uploads: market-research.pdf
→ Category: research
→ Tags: ["research", "market"]
→ Related: [target_audience_item]
```

#### Integration Points

- **ReferenceAnalysisAgent:** Analyzes uploaded resources
- **UnifiedResearchAgent:** Searches organized resources
- **PersistenceManagerAgent:** Links resources to recorded items
- **ReviewerAgent:** Verifies resource organization

---

### 9. UnifiedResearchAgent

**Replaces:** LiveResearchAgent + DocumentResearchAgent + ResearchSuggestionAgent

**File:** [`backend/src/agents/unifiedResearchAgent.ts`](backend/src/agents/unifiedResearchAgent.ts)

#### Purpose
Intelligent research assistant that searches across multiple knowledge sources (web + project documents) with AI-powered source selection and synthesis.

#### Key Capabilities

##### 1. Multi-Source Search

**Web Sources:**
- External knowledge and latest information
- Best practices and industry standards
- Competitive analysis
- Technical documentation

**Project Documents:**
- Internal references and uploaded files
- Generated documents
- Project-specific context
- Previous research results

**Semantic Similarity Search:**
- Uses embeddings for document matching
- Ranks by relevance score
- Finds contextually similar content

**Cross-Source Synthesis:**
- Combines findings from all sources
- Cites sources clearly (web URLs and document names)
- Identifies conflicting information
- Highlights gaps in knowledge

##### 2. Intelligent Source Selection (4 Modes)

**Auto (AI-Powered):**
AI analyzes query to determine optimal sources
```
"Latest React 19 features" → Web only
"What did we decide about auth?" → Documents only
"Compare our architecture to best practices" → Both
```

**Web Only:**
External knowledge, latest information, best practices

**Documents Only:**
Project-specific, internal context, existing research

**All (Both):**
Comprehensive view combining external + internal knowledge

##### 3. Research Intents

**Intent 1: Research (Default)**
General research on any topic
```typescript
intent: 'research'
```
- Searches selected sources
- Analyzes all findings
- Creates comprehensive synthesis
- No special outputs

**Intent 2: Document Discovery**
Find what documents you need for your project
```typescript
intent: 'document_discovery'
```
- Searches sources for document needs
- Analyzes findings
- **Suggests specific document templates** (Privacy Policy, API Docs, etc.)
- Provides reasoning and priority (high/medium/low)

Example: "What documentation do I need for my healthcare app?"

**Intent 3: Gap Analysis**
Identify gaps in existing documentation
```typescript
intent: 'gap_analysis'
```
- Searches project documents
- Compares against best practices/requirements
- **Identifies missing or incomplete documentation**
- Suggests actions to fill gaps

Example: "What's missing from our API documentation?"

##### 4. Main Research Method

```typescript
async research(
  query: string,
  projectId: string,
  userId: string,
  options: {
    sources?: 'web' | 'documents' | 'all' | 'auto';
    intent?: 'research' | 'document_discovery' | 'gap_analysis';
    maxWebSources?: number;  // Default: 5
    maxDocumentSources?: number;  // Default: 10
    includeAnalysis?: boolean;  // Default: true
    saveToDB?: boolean;  // Default: true
  },
  callbacks?: {
    onSourceSelectionComplete?: (strategy: string) => Promise<void>;
    onWebSearchComplete?: (count: number) => Promise<void>;
    onDocumentSearchComplete?: (count: number) => Promise<void>;
    onAnalysisComplete?: (count: number) => Promise<void>;
    onSynthesisComplete?: () => Promise<void>;
  }
): Promise<UnifiedResearchResult>
```

##### 5. Research Result Structure

```typescript
{
  query: string;
  intent: 'research' | 'document_discovery' | 'gap_analysis';
  sourcesUsed: ['web', 'documents', 'all'];

  // Web sources
  webSources: [
    {
      url: "https://...",
      title: "Article Title",
      snippet: "Brief description",
      content: "Full extracted content",
      analysis: "AI analysis of content",
      source: "web"
    }
  ],

  // Document sources
  documentSources: [
    {
      id: "doc_123",
      filename: "architecture.md",
      type: "reference" | "generated_document" | "uploaded_file",
      content: "Document content",
      analysis: "Document summary",
      relevanceScore: 0.85,
      source: "documents"
    }
  ],

  // Unified synthesis combining all sources
  synthesis: "Comprehensive analysis combining web and document findings...",

  // Intent-specific outputs
  suggestedDocuments?: [  // For document_discovery
    {
      templateId: "api_documentation",
      templateName: "API Documentation",
      category: "software_technical",
      reasoning: "Your app needs documented API endpoints",
      priority: "high"
    }
  ],

  identifiedGaps?: [  // For gap_analysis
    {
      area: "Authentication documentation",
      description: "No documentation of OAuth flow",
      suggestedAction: "Create authentication flow diagram and documentation"
    }
  ],

  // Saved references (IDs)
  savedReferences: ["ref_123", "ref_456"],

  // Metadata
  metadata: {
    totalSources: 8,
    webSourcesCount: 5,
    documentSourcesCount: 3,
    duration: 12500,  // milliseconds
    searchStrategy: "Web + Documents (AI recommended)"
  }
}
```

##### 6. Real-Time Progress Tracking

Callbacks for monitoring research progress:
```typescript
callbacks: {
  onSourceSelectionComplete: (strategy) => {
    // "Web + Documents (AI recommended)"
  },
  onWebSearchComplete: (count) => {
    // Found 5 web sources
  },
  onDocumentSearchComplete: (count) => {
    // Found 3 document sources
  },
  onAnalysisComplete: (count) => {
    // Analyzed 8 sources
  },
  onSynthesisComplete: () => {
    // Synthesis complete
  }
}
```

##### 7. Search Strategy Determination

```typescript
private async determineSearchStrategy(
  query: string,
  sources: ResearchSource,
  intent: ResearchIntent
): Promise<{
  searchWeb: boolean;
  searchDocuments: boolean;
  sourcesUsed: ResearchSource[];
  description: string;
}>
```

Uses Claude AI to analyze query and determine best sources:
- Analyzes query keywords and intent
- Considers whether it's project-specific or general
- Determines if latest external info or internal context needed
- Returns strategy with reasoning

#### Example Workflows

**Example 1: Auto Source Selection**
```
Query: "How should we implement real-time collaboration?"
Sources: Auto
Intent: Research

→ AI Strategy: BOTH (needs external best practices + internal project context)
→ Searches 5 web sources (Firebase docs, Socket.io guides)
→ Searches 3 project documents (architecture.md, technical-specs.md)
→ Analyzes all 8 sources
→ Creates synthesis: "Based on your current architecture (Node.js + PostgreSQL) and industry best practices, recommend WebSocket implementation using Socket.io..."
```

**Example 2: Document Discovery**
```
Query: "What legal documents do I need for my SaaS product?"
Sources: Web
Intent: Document Discovery

→ Searches web for SaaS legal requirements
→ Analyzes findings
→ Suggests Documents:
  1. Privacy Policy (high priority) - "Required by GDPR and CCPA"
  2. Terms of Service (high priority) - "Defines user rights and limitations"
  3. Data Processing Agreement (medium) - "If handling EU customer data"
  4. Cookie Policy (medium) - "If using tracking cookies"
  5. SLA Agreement (low) - "For enterprise customers"
```

**Example 3: Gap Analysis**
```
Query: "What's missing from our API documentation?"
Sources: Documents
Intent: Gap Analysis

→ Searches project documents for API-related content
→ Compares against API documentation best practices
→ Identifies Gaps:
  1. "Authentication flow not documented"
     → Create API auth guide with OAuth examples
  2. "No error code reference"
     → Add comprehensive error code table
  3. "Missing rate limiting info"
     → Document rate limits and quotas
  4. "No API versioning strategy"
     → Define versioning approach
```

#### Integration with Other Agents

- **ReferenceAnalysisAgent:** Analyzes web sources found during research
- **SynthesisAgent:** Creates unified synthesis from multiple sources
- **PersistenceManagerAgent:** Saves research results to database
- **ContextManagerAgent:** Routes document_research intent to this agent

#### Database Integration

Saves all research to database:
```sql
-- Web sources saved as references
INSERT INTO references (
  project_id,
  user_id,
  url,
  filename,
  analysis_status,
  metadata
) VALUES (...);

-- Links to existing document sources
-- Tracks research queries with full results
```

---

## Agent Orchestration

### IntegrationOrchestrator

**File:** [`backend/src/agents/orchestrator.ts`](backend/src/agents/orchestrator.ts)

#### Purpose
Coordinates all agents through specialized workflows based on user intent. Manages parallel execution, context pruning, and response caching.

#### Workflow Determination

```typescript
async determineWorkflow(
  intent: IntentClassification,
  userMessage: string
): Promise<Workflow>
```

Maps intent to agent workflow sequence.

#### Workflow Definitions

##### 1. Brainstorming Workflow
```typescript
[
  { agentName: 'brainstorming', action: 'reflect', parallel: true },
  { agentName: 'gapDetection', action: 'analyze', parallel: false },
  { agentName: 'recorder', action: 'record' },
  { agentName: 'clarification', action: 'generateQuestion', condition: 'if_gaps_found' }
]
```

**Flow:**
1. ConversationAgent reflects user's ideas (parallel)
2. GapDetection analyzes for missing info (end parallel)
3. PersistenceManager records items
4. Clarification asks question if gaps found

##### 2. Deciding Workflow
```typescript
[
  { agentName: 'brainstorming', action: 'reflect' },
  { agentName: 'recorder', action: 'record' },
  { agentName: 'verification', action: 'verify', parallel: true },
  { agentName: 'assumptionBlocker', action: 'scan', parallel: true },
  { agentName: 'consistencyGuardian', action: 'checkConsistency', parallel: false },
  { agentName: 'versionControl', action: 'trackChange' }
]
```

**Flow:**
1. ConversationAgent reflects decision
2. PersistenceManager records decision
3. QualityAuditor runs 3 checks in parallel:
   - Verification
   - Assumption scanning
   - Consistency checking
4. VersionControl tracks change

##### 3. Modifying Workflow
```typescript
[
  { agentName: 'brainstorming', action: 'reflect' },
  { agentName: 'verification', action: 'verify', parallel: true },
  { agentName: 'consistencyGuardian', action: 'checkConsistency', parallel: false },
  { agentName: 'versionControl', action: 'trackChange', parallel: true },
  { agentName: 'accuracyAuditor', action: 'audit', parallel: false }
]
```

##### 4. Exploring Workflow
```typescript
[
  { agentName: 'brainstorming', action: 'reflect', parallel: true },
  { agentName: 'questioner', action: 'generateQuestion', parallel: false },
  { agentName: 'recorder', action: 'record' }
]
```

##### 5. Reviewing Workflow
```typescript
[
  { agentName: 'reviewer', action: 'review' },
  { agentName: 'recorder', action: 'record' },
  { agentName: 'accuracyAuditor', action: 'audit', parallel: true },
  { agentName: 'prioritization', action: 'prioritize', parallel: false }
]
```

##### 6. Development Workflow
```typescript
[
  { agentName: 'translation', action: 'translate' },
  { agentName: 'development', action: 'research' },
  { agentName: 'reviewer', action: 'review' }
]
```

##### 7. Reference Integration Workflow
```typescript
[
  { agentName: 'referenceAnalysis', action: 'analyzeWithContext' },
  { agentName: 'consistencyGuardian', action: 'checkReferenceAgainstDecisions' },
  { agentName: 'clarification', action: 'generateQuestion', condition: 'if_conflicts_found' },
  { agentName: 'recorder', action: 'updateConfidenceScores', condition: 'if_confirmations_found' }
]
```

##### 8. Document Research Workflow
```typescript
[
  { agentName: 'documentResearch', action: 'analyzeAndSuggest' },
  { agentName: 'qualityAuditor', action: 'validateSuggestions' },
  { agentName: 'recorder', action: 'recordDocumentIntent' }
]
```

#### Parallel Execution

Agents marked with `parallel: true` run concurrently until a step with `parallel: false` is reached:

```typescript
// These 3 run in parallel
{ agentName: 'verification', action: 'verify', parallel: true },
{ agentName: 'assumptionBlocker', action: 'scan', parallel: true },
{ agentName: 'consistencyGuardian', action: 'checkConsistency', parallel: false }
// parallel group ends here
```

**Benefits:**
- Faster response times
- Efficient API usage
- Independent validation checks

#### Conditional Execution

Steps with `condition` only execute if condition is met:

```typescript
{
  agentName: 'clarification',
  action: 'generateQuestion',
  condition: 'if_gaps_found'
}
```

**Supported Conditions:**
- `if_gaps_found` - Gap detection found critical gaps
- `if_verified` - Verification approved
- `if_conflicts_found` - Consistency check found conflicts
- `if_confirmations_found` - Reference confirmed decisions

#### Optimization Features

##### 1. Context Pruning
```typescript
const { prunedHistory, stats } = this.contextPruner.pruneForAgent(
  agentName,
  conversationHistory,
  projectState
);
```

Reduces conversation history based on agent-specific needs:
- ConversationAgent: Keeps recent messages
- PersistenceManager: Keeps decision-related messages
- QualityAuditor: Keeps verification-relevant messages

##### 2. Response Caching
```typescript
const cacheKey = this.responseCache.generateKey(
  agentName,
  userMessage,
  projectState,
  history
);

const cachedResponse = this.responseCache.get(cacheKey);
if (cachedResponse) {
  return cachedResponse; // Skip API call
}
```

Caches identical requests to reduce API calls and improve performance.

##### 3. Token Metrics
```typescript
this.tokenMetrics.trackUsage(agentName, tokensUsed);
const metrics = this.tokenMetrics.getMetricsForAPI();
```

Tracks token usage per agent for optimization insights.

---

## Intent Classification System

### How Intent Classification Works

1. **User sends message** to backend
2. **ContextManagerAgent.classifyIntent()** analyzes message
3. **Returns IntentClassification** with type and confidence
4. **Orchestrator determines workflow** based on intent
5. **Workflow executes** appropriate agent sequence

### Classification Process

```typescript
// Step 1: Analyze message
const intent = await contextManager.classifyIntent(userMessage, conversationHistory);

// Step 2: Determine workflow
const workflow = await orchestrator.determineWorkflow(intent, userMessage);

// Step 3: Execute workflow
const responses = await orchestrator.executeWorkflow(
  workflow,
  userMessage,
  projectState,
  conversationHistory,
  projectReferences
);
```

### Intent Confidence Levels

- **90-100%:** High confidence, proceed with workflow
- **70-89%:** Medium confidence, generally safe to proceed
- **50-69%:** Low confidence, may need clarification
- **<50%:** Very low, default to general workflow

### Special Intent Handling

**Review Conversation (100% confidence):**
```typescript
if (message === 'review conversation') {
  return {
    type: 'reviewing',
    confidence: 100,
    reasoning: 'Explicit review command'
  };
}
```

**Context-Aware Approval:**
```typescript
if (isShortAffirmative && previousMessageFromAI) {
  return {
    type: 'deciding',
    confidence: 95,
    reasoning: 'User approving AI suggestion'
  };
}
```

---

## Workflow Examples

### Example 1: Complete Brainstorming Flow

**User Input:** "I'm thinking about adding dark mode and maybe a settings page"

**Step 1: Intent Classification**
```
ContextManagerAgent:
→ Intent: brainstorming (confidence: 85%)
→ Reasoning: "Tentative language ('thinking about', 'maybe')"
```

**Step 2: Workflow Determination**
```
Orchestrator:
→ Workflow: brainstorming
→ Steps: [ConversationAgent, GapDetection, Recorder, Clarification?]
```

**Step 3: Workflow Execution**

**3a. ConversationAgent reflects:**
```
Response: "You're considering adding dark mode functionality and a settings page for configuration."
showToUser: true
```

**3b. GapDetection analyzes (silent):**
```json
{
  "gaps": [
    {
      "category": "specification",
      "description": "Settings page contents not specified",
      "importance": "high",
      "question": "What settings should be configurable?"
    }
  ],
  "criticalCount": 0,
  "hasCriticalGaps": false,
  "hasGaps": true
}
```

**3c. PersistenceManager records:**
```
State: exploring
Items:
- "Add dark mode toggle"
- "Create settings page"
Confidence: 70% (tentative language)
```

**3d. Clarification asks (because gaps found):**
```
Response: "What settings would you like users to be able to configure?"
showToUser: true
```

**Result to User:**
```
[ConversationAgent]: "You're considering adding dark mode functionality and a settings page for configuration."

[ClarificationAgent]: "What settings would you like users to be able to configure?"
```

---

### Example 2: Complete Deciding Flow

**User Input:** "Yes, let's go with Stripe for payments!"

**Step 1: Intent Classification**
```
ContextManagerAgent:
→ Context: Previous AI message suggested Stripe
→ Intent: deciding (confidence: 95%)
→ Reasoning: "Affirmative response approving AI suggestion"
```

**Step 2: Workflow Execution**

**2a. ConversationAgent reflects:**
```
Response: "You've decided to use Stripe for the payment system."
```

**2b. PersistenceManager records:**
```
State: decided
Item: "Use Stripe for payment processing"
Confidence: 95%
UserQuote: "Yes, let's go with Stripe for payments!"
```

**2c. QualityAuditor runs 3 parallel checks:**

**Verification:**
```json
{
  "approved": true,
  "confidence": 95,
  "reasoning": "User explicitly approved Stripe integration"
}
```

**Assumption Scan:**
```json
{
  "assumptionsDetected": false,
  "approved": true,
  "reasoning": "No assumptions - clear explicit decision"
}
```

**Consistency Check:**
```json
{
  "conflictDetected": false,
  "reasoning": "No conflicts with existing decisions"
}
```

**2d. VersionControl tracks:**
```json
{
  "versionNumber": 1,
  "changeType": "created",
  "reasoning": "Initial decision to use Stripe",
  "timestamp": "2025-10-21T10:30:00Z"
}
```

**Result:**
- Decision recorded with high confidence
- All quality checks passed
- Version 1 created

---

### Example 3: Reference Integration Flow

**User uploads:** `competitor-analysis.pdf` containing pricing information

**Step 1: Intent Classification**
```
Intent: reference_integration (automatic on file upload)
```

**Step 2: Workflow Execution**

**2a. ReferenceAnalysisAgent analyzes:**
```markdown
# Competitor Analysis

## Pricing Models
- Competitor A: $29/month (basic), $99/month (pro)
- Competitor B: $19/month (basic), $79/month (pro)

## Key Features
- Both offer 14-day free trial
- Annual billing discount (20%)
```

**2b. ConsistencyGuardian checks against decisions:**
```
Decided Items:
- "Pricing: $49/month"

Conflict Detected:
- Our pricing ($49/mo) is between competitors
- BUT: No analysis of our feature set vs competitors
- Gap: Need to justify pricing relative to features
```

**2c. Clarification triggered (if conflicts):**
```
Response: "Your pricing ($49/month) is positioned between Competitor A ($29) and Competitor B ($19-79). Should we:
1. Adjust pricing based on competitor analysis?
2. Keep pricing and document feature advantages?
3. Add free trial period like competitors?"
```

**2d. Recorder updates confidence:**
```
Item: "Pricing: $49/month"
Updated Confidence: 75% (down from 85%)
Reasoning: "Competitor analysis suggests re-evaluation needed"
```

---

## API Integration

### Backend Routes

**Agent Coordination Service:**
```typescript
POST /api/conversations/message
{
  projectId: string;
  userId: string;
  userMessage: string;
}

Response:
{
  responses: AgentResponse[];
  updates: {
    itemsAdded: any[];
    itemsModified: any[];
    itemsMoved: any[];
  };
  workflow: Workflow;
}
```

**Unified Research:**
```typescript
POST /api/research/unified
{
  query: string;
  projectId: string;
  userId: string;
  sources?: 'web' | 'documents' | 'all' | 'auto';
  intent?: 'research' | 'document_discovery' | 'gap_analysis';
  maxWebSources?: number;
  maxDocumentSources?: number;
  saveResults?: boolean;
}
```

**Reference Analysis:**
```typescript
POST /api/references/:referenceId/analyze
{
  templateId?: string;
}

Response:
{
  success: boolean;
  analysis: string;
  metadata: {
    analysisCompleted: boolean;
    templateUsed?: {
      id: string;
      name: string;
    };
  };
}
```

### Frontend Integration

**Chat Interface:**
```typescript
import { conversationsApi } from '@/services/api';

const sendMessage = async (message: string) => {
  const response = await conversationsApi.sendMessage(
    projectId,
    userId,
    message
  );

  // Process agent responses
  response.responses.forEach(agentResponse => {
    if (agentResponse.showToUser) {
      displayMessage(agentResponse);
    }
  });

  // Handle state updates
  if (response.updates.itemsAdded.length > 0) {
    refreshProjectState();
  }
};
```

**Research Hub:**
```typescript
import { unifiedResearchApi } from '@/services/api';

const startResearch = async (query: string) => {
  const result = await unifiedResearchApi.submitQuery({
    query,
    projectId,
    userId,
    sources: 'auto',
    intent: 'research'
  });

  // Poll for results
  const queryId = result.queryId;
  pollQueryStatus(queryId);
};
```

---

## Appendix

### Agent Consolidation Map

| Original Agents | Consolidated Into |
|----------------|-------------------|
| BrainstormingAgent | ConversationAgent |
| ClarificationEngine | ConversationAgent |
| GapDetectionAgent | ConversationAgent |
| ClarificationAgent | ConversationAgent |
| QuestionerAgent | ConversationAgent |
| RecorderAgent | PersistenceManagerAgent |
| VerificationAgent | PersistenceManagerAgent |
| VersionControlAgent | PersistenceManagerAgent |
| VerificationAgent (quality) | QualityAuditorAgent |
| AssumptionBlockerAgent | QualityAuditorAgent |
| AccuracyAuditorAgent | QualityAuditorAgent |
| ConsistencyGuardianAgent | QualityAuditorAgent |
| TranslationAgent | StrategicPlannerAgent |
| DevelopmentAgent | StrategicPlannerAgent |
| PrioritizationAgent | StrategicPlannerAgent |
| ContextManagerAgent | *(unchanged)* |
| ReferenceAnalysisAgent | *(unchanged)* |
| ReviewerAgent | *(unchanged)* |
| ResourceManagerAgent | *(unchanged)* |
| LiveResearchAgent | UnifiedResearchAgent |
| DocumentResearchAgent | UnifiedResearchAgent |
| ResearchSuggestionAgent | UnifiedResearchAgent |

**Total:** 22 original agents → 9 consolidated agents

---

## Version History

- **v2.0** (2025-10-21): Complete documentation of 9-agent system
- **v1.9** (2025-10-21): Unified research agents into UnifiedResearchAgent
- **v1.5** (2025-10-20): Consolidated to 9 core + support agents
- **v1.0** (2025-10-15): Initial 17-agent system

---

**For questions or contributions, see:** [CONTRIBUTING.md](CONTRIBUTING.md)
**For migration guides, see:** [MIGRATION_UNIFIED_RESEARCH.md](MIGRATION_UNIFIED_RESEARCH.md)
