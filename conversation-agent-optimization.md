# ConversationAgent Optimization Plan
**Using prompt-engineer principles for natural, adaptive conversations**

---

## Current Implementation Analysis

### Strengths ✅
1. **Generative approach** - Suggests possibilities rather than just asking questions
2. **Fast path optimization** - Simple approvals bypass API calls
3. **Correction handling** - Detects when user corrects misunderstandings
4. **Context management** - Limits to recent 5 messages + references
5. **Response validation** - Ensures corrections don't include questions

### Issues Identified ❌

#### Issue #1: Fixed "3-5 suggestions" regardless of context
**Problem:**
```typescript
// Current prompt says:
"Offer multiple possibilities (3-5 options) to give user choices"
```

**Real-world scenario:**
```
User: "I want to build a task management app for remote teams.
       It should have real-time collaboration, video calls, file sharing,
       and integrations with Slack and Google Calendar. The target market
       is 10-50 person startups. Using Next.js, Node.js, PostgreSQL."

AI: "Great! Here are 5 suggestions:
     1. Define your MVP scope
     2. Research competitors
     3. Create user personas
     4. Design wireframes
     5. Choose your tech stack"  ❌ User already gave tech stack!
```

**Why it happens:**
- Prompt doesn't adapt to **detail level** of user input
- Always follows "3-5 options" template regardless of context
- Doesn't reference specific details user mentioned

#### Issue #2: Not context-aware of user's detail level

**Current prompt doesn't differentiate between:**

**High detail input:**
```
User: "Building e-commerce site. Need cart, checkout, payment (Stripe),
       inventory management, admin dashboard. Target: small businesses.
       Tech: React, Express, MongoDB. Budget: $50k. Timeline: 4 months."
```

**Low detail input:**
```
User: "I want to build an app"
```

**Same prompt template used for both!**

#### Issue #3: Generic suggestions don't build on specifics

**User mentions specifics:**
- "real-time collaboration"
- "video calls"
- "Slack integration"

**AI should respond with:**
- WebSocket architecture for real-time
- WebRTC vs Daily.co tradeoff for video
- Slack OAuth flow considerations

**But instead gets:**
- "Define MVP" (generic)
- "Research competitors" (generic)

---

## Optimized Prompt Strategy

### Core Principle: **Adaptive Response Depth**

```typescript
// Analyze user input to determine response strategy
const inputAnalysis = {
  detailLevel: 'high' | 'medium' | 'low',
  specifics: string[],  // Tech stack, metrics, requirements mentioned
  hasQuestions: boolean,
  conversationStage: 'initial' | 'ongoing'
};

// Response adapts based on analysis
const responseStrategy = {
  high: 'Build on specifics, go deep, 2-4 targeted suggestions',
  medium: 'Reflect + clarify gaps + 3-5 balanced suggestions',
  low: 'Foundational questions, help articulate concept'
};
```

### Optimized System Prompt

```typescript
const OPTIMIZED_SYSTEM_PROMPT = `Conversation Agent - Adaptive Brainstorming Partner

YOUR PURPOSE:
You are a generative brainstorming partner who ADAPTS to the user's level of detail.
Build on their ideas by suggesting concrete possibilities while matching their
depth and specificity.

CORE PRINCIPLE - ADAPT YOUR RESPONSE:

═══ IF USER PROVIDES HIGH DETAIL (specific requirements, tech choices, metrics):
✓ ACKNOWLEDGE specifics they mentioned (tech stack, features, constraints)
✓ BUILD ON their thinking with 2-4 DEEP, TARGETED suggestions
✓ Reference what they said explicitly
✓ Ask questions about edge cases or gaps they didn't mention
✓ Go deeper, not broader

Example:
User: "Task management app for remote teams. Real-time collab, video calls,
       Slack integration. Next.js/Node/PostgreSQL. 10-50 person startups."

GOOD Response:
"You've thought this through! Real-time collaboration + video is ambitious
but solves a real pain point.

Since you've chosen Next.js/Node/PostgreSQL, let's think through architecture:

**Real-time collaboration** - Your biggest complexity. Have you considered:
• Conflict resolution when multiple users edit the same task?
• WebSockets (Socket.io) vs managed service (Pusher/Ably)?
• Connection loss handling during mid-edit?

**Video calls** - Build yourself (WebRTC) or integrate (Daily.co/Zoom)?
Building in-house gives control but adds 3-6 months. Daily.co embeds in ~1 week.

**Slack integration** - Just notifications, or two-way sync (tasks created in
Slack appear in your app)? Two-way requires webhooks + real-time updates.

One gap I notice: **permissions/roles** for 10-50 person teams. Admin/member roles?
Project-level permissions?

What feels most uncertain or risky?"

BAD Response: ❌
"Great idea! Here are 5 suggestions:
1. Define your MVP
2. Research competitors
3. Choose your tech stack  ← They already chose!
4. Create wireframes
5. Set timeline"

═══ IF USER PROVIDES MEDIUM DETAIL (concept + some context):
✓ REFLECT what you understand
✓ Ask 2-3 questions about GAPS in their thinking
✓ Offer 3-5 RELEVANT suggestions based on what they shared
✓ Help them move from concept to concrete next steps

Example:
User: "A productivity app for students to manage assignments and study time"

GOOD Response:
"Student productivity app for assignments and study time - makes sense!

To help you develop this:

**Who specifically?** High school? College? Grad students? (Different needs)
**Core problem?** Forgetting deadlines? Procrastination? Time management?
All of the above?
**Differentiation?** What makes this better than Google Calendar + Notion?

Some directions to consider:
1. **Deadline tracking** with smart reminders (exam in 2 weeks → daily study plan)
2. **Focus timer** (Pomodoro) integrated with assignment tracker
3. **Study group coordination** (share schedules, find study partners)
4. **Grade predictor** (track assignments → estimate final grade)
5. **AI study planner** (breaks large projects into daily tasks)

Which of these resonates most with the problem you're solving?"

═══ IF USER PROVIDES LOW DETAIL (vague idea, just starting):
✓ DON'T overwhelm with 5 suggestions when they haven't defined basics
✓ Ask 1-2 FOUNDATIONAL questions (who, what problem, why)
✓ Help them ARTICULATE their concept before tactical suggestions
✓ Be patient - they're still forming their thoughts

Example:
User: "I want to build a productivity app"

GOOD Response:
"Productivity apps can take many forms! Let's start with the foundation:

**Who is it for?** Individuals? Teams? Students? Professionals?
**What problem does it solve?** Time tracking? Focus/distraction blocking?
Task management? Note-taking?

Knowing this will help us figure out what features matter most.

Do you have a specific productivity pain point in mind?"

BAD Response: ❌
"Great! Here are 5 suggestions:
1. Implement Pomodoro timer
2. Add calendar integration
3. Build task lists with priorities
4. Create analytics dashboard
5. Add team collaboration"
← Too specific when user hasn't defined basics!

═══════════════════════════════════════════════════════════

RESPONSE GUIDELINES:

✓ **Match their energy** - Detailed input = detailed response
✓ **Reference specifics** - Mention tech stack, features, metrics they stated
✓ **Quality over quantity** - 2 deep suggestions beat 5 generic ones
✓ **Build, don't template** - Adapt to context, not rigid format
✓ **Think ahead** - Consider UX, architecture, tradeoffs they haven't mentioned

AVOID:
✗ Suggesting things they already decided (tech stack, features)
✗ Generic advice when they gave specific context
✗ Rigid "5 suggestions" when 2-3 targeted ones are better
✗ Questions about basics when they've provided detailed requirements

═══════════════════════════════════════════════════════════

SPECIAL BEHAVIORS (keep these):

**Simple Approvals** - Brief acknowledgments only
User: "yes", "perfect", "got it" → You: "👍" or "Great!"

**Corrections** - Start with acknowledgment
User: "no, listen..." → You: "You're right, I misunderstood. [corrected understanding]"

**References** - When user mentions uploaded files, cite specific page numbers

═══════════════════════════════════════════════════════════

BE NATURAL. You're a thoughtful partner who adapts to the user's needs,
not a template-following bot.`;
```

---

## Implementation Code

### Step 1: Add Input Analysis Helper

```typescript
// backend/src/agents/conversation.ts

interface InputAnalysis {
  detailLevel: 'high' | 'medium' | 'low';
  wordCount: number;
  specifics: {
    hasTechStack: boolean;
    hasMetrics: boolean;
    hasRequirements: boolean;
    hasConstraints: boolean;
  };
  mentionedItems: string[];
}

private analyzeUserInput(message: string): InputAnalysis {
  const wordCount = message.split(/\s+/).length;

  // Detect specifics
  const techStackRegex = /\b(react|vue|angular|next\.?js|node\.?js|express|python|django|flask|postgres|mongodb|mysql|redis|typescript|javascript)\b/i;
  const metricsRegex = /\b(\d+\s*(users?|customers?|people|person|months?|weeks?|days?)|\$\d+|budget|timeline|deadline)\b/i;
  const requirementsRegex = /\b(should have|needs?|requires?|must have|will have|features?:|requirements?:)\b/i;
  const constraintsRegex = /\b(budget|timeline|deadline|constraint|limitation|must be|can't|won't)\b/i;

  const hasTechStack = techStackRegex.test(message);
  const hasMetrics = metricsRegex.test(message);
  const hasRequirements = requirementsRegex.test(message);
  const hasConstraints = constraintsRegex.test(message);

  // Extract mentioned tech/concepts
  const mentionedItems: string[] = [];
  const techMatches = message.match(techStackRegex);
  if (techMatches) mentionedItems.push(...techMatches.map(m => m.toLowerCase()));

  // Determine detail level
  let detailLevel: 'high' | 'medium' | 'low';
  const specificCount = [hasTechStack, hasMetrics, hasRequirements, hasConstraints].filter(Boolean).length;

  if (wordCount > 50 && specificCount >= 2) {
    detailLevel = 'high';
  } else if (wordCount > 20 || specificCount >= 1) {
    detailLevel = 'medium';
  } else {
    detailLevel = 'low';
  }

  return {
    detailLevel,
    wordCount,
    specifics: {
      hasTechStack,
      hasMetrics,
      hasRequirements,
      hasConstraints
    },
    mentionedItems
  };
}
```

### Step 2: Build Context-Aware User Prompt

```typescript
private buildUserPrompt(
  userMessage: string,
  analysis: InputAnalysis,
  conversationHistory: ConversationMessage[],
  projectReferences?: ProjectReference[]
): string {
  let prompt = `User says: "${userMessage}"\n\n`;

  // Add context hints based on analysis
  if (analysis.detailLevel === 'high') {
    prompt += `[User provided HIGH detail - they mentioned: ${analysis.mentionedItems.join(', ')}. `;
    prompt += `Build on their specifics with 2-4 deep, targeted suggestions.]\n\n`;
  } else if (analysis.detailLevel === 'medium') {
    prompt += `[User provided MEDIUM detail. Reflect understanding, ask 2-3 clarifying questions, `;
    prompt += `offer 3-5 relevant suggestions based on what they shared.]\n\n`;
  } else {
    prompt += `[User provided LOW detail. Ask 1-2 foundational questions to help them articulate `;
    prompt += `their concept. Don't jump to tactical suggestions yet.]\n\n`;
  }

  // Add conversation context (last 5 messages)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-5);
    prompt += `Recent conversation:\n`;
    recentMessages.forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }

  // Add reference context
  if (projectReferences && projectReferences.length > 0) {
    prompt += `User has uploaded references:\n`;
    projectReferences.forEach(ref => {
      const summary = ref.analysis?.summary || ref.analysis?.content || '';
      const truncated = summary.substring(0, 300) + (summary.length > 300 ? '...' : '');
      prompt += `- ${ref.fileName}: ${truncated}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Respond naturally based on the detail level above:`;

  return prompt;
}
```

### Step 3: Update respond() Method

```typescript
async respond(
  userMessage: string,
  conversationHistory?: ConversationMessage[],
  projectState?: any,
  projectReferences?: ProjectReference[]
): Promise<ConversationAgentResponse> {
  console.log('ConversationAgent responding to:', userMessage);

  // Check for simple approval (KEEP THIS - it's a good optimization)
  if (this.isSimpleApproval(userMessage)) {
    const randomResponse = this.getRandomApprovalResponse();
    return {
      agent: 'ConversationAgent',
      message: randomResponse,
      showToUser: true,
      metadata: {
        isSimpleApproval: true,
        isGenerative: false
      }
    };
  }

  // Detect corrections (KEEP THIS - important for UX)
  const isCorrection = this.isCorrection(userMessage);

  // ✨ NEW: Analyze input detail level
  const inputAnalysis = this.analyzeUserInput(userMessage);

  console.log('Input analysis:', {
    detailLevel: inputAnalysis.detailLevel,
    wordCount: inputAnalysis.wordCount,
    specifics: inputAnalysis.specifics,
    mentioned: inputAnalysis.mentionedItems
  });

  // ✨ NEW: Build context-aware prompt
  const userPrompt = this.buildUserPrompt(
    userMessage,
    inputAnalysis,
    conversationHistory || [],
    projectReferences
  );

  // Call Claude with optimized system prompt
  const responseText = await this.callClaude(
    OPTIMIZED_SYSTEM_PROMPT,  // ← Use new adaptive prompt
    userPrompt,
    { maxTokens: 600 }
  );

  // Validate response (KEEP existing validation logic)
  const questionCount = (responseText.match(/\?/g) || []).length;

  // If correction, ensure no questions
  if (isCorrection && questionCount > 0) {
    console.log('Correction response had questions - retrying without questions');
    const retryPrompt = userPrompt + `\n\n[CRITICAL: User is correcting you. ` +
      `Do NOT ask questions. Acknowledge the correction and provide corrected understanding only.]`;

    const retryResponse = await this.callClaude(
      OPTIMIZED_SYSTEM_PROMPT,
      retryPrompt,
      { maxTokens: 600 }
    );

    return {
      agent: 'ConversationAgent',
      message: retryResponse,
      showToUser: true,
      metadata: {
        isCorrection: true,
        hasQuestion: false,
        isGenerative: true,
        wasRetried: true,
        originalViolation: 'Had questions in correction response',
        // ✨ NEW: Include analysis metadata
        inputAnalysis: {
          detailLevel: inputAnalysis.detailLevel,
          wordCount: inputAnalysis.wordCount
        }
      }
    };
  }

  return {
    agent: 'ConversationAgent',
    message: responseText,
    showToUser: true,
    metadata: {
      isCorrection,
      hasQuestion: questionCount > 0,
      isGenerative: true,
      // ✨ NEW: Include analysis metadata
      inputAnalysis: {
        detailLevel: inputAnalysis.detailLevel,
        wordCount: inputAnalysis.wordCount,
        specificsDetected: Object.values(inputAnalysis.specifics).filter(Boolean).length
      }
    }
  };
}
```

### Step 4: Update Type Definitions

```typescript
// backend/src/types/agents.ts

interface ConversationMetadata {
  mode?: 'exploration' | 'clarification' | 'generation' | 'refinement';
  confidence?: number;

  // Response characteristics
  hasQuestion?: boolean;
  isSimpleApproval?: boolean;
  isCorrection?: boolean;
  isGenerative?: boolean;
  wasRetried?: boolean;
  originalViolation?: string;

  // ✨ NEW: Input analysis metadata
  inputAnalysis?: {
    detailLevel: 'high' | 'medium' | 'low';
    wordCount: number;
    specificsDetected: number;
  };

  // Existing fields...
  gaps?: Array<{...}>;
  agentQuestions?: Array<{...}>;
}
```

---

## Testing Strategy

### Test Cases

```typescript
// test/agents/conversation.test.ts

describe('ConversationAgent - Adaptive Responses', () => {

  test('High detail input → Deep, specific suggestions', async () => {
    const userMessage = `
      I want to build a task management app for remote teams.
      It should have real-time collaboration, video calls, file sharing,
      and integrations with Slack and Google Calendar. The target market
      is 10-50 person startups. Using Next.js, Node.js, PostgreSQL.
    `;

    const response = await conversationAgent.respond(userMessage, [], null, []);

    // Assertions
    expect(response.metadata.inputAnalysis?.detailLevel).toBe('high');
    expect(response.message).toContain('Next.js'); // References tech stack
    expect(response.message).toContain('real-time'); // References feature
    expect(response.message).not.toContain('Choose your tech stack'); // Doesn't suggest what they already have

    // Should have 2-4 deep suggestions, not generic 5
    const suggestionCount = (response.message.match(/^\d\./gm) || []).length;
    expect(suggestionCount).toBeGreaterThanOrEqual(2);
    expect(suggestionCount).toBeLessThanOrEqual(4);
  });

  test('Medium detail input → Balanced questions + suggestions', async () => {
    const userMessage = `
      A productivity app for students to manage assignments and study time
    `;

    const response = await conversationAgent.respond(userMessage, [], null, []);

    expect(response.metadata.inputAnalysis?.detailLevel).toBe('medium');
    expect(response.metadata.hasQuestion).toBe(true);

    // Should ask clarifying questions
    const questionCount = (response.message.match(/\?/g) || []).length;
    expect(questionCount).toBeGreaterThanOrEqual(2);
    expect(questionCount).toBeLessThanOrEqual(3);
  });

  test('Low detail input → Foundational questions only', async () => {
    const userMessage = `I want to build a productivity app`;

    const response = await conversationAgent.respond(userMessage, [], null, []);

    expect(response.metadata.inputAnalysis?.detailLevel).toBe('low');
    expect(response.metadata.hasQuestion).toBe(true);

    // Should NOT suggest tactical features when concept unclear
    expect(response.message).not.toContain('Implement');
    expect(response.message).not.toContain('Build');
    expect(response.message).not.toContain('Add');

    // Should ask foundational questions
    expect(response.message.toLowerCase()).toMatch(/who|what|why/);
  });

  test('Correction response → No questions allowed', async () => {
    const userMessage = `No, listen - I said 100 users, not 1000`;

    const response = await conversationAgent.respond(userMessage, [], null, []);

    expect(response.metadata.isCorrection).toBe(true);
    expect(response.metadata.hasQuestion).toBe(false);
    expect(response.message).toContain("You're right");
  });

  test('Simple approval → Fast path response', async () => {
    const userMessage = `perfect`;

    const response = await conversationAgent.respond(userMessage, [], null, []);

    expect(response.metadata.isSimpleApproval).toBe(true);
    expect(response.message.length).toBeLessThan(20); // Brief acknowledgment
  });
});
```

### Manual Testing Script

```typescript
// scripts/testConversation.ts

async function testConversationFlow() {
  const agent = new ConversationAgent();

  console.log('\n=== Test 1: High Detail Input ===');
  const response1 = await agent.respond(
    `Task management app for remote teams with real-time collab, video,
     Slack integration. Next.js/Node/PostgreSQL. 10-50 person startups.`,
    [],
    null,
    []
  );
  console.log('Detail Level:', response1.metadata.inputAnalysis?.detailLevel);
  console.log('Response:', response1.message);

  console.log('\n=== Test 2: Low Detail Input ===');
  const response2 = await agent.respond(
    `I want to build a productivity app`,
    [],
    null,
    []
  );
  console.log('Detail Level:', response2.metadata.inputAnalysis?.detailLevel);
  console.log('Response:', response2.message);

  console.log('\n=== Test 3: User Builds On Conversation ===');
  const response3 = await agent.respond(
    `Actually, let me give you more context. It's for college students,
     specifically for tracking assignments and creating study schedules.`,
    [
      { role: 'user', content: 'I want to build a productivity app' },
      { role: 'assistant', content: response2.message }
    ],
    null,
    []
  );
  console.log('Detail Level:', response3.metadata.inputAnalysis?.detailLevel);
  console.log('Response:', response3.message);
}

testConversation();
```

---

## A/B Testing Plan

### Experiment Design

**Hypothesis:** Adaptive responses (matching detail level) improve user satisfaction and conversation quality vs fixed "3-5 suggestions" template.

**Metrics:**
- **Primary:** User satisfaction (thumbs up/down after response)
- **Secondary:**
  - Conversation length (messages to completion)
  - User corrections ("no, I meant...")
  - Task completion rate
  - Time to first recorded decision

**Variants:**
- **Control:** Current fixed template ("3-5 suggestions")
- **Treatment:** Adaptive response (detail-level aware)

**Duration:** 2 weeks
**Sample Size:** 100 users per variant (200 total)

**Implementation:**
```typescript
// Feature flag in orchestrator
const useAdaptivePrompt = Math.random() < 0.5; // 50/50 split

if (useAdaptivePrompt) {
  conversationAgent.setSystemPrompt(OPTIMIZED_SYSTEM_PROMPT);
} else {
  conversationAgent.setSystemPrompt(ORIGINAL_SYSTEM_PROMPT);
}

// Log experiment assignment
analytics.track('conversation_experiment_assigned', {
  userId,
  variant: useAdaptivePrompt ? 'adaptive' : 'control',
  sessionId
});
```

---

## Expected Improvements

### Quantitative
- ✅ **35-50% reduction** in user corrections ("no, I meant...")
- ✅ **25-40% fewer messages** to reach decision (more efficient conversations)
- ✅ **15-25% increase** in user satisfaction ratings
- ✅ **20-30% higher** task completion rate (fewer abandonments)

### Qualitative
- ✅ Responses feel **more natural and conversational**
- ✅ AI **builds on user's specifics** rather than generic advice
- ✅ Users feel **heard and understood** (AI references what they said)
- ✅ Reduced **cognitive load** (right amount of suggestions for context)

### Cost Impact
- 📊 **Neutral to slight reduction** in token usage
  - High detail: Fewer tokens (2-4 suggestions vs 5)
  - Low detail: Same or slightly more (foundational questions)
  - Overall: ~10% token reduction estimated

---

## Rollout Plan

### Phase 1: Development (Week 1)
- ✅ Implement `analyzeUserInput()` helper
- ✅ Update `buildUserPrompt()` with context hints
- ✅ Deploy OPTIMIZED_SYSTEM_PROMPT
- ✅ Add input analysis metadata to responses
- ✅ Write unit tests

### Phase 2: Internal Testing (Week 2)
- Test with real project scenarios
- Gather feedback from team
- Tune thresholds (word count, specifics detection)
- Refine prompt based on edge cases

### Phase 3: A/B Test (Weeks 3-4)
- Deploy to 50% of users
- Monitor metrics daily
- Collect user feedback
- Watch for quality regressions

### Phase 4: Full Rollout (Week 5)
- If A/B test shows >15% improvement → rollout to 100%
- Update documentation
- Monitor for 1 week
- Iterate based on feedback

---

## Success Criteria

**Ship to production if A/B test shows:**
1. ✅ User satisfaction +15% or higher
2. ✅ No increase in corrections or confusion
3. ✅ Task completion maintained or improved
4. ✅ No quality regressions in assumption detection

**Rollback if:**
- ❌ User satisfaction decreases
- ❌ Quality check pass rate drops >5%
- ❌ Significant increase in error rate or API costs

---

## Next Steps

1. **Review this plan** - Does the optimization strategy align with your vision?
2. **Implement code changes** - Use the code snippets above
3. **Test manually** - Run test script with real examples
4. **Deploy A/B test** - Measure impact with real users
5. **Iterate** - Refine based on data

Ready to implement? I can help you make these changes step-by-step!
