import { IntentClassification, Workflow, WorkflowStep, AgentResponse } from '../types';
import { ConversationAgent } from './conversation'; // CONSOLIDATED: Brainstorming + ClarificationEngine (GapDetection + Clarification + Questioner)
import { PersistenceManagerAgent } from './persistenceManager'; // CONSOLIDATED: Recorder + VersionControl + Verification
import { QualityAuditorAgent } from './qualityAuditor'; // CONSOLIDATED: Verification + AssumptionBlocker + AccuracyAuditor + ConsistencyGuardian
import { StrategicPlannerAgent } from './strategicPlanner'; // CONSOLIDATED: Translation + Development + Prioritization
import { ContextManagerAgent } from './contextManager';
import { ReferenceAnalysisAgent } from './referenceAnalysis';
import { ReviewerAgent } from './reviewer';
import { ResourceManagerAgent } from './resourceManager';
import { ContextPruner } from '../services/contextPruner';
import { ResponseCache } from '../services/responseCache';
import { TokenMetrics } from '../services/tokenMetrics';

export class IntegrationOrchestrator {
  private agents: Map<string, any>;
  private workflowHistory: Workflow[];
  private contextPruner: ContextPruner;
  private responseCache: ResponseCache;
  private tokenMetrics: TokenMetrics;

  constructor() {
    this.agents = new Map();
    this.workflowHistory = [];
    this.contextPruner = new ContextPruner();
    this.responseCache = new ResponseCache();
    this.tokenMetrics = new TokenMetrics();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Core Consolidated Agents
    this.agents.set('conversation', new ConversationAgent()); // MEGA-CONSOLIDATED: Brainstorming + ClarificationEngine
    this.agents.set('persistenceManager', new PersistenceManagerAgent()); // CONSOLIDATED
    this.agents.set('qualityAuditor', new QualityAuditorAgent()); // CONSOLIDATED
    this.agents.set('strategicPlanner', new StrategicPlannerAgent()); // CONSOLIDATED
    this.agents.set('contextManager', new ContextManagerAgent());

    // Support Agents
    this.agents.set('referenceAnalysis', new ReferenceAnalysisAgent());
    this.agents.set('reviewer', new ReviewerAgent());
    this.agents.set('resourceManager', new ResourceManagerAgent());

    // Legacy aliases for backwards compatibility during migration
    // ConversationAgent aliases
    this.agents.set('brainstorming', this.agents.get('conversation'));
    this.agents.set('clarificationEngine', this.agents.get('conversation'));
    this.agents.set('gapDetection', this.agents.get('conversation'));
    this.agents.set('clarification', this.agents.get('conversation'));
    this.agents.set('questioner', this.agents.get('conversation'));

    // PersistenceManager aliases
    this.agents.set('recorder', this.agents.get('persistenceManager'));
    this.agents.set('versionControl', this.agents.get('persistenceManager'));

    // QualityAuditor aliases
    this.agents.set('verification', this.agents.get('qualityAuditor'));
    this.agents.set('assumptionBlocker', this.agents.get('qualityAuditor'));
    this.agents.set('accuracyAuditor', this.agents.get('qualityAuditor'));
    this.agents.set('consistencyGuardian', this.agents.get('qualityAuditor'));

    // StrategicPlanner aliases
    this.agents.set('translation', this.agents.get('strategicPlanner'));
    this.agents.set('development', this.agents.get('strategicPlanner'));
    this.agents.set('prioritization', this.agents.get('strategicPlanner'));

    console.log('✓ FINAL Consolidation COMPLETE: 17→5 core agents + 3 support = 8 total');
    console.log('  - ConversationAgent (Brainstorming+GapDetection+Clarification+Questioner)');
    console.log('  - PersistenceManager (Recorder+Verification+VersionControl)');
    console.log('  - QualityAuditor (Verification+AssumptionBlocker+AccuracyAuditor+ConsistencyGuardian)');
    console.log('  - StrategicPlanner (Translation+Development+Prioritization)');
    console.log('  - ContextManager');
  }

  async determineWorkflow(intent: IntentClassification, userMessage: string): Promise<Workflow> {
    console.log(`[Orchestrator] Determining workflow for intent: ${intent.type}`);

    const workflows: { [key: string]: WorkflowStep[] } = {
      brainstorming: [
        { agentName: 'brainstorming', action: 'reflect', parallel: true },
        { agentName: 'gapDetection', action: 'analyze', parallel: false }, // End parallel group
        { agentName: 'recorder', action: 'record' }, // Record items from brainstorming
        { agentName: 'clarification', action: 'generateQuestion', condition: 'if_gaps_found' },
      ],

      deciding: [
        { agentName: 'brainstorming', action: 'reflect' },
        { agentName: 'recorder', action: 'record' }, // Record decisions immediately
        // These 3 agents can run in parallel - they're all independent validation checks
        { agentName: 'verification', action: 'verify', parallel: true },
        { agentName: 'assumptionBlocker', action: 'scan', parallel: true },
        { agentName: 'consistencyGuardian', action: 'checkConsistency', parallel: false }, // End parallel group
        { agentName: 'versionControl', action: 'trackChange' },
      ],

      modifying: [
        { agentName: 'brainstorming', action: 'reflect' },
        // Verification and consistency can run in parallel
        { agentName: 'verification', action: 'verify', parallel: true },
        { agentName: 'consistencyGuardian', action: 'checkConsistency', parallel: false }, // End parallel group
        { agentName: 'versionControl', action: 'trackChange', parallel: true },
        { agentName: 'accuracyAuditor', action: 'audit', parallel: false }, // End parallel group
      ],

      exploring: [
        { agentName: 'brainstorming', action: 'reflect', parallel: true },
        { agentName: 'questioner', action: 'generateQuestion', parallel: false }, // End parallel group
        { agentName: 'recorder', action: 'record' }, // Record exploring ideas
      ],

      reviewing: [
        { agentName: 'reviewer', action: 'review' },  // Review conversation for missing items
        { agentName: 'recorder', action: 'record' },  // Record anything that was missed
        // Audit and prioritization can run in parallel
        { agentName: 'accuracyAuditor', action: 'audit', parallel: true },
        { agentName: 'prioritization', action: 'prioritize', parallel: false }, // End parallel group
      ],

      development: [
        { agentName: 'translation', action: 'translate' },
        { agentName: 'development', action: 'research' },
        { agentName: 'reviewer', action: 'review' },
      ],

      general: [
        { agentName: 'brainstorming', action: 'reflect' },
        { agentName: 'recorder', action: 'record' }, // Record items from general conversation
      ],

      parking: [
        { agentName: 'brainstorming', action: 'reflect', parallel: true },
        { agentName: 'recorder', action: 'record', parallel: false }, // End parallel group
      ],

      reference_integration: [
        { agentName: 'referenceAnalysis', action: 'analyzeWithContext' },
        { agentName: 'consistencyGuardian', action: 'checkReferenceAgainstDecisions' },
        { agentName: 'clarification', action: 'generateQuestion', condition: 'if_conflicts_found' },
        { agentName: 'recorder', action: 'updateConfidenceScores', condition: 'if_confirmations_found' },
      ],
    };

    const workflow: Workflow = {
      intent: intent.type,
      sequence: workflows[intent.type] || workflows.general,
      timestamp: new Date().toISOString(),
      confidence: intent.confidence,
    };

    this.workflowHistory.push(workflow);
    return workflow;
  }

  async executeWorkflow(
    workflow: Workflow,
    userMessage: string,
    projectState: any,
    conversationHistory: any[],
    projectReferences: any[] = []
  ): Promise<AgentResponse[]> {
    console.log(`[Orchestrator] Executing workflow: ${workflow.intent}`);
    console.log(`[Orchestrator] References available: ${projectReferences.length}`);

    const results: AgentResponse[] = [];
    let shouldContinue = true;
    let reviewData: any = null; // Store review data for later use

    // Group steps into parallel batches
    const batches = this.groupStepsForParallelExecution(workflow.sequence);
    console.log(`[Orchestrator] Organized ${workflow.sequence.length} steps into ${batches.length} execution batches`);

    for (const batch of batches) {
      if (!shouldContinue) break;

      // Execute batch (single step or parallel group)
      if (batch.length === 1) {
        // Single step - execute normally
        const step = batch[0];

        // Check condition
        if (step.condition) {
          shouldContinue = this.evaluateCondition(step.condition, results);
          if (!shouldContinue) continue;
        }

        const result = await this.executeSingleStep(
          step,
          userMessage,
          projectState,
          conversationHistory,
          projectReferences,
          results,
          workflow,
          reviewData
        );

        if (result) {
          results.push(result);
          // Store reviewer findings for use by recorder
          if (step.agentName === 'reviewer' && result.metadata && result.metadata.findings) {
            reviewData = result.metadata;
          }
        }
      } else {
        // Multiple steps - execute in parallel
        console.log(`[Orchestrator] Executing ${batch.length} agents in parallel: ${batch.map(s => s.agentName).join(', ')}`);

        const parallelPromises = batch.map(step =>
          this.executeSingleStep(
            step,
            userMessage,
            projectState,
            conversationHistory,
            projectReferences,
            results,
            workflow,
            reviewData
          ).catch(error => {
            console.error(`[Orchestrator] Error in parallel execution of ${step.agentName}:`, error);
            return null;
          })
        );

        const parallelResults = await Promise.all(parallelPromises);

        // Add non-null results
        for (const result of parallelResults) {
          if (result) {
            results.push(result);
          }
        }
      }
    }

    return results;
  }

  /**
   * Group workflow steps into batches for parallel execution
   * Steps marked with parallel: true will be grouped together
   */
  private groupStepsForParallelExecution(steps: WorkflowStep[]): WorkflowStep[][] {
    const batches: WorkflowStep[][] = [];
    let currentBatch: WorkflowStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      currentBatch.push(step);

      // If this step is not marked for parallel execution, or it's the last step,
      // finalize the current batch
      if (!step.parallel || i === steps.length - 1) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    // Add any remaining steps
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Execute a single workflow step
   */
  private async executeSingleStep(
    step: WorkflowStep,
    userMessage: string,
    projectState: any,
    conversationHistory: any[],
    projectReferences: any[],
    results: AgentResponse[],
    workflow: Workflow,
    reviewData: any
  ): Promise<AgentResponse | null> {
    try {
      const agent = this.agents.get(step.agentName);
      if (!agent) {
        console.error(`[Orchestrator] Agent not found: ${step.agentName}`);
        return null;
      }

      // Phase 2 Optimization: Smart Context Pruning
      // Prune conversation history based on agent-specific needs
      const { prunedHistory, stats } = this.contextPruner.pruneForAgent(
        step.agentName,
        conversationHistory,
        projectState
      );

      // Log pruning statistics
      this.contextPruner.logStats(stats);

      // Phase 2 Optimization: Response Caching
      // Check cache before executing agent
      const cacheKey = this.responseCache.generateKey(
        step.agentName,
        userMessage,
        projectState,
        prunedHistory
      );

      const cachedResponse = this.responseCache.get(cacheKey);
      if (cachedResponse) {
        console.log(`[Orchestrator] Using cached response for ${step.agentName}`);
        return cachedResponse;
      }

      console.log(`[Orchestrator] Executing: ${step.agentName}.${step.action}`);

      const result = await this.executeAgentAction(
        agent,
        step.action,
        userMessage,
        projectState,
        prunedHistory, // Use pruned history instead of full history
        projectReferences,
        results,
        workflow,
        reviewData
      );

      // Cache the result if it was successful
      if (result) {
        this.responseCache.set(cacheKey, step.agentName, result, userMessage);
        console.log(`[Orchestrator] Agent ${step.agentName} returned: showToUser=${result.showToUser}, agent=${result.agent}`);
      } else {
        console.log(`[Orchestrator] Agent ${step.agentName} returned null`);
      }

      return result;
    } catch (error) {
      console.error(`[Orchestrator] Error in ${step.agentName}:`, error);
      return null;
    }
  }

  private async executeAgentAction(
    agent: any,
    action: string,
    userMessage: string,
    projectState: any,
    conversationHistory: any[],
    projectReferences: any[],
    previousResults: AgentResponse[],
    workflow: Workflow,
    reviewData: any = null
  ): Promise<AgentResponse | null> {
    switch (action) {
      case 'reflect':
        return await agent.reflect(userMessage, conversationHistory, projectReferences);

      case 'analyze':
        return await agent.analyze(userMessage, projectState);

      case 'generateQuestion':
        // ClarificationEngine has two modes:
        // 1. Gap/conflict clarification (used after analyze)
        // 2. Exploratory questioning (used in exploring workflow)

        const gaps = this.getLastResult(previousResults, 'gapDetection');
        const consistencyResult = this.getLastResult(previousResults, 'consistencyGuardian');

        // Check if there are gaps or conflicts that need clarification
        const hasGaps = gaps?.metadata?.hasGaps || gaps?.metadata?.hasCriticalGaps || false;
        const hasConflicts = consistencyResult?.metadata?.conflictDetected || false;

        if (hasGaps || hasConflicts) {
          // Gap/conflict mode - targeted clarification
          console.log(`[Orchestrator] Triggering ClarificationEngine (gap mode) - hasGaps: ${hasGaps}, hasConflicts: ${hasConflicts}`);

          if (gaps?.metadata) {
            console.log(`[Orchestrator] Gap data: ${gaps.metadata.criticalCount} critical, ${gaps.metadata.gaps?.length || 0} total gaps`);
          }

          return await agent.generateQuestion(
            gaps?.metadata || {},
            conversationHistory,
            consistencyResult?.metadata || null
          );
        }

        // If no gaps/conflicts but we're in exploring workflow, use exploration mode
        if (workflow.intent === 'exploring') {
          console.log('[Orchestrator] Triggering ClarificationEngine (exploration mode)');
          return await agent.generateExplorationQuestion(
            { userMessage, projectState },
            conversationHistory
          );
        }

        console.log('[Orchestrator] No gaps/conflicts/exploration need - skipping ClarificationEngine');
        return null;

      case 'verify':
        return await agent.verify({ message: userMessage }, userMessage);

      case 'scan':
        return await agent.scan({ message: userMessage });

      case 'checkConsistency':
        return await agent.checkConsistency({ message: userMessage }, projectState, projectReferences);

      case 'record':
        // Check if this is part of a review workflow with review data
        if (workflow.intent === 'reviewing' && reviewData && reviewData.findings) {
          console.log(`[Orchestrator] Review workflow - using reviewData with ${reviewData.findings.length} findings`);
          // Use the new recordFromReview method
          return await agent.recordFromReview(
            reviewData.findings,
            conversationHistory,
            projectState
          );
        }
        // Default behavior: Record the user's message to project state (with workflow intent for context-aware verification)
        console.log(`[Orchestrator] Using default record method with intent: ${workflow.intent}`);
        return await agent.record({ message: userMessage }, projectState, userMessage, workflow.intent, conversationHistory);

      case 'trackChange':
        return await agent.trackChange(
          { id: Date.now().toString(), text: userMessage },
          'modified',
          'User update',
          userMessage
        );

      case 'audit':
        return await agent.audit(projectState, conversationHistory);

      case 'prioritize':
        return await agent.prioritize(projectState);

      case 'translate':
        return await agent.translate(projectState.decided || [], { userMessage });

      case 'research':
        return await agent.research({ concept: userMessage }, projectState.decided || []);

      case 'review':
        // Check if this is an explicit "Review Conversation" request
        const isExplicitReview = workflow.intent === 'reviewing' && workflow.confidence === 100;
        return await agent.review('conversation', {
          conversation: conversationHistory,
          projectState,
          explicitReview: isExplicitReview,
        });

      case 'analyzeWithContext':
        // For reference integration workflow
        const referenceData = previousResults.find(r => r.metadata?.referenceData);
        if (referenceData) {
          return await agent.analyzeWithContext(
            referenceData.metadata.referenceType || 'document',
            referenceData.metadata.referenceData,
            {
              decidedItems: projectState.decided || [],
              exploringItems: projectState.exploring || [],
              projectTitle: projectState.title || 'Project',
            }
          );
        }
        return null;

      case 'checkReferenceAgainstDecisions':
        // Get reference analysis from previous step
        const analysisResult = this.getLastResult(previousResults, 'referenceAnalysis');
        if (analysisResult && analysisResult.metadata?.contextualAnalysis) {
          return await agent.checkReferenceAgainstDecisions(
            analysisResult.metadata.contextualAnalysis,
            analysisResult.metadata.referenceName || 'Uploaded Reference',
            {
              decided: projectState.decided || [],
              exploring: projectState.exploring || [],
              parked: projectState.parked || [],
            }
          );
        }
        return null;

      case 'updateConfidenceScores':
        // Update confidence scores for confirmed items
        const confirmationResult = this.getLastResult(previousResults, 'consistencyGuardian');
        if (confirmationResult && confirmationResult.metadata?.referenceIntegration?.confirmations) {
          // This would update item confidence scores in the database
          return {
            agent: 'RecorderAgent',
            message: 'Updated confidence scores based on reference confirmations',
            showToUser: true,
            metadata: {
              confirmations: confirmationResult.metadata.referenceIntegration.confirmations,
            },
          };
        }
        return null;

      default:
        console.warn(`[Orchestrator] Unknown action: ${action}`);
        return null;
    }
  }

  private evaluateCondition(condition: string, results: AgentResponse[]): boolean {
    switch (condition) {
      case 'if_gaps_found':
        const gapResult = this.getLastResult(results, 'gapDetection');
        // Check both old and new metadata structure for compatibility
        const hasGaps = gapResult?.metadata?.hasGaps ||
                        gapResult?.metadata?.hasCriticalGaps ||
                        (gapResult?.metadata?.criticalCount > 0);
        console.log(`[Orchestrator] Condition 'if_gaps_found': ${hasGaps}`);
        return hasGaps;

      case 'if_verified':
        const verifyResult = this.getLastResult(results, 'verification');
        return verifyResult?.metadata?.approved === true;

      case 'if_conflicts_found':
        const conflictResult = this.getLastResult(results, 'consistencyGuardian');
        return conflictResult?.metadata?.hasConflicts === true;

      case 'if_confirmations_found':
        const confirmationResult = this.getLastResult(results, 'consistencyGuardian');
        return confirmationResult?.metadata?.hasConfirmations === true;

      default:
        return true;
    }
  }

  private getLastResult(results: AgentResponse[], agentName: string): AgentResponse | null {
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] && results[i].agent && results[i].agent.includes(agentName)) {
        return results[i];
      }
    }
    return null;
  }

  getStats() {
    const cacheStats = this.responseCache.getStats();

    return {
      totalWorkflows: this.workflowHistory.length,
      agentCount: this.agents.size,
      registeredAgents: Array.from(this.agents.keys()),
      // Phase 2: Cache performance metrics
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        apiCallsSaved: cacheStats.estimatedSavings,
        currentSize: cacheStats.currentSize,
      },
    };
  }

  /**
   * Log Phase 2 optimization statistics
   */
  logOptimizationStats() {
    console.log('\n=== Phase 2 Optimization Stats ===');
    this.responseCache.logStats();
    this.tokenMetrics.logMetrics();
    console.log('==================================\n');
  }

  /**
   * Get token metrics for API response
   */
  getTokenMetrics() {
    return this.tokenMetrics.getMetricsForAPI();
  }
}