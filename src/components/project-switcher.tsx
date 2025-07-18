
'use client';

import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function ProjectSwitcher() {
  const {
    projects,
    activeProjectId,
    loadProject,
  } = useProjects();
  const { toast } = useToast();
  
  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    toast({
      title: 'Project Loaded',
      description: `Switched to project: ${projects.find(p => p.id === projectId)?.name}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={activeProjectId || ''} onValueChange={handleLoadProject}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a project..." />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
