/**
 * Document Templates Knowledge Base
 * Phase 3.1: Document Research Agent
 *
 * Provides built-in templates for common document types across:
 * - Software & Technical
 * - Business
 * - Development
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  category: 'software_technical' | 'business' | 'development';
  description: string;
  requiredFields: RequiredField[];
  optionalFields: string[];
  structure: string; // Markdown template with placeholders
  webResearchKeywords?: string[]; // Keywords for web research
}

export interface RequiredField {
  field: string;
  description: string;
  source: 'project_title' | 'project_description' | 'decided_items' | 'manual';
  required: boolean;
  example?: string;
}

// ============================================
// SOFTWARE & TECHNICAL TEMPLATES
// ============================================

const apiDocumentationTemplate: DocumentTemplate = {
  id: 'api_documentation',
  name: 'API Documentation',
  category: 'software_technical',
  description: 'Complete API reference documentation with endpoints, parameters, and examples',
  requiredFields: [
    {
      field: 'api_name',
      description: 'Name of the API',
      source: 'project_title',
      required: true,
      example: 'Healthcare API v2'
    },
    {
      field: 'base_url',
      description: 'Base URL for API requests',
      source: 'decided_items',
      required: true,
      example: 'https://api.example.com/v2'
    },
    {
      field: 'authentication_method',
      description: 'Authentication mechanism (OAuth, JWT, API Key, etc.)',
      source: 'decided_items',
      required: true,
      example: 'JWT Bearer Token'
    },
    {
      field: 'endpoints',
      description: 'List of API endpoints with methods and purposes',
      source: 'decided_items',
      required: true,
      example: 'GET /patients, POST /appointments'
    }
  ],
  optionalFields: [
    'rate_limits',
    'error_codes',
    'sdks_available',
    'webhooks',
    'versioning_strategy'
  ],
  structure: `# [api_name] API Documentation [completion_percent]%

**Last Updated:** [timestamp]
**Status:** [status]

---

## Overview

[project_description]

**Base URL:** [base_url]

---

## Authentication

[authentication_method]

---

## Endpoints

[endpoints]

---

## Error Handling

[error_codes]

---

## Rate Limiting

[rate_limits]

---

## SDKs & Libraries

[sdks_available]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['API documentation best practices', 'REST API documentation structure', 'API reference guide']
};

const technicalArchitectureTemplate: DocumentTemplate = {
  id: 'technical_architecture',
  name: 'Technical Architecture Document',
  category: 'software_technical',
  description: 'System architecture overview including components, technologies, and data flow',
  requiredFields: [
    {
      field: 'system_name',
      description: 'Name of the system/application',
      source: 'project_title',
      required: true
    },
    {
      field: 'architecture_pattern',
      description: 'Architecture pattern used (microservices, monolith, serverless, etc.)',
      source: 'decided_items',
      required: true,
      example: 'Microservices with event-driven communication'
    },
    {
      field: 'tech_stack',
      description: 'Technologies and frameworks used',
      source: 'decided_items',
      required: true,
      example: 'React, Node.js, PostgreSQL, Redis, AWS'
    },
    {
      field: 'components',
      description: 'Major system components and their responsibilities',
      source: 'decided_items',
      required: true
    }
  ],
  optionalFields: [
    'deployment_strategy',
    'scaling_approach',
    'security_measures',
    'monitoring_tools',
    'disaster_recovery'
  ],
  structure: `# [system_name] - Technical Architecture [completion_percent]%

**Status:** [status]

---

## System Overview

[project_description]

---

## Architecture Pattern

[architecture_pattern]

---

## Technology Stack

[tech_stack]

---

## System Components

[components]

---

## Data Flow

[data_flow_diagram]

---

## Deployment

[deployment_strategy]

---

## Scaling

[scaling_approach]

---

## Security

[security_measures]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['software architecture patterns', 'system design best practices', 'technical architecture document']
};

const deploymentGuideTemplate: DocumentTemplate = {
  id: 'deployment_guide',
  name: 'Deployment Guide',
  category: 'software_technical',
  description: 'Step-by-step deployment instructions and environment configuration',
  requiredFields: [
    {
      field: 'application_name',
      description: 'Name of the application being deployed',
      source: 'project_title',
      required: true
    },
    {
      field: 'deployment_platform',
      description: 'Platform/service for deployment (AWS, Heroku, Vercel, etc.)',
      source: 'decided_items',
      required: true,
      example: 'AWS (ECS + RDS + S3)'
    },
    {
      field: 'environment_variables',
      description: 'Required environment variables and configuration',
      source: 'decided_items',
      required: true
    },
    {
      field: 'dependencies',
      description: 'System dependencies and prerequisites',
      source: 'decided_items',
      required: true
    }
  ],
  optionalFields: [
    'ci_cd_pipeline',
    'rollback_procedure',
    'health_checks',
    'monitoring_setup',
    'ssl_certificates'
  ],
  structure: `# [application_name] - Deployment Guide [completion_percent]%

**Status:** [status]

---

## Prerequisites

[dependencies]

---

## Platform

[deployment_platform]

---

## Environment Configuration

[environment_variables]

---

## Deployment Steps

1. [deployment_steps]

---

## CI/CD Pipeline

[ci_cd_pipeline]

---

## Health Checks

[health_checks]

---

## Rollback Procedure

[rollback_procedure]

---

## Monitoring

[monitoring_setup]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['deployment best practices', 'production deployment checklist', 'CI/CD pipeline setup']
};

// ============================================
// BUSINESS TEMPLATES
// ============================================

const privacyPolicyTemplate: DocumentTemplate = {
  id: 'privacy_policy',
  name: 'Privacy Policy',
  category: 'business',
  description: 'Legal privacy policy document for user data handling',
  requiredFields: [
    {
      field: 'company_name',
      description: 'Legal company or entity name',
      source: 'project_title',
      required: true,
      example: 'HealthTech Solutions Inc.'
    },
    {
      field: 'data_collected',
      description: 'Types of data collected from users',
      source: 'decided_items',
      required: true,
      example: 'email, name, health records, location'
    },
    {
      field: 'data_usage',
      description: 'How user data is used',
      source: 'decided_items',
      required: true,
      example: 'account management, service delivery, analytics'
    },
    {
      field: 'data_retention_period',
      description: 'How long data is retained',
      source: 'decided_items',
      required: true,
      example: '90 days after account deletion, 7 years for medical records'
    },
    {
      field: 'third_party_services',
      description: 'Third-party services with data access',
      source: 'decided_items',
      required: true,
      example: 'AWS (hosting), SendGrid (emails), Stripe (payments)'
    },
    {
      field: 'contact_email',
      description: 'Privacy inquiry contact email',
      source: 'manual',
      required: true,
      example: 'privacy@company.com'
    }
  ],
  optionalFields: [
    'cookies_used',
    'gdpr_compliance',
    'ccpa_compliance',
    'data_sharing_policies',
    'children_policy'
  ],
  structure: `# Privacy Policy [completion_percent]%

**Effective Date:** [timestamp]
**Company:** [company_name]
**Status:** [status]

---

## 1. Information We Collect

We collect the following types of information:

[data_collected]

---

## 2. How We Use Your Information

[data_usage]

---

## 3. Data Retention

[data_retention_period]

---

## 4. Third-Party Services

We share data with the following third-party services:

[third_party_services]

---

## 5. Your Rights

You have the right to:
- Access your personal data
- Request deletion of your data
- Export your data
- Opt-out of marketing communications

Contact us at [contact_email] to exercise these rights.

---

## 6. Cookies

[cookies_used]

---

## 7. GDPR Compliance

[gdpr_compliance]

---

## 8. CCPA Compliance

[ccpa_compliance]

---

## 9. Contact Us

For privacy-related questions, contact: [contact_email]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['privacy policy requirements', 'GDPR compliance', 'privacy policy template']
};

const termsOfServiceTemplate: DocumentTemplate = {
  id: 'terms_of_service',
  name: 'Terms of Service',
  category: 'business',
  description: 'Legal terms and conditions for using the service',
  requiredFields: [
    {
      field: 'company_name',
      description: 'Legal company or entity name',
      source: 'project_title',
      required: true
    },
    {
      field: 'service_description',
      description: 'Description of the service provided',
      source: 'project_description',
      required: true
    },
    {
      field: 'user_obligations',
      description: 'What users must and must not do',
      source: 'decided_items',
      required: true
    },
    {
      field: 'liability_limits',
      description: 'Limitation of liability clauses',
      source: 'manual',
      required: true
    }
  ],
  optionalFields: [
    'payment_terms',
    'refund_policy',
    'termination_conditions',
    'dispute_resolution',
    'governing_law'
  ],
  structure: `# Terms of Service [completion_percent]%

**Effective Date:** [timestamp]
**Company:** [company_name]
**Status:** [status]

---

## 1. Acceptance of Terms

By accessing and using [company_name], you agree to these Terms of Service.

---

## 2. Service Description

[service_description]

---

## 3. User Obligations

[user_obligations]

---

## 4. Payment Terms

[payment_terms]

---

## 5. Refund Policy

[refund_policy]

---

## 6. Limitation of Liability

[liability_limits]

---

## 7. Termination

[termination_conditions]

---

## 8. Dispute Resolution

[dispute_resolution]

---

## 9. Governing Law

[governing_law]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['terms of service template', 'SaaS terms and conditions', 'user agreement']
};

const slaTemplate: DocumentTemplate = {
  id: 'service_level_agreement',
  name: 'Service Level Agreement (SLA)',
  category: 'business',
  description: 'Formal SLA defining service availability and performance commitments',
  requiredFields: [
    {
      field: 'service_name',
      description: 'Name of the service',
      source: 'project_title',
      required: true
    },
    {
      field: 'uptime_commitment',
      description: 'Guaranteed uptime percentage',
      source: 'decided_items',
      required: true,
      example: '99.9% uptime'
    },
    {
      field: 'response_times',
      description: 'Response time commitments for different priority levels',
      source: 'decided_items',
      required: true,
      example: 'Critical: 1 hour, High: 4 hours, Normal: 24 hours'
    },
    {
      field: 'support_hours',
      description: 'Support availability hours',
      source: 'decided_items',
      required: true,
      example: '24/7 for critical issues, 9am-5pm EST for others'
    }
  ],
  optionalFields: [
    'credits_compensation',
    'exclusions',
    'maintenance_windows',
    'performance_metrics'
  ],
  structure: `# Service Level Agreement - [service_name] [completion_percent]%

**Effective Date:** [timestamp]
**Status:** [status]

---

## 1. Service Overview

[project_description]

---

## 2. Uptime Guarantee

[uptime_commitment]

---

## 3. Response Times

[response_times]

---

## 4. Support Hours

[support_hours]

---

## 5. Performance Metrics

[performance_metrics]

---

## 6. Service Credits

[credits_compensation]

---

## 7. Exclusions

[exclusions]

---

## 8. Planned Maintenance

[maintenance_windows]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['SLA best practices', 'service level agreement template', 'uptime guarantees']
};

// ============================================
// DEVELOPMENT TEMPLATES
// ============================================

const readmeTemplate: DocumentTemplate = {
  id: 'readme',
  name: 'README.md',
  category: 'development',
  description: 'Project README with installation, usage, and contribution instructions',
  requiredFields: [
    {
      field: 'project_name',
      description: 'Name of the project',
      source: 'project_title',
      required: true
    },
    {
      field: 'project_description',
      description: 'What the project does',
      source: 'project_description',
      required: true
    },
    {
      field: 'installation_steps',
      description: 'How to install/set up the project',
      source: 'decided_items',
      required: true
    },
    {
      field: 'usage_examples',
      description: 'How to use the project',
      source: 'decided_items',
      required: true
    }
  ],
  optionalFields: [
    'tech_stack',
    'features',
    'demo_link',
    'screenshots',
    'roadmap',
    'license'
  ],
  structure: `# [project_name] [completion_percent]%

**Status:** [status]

---

## 📖 Description

[project_description]

---

## ✨ Features

[features]

---

## 🚀 Installation

[installation_steps]

---

## 💻 Usage

[usage_examples]

---

## 🛠️ Tech Stack

[tech_stack]

---

## 🎯 Roadmap

[roadmap]

---

## 📄 License

[license]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['README best practices', 'open source README template', 'project documentation']
};

const contributingGuideTemplate: DocumentTemplate = {
  id: 'contributing_guide',
  name: 'CONTRIBUTING.md',
  category: 'development',
  description: 'Guidelines for contributing to the project',
  requiredFields: [
    {
      field: 'project_name',
      description: 'Name of the project',
      source: 'project_title',
      required: true
    },
    {
      field: 'contribution_workflow',
      description: 'Steps for making contributions (fork, branch, PR, etc.)',
      source: 'decided_items',
      required: true
    },
    {
      field: 'coding_standards',
      description: 'Code style and standards to follow',
      source: 'decided_items',
      required: true
    }
  ],
  optionalFields: [
    'testing_requirements',
    'commit_message_format',
    'branch_naming',
    'review_process'
  ],
  structure: `# Contributing to [project_name] [completion_percent]%

**Status:** [status]

Thank you for considering contributing to [project_name]!

---

## 🤝 Contribution Workflow

[contribution_workflow]

---

## 📝 Coding Standards

[coding_standards]

---

## ✅ Testing Requirements

[testing_requirements]

---

## 💬 Commit Message Format

[commit_message_format]

---

## 🌿 Branch Naming

[branch_naming]

---

## 👀 Review Process

[review_process]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['contributing guidelines', 'open source contribution guide', 'contributor covenant']
};

const codeOfConductTemplate: DocumentTemplate = {
  id: 'code_of_conduct',
  name: 'CODE_OF_CONDUCT.md',
  category: 'development',
  description: 'Community code of conduct and behavioral expectations',
  requiredFields: [
    {
      field: 'project_name',
      description: 'Name of the project/community',
      source: 'project_title',
      required: true
    },
    {
      field: 'contact_email',
      description: 'Email for reporting violations',
      source: 'manual',
      required: true,
      example: 'conduct@project.org'
    }
  ],
  optionalFields: [
    'scope',
    'enforcement_guidelines',
    'attribution'
  ],
  structure: `# Code of Conduct - [project_name] [completion_percent]%

**Status:** [status]

---

## Our Pledge

We as members, contributors, and leaders pledge to make participation in [project_name] a harassment-free experience for everyone.

---

## Our Standards

### Positive Behavior:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

### Unacceptable Behavior:
- Trolling, insulting comments, and personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

---

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to [contact_email].

All complaints will be reviewed and investigated promptly and fairly.

---

## Scope

[scope]

---

## Enforcement Guidelines

[enforcement_guidelines]

---

## Attribution

[attribution]

---

## ❌ Missing Information

[missing_fields_checklist]
`,
  webResearchKeywords: ['contributor covenant', 'code of conduct template', 'community guidelines']
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

export const documentTemplates: DocumentTemplate[] = [
  // Software & Technical
  apiDocumentationTemplate,
  technicalArchitectureTemplate,
  deploymentGuideTemplate,

  // Business
  privacyPolicyTemplate,
  termsOfServiceTemplate,
  slaTemplate,

  // Development
  readmeTemplate,
  contributingGuideTemplate,
  codeOfConductTemplate,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return documentTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: 'software_technical' | 'business' | 'development'): DocumentTemplate[] {
  return documentTemplates.filter(t => t.category === category);
}

export function getAllTemplates(): DocumentTemplate[] {
  return documentTemplates;
}

export function searchTemplates(query: string): DocumentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return documentTemplates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.webResearchKeywords?.some(k => k.toLowerCase().includes(lowerQuery))
  );
}
