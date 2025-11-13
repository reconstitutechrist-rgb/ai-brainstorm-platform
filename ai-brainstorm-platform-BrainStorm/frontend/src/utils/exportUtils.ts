import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import type { Project, Message, Document, AgentActivity } from '../types';

interface GeneratedDocument {
  id: string;
  project_id: string;
  document_type: string;
  content: string;
  version: number;
  created_at: string;
  metadata?: Record<string, any>;
}

interface ExportData {
  project: Project;
  messages?: Message[];
  documents?: Document[];
  agentActivities?: AgentActivity[];
  generatedDocuments?: GeneratedDocument[];
}

/**
 * Export project to PDF format
 */
export const exportToPDF = async (data: ExportData): Promise<void> => {
  const { project, messages = [], documents = [], agentActivities = [] } = data;
  const pdf = new jsPDF();

  let yPosition = 20;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;
  const maxWidth = 170;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Helper function to add wrapped text
  const addWrappedText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }

    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak();
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Export Report', margin, yPosition);
  yPosition += 15;

  // Project metadata
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Generated: ${format(new Date(), 'PPpp')}`, margin, yPosition);
  yPosition += 10;

  // Project Information Section
  checkPageBreak(20);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Project Information', margin, yPosition);
  yPosition += 10;

  addWrappedText(`Title: ${project.title}`, 12, true);
  yPosition += 2;
  addWrappedText(`Status: ${project.status.toUpperCase()}`, 11);
  yPosition += 2;
  addWrappedText(`Description: ${project.description || 'No description'}`, 11);
  yPosition += 2;
  addWrappedText(`Created: ${format(new Date(project.created_at), 'PPp')}`, 10);
  yPosition += 2;
  addWrappedText(`Last Updated: ${format(new Date(project.updated_at), 'PPp')}`, 10);
  yPosition += 10;

  // Project Items Section
  const decidedItems = project.items.filter(item => item.state === 'decided');
  const exploringItems = project.items.filter(item => item.state === 'exploring');
  const parkedItems = project.items.filter(item => item.state === 'parked');

  // Decided Items
  if (decidedItems.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94); // Green
    pdf.text(`Decided Items (${decidedItems.length})`, margin, yPosition);
    yPosition += 8;

    decidedItems.forEach((item, index) => {
      checkPageBreak(15);
      pdf.setTextColor(0);
      addWrappedText(`${index + 1}. ${item.text}`, 10);
      if (item.citation) {
        pdf.setTextColor(100);
        pdf.setFontSize(9);
        pdf.text(`   "${item.citation.userQuote}"`, margin + 5, yPosition);
        yPosition += 6;
      }
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Exploring Items
  if (exploringItems.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246); // Blue
    pdf.text(`Exploring Items (${exploringItems.length})`, margin, yPosition);
    yPosition += 8;

    exploringItems.forEach((item, index) => {
      checkPageBreak(15);
      pdf.setTextColor(0);
      addWrappedText(`${index + 1}. ${item.text}`, 10);
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Parked Items
  if (parkedItems.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(156, 163, 175); // Gray
    pdf.text(`Parked Items (${parkedItems.length})`, margin, yPosition);
    yPosition += 8;

    parkedItems.forEach((item, index) => {
      checkPageBreak(15);
      pdf.setTextColor(0);
      addWrappedText(`${index + 1}. ${item.text}`, 10);
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Generated Documents Section (AI-generated)
  const { generatedDocuments = [] } = data;
  if (generatedDocuments.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(139, 92, 246); // Purple for AI-generated content
    pdf.text(`AI-Generated Documents (${generatedDocuments.length})`, margin, yPosition);
    yPosition += 8;

    generatedDocuments.forEach((genDoc, index) => {
      checkPageBreak(30);
      pdf.setTextColor(0);

      // Document type header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      const docTypeName = genDoc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      pdf.text(`${index + 1}. ${docTypeName}`, margin, yPosition);
      yPosition += 7;

      // Version and date
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`Version: ${genDoc.version} | Generated: ${format(new Date(genDoc.created_at), 'PPp')}`, margin + 5, yPosition);
      yPosition += 6;

      // Content preview (first 500 characters)
      pdf.setFontSize(9);
      pdf.setTextColor(60);
      const contentPreview = genDoc.content.length > 500
        ? genDoc.content.substring(0, 500) + '...'
        : genDoc.content;
      addWrappedText(contentPreview, 9);

      pdf.setTextColor(0);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Uploaded Documents Section
  if (documents.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(`Uploaded Documents (${documents.length})`, margin, yPosition);
    yPosition += 8;

    documents.forEach((doc, index) => {
      checkPageBreak(15);
      addWrappedText(`${index + 1}. ${doc.filename}`, 10);
      if (doc.description) {
        pdf.setTextColor(100);
        addWrappedText(`   ${doc.description}`, 9);
        pdf.setTextColor(0);
      }
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Agent Activities Section
  if (agentActivities.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(`Recent Agent Activities (Last 10)`, margin, yPosition);
    yPosition += 8;

    agentActivities.slice(0, 10).forEach((activity, index) => {
      checkPageBreak(15);
      addWrappedText(`${index + 1}. ${activity.agent_type}: ${activity.action}`, 9);
      pdf.setTextColor(100);
      addWrappedText(`   ${format(new Date(activity.created_at), 'PPp')}`, 8);
      pdf.setTextColor(0);
      yPosition += 3;
    });
  }

  // Statistics Summary (Last Page)
  pdf.addPage();
  yPosition = 20;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Statistics', margin, yPosition);
  yPosition += 10;

  const stats = [
    { label: 'Total Items', value: project.items.length },
    { label: 'Decided Items', value: decidedItems.length },
    { label: 'Exploring Items', value: exploringItems.length },
    { label: 'Parked Items', value: parkedItems.length },
    { label: 'Total Messages', value: messages.length },
    { label: 'Uploaded Documents', value: documents.length },
    { label: 'AI-Generated Documents', value: generatedDocuments.length },
    { label: 'Agent Activities', value: agentActivities.length },
  ];

  stats.forEach(stat => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${stat.label}:`, margin, yPosition);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stat.value.toString(), margin + 80, yPosition);
    yPosition += 8;
  });

  // Save the PDF
  const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  pdf.save(filename);
};

/**
 * Export project to Excel format
 */
export const exportToExcel = (data: ExportData): void => {
  const { project, messages = [], agentActivities = [], documents = [], generatedDocuments = [] } = data;

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Project Overview
  const overviewData = [
    ['Project Export Report'],
    ['Generated', format(new Date(), 'PPpp')],
    [],
    ['Project Information'],
    ['Title', project.title],
    ['Status', project.status],
    ['Description', project.description || 'No description'],
    ['Created', format(new Date(project.created_at), 'PPp')],
    ['Updated', format(new Date(project.updated_at), 'PPp')],
    [],
    ['Statistics'],
    ['Total Items', project.items.length],
    ['Decided Items', project.items.filter(i => i.state === 'decided').length],
    ['Exploring Items', project.items.filter(i => i.state === 'exploring').length],
    ['Parked Items', project.items.filter(i => i.state === 'parked').length],
    ['Total Messages', messages.length],
    ['Uploaded Documents', documents.length],
    ['AI-Generated Documents', generatedDocuments.length],
    ['Agent Activities', agentActivities.length],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // Sheet 2: Decided Items
  const decidedItems = project.items.filter(item => item.state === 'decided');
  if (decidedItems.length > 0) {
    const decidedData = [
      ['Decided Items'],
      ['#', 'Text', 'Created', 'Citation Quote', 'Citation Confidence'],
      ...decidedItems.map((item, idx) => [
        idx + 1,
        item.text,
        format(new Date(item.created_at), 'PPp'),
        item.citation?.userQuote || '',
        item.citation?.confidence || '',
      ])
    ];
    const wsDecided = XLSX.utils.aoa_to_sheet(decidedData);
    XLSX.utils.book_append_sheet(wb, wsDecided, 'Decided');
  }

  // Sheet 3: Exploring Items
  const exploringItems = project.items.filter(item => item.state === 'exploring');
  if (exploringItems.length > 0) {
    const exploringData = [
      ['Exploring Items'],
      ['#', 'Text', 'Created'],
      ...exploringItems.map((item, idx) => [
        idx + 1,
        item.text,
        format(new Date(item.created_at), 'PPp'),
      ])
    ];
    const wsExploring = XLSX.utils.aoa_to_sheet(exploringData);
    XLSX.utils.book_append_sheet(wb, wsExploring, 'Exploring');
  }

  // Sheet 4: Parked Items
  const parkedItems = project.items.filter(item => item.state === 'parked');
  if (parkedItems.length > 0) {
    const parkedData = [
      ['Parked Items'],
      ['#', 'Text', 'Created'],
      ...parkedItems.map((item, idx) => [
        idx + 1,
        item.text,
        format(new Date(item.created_at), 'PPp'),
      ])
    ];
    const wsParked = XLSX.utils.aoa_to_sheet(parkedData);
    XLSX.utils.book_append_sheet(wb, wsParked, 'Parked');
  }

  // Sheet 5: Conversation History (if messages exist)
  if (messages.length > 0) {
    const messagesData = [
      ['Conversation History'],
      ['#', 'Role', 'Content', 'Agent', 'Timestamp'],
      ...messages.map((msg, idx) => [
        idx + 1,
        msg.role,
        msg.content.substring(0, 500), // Truncate long messages
        msg.metadata?.agent || 'N/A',
        format(new Date(msg.created_at), 'PPp'),
      ])
    ];
    const wsMessages = XLSX.utils.aoa_to_sheet(messagesData);
    XLSX.utils.book_append_sheet(wb, wsMessages, 'Conversation');
  }

  // Sheet 6: Generated Documents (AI-generated)
  if (generatedDocuments.length > 0) {
    const generatedDocsData = [
      ['AI-Generated Documents'],
      ['#', 'Document Type', 'Version', 'Content Preview', 'Generated'],
      ...generatedDocuments.map((genDoc, idx) => [
        idx + 1,
        genDoc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        genDoc.version,
        genDoc.content.substring(0, 1000), // First 1000 characters
        format(new Date(genDoc.created_at), 'PPp'),
      ])
    ];
    const wsGenDocs = XLSX.utils.aoa_to_sheet(generatedDocsData);
    XLSX.utils.book_append_sheet(wb, wsGenDocs, 'Generated Docs');
  }

  // Sheet 7: Agent Activity Log
  if (agentActivities.length > 0) {
    const activitiesData = [
      ['Agent Activity Log'],
      ['#', 'Agent Type', 'Action', 'Timestamp'],
      ...agentActivities.map((activity, idx) => [
        idx + 1,
        activity.agent_type,
        activity.action,
        format(new Date(activity.created_at), 'PPp'),
      ])
    ];
    const wsActivities = XLSX.utils.aoa_to_sheet(activitiesData);
    XLSX.utils.book_append_sheet(wb, wsActivities, 'Agent Activity');
  }

  // Save the Excel file
  const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * Export project to JSON format
 */
export const exportToJSON = (data: ExportData): void => {
  const exportData = {
    exportInfo: {
      exportDate: new Date().toISOString(),
      version: '1.0',
      format: 'AI Brainstorm Platform Export'
    },
    project: data.project,
    messages: data.messages || [],
    documents: data.documents || [],
    generatedDocuments: data.generatedDocuments || [],
    agentActivities: data.agentActivities || [],
    statistics: {
      totalItems: data.project.items.length,
      decidedItems: data.project.items.filter(i => i.state === 'decided').length,
      exploringItems: data.project.items.filter(i => i.state === 'exploring').length,
      parkedItems: data.project.items.filter(i => i.state === 'parked').length,
      totalMessages: (data.messages || []).length,
      uploadedDocuments: (data.documents || []).length,
      generatedDocuments: (data.generatedDocuments || []).length,
      agentActivities: (data.agentActivities || []).length,
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.project.title.replace(/[^a-z0-9]/gi, '_')}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export complete package (ZIP with all formats)
 */
export const exportCompletePackage = async (data: ExportData): Promise<void> => {
  const zip = new JSZip();
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const projectName = data.project.title.replace(/[^a-z0-9]/gi, '_');

  // Add JSON export
  const jsonData = {
    exportInfo: {
      exportDate: new Date().toISOString(),
      version: '1.0',
      format: 'AI Brainstorm Platform Export'
    },
    project: data.project,
    messages: data.messages || [],
    documents: data.documents || [],
    generatedDocuments: data.generatedDocuments || [],
    agentActivities: data.agentActivities || [],
  };
  zip.file(`${projectName}_data.json`, JSON.stringify(jsonData, null, 2));

  // Add Excel export
  const wb = XLSX.utils.book_new();

  // Overview sheet
  const overviewData = [
    ['Project Export Report'],
    ['Generated', format(new Date(), 'PPpp')],
    [],
    ['Title', data.project.title],
    ['Status', data.project.status],
    ['Description', data.project.description || 'No description'],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // Add items sheets
  const decidedItems = data.project.items.filter(i => i.state === 'decided');
  if (decidedItems.length > 0) {
    const decidedData = [
      ['#', 'Text', 'Created'],
      ...decidedItems.map((item, idx) => [idx + 1, item.text, format(new Date(item.created_at), 'PPp')])
    ];
    const wsDecided = XLSX.utils.aoa_to_sheet(decidedData);
    XLSX.utils.book_append_sheet(wb, wsDecided, 'Decided');
  }

  const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  zip.file(`${projectName}_spreadsheet.xlsx`, excelBuffer);

  // Add README
  const readme = `# ${data.project.title}

## Export Information
- Generated: ${format(new Date(), 'PPpp')}
- Export Version: 1.0

## Project Details
- Status: ${data.project.status}
- Created: ${format(new Date(data.project.created_at), 'PPp')}
- Last Updated: ${format(new Date(data.project.updated_at), 'PPp')}

## Contents
- ${projectName}_data.json: Complete project data in JSON format
- ${projectName}_spreadsheet.xlsx: Project items and statistics in Excel format
- README.md: This file

## Statistics
- Total Items: ${data.project.items.length}
- Decided: ${data.project.items.filter(i => i.state === 'decided').length}
- Exploring: ${data.project.items.filter(i => i.state === 'exploring').length}
- Parked: ${data.project.items.filter(i => i.state === 'parked').length}
- Messages: ${(data.messages || []).length}
- Documents: ${(data.documents || []).length}
`;
  zip.file('README.md', readme);

  // Generate and download the ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}_complete_export_${timestamp}.zip`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export project to Markdown format with YAML frontmatter
 */
export const exportToMarkdown = (data: ExportData): void => {
  const { project, messages = [], documents = [], agentActivities = [] } = data;

  const decidedItems = project.items.filter(i => i.state === 'decided');
  const exploringItems = project.items.filter(i => i.state === 'exploring');
  const parkedItems = project.items.filter(i => i.state === 'parked');

  // YAML Frontmatter
  const frontmatter = `---
title: "${project.title}"
status: ${project.status}
created: ${format(new Date(project.created_at), 'yyyy-MM-dd')}
updated: ${format(new Date(project.updated_at), 'yyyy-MM-dd')}
total_items: ${project.items.length}
decided: ${decidedItems.length}
exploring: ${exploringItems.length}
parked: ${parkedItems.length}
tags: [${project.status}, brainstorm, project-management]
version: "1.0"
---

`;

  // Markdown Content
  let markdown = `# ${project.title}\n\n`;

  if (project.description) {
    markdown += `${project.description}\n\n`;
  }

  markdown += `## Project Overview\n\n`;
  markdown += `- **Status**: ${project.status.toUpperCase()}\n`;
  markdown += `- **Created**: ${format(new Date(project.created_at), 'PPP')}\n`;
  markdown += `- **Last Updated**: ${format(new Date(project.updated_at), 'PPP')}\n`;
  markdown += `- **Total Items**: ${project.items.length}\n\n`;

  markdown += `---\n\n`;

  // Decided Items
  if (decidedItems.length > 0) {
    markdown += `## ✅ Decided (${decidedItems.length})\n\n`;
    decidedItems.forEach((item, idx) => {
      markdown += `### ${idx + 1}. ${item.text}\n\n`;
      if (item.citation) {
        markdown += `> **User said**: "${item.citation.userQuote}"\n`;
        markdown += `> \n`;
        markdown += `> *Recorded: ${format(new Date(item.citation.timestamp), 'PPP p')}*\n`;
        markdown += `> *Confidence: ${item.citation.confidence}%*\n\n`;
      }
    });
  }

  // Exploring Items
  if (exploringItems.length > 0) {
    markdown += `## 🔍 Exploring (${exploringItems.length})\n\n`;
    exploringItems.forEach((item, idx) => {
      markdown += `${idx + 1}. ${item.text}\n`;
      if (item.citation) {
        markdown += `   > "${item.citation.userQuote}" (Confidence: ${item.citation.confidence}%)\n`;
      }
    });
    markdown += `\n`;
  }

  // Parked Items
  if (parkedItems.length > 0) {
    markdown += `## 📦 Parked (${parkedItems.length})\n\n`;
    parkedItems.forEach((item, idx) => {
      markdown += `${idx + 1}. ${item.text}\n`;
    });
    markdown += `\n`;
  }

  // Documents
  if (documents && documents.length > 0) {
    markdown += `## 📄 Referenced Documents\n\n`;
    documents.forEach(doc => {
      markdown += `- **${doc.filename}**`;
      if (doc.description) {
        markdown += `: ${doc.description}`;
      }
      markdown += `\n`;
    });
    markdown += `\n`;
  }

  // Statistics
  markdown += `## 📊 Project Statistics\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Items | ${project.items.length} |\n`;
  markdown += `| Decided | ${decidedItems.length} |\n`;
  markdown += `| Exploring | ${exploringItems.length} |\n`;
  markdown += `| Parked | ${parkedItems.length} |\n`;
  markdown += `| Messages | ${messages.length} |\n`;
  markdown += `| Documents | ${documents.length} |\n`;
  markdown += `| Agent Activities | ${agentActivities.length} |\n\n`;

  // Footer
  markdown += `---\n\n`;
  markdown += `*Exported from AI Brainstorm Platform on ${format(new Date(), 'PPP p')}*\n`;

  // Download
  const blob = new Blob([frontmatter + markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export decisions as Architecture Decision Records (ADR)
 */
export const exportToADR = (data: ExportData): void => {
  const { project } = data;
  const decidedItems = project.items.filter(i => i.state === 'decided');

  let adr = `# Architecture Decision Records\n\n`;
  adr += `**Project**: ${project.title}\n\n`;
  adr += `**Generated**: ${format(new Date(), 'PPP')}\n\n`;

  if (decidedItems.length === 0) {
    adr += `*No decisions have been recorded yet.*\n`;
  } else {
    adr += `This document contains ${decidedItems.length} architecture decision record(s).\n\n`;
    adr += `---\n\n`;

    decidedItems.forEach((item, idx) => {
      const adrNumber = String(idx + 1).padStart(4, '0');

      adr += `## ADR-${adrNumber}: ${item.text}\n\n`;
      adr += `**Status**: ✅ Accepted\n\n`;
      adr += `**Date**: ${format(new Date(item.created_at), 'yyyy-MM-dd')}\n\n`;

      if (item.citation) {
        adr += `### Context\n\n`;
        adr += `${item.citation.userQuote}\n\n`;
        adr += `**Confidence Level**: ${item.citation.confidence}%\n\n`;
        adr += `**Decision Made**: ${format(new Date(item.citation.timestamp), 'PPP p')}\n\n`;
      }

      adr += `### Decision\n\n`;
      adr += `${item.text}\n\n`;

      adr += `### Consequences\n\n`;
      adr += `- **Positive**: [To be documented based on implementation]\n`;
      adr += `- **Negative**: [To be documented based on implementation]\n`;
      adr += `- **Risks**: [To be evaluated during implementation]\n\n`;

      if (item.tags && item.tags.length > 0) {
        adr += `### Tags\n\n`;
        adr += item.tags.map(tag => `- ${tag}`).join('\n');
        adr += `\n\n`;
      }

      adr += `### Notes\n\n`;
      adr += `This decision was automatically recorded during the brainstorming session. `;
      adr += `Update this ADR with implementation details, alternatives considered, and actual consequences.\n\n`;

      adr += `---\n\n`;
    });
  }

  // Add index at the end
  adr += `## Index\n\n`;
  decidedItems.forEach((item, idx) => {
    const adrNumber = String(idx + 1).padStart(4, '0');
    adr += `- [ADR-${adrNumber}](#adr-${adrNumber.toLowerCase()}-${item.text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}): ${item.text}\n`;
  });

  const blob = new Blob([adr], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_ADR_${format(new Date(), 'yyyyMMdd')}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export project to DOCX (Microsoft Word) format
 */
export const exportToDOCX = async (data: ExportData): Promise<void> => {
  const { project, messages = [], documents = [], generatedDocuments = [], agentActivities = [] } = data;

  const decidedItems = project.items.filter(i => i.state === 'decided');
  const exploringItems = project.items.filter(i => i.state === 'exploring');
  const parkedItems = project.items.filter(i => i.state === 'parked');

  // Create document sections
  const sections = [];

  // Title Page
  sections.push(
    new Paragraph({
      text: 'Project Export Report',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: `Generated: ${format(new Date(), 'PPPP')}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    new Paragraph({ text: '' }) // Page break spacing
  );

  // Project Information
  sections.push(
    new Paragraph({
      text: 'Project Information',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Title: ', bold: true }),
        new TextRun(project.title)
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Status: ', bold: true }),
        new TextRun(project.status.toUpperCase())
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Description: ', bold: true }),
        new TextRun(project.description || 'No description provided')
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Created: ', bold: true }),
        new TextRun(format(new Date(project.created_at), 'PPp'))
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Last Updated: ', bold: true }),
        new TextRun(format(new Date(project.updated_at), 'PPp'))
      ],
      spacing: { after: 200 }
    })
  );

  // Statistics Table
  sections.push(
    new Paragraph({
      text: 'Project Statistics',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 }
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Metric', bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: 'Count', bold: true })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Total Items')] }),
            new TableCell({ children: [new Paragraph(project.items.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Decided Items')] }),
            new TableCell({ children: [new Paragraph(decidedItems.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Exploring Items')] }),
            new TableCell({ children: [new Paragraph(exploringItems.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Parked Items')] }),
            new TableCell({ children: [new Paragraph(parkedItems.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Messages')] }),
            new TableCell({ children: [new Paragraph(messages.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Uploaded Documents')] }),
            new TableCell({ children: [new Paragraph(documents.length.toString())] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('AI-Generated Documents')] }),
            new TableCell({ children: [new Paragraph(generatedDocuments.length.toString())] })
          ]
        })
      ]
    })
  );

  // Decided Items Section
  if (decidedItems.length > 0) {
    sections.push(
      new Paragraph({
        text: `Decided Items (${decidedItems.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    decidedItems.forEach((item, idx) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            new TextRun(item.text)
          ],
          spacing: { after: 100 }
        })
      );

      if (item.citation) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'User Quote: ', italic: true, size: 20 }),
              new TextRun({ text: `"${item.citation.userQuote}"`, italic: true, size: 20 })
            ],
            spacing: { left: 360, after: 50 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${format(new Date(item.citation.timestamp), 'PPp')} • Confidence: ${Math.round(item.citation.confidence * 100)}%`,
                size: 18,
                color: '666666'
              })
            ],
            spacing: { left: 360, after: 150 }
          })
        );
      }
    });
  }

  // Exploring Items Section
  if (exploringItems.length > 0) {
    sections.push(
      new Paragraph({
        text: `Exploring Items (${exploringItems.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    exploringItems.forEach((item, idx) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            new TextRun(item.text)
          ],
          spacing: { after: 100 }
        })
      );
    });
  }

  // Parked Items Section
  if (parkedItems.length > 0) {
    sections.push(
      new Paragraph({
        text: `Parked Items (${parkedItems.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    parkedItems.forEach((item, idx) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true }),
            new TextRun(item.text)
          ],
          spacing: { after: 100 }
        })
      );
    });
  }

  // AI-Generated Documents Section
  if (generatedDocuments.length > 0) {
    sections.push(
      new Paragraph({
        text: `AI-Generated Documents (${generatedDocuments.length})`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    generatedDocuments.forEach((genDoc, idx) => {
      const docTypeName = genDoc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      sections.push(
        new Paragraph({
          text: `${idx + 1}. ${docTypeName}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Version: ', size: 20 }),
            new TextRun({ text: genDoc.version.toString(), size: 20 }),
            new TextRun({ text: ' | Generated: ', size: 20 }),
            new TextRun({ text: format(new Date(genDoc.created_at), 'PPp'), size: 20 })
          ],
          spacing: { after: 150 }
        }),
        new Paragraph({
          text: genDoc.content.substring(0, 1000) + (genDoc.content.length > 1000 ? '...' : ''),
          spacing: { after: 200, left: 360 }
        })
      );
    });
  }

  // Create the document
  const doc = new DocxDocument({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: sections
    }]
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_export_${format(new Date(), 'yyyyMMdd')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};