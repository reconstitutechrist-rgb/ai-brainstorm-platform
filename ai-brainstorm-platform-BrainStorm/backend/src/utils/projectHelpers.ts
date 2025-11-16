/**
 * Project Helpers - Shared utility functions for project data access
 *
 * Centralizes common database operations to eliminate code duplication
 * across orchestrators.
 */

import { supabase } from '../services/supabase';

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  state: 'decided' | 'exploring' | 'parked' | 'rejected' | string;
  tags: string[];
  confidence?: number;
  created_at: Date;
}

/**
 * Get raw project items from database
 * Returns items in their stored format (minimal transformation)
 */
export async function getRawProjectItems(projectId: string): Promise<any[]> {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('items')
      .eq('id', projectId)
      .single();

    if (error) throw error;

    return project?.items || [];
  } catch (error) {
    console.error('[projectHelpers] Error fetching raw project items:', error);
    return [];
  }
}

/**
 * Get project items with full transformation to ProjectItem interface
 * Includes sorting by state priority
 */
export async function getProjectItems(projectId: string): Promise<ProjectItem[]> {
  try {
    const items = await getRawProjectItems(projectId);

    // Convert to ProjectItem format
    const projectItems: ProjectItem[] = items.map((item: any) => ({
      id: item.id,
      title: item.text || item.title || '',
      description: item.text || item.description || '',
      state: item.state || 'exploring',
      tags: item.tags || item.metadata?.tags || [],
      confidence: item.citation?.confidence || item.confidence || 85,
      created_at: new Date(item.created_at || Date.now()),
    }));

    // Sort by state priority
    return projectItems.sort((a, b) => {
      const statePriority: Record<string, number> = {
        decided: 1,
        exploring: 2,
        parked: 3,
        rejected: 4
      };
      return (statePriority[a.state] || 5) - (statePriority[b.state] || 5);
    });
  } catch (error) {
    console.error('[projectHelpers] Error fetching project items:', error);
    return [];
  }
}

/**
 * Get project items filtered by specific states
 */
export async function getProjectItemsByState(
  projectId: string,
  states: string[]
): Promise<ProjectItem[]> {
  const items = await getProjectItems(projectId);
  return items.filter(item => states.includes(item.state));
}

/**
 * Get counts of project items by state
 */
export async function getProjectItemCounts(projectId: string): Promise<{
  total: number;
  decided: number;
  exploring: number;
  parked: number;
  rejected: number;
}> {
  const items = await getProjectItems(projectId);

  return {
    total: items.length,
    decided: items.filter(i => i.state === 'decided').length,
    exploring: items.filter(i => i.state === 'exploring').length,
    parked: items.filter(i => i.state === 'parked').length,
    rejected: items.filter(i => i.state === 'rejected').length,
  };
}
