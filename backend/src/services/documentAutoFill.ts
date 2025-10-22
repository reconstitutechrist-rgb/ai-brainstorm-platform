/**
 * Document Auto-Fill Service
 * Phase 3.1: Document Research Agent
 *
 * STRICT RULE: Only auto-fill from project's DECIDED items
 * Never hallucinate or make up information
 */

import { DocumentTemplate, RequiredField } from './documentTemplates';

export interface AutoFillResult {
  content: string; // Generated markdown document
  completionPercent: number; // 0-100
  missingFields: MissingFieldInfo[];
  filledFields: Record<string, string>;
  category: string;
  status: 'complete' | 'incomplete';
}

export interface MissingFieldInfo {
  field: string;
  description: string;
  example?: string;
  required: boolean;
}

export interface ProjectContext {
  id: string;
  title: string;
  description: string;
  items: ProjectItem[];
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  text: string;
  state: 'decided' | 'exploring' | 'parked';
  type?: string;
  category?: string;
  citation?: any;
  created_at?: string;
}

/**
 * Auto-fill a document template using ONLY decided items from the project
 *
 * @param template The document template to fill
 * @param project The project context
 * @returns Auto-fill result with completion status
 */
export async function autoFillDocument(
  template: DocumentTemplate,
  project: ProjectContext
): Promise<AutoFillResult> {
  // STRICT: Only use decided items
  const decidedItems = project.items.filter(i => i.state === 'decided');

  console.log(`[AutoFill] Filling template "${template.name}" for project "${project.title}"`);
  console.log(`[AutoFill] Found ${decidedItems.length} decided items to work with`);

  const filledFields: Record<string, string> = {};
  const missingFields: MissingFieldInfo[] = [];

  // Process each required field
  for (const field of template.requiredFields) {
    const value = extractFieldValue(field, project, decidedItems);

    if (value) {
      filledFields[field.field] = value;
      console.log(`[AutoFill] ✓ Found value for ${field.field}`);
    } else {
      missingFields.push({
        field: field.field,
        description: field.description,
        example: field.example,
        required: field.required,
      });
      console.log(`[AutoFill] ✗ Missing value for ${field.field}`);
    }
  }

  // Calculate completion percentage
  const totalRequired = template.requiredFields.filter(f => f.required).length;
  const filled = template.requiredFields.filter(f => f.required && filledFields[f.field]).length;
  const completionPercent = totalRequired > 0 ? Math.round((filled / totalRequired) * 100) : 100;

  console.log(`[AutoFill] Completion: ${completionPercent}% (${filled}/${totalRequired} required fields)`);

  // Generate document content
  const content = generateDocumentContent(
    template,
    filledFields,
    missingFields,
    project,
    completionPercent
  );

  return {
    content,
    completionPercent,
    missingFields,
    filledFields,
    category: template.category,
    status: completionPercent === 100 ? 'complete' : 'incomplete',
  };
}

/**
 * Extract field value from project context
 * STRICT: Only uses decided items, never makes up information
 */
function extractFieldValue(
  field: RequiredField,
  project: ProjectContext,
  decidedItems: ProjectItem[]
): string | null {
  switch (field.source) {
    case 'project_title':
      return project.title || null;

    case 'project_description':
      return project.description || null;

    case 'decided_items':
      // Search decided items for relevant information
      return extractFromDecidedItems(field, decidedItems);

    case 'manual':
      // Manual fields cannot be auto-filled
      return null;

    default:
      return null;
  }
}

/**
 * Extract information from decided items based on field description
 * Uses keyword matching and context analysis
 */
function extractFromDecidedItems(
  field: RequiredField,
  decidedItems: ProjectItem[]
): string | null {
  if (decidedItems.length === 0) return null;

  // Define keyword mappings for common fields
  const keywordMap: Record<string, string[]> = {
    // API/Tech fields
    base_url: ['url', 'endpoint', 'api url', 'base url', 'server'],
    authentication_method: ['auth', 'authentication', 'jwt', 'oauth', 'api key', 'token'],
    endpoints: ['endpoint', 'route', 'api', 'path', '/'],
    tech_stack: ['technology', 'framework', 'library', 'stack', 'using', 'built with'],
    architecture_pattern: ['architecture', 'pattern', 'microservices', 'monolith', 'serverless'],
    components: ['component', 'service', 'module', 'part'],
    deployment_platform: ['deploy', 'host', 'platform', 'aws', 'heroku', 'vercel', 'cloud'],
    environment_variables: ['env', 'environment', 'config', 'variable'],
    dependencies: ['dependency', 'require', 'prerequisite', 'need'],

    // Business/Legal fields
    data_collected: ['data', 'collect', 'information', 'user data', 'personal'],
    data_usage: ['use', 'usage', 'purpose', 'why', 'process'],
    data_retention_period: ['retention', 'keep', 'store', 'delete', 'days', 'months', 'years'],
    third_party_services: ['third party', 'third-party', 'service', 'integration', 'external'],
    user_obligations: ['user must', 'user cannot', 'prohibited', 'allowed', 'obligation'],
    uptime_commitment: ['uptime', 'availability', 'sla', '99', 'downtime'],
    response_times: ['response', 'time', 'sla', 'support', 'reply'],
    support_hours: ['support', 'hours', 'available', '24/7', 'business hours'],

    // Development fields
    installation_steps: ['install', 'setup', 'getting started', 'npm', 'yarn', 'clone'],
    usage_examples: ['usage', 'example', 'how to use', 'tutorial'],
    coding_standards: ['code style', 'standard', 'convention', 'linting', 'format'],
    contribution_workflow: ['contribute', 'pr', 'pull request', 'fork', 'branch'],
  };

  const keywords = keywordMap[field.field] || [field.field.toLowerCase()];

  // Find items that match keywords
  const relevantItems = decidedItems.filter(item => {
    const text = item.text.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  });

  if (relevantItems.length === 0) return null;

  // Combine relevant items into a coherent value
  return relevantItems.map(item => item.text).join('\n- ');
}

/**
 * Generate the final document content with filled and missing fields
 */
function generateDocumentContent(
  template: DocumentTemplate,
  filledFields: Record<string, string>,
  missingFields: MissingFieldInfo[],
  project: ProjectContext,
  completionPercent: number
): string {
  let content = template.structure;

  // Replace common placeholders
  content = content.replace(/\[completion_percent\]/g, completionPercent.toString());
  content = content.replace(/\[status\]/g, completionPercent === 100 ? '✅ Complete' : '⚠️ Incomplete');
  content = content.replace(/\[timestamp\]/g, new Date().toISOString().split('T')[0]);
  content = content.replace(/\[project_description\]/g, project.description || '[Project description not provided]');

  // Replace filled fields
  for (const [field, value] of Object.entries(filledFields)) {
    const placeholder = new RegExp(`\\[${field}\\]`, 'g');
    content = content.replace(placeholder, value);
  }

  // Replace missing fields with NEEDS INPUT markers
  for (const missing of missingFields) {
    const placeholder = new RegExp(`\\[${missing.field}\\]`, 'g');
    content = content.replace(
      placeholder,
      `[NEEDS INPUT: ${missing.description}${missing.example ? ' - Example: ' + missing.example : ''}]`
    );
  }

  // Generate missing fields checklist
  const checklistContent = generateMissingFieldsChecklist(missingFields);
  content = content.replace(/\[missing_fields_checklist\]/g, checklistContent);

  // Clean up any remaining unreplaced placeholders
  content = content.replace(/\[(\w+)\]/g, '[Information not available]');

  return content;
}

/**
 * Generate a markdown checklist of missing required fields
 */
function generateMissingFieldsChecklist(missingFields: MissingFieldInfo[]): string {
  if (missingFields.length === 0) {
    return 'All required information has been filled! ✅';
  }

  let checklist = 'Complete this checklist to finish your document:\n\n';

  for (const field of missingFields) {
    checklist += `- [ ] **${field.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}** - ${field.description}\n`;
    if (field.example) {
      checklist += `  - Example: "${field.example}"\n`;
    }
    checklist += `  - Add this as a decided item in your project\n\n`;
  }

  checklist += `\n**Next Steps:**\n`;
  checklist += `1. Add the missing information as decided items in your project\n`;
  checklist += `2. Click "Re-scan" to update this document\n`;
  checklist += `3. Or manually fill in the [NEEDS INPUT] sections above\n`;

  return checklist;
}

/**
 * Re-examine an incomplete document to check if it can now be completed
 * Called when project decisions are updated
 */
export async function reExamineDocument(
  template: DocumentTemplate,
  project: ProjectContext,
  previousMissingFields: MissingFieldInfo[]
): Promise<{
  updated: boolean;
  newCompletionPercent: number;
  previousCompletionPercent: number;
  newlyFilledFields: string[];
}> {
  // Re-run auto-fill
  const result = await autoFillDocument(template, project);

  // Calculate what changed
  const previousCompletionPercent = Math.round(
    ((template.requiredFields.filter(f => f.required).length - previousMissingFields.length) /
      template.requiredFields.filter(f => f.required).length) *
      100
  );

  const newlyFilledFields = previousMissingFields
    .filter(mf => result.filledFields[mf.field])
    .map(mf => mf.field);

  const updated = result.completionPercent > previousCompletionPercent;

  console.log(`[Re-examination] Document completion: ${previousCompletionPercent}% → ${result.completionPercent}%`);
  console.log(`[Re-examination] Newly filled fields: ${newlyFilledFields.join(', ') || 'none'}`);

  return {
    updated,
    newCompletionPercent: result.completionPercent,
    previousCompletionPercent,
    newlyFilledFields,
  };
}

/**
 * Categorize a document based on its template category
 */
export function categorizeDocument(category: string): string {
  const categoryMap: Record<string, string> = {
    software_technical: 'Software & Technical',
    business: 'Business',
    development: 'Development',
  };

  return categoryMap[category] || 'Uncategorized';
}
