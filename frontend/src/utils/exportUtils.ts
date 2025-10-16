import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { format } from 'date-fns';
import type { Project, Message, Document, AgentActivity } from '../types';

interface ExportData {
  project: Project;
  messages?: Message[];
  documents?: Document[];
  agentActivities?: AgentActivity[];
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

  // Documents Section
  if (documents.length > 0) {
    checkPageBreak(20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(`Documents (${documents.length})`, margin, yPosition);
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
    { label: 'Total Documents', value: documents.length },
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
  const { project, messages = [], agentActivities = [] } = data;

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

  // Sheet 6: Agent Activity Log
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
    agentActivities: data.agentActivities || [],
    statistics: {
      totalItems: data.project.items.length,
      decidedItems: data.project.items.filter(i => i.state === 'decided').length,
      exploringItems: data.project.items.filter(i => i.state === 'exploring').length,
      parkedItems: data.project.items.filter(i => i.state === 'parked').length,
      totalMessages: (data.messages || []).length,
      totalDocuments: (data.documents || []).length,
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