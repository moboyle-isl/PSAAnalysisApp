
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from './use-local-storage';
import type { Asset, RepairPrice } from '@/lib/data';
import { initialAssets, initialRepairPrices } from '@/lib/data';
import type { Rule } from '@/app/rules/rules-client';

type CostBreakdownItem = {
  repairType: string;
  unitPrice: number;
};

type AssetWithRecommendation = Asset & { 
  abandoned: 'Yes' | 'No';
  recommendation?: string[];
  userRecommendation?: string[];
  aiEstimatedCost?: number;
  userVerifiedCost?: number;
  needsPrice?: boolean;
  estimatedRemainingLife?: string;
  costBreakdown?: CostBreakdownItem[];
};

// Define the structure of a project snapshot
type ProjectSnapshot = {
  assets: AssetWithRecommendation[];
  repairPrices: RepairPrice[];
  aiRules: Rule[];
};

// Define the structure of a project
export type Project = {
  id: string;
  name: string;
  snapshot: ProjectSnapshot;
};

const DEFAULT_PROJECT_ID = 'default';

const defaultAssets = initialAssets.map(d => ({ ...d, recommendation: undefined, userRecommendation: undefined, aiEstimatedCost: undefined, userVerifiedCost: undefined, needsPrice: false, estimatedRemainingLife: undefined, costBreakdown: [] }));

const DEFAULT_PROJECT: Project = {
    id: DEFAULT_PROJECT_ID,
    name: 'Default Project',
    snapshot: {
        assets: defaultAssets,
        repairPrices: initialRepairPrices,
        aiRules: []
    }
}


export function useProjects() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', [DEFAULT_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string>('activeProjectId', DEFAULT_PROJECT_ID);
  
  const [activeProjectState, setActiveProjectState] = useState<ProjectSnapshot | null>(null);
  
  const [isReady, setIsReady] = useState(false);

  // Effect to initialize the active project state from localStorage
  useEffect(() => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (activeProject) {
      // Deep copy to avoid direct mutation of localStorage state
      setActiveProjectState(JSON.parse(JSON.stringify(activeProject.snapshot)));
    } else {
      // If active project not found (e.g., deleted), load default
      setActiveProjectState(JSON.parse(JSON.stringify(DEFAULT_PROJECT.snapshot)));
      setActiveProjectId(DEFAULT_PROJECT_ID);
    }
    setIsReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  const activeProjectStateString = useMemo(() => {
    return activeProjectState ? JSON.stringify(activeProjectState) : null;
  }, [activeProjectState]);

  // This effect now safely auto-saves when the content of the project changes.
  useEffect(() => {
    if (isReady && activeProjectStateString) {
       setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === activeProjectId
            ? { ...p, snapshot: JSON.parse(activeProjectStateString) }
            : p
        )
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activeProjectStateString, isReady]);

  const updateCurrentProject = useCallback(() => {
    if (!activeProjectState || !activeProjectId) return;

    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.id === activeProjectId ? { ...p, snapshot: JSON.parse(JSON.stringify(activeProjectState)) } : p
      )
    );
  }, [activeProjectId, activeProjectState, setProjects]);


  const loadProject = useCallback((projectId: string) => {
    if (projectId === activeProjectId) return;
    setActiveProjectId(projectId);
  }, [activeProjectId, setActiveProjectId]);
  

  const saveProject = useCallback((name: string) => {
    if (!activeProjectState) return;

    const newProjectId = `PROJ-${Date.now()}`;
    const newProject: Project = { id: newProjectId, name, snapshot: activeProjectState };
    
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProjectId);
  }, [activeProjectState, setProjects, setActiveProjectId]);

  
  const deleteProject = useCallback((projectId: string) => {
    if (projectId === DEFAULT_PROJECT_ID) {
      console.error("Cannot delete the default project.");
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // After deleting, switch to the default project
    setActiveProjectId(DEFAULT_PROJECT_ID);
  }, [setProjects, setActiveProjectId]);
  
  
  // Ensure default project exists on first load
  useEffect(() => {
    if (projects && projects.length > 0) {
      const defaultProjectExists = projects.some(p => p.id === DEFAULT_PROJECT_ID);
      if (!defaultProjectExists) {
        setProjects(prev => [DEFAULT_PROJECT, ...prev]);
      }
    } else {
       setProjects([DEFAULT_PROJECT]);
    }
  }, [projects, setProjects]);


  // Create stable setters for individual data types
  const setAssets = useCallback((value: React.SetStateAction<AssetWithRecommendation[]>) => {
    setActiveProjectState(prev => {
      if (!prev) return null;
      const newAssets = value instanceof Function ? value(prev.assets) : value;
      return { ...prev, assets: newAssets };
    });
  }, []);

  const setRepairPrices = useCallback((value: React.SetStateAction<RepairPrice[]>) => {
    setActiveProjectState(prev => {
      if (!prev) return null;
      const newRepairPrices = value instanceof Function ? value(prev.repairPrices) : value;
      return { ...prev, repairPrices: newRepairPrices };
    });
  }, []);

  const setRules = useCallback((value: React.SetStateAction<Rule[]>) => {
    setActiveProjectState(prev => {
      if (!prev) return null;
      const newRules = value instanceof Function ? value(prev.aiRules) : value;
      return { ...prev, aiRules: newRules };
    });
  }, []);
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  return {
    isReady,
    projects,
    activeProjectId,
    activeProject: activeProject,
    assets: activeProjectState?.assets ?? [],
    setAssets,
    repairPrices: activeProjectState?.repairPrices ?? [],
    setRepairPrices,
    rules: activeProjectState?.aiRules ?? [],
    setRules,
    loadProject,
    saveProject,
    updateCurrentProject,
    deleteProject,
  };
}
