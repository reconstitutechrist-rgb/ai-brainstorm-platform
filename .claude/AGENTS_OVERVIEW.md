# Claude Code Agents Overview

This document provides an overview of all project-specific Claude Code agents available for the AI Brainstorm Platform.

## Agent Directory

All agents are located in `.claude/agents/` and are project-scoped (shared with your team via git).

---

## Development Agents

### 1. **fullstack-developer**
**Purpose:** Complete feature development across frontend and backend
**Specializes in:**
- Multi-agent system integration
- End-to-end feature implementation
- State management (decided/exploring/parked)
- Agent response handling
- Workflow coordination

**When to use:** Building complete features that span both frontend and backend

---

### 2. **backend-developer**
**Purpose:** Node.js backend and agent orchestration
**Specializes in:**
- Agent implementation (9 agents)
- Workflow orchestration (parallel/sequential)
- Zero-assumption framework enforcement
- Context pruning optimization
- Database integration

**When to use:** Implementing agent logic, API endpoints, or workflow modifications

---

### 3. **frontend-developer**
**Purpose:** React + Tailwind UI development
**Specializes in:**
- Chat/conversation interface
- Canvas visualization (idea cards)
- Real-time agent response rendering
- State management (ProjectContext)
- Component architecture

**When to use:** Building or modifying UI components, chat interface, or canvas

---

### 4. **api-designer**
**Purpose:** API contract design and documentation
**Specializes in:**
- RESTful API endpoint design
- Request/response schemas
- Agent coordination endpoints
- Research API design
- OpenAPI documentation

**When to use:** Designing new API endpoints or refactoring existing ones

---

### 5. **ui-designer**
**Purpose:** Design system and visual design
**Specializes in:**
- Tailwind CSS styling
- Color palette (decided/exploring/parked)
- Component design patterns
- Responsive layouts
- Accessibility

**When to use:** Design work, styling components, or establishing design patterns

---

### 6. **legacy-modernizer**
**Purpose:** Incremental system modernization and technical debt reduction
**Specializes in:**
- Technical debt assessment and prioritization
- Strangler fig pattern implementation
- Incremental migration strategies (queue, ML pruning, state machines)
- Feature flag management for safe rollout
- Characterization and golden master testing
- Risk mitigation and rollback procedures
- Zero-disruption modernization
- Team training and knowledge transfer

**When to use:** Migrating legacy components, reducing technical debt, modernizing architecture

---

## Architecture & Quality Agents

### 7. **brainstorm-architect**
**Purpose:** Multi-agent system architecture expert
**Specializes in:**
- Agent system design
- Workflow patterns
- Zero-assumption framework
- Intent classification
- Agent coordination

**When to use:** Making architectural decisions about the agent system

---

### 8. **architect-reviewer**
**Purpose:** Architecture validation and review
**Specializes in:**
- Multi-agent system assessment
- Workflow orchestration review
- Scalability analysis (10x, 100x)
- Technical debt identification
- Security architecture review

**When to use:** Reviewing major architectural changes or conducting architecture audits

---

### 9. **code-reviewer**
**Purpose:** Code quality and zero-assumption compliance
**Specializes in:**
- Agent implementation review
- Zero-assumption enforcement
- Workflow pattern validation
- Type safety verification
- Error handling assessment

**When to use:** Reviewing pull requests or ensuring code quality

---

### 10. **test-specialist**
**Purpose:** Comprehensive testing for multi-agent system
**Specializes in:**
- Agent unit tests
- Workflow integration tests
- Intent classification tests
- Assumption detection tests
- Performance tests

**When to use:** Writing tests or ensuring test coverage

---

## Infrastructure & Operations Agents

### 11. **database-architect**
**Purpose:** PostgreSQL schema design and optimization
**Specializes in:**
- Schema design (project state, conversations)
- Query optimization
- Indexing strategies
- Version history tracking
- Full-text search

**When to use:** Database schema changes, migrations, or query optimization

---

### 12. **performance-optimizer**
**Purpose:** Performance optimization across the stack
**Specializes in:**
- Context pruning optimization
- Response caching strategies
- Claude API token reduction
- Database query optimization
- Frontend performance

**When to use:** Addressing performance issues or optimizing for scale

---

### 13. **security-auditor**
**Purpose:** Security review and hardening
**Specializes in:**
- Prompt injection prevention
- Authorization enforcement
- SQL injection prevention
- XSS protection
- Rate limiting

**When to use:** Security reviews, auditing endpoints, or implementing security controls

---

### 14. **devops-engineer**
**Purpose:** Deployment and infrastructure automation
**Specializes in:**
- Docker containerization
- CI/CD pipelines (GitHub Actions)
- Monitoring (Prometheus, Grafana)
- Zero-downtime deployments
- Database backups

**When to use:** Deployment issues, CI/CD setup, or infrastructure work

---

## Meta-Orchestration Agents

### 15. **agent-organizer** ⭐
**Purpose:** Multi-agent workflow orchestration and optimization
**Specializes in:**
- Intent-based workflow assembly (10 intent types)
- Agent selection and team composition
- Parallel vs sequential execution optimization
- Context pruning strategy design
- Workflow performance analysis
- Token budget management
- Error recovery and resilience

**When to use:**
- Analyzing or optimizing existing workflows
- Designing new intent-based workflows
- Understanding agent coordination patterns
- Debugging slow workflows
- Planning agent team composition

**Key Capabilities:**
- Maps all 10 intent types to optimal agent workflows
- Identifies parallel execution opportunities (20-30% speedup)
- Provides per-agent context requirements and token estimates
- Implements workflow queuing and load balancing
- Handles agent failures with graceful degradation

**Example queries:**
```
"Analyze the 'deciding' workflow for optimization opportunities"
"Design a new workflow for feature planning"
"Why is the reviewing workflow taking 3+ seconds?"
"Which agents should run in parallel for best performance?"
```

---

### 16. **context-manager** ⭐
**Purpose:** Context retrieval, pruning, and state synchronization
**Specializes in:**
- Agent-specific context pruning (40-60% token savings)
- Conversation history management
- Project state synchronization (decided/exploring/parked)
- Semantic context pruning (relevance-based)
- Database query optimization (3x faster retrieval)
- Context caching strategies
- State invalidation rules

**When to use:**
- Optimizing context size for agents
- Understanding context pruning strategies
- Debugging context-related issues
- Improving database query performance
- Managing conversation history
- Implementing caching strategies

**Key Capabilities:**
- Defines per-agent context requirements (e.g., ConversationAgent: 10 messages, StrategicPlanner: 0 messages)
- Optimizes project state retrieval (3 queries → 1 aggregated query)
- Implements semantic pruning (keeps most relevant, not just recent)
- Manages cache invalidation (agent-specific rules)
- Tracks context metrics (retrieval time, token savings)

**Example queries:**
```
"How much context does the QualityAuditorAgent need?"
"Optimize the conversation history query"
"Implement semantic pruning for PersistenceManager"
"Why is context retrieval slow for this project?"
```

---

### 17. **knowledge-synthesizer** ⭐
**Purpose:** Extract insights from multi-agent interactions and build collective intelligence
**Specializes in:**
- Pattern recognition across all 9 agents and workflows
- Best practice identification and extraction
- Performance optimization insights
- Failure pattern analysis and prevention
- Success factor isolation
- Knowledge graph construction
- Recommendation generation
- Learning distribution and evolution tracking

**When to use:**
- Analyzing system-wide patterns and trends
- Extracting best practices from agent interactions
- Identifying optimization opportunities
- Understanding failure modes and prevention
- Building collective intelligence
- Generating performance recommendations
- Tracking system evolution and maturity
- Distributing insights to other agents

**Key Capabilities:**
- Mines 342+ patterns from agent interactions
- Generates 156+ actionable insights
- Provides 89+ active recommendations
- Achieves 23%+ system performance improvement
- Builds comprehensive knowledge graphs (1,247+ entities)
- Tracks ROI and demonstrates value
- Enables continuous learning and adaptation
- Detects emerging patterns and innovation opportunities

**Example queries:**
```
"What patterns have emerged from deciding workflows?"
"Identify optimization opportunities across all agents"
"What are the top failure patterns and how can we prevent them?"
"Show me best practices for parallel agent execution"
"Generate recommendations for improving workflow performance"
```

---

### 18. **multi-agent-coordinator** ⭐
**Purpose:** Orchestrate complex workflows with inter-agent communication and distributed coordination
**Specializes in:**
- Workflow orchestration across 9-agent system
- Inter-agent communication protocols
- Dependency management and deadlock prevention
- Parallel execution control with barrier synchronization
- Fault tolerance and recovery mechanisms
- Message routing and delivery guarantees
- Performance optimization (< 5% overhead target)
- Scalability to 100+ concurrent agents

**When to use:**
- Coordinating complex multi-agent workflows
- Implementing new workflow patterns
- Optimizing parallel execution strategies
- Debugging coordination bottlenecks
- Handling workflow failures and recovery
- Scaling agent communication patterns
- Monitoring coordination efficiency
- Implementing fault-tolerant workflows

**Key Capabilities:**
- Executes 9 agents across 5+ concurrent workflows
- Processes 1,200+ messages/minute
- Achieves 96%+ coordination efficiency
- Zero deadlock guarantee with cycle detection
- 99.9% message delivery rate
- Parallel execution speedup (27% in quality checks)
- Automatic failure detection and recovery
- DAG validation and topological execution

**Example queries:**
```
"How can we optimize the deciding workflow coordination?"
"Implement fault tolerance for the research workflow"
"Debug coordination bottleneck in reviewing workflow"
"Add parallel execution to the modifying workflow"
"Monitor inter-agent communication patterns"
```

---

### 19. **error-coordinator** ⭐
**Purpose:** Distributed error handling, failure recovery, and system resilience management
**Specializes in:**
- Error aggregation and classification across all 9 agents
- Cross-agent error correlation and root cause analysis
- Failure cascade prevention with circuit breakers
- Automated recovery orchestration
- Retry strategy coordination with exponential backoff
- Fallback mechanisms and graceful degradation
- Post-mortem automation and learning extraction
- MTTR optimization (target: < 5 minutes)

**When to use:**
- Handling distributed errors across workflows
- Implementing failure recovery strategies
- Preventing cascading failures
- Analyzing error patterns and correlations
- Optimizing recovery effectiveness
- Building resilient error handling
- Automating incident response
- Learning from failures to prevent recurrence

**Key Capabilities:**
- Handles 3,421+ errors/day with 93% auto-recovery
- Prevents 47+ cascade failures daily
- Maintains MTTR of 4.2 minutes
- 100% cascade prevention with circuit breakers
- Error detection < 30 seconds
- Automated post-mortem generation
- Learning system improving 15% monthly
- Zero-assumption violation detection and handling

**Example queries:**
```
"Analyze recent error patterns in deciding workflows"
"Implement circuit breaker for Claude API failures"
"What's the root cause of database connection errors?"
"Set up automated recovery for validation failures"
"Generate post-mortem for yesterday's incident"
```

---

### 20. **performance-monitor** ⭐
**Purpose:** System-wide metrics collection, analysis, and optimization
**Specializes in:**
- Real-time monitoring across all 9 agents and workflows
- Workflow performance metrics (duration, throughput, bottlenecks)
- Agent performance tracking (latency, success rate, token usage)
- Resource utilization monitoring (CPU, memory, database, Claude API)
- Anomaly detection using statistical methods
- Bottleneck identification and critical path analysis
- Predictive monitoring and capacity planning
- Alert management with 95%+ accuracy

**When to use:**
- Monitoring system health and performance
- Identifying workflow bottlenecks
- Analyzing agent performance patterns
- Tracking Claude API usage and costs
- Detecting performance anomalies
- Capacity planning and forecasting
- Setting up performance alerts
- Optimizing resource utilization

**Key Capabilities:**
- Collects 2,847+ metrics with <1s latency
- 5 comprehensive dashboards (system health, workflows, agents, resources, business)
- 12+ alert rules with 95% accuracy
- Anomaly detection < 5 minutes
- 90-day data retention
- < 2% resource overhead
- Context pruning effectiveness tracking (40-60% savings)
- Parallel execution efficiency monitoring

**Example queries:**
```
"Show workflow performance metrics for deciding workflows"
"Identify bottlenecks in the development workflow"
"What's the current Claude API usage and cost?"
"Detect anomalies in agent performance"
"Generate capacity plan for 20% monthly growth"
```

---

### 21. **task-distributor** ⭐
**Purpose:** Intelligent work allocation, load balancing, and queue management
**Specializes in:**
- Priority-based task scheduling across 9 agents
- Load balancing with < 10% variance
- Queue management with deadline awareness
- Agent capacity tracking and dynamic adjustment
- Fair scheduling across users and projects
- Batch optimization for similar workflows
- Resource constraint enforcement (Claude API, database)
- Starvation prevention for low-priority tasks

**When to use:**
- Managing workflow queues and priorities
- Optimizing task distribution across agents
- Balancing load to prevent bottlenecks
- Enforcing user quotas and fair scheduling
- Handling deadline-critical workflows
- Scaling task distribution
- Monitoring queue health
- Implementing retry strategies

**Key Capabilities:**
- Distributes 456+ workflows/day with 230ms avg queue time
- Load balance variance < 7%
- 97%+ deadline success rate
- 84% resource utilization
- 5-level priority system with starvation prevention
- Max 10 concurrent workflows with intelligent queuing
- Fair round-robin scheduling across users
- Dead letter queue for failed items

**Example queries:**
```
"Show current queue depth and wait times"
"Optimize task distribution for deciding workflows"
"Implement priority scheduling for enterprise users"
"Balance load across quality check agents"
"Set up fair scheduling across projects"
```

---

### 22. **workflow-orchestrator** ⭐
**Purpose:** Complex process design, state machine implementation, and business process automation
**Specializes in:**
- Intent-based workflow state machines (10 workflows)
- State management with persistence and consistency
- Saga pattern for error compensation
- Event-driven workflow execution
- Human-in-the-loop task management (clarifications, approvals)
- Transaction management with ACID properties
- Workflow monitoring and SLA tracking
- Version compatibility and migration

**When to use:**
- Designing new workflow patterns
- Implementing state machines for processes
- Managing workflow state and transitions
- Implementing error compensation logic
- Handling human tasks and timeouts
- Tracking workflow execution metrics
- Ensuring workflow reliability > 99.9%
- Managing workflow versions and migrations

**Key Capabilities:**
- Manages 234+ workflows/day with 99.4% success rate
- State consistency 100% (ACID guarantees)
- Recovery time < 30 seconds
- Average workflow duration 2.8s
- SLA compliance 97.2%
- Complete audit trail for all state transitions
- Saga pattern for automatic compensation
- Human task timeout handling (5min clarification, 1hr approval)

**Example queries:**
```
"Design state machine for feature planning workflow"
"Implement compensation logic for deciding workflow"
"Add human approval step to development workflow"
"Track SLA compliance for research workflows"
"Analyze workflow bottlenecks and optimize"
```

---


### 23. **cost-optimizer** ⭐
**Purpose:** Multi-dimensional cost optimization across Claude API, infrastructure, and development resources
**Specializes in:**
- Claude API token usage analysis and optimization (40-60% context pruning enhancement)
- Model selection optimization (Opus/Sonnet/Haiku for different tasks)
- Database query cost analysis and indexing strategies
- Storage lifecycle management and compression
- Workflow cost efficiency (parallel vs sequential tradeoffs)
- Budget forecasting and anomaly detection
- ROI analysis per agent and workflow
- Cost-aware architecture recommendations

**When to use:**
- Monthly cost review and optimization planning
- Investigating unexpected cost spikes
- Estimating cost impact of new features
- Scaling cost projections (10x, 100x growth)
- Optimizing agent execution budgets
- Reducing infrastructure spending
- Cost vs quality tradeoff analysis
- Budget alert investigation

**Key Capabilities:**
- Targets 50-60% cost reduction through optimization phases
- Token efficiency: <40% of baseline usage
- Model mix optimization: <30% Opus usage
- Database query cost reduction: 50%
- Storage efficiency: 30% reduction
- Maintains zero-assumption framework compliance during optimization
- Real-time cost attribution per agent/intent/workflow

**Example queries:**
```
"Analyze this month's Claude API costs and recommend optimizations"
"Should we use parallel or sequential execution for this workflow?"
"What will it cost to add a new ConversationAnalysisAgent?"
"Which workflows are most expensive to run?"
"Optimize context pruning for exploring intent workflows"
"Project costs at 100x current usage"
```

---

### 24. **accessibility-auditor** ⭐
**Purpose:** Comprehensive accessibility compliance and inclusive design for WCAG 2.1/2.2 standards
**Specializes in:**
- WCAG 2.1/2.2 Level AA compliance auditing
- ARIA implementation and landmark regions
- Keyboard navigation and focus management
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Color contrast analysis (4.5:1 minimum for text)
- Semantic HTML validation
- Alternative text and captions
- Error prevention and accessible error messages

**When to use:**
- Pre-release accessibility audits
- Component library accessibility validation
- PR reviews for accessibility compliance
- Design mockup contrast checking
- User complaint investigation (accessibility issues)
- Legal compliance preparation
- Keyboard navigation testing
- Screen reader compatibility verification

**Key Capabilities:**
- 100% WCAG 2.1 Level AA compliance target
- Automated testing integration (axe-core, Lighthouse)
- Focus indicator validation (no outline-none violations)
- State color contrast checking (decided/exploring/parked badges)
- Live region implementation for real-time agent updates
- Complex widget ARIA patterns (multi-select, radio groups)
- Keyboard shortcut conflict prevention

**Critical Fixes:**
- State badge contrast: green-700→green-800 (4.2→6.1 ratio)
- Canvas keyboard navigation (drag-drop alternatives)
- Modal focus trapping and restoration
- Agent response announcements (role="log" aria-live="polite")

**Example queries:**
```
"Audit chat interface for WCAG compliance"
"Check if state colors meet contrast requirements"
"Make the canvas keyboard accessible"
"Review this component for accessibility issues"
"Generate accessibility test cases for project dashboard"
"Validate ARIA implementation for agent selector"
```

---

### 25. **ux-researcher** ⭐
**Purpose:** User experience research, usability validation, and user-centered design advocacy
**Specializes in:**
- User journey analysis and friction point identification
- Cognitive load assessment (agent comprehension, intent selection)
- Mental model research (how users think vs how system works)
- Usability testing (think-aloud, task completion, A/B testing)
- Feature prioritization (Kano model, Jobs-to-be-Done)
- Conversion funnel optimization
- Cohort retention analysis
- User interview synthesis and persona refinement

**When to use:**
- Pre-feature user research and validation
- Investigating user drop-off points
- Testing new UX designs and workflows
- Understanding user mental models
- Prioritizing feature roadmap
- Validating design assumptions
- Analyzing engagement metrics
- Post-launch usability testing

**Key Capabilities:**
- User journey mapping (signup → activation → retention)
- A/B test design and statistical analysis
- Qualitative research (interviews, diary studies, think-aloud)
- Quantitative analytics (funnels, cohorts, event tracking)
- Mental model alignment (user expectations vs system reality)
- Feature opportunity scoring
- Usability metrics: >80% comprehension, >90% task completion

**Critical Insights:**
- Intent selector: 10 types→3 types increases decision recording 55%
- Quality feedback: Positive framing reduces abandonment by 94%
- Agent comprehension: StrategicPlanner/ContextManager need clarity
- State labels: "decided/exploring/parked" only 20% correctly used
- Activation funnel: 50% drop-off at quality iteration (biggest opportunity)

**Example queries:**
```
"Why are users abandoning during quality checks?"
"Do users understand the decided/exploring/parked states?"
"Test this new assumption feedback design"
"What features should we prioritize next quarter?"
"Analyze the signup to activation funnel"
"Research user mental models of agent orchestration"
```

---

### 26. **prompt-engineer** ⭐
**Purpose:** Prompt optimization specialist for Claude API across 9-agent orchestration system
**Specializes in:**
- System prompt optimization (30-50% token reduction while maintaining quality)
- Zero-assumption framework enforcement through prompt design
- A/B testing prompt variations for effectiveness
- Intent-specific prompt strategies (10 intent types)
- Few-shot example design for assumption detection
- Context-aware prompting (adapts to pruned context)
- Prompt regression testing and validation
- Token efficiency techniques (imperatives, structured output, examples over explanations)

**When to use:**
- Optimizing agent prompts to reduce costs
- Improving assumption detection accuracy
- Designing prompts for new agents
- Investigating prompt-related quality issues
- A/B testing prompt strategies
- Reducing token usage without sacrificing quality
- Creating prompt test suites
- Ensuring prompt consistency across agents

**Key Capabilities:**
- QualityAuditorAgent optimization: 91% F1 score, 27% token reduction
- ConversationAgent optimization: 51% token reduction, NPS 62
- Prompt A/B testing framework with statistical validation
- Automated regression testing (>90% pass rate required)
- Dynamic context injection based on intent and project state
- Prompt version control and performance tracking

**Critical Optimizations:**
- Token efficiency: 30-50% reduction across all agents
- Quality maintenance: >90% assumption detection accuracy
- User satisfaction: NPS >60 through prompt clarity
- Consistent zero-assumption enforcement across all 9 agents

**Example queries:**
```
"Optimize QualityAuditorAgent prompt to reduce false negatives"
"Design intent-specific prompts for ConversationAgent"
"Test whether few-shot examples improve assumption detection"
"Reduce token usage by 30% while maintaining quality"
"Create prompt template for new agent"
"A/B test assumption feedback framing (positive vs negative)"
```

---

### 27. **llm-architect** ⭐
**Purpose:** LLM architecture and strategy specialist for cost-optimal, high-quality AI implementation
**Specializes in:**
- Multi-model strategy design (Opus/Sonnet/Haiku tier selection)
- RAG (Retrieval Augmented Generation) architecture for documents and conversations
- Fine-tuning evaluation and ROI analysis
- Semantic search and embeddings strategy (pgvector, OpenAI embeddings)
- Vector database design and optimization (HNSW, IVFFlat indexing)
- Prompt caching and response caching strategies
- Hybrid search (keyword + semantic with RRF fusion)
- Cost-optimal LLM infrastructure design

**When to use:**
- Designing multi-model cost optimization strategy
- Implementing RAG for reference documents
- Evaluating fine-tuning vs prompt engineering tradeoffs
- Building semantic search for project history
- Optimizing vector database performance
- Investigating prompt/response caching
- Reducing LLM costs at architectural level
- Planning for scale (10x, 100x growth)

**Key Capabilities:**
- Multi-model savings: 60% cost reduction (tiered Opus/Sonnet/Haiku)
- RAG efficiency: 95% cost reduction (5 chunks vs full document)
- Prompt caching: 60-70% savings potential (if available)
- Semantic search: <100ms vector search, 99% recall with HNSW
- Fine-tuning ROI: Intent classification 67%→90% accuracy (+80% cost savings)
- Hybrid search: BM25 + vector fusion for best accuracy

**Critical Architectures:**
- Reference document RAG: pgvector + text-embedding-3-small + retrieval
- Conversation history search: Semantic search across all projects
- Dynamic model routing: Complexity-based Opus/Sonnet/Haiku selection
- Embedding strategy: $8/month for 1K docs + 100K messages

**Example queries:**
```
"Design multi-model strategy to reduce costs by 50%"
"Should we fine-tune for intent classification or improve prompts?"
"Implement semantic search for reference documents using RAG"
"Build cross-project search to find similar past decisions"
"Evaluate prompt caching ROI for our usage patterns"
"Design hybrid search combining keywords and semantic similarity"
"Compare pgvector vs Pinecone for vector database"
```

---
## How to Use Agents

### In Claude Code

Agents are automatically available when working in the project. Claude Code will use the appropriate agent based on your request context.

### Explicitly Request an Agent

You can explicitly request a specific agent:

```
"Use the backend-developer agent to help me implement a new workflow"
"Ask the security-auditor to review this endpoint"
"Have the performance-optimizer analyze our token usage"
```

### Agent Collaboration

Agents often work together:
- **fullstack-developer** coordinates with **backend-developer** and **frontend-developer**
- **code-reviewer** escalates to **architect-reviewer** for architectural concerns
- **test-specialist** works with all development agents to ensure coverage
- **security-auditor** reviews work from **backend-developer** and **api-designer**
- **knowledge-synthesizer** extracts insights from all agent interactions to enable continuous improvement
- **multi-agent-coordinator** orchestrates workflow execution across all agents with fault tolerance
- **error-coordinator** monitors all agents for failures and orchestrates automated recovery
- **performance-monitor** tracks metrics across all agents and identifies optimization opportunities
- **task-distributor** manages queues and ensures fair, efficient work allocation across all agents
- **workflow-orchestrator** designs and executes complex processes with state management and compensation

---

## Agent Development Principles

All agents follow these principles specific to the Brainstorm Platform:

### 1. Zero-Assumption Framework
Every agent enforces the principle: **no assumptions beyond explicit user statements**

### 2. Multi-Agent Awareness
Agents understand the 9-agent orchestration system and workflow patterns

### 3. Project Context
Agents reference:
- `ARCHITECTURE.md` - System design
- `AGENTS_DOCUMENTATION.md` - Agent specifications
- `AGENTS.md` - Operational instructions

### 4. Tech Stack Knowledge
Agents are familiar with:
- Backend: Node.js + TypeScript + Express
- Frontend: React + Tailwind CSS
- Database: PostgreSQL
- AI: Claude API (Anthropic)

---

## Quick Reference

| Task | Recommended Agent |
|------|------------------|
| Implement new agent | **brainstorm-architect**, **backend-developer** |
| Create new workflow | **brainstorm-architect**, **backend-developer** |
| Build UI component | **frontend-developer**, **ui-designer** |
| Design API endpoint | **api-designer**, **backend-developer** |
| Write tests | **test-specialist** |
| Review code | **code-reviewer** |
| Optimize performance | **performance-optimizer** |
| Security review | **security-auditor** |
| Database schema change | **database-architect** |
| Deployment issue | **devops-engineer** |
| Architecture decision | **architect-reviewer**, **brainstorm-architect** |
| Full feature (end-to-end) | **fullstack-developer** |
| Pattern analysis | **knowledge-synthesizer** |
| System optimization | **knowledge-synthesizer**, **performance-optimizer** |
| Best practice extraction | **knowledge-synthesizer** |
| Workflow coordination | **multi-agent-coordinator**, **agent-organizer** |
| Fault tolerance | **multi-agent-coordinator**, **error-coordinator** |
| Parallel execution | **multi-agent-coordinator**, **agent-organizer** |
| Error handling | **error-coordinator** |
| Incident recovery | **error-coordinator** |
| Root cause analysis | **error-coordinator**, **knowledge-synthesizer** |
| Performance monitoring | **performance-monitor** |
| Bottleneck analysis | **performance-monitor** |
| Capacity planning | **performance-monitor** |
| Cost optimization | **performance-monitor**, **performance-optimizer** |
| Queue management | **task-distributor** |
| Load balancing | **task-distributor** |
| Priority scheduling | **task-distributor** |
| Resource allocation | **task-distributor**, **multi-agent-coordinator** |
| Workflow design | **workflow-orchestrator**, **agent-organizer** |
| State management | **workflow-orchestrator** |
| Process automation | **workflow-orchestrator** |
| Saga/compensation | **workflow-orchestrator**, **error-coordinator** |

---

## Updating Agents

Agents are stored in `.claude/agents/` as markdown files. To update an agent:

1. Edit the `.md` file directly
2. Commit changes to git
3. Agents are immediately available to all team members

---

## Creating New Agents

To create a new specialized agent:

1. Create a new `.md` file in `.claude/agents/`
2. Follow the format:
```markdown
---
name: agent-name
description: What this agent does
tools: Bash, Glob, Grep, Read, Edit, Write
model: sonnet
---

Agent instructions here...
```

3. Include project-specific context (architecture, tech stack, patterns)
4. Reference relevant documentation files
5. Define integration points with other agents

---

*Last updated: 2025-01-15*
*Total agents: 27*
