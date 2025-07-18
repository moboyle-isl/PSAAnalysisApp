
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { initialAssets, initialRepairPrices } from '@/lib/data';

// Define the structure of a project snapshot
type ProjectSnapshot = {
  assets: any[]; // Replace 'any' with your Asset type
  repairPrices: any[]; // Replace 'any' with your RepairPrice type
  aiRules: any[]; // Replace 'any' with your Rule type
};

// Define the structure of a project
type Project = {
  id: string;
  name: string;
  snapshot: ProjectSnapshot;
};

const DEFAULT_PROJECT_ID = 'default';

const a = initialAssets.map(d => ({ ...d, recommendation: undefined, estimatedCost: undefined, needsPrice: false }));

const DEFAULT_PROJECT: Project = {
    id: DEFAULT_PROJECT_ID,
    name: 'Default Project',
    snapshot: {
        assets: a,
        repairPrices: initialRepairPrices,
        aiRules: []
    }
}


export function useProjects() {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', [DEFAULT_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string>('activeProjectId', DEFAULT_PROJECT_ID);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const saveProject = useCallback((name: string) => {
    if (typeof window === 'undefined') return;

    const assets = JSON.parse(window.localStorage.getItem('assets') || '[]');
    const repairPrices = JSON.parse(window.localStorage.getItem('repairPrices') || '[]');
    const aiRules = JSON.parse(window.localStorage.getItem('aiRules') || '[]');

    const newSnapshot: ProjectSnapshot = { assets, repairPrices, aiRules };
    
    const newProjectId = `PROJ-${Date.now()}`;
    const newProject: Project = { id: newProjectId, name, snapshot: newSnapshot };
    setProjects([...projects, newProject]);
    
    setActiveProjectId(newProjectId);

  }, [projects, setProjects, setActiveProjectId]);

  const updateCurrentProject = useCallback(() => {
    if (typeof window === 'undefined' || !activeProjectId || activeProjectId === DEFAULT_PROJECT_ID) return;

    const assets = JSON.parse(window.localStorage.getItem('assets') || '[]');
    const repairPrices = JSON.parse(window.localStorage.getItem('repairPrices') || '[]');
    const aiRules = JSON.parse(window.localStorage.getItem('aiRules') || '[]');

    const updatedSnapshot: ProjectSnapshot = { assets, repairPrices, aiRules };

    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.id === activeProjectId ? { ...p, snapshot: updatedSnapshot } : p
      )
    );
  }, [activeProjectId, setProjects]);


  const loadProject = useCallback((projectId: string) => {
    if (typeof window === 'undefined') return;

    const projectToLoad = projects.find((p) => p.id === projectId);
    if (!projectToLoad) {
      console.error(`Project with id ${projectId} not found.`);
      return;
    }

    const { snapshot } = projectToLoad;
    
    // Update localStorage for each data type
    window.localStorage.setItem('assets', JSON.stringify(snapshot.assets));
    window.localStorage.setItem('repairPrices', JSON.stringify(snapshot.repairPrices));
    window.localStorage.setItem('aiRules', JSON.stringify(snapshot.aiRules));

    setActiveProjectId(projectId);

    // Dispatch a custom event to notify components of the change
    // This forces a reload to ensure all components get the new state
    window.dispatchEvent(new CustomEvent('project-loaded'));

  }, [projects, setActiveProjectId]);


  const deleteProject = useCallback((projectId: string) => {
    if (projectId === DEFAULT_PROJECT_ID) {
      console.error("Cannot delete the default project.");
      return;
    }
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    // Load the default project after deletion
    loadProject(DEFAULT_PROJECT_ID);
  }, [projects, setProjects, loadProject]);
  
  // Ensure default project exists on first load
  useEffect(() => {
    if (isClient && !projects.find(p => p.id === DEFAULT_PROJECT_ID)) {
        setProjects([DEFAULT_PROJECT, ...projects]);
    }
  }, [isClient, projects, setProjects]);

  return {
    projects,
    activeProjectId,
    loadProject,
    saveProject,
    updateCurrentProject,
    deleteProject,
  };
}
