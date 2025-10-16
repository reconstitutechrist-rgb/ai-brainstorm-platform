import { BaseAgent } from './base';

export class ResourceManagerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Resource Manager Agent.

YOUR PURPOSE:
Organize and manage reference materials, research, and inspiration.

WHAT YOU MANAGE:
- Reference links and sources
- Competitor examples
- Inspiration materials
- Research documents
- Related projects
- Uploaded files (images, videos, PDFs)

ORGANIZATION SYSTEM:
- Categorize by project area
- Tag with relevant keywords
- Link to related decided items
- Track when/why added
- Enable easy retrieval

CAPABILITIES:
- Store new resources
- Retrieve relevant materials
- Suggest related resources
- Organize by category/tags
- Generate resource summaries`;

    super('ResourceManagerAgent', systemPrompt);
  }

  async organizeResource(resource: any, category: string, relatedItems: string[]): Promise<any> {
    this.log(`Organizing resource in category: ${category}`);

    const resourceRecord = {
      id: this.generateId(),
      ...resource,
      category: category,
      relatedItems: relatedItems,
      addedAt: new Date().toISOString(),
      tags: this.extractTags(resource),
    };

    // Return standardized AgentResponse format
    return {
      agent: this.name,
      message: '', // Internal agent - no user-facing message
      showToUser: false,
      metadata: resourceRecord,
    };
  }

  private generateId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTags(resource: any): string[] {
    const content = JSON.stringify(resource).toLowerCase();
    const commonTags = ['design', 'technical', 'inspiration', 'competitor', 'research', 'reference'];
    return commonTags.filter(tag => content.includes(tag));
  }
}