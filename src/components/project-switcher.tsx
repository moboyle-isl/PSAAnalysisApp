
'use client';

import { useState } from 'react';
import type { Project } from '@/hooks/use-projects';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, PlusCircle, Trash } from 'lucide-react';


type ProjectSwitcherProps = ReturnType<typeof useProjects>;

export function ProjectSwitcher(props: ProjectSwitcherProps) {
  const {
    projects,
    activeProjectId,
    activeProject,
    loadProject,
    updateCurrentProject,
    saveProject,
    deleteProject,
    isReady,
  } = props;
  const { toast } = useToast();
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    toast({
      title: 'Project Loaded',
      description: `Switched to project: ${projects.find(p => p.id === projectId)?.name}`,
    });
  };

  const handleUpdateCurrentProject = () => {
    if (activeProject && activeProject.id !== 'default') {
      updateCurrentProject();
      toast({
        title: 'Project Saved',
        description: `Your changes to "${activeProject?.name}" have been saved.`,
      });
      setIsSaveDialogOpen(false);
    }
  }

  const handleSaveAsNewProject = () => {
    if (!newProjectName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Name',
        description: 'Project name cannot be empty.',
      });
      return;
    }
    saveProject(newProjectName);
    toast({
      title: 'Project Saved',
      description: `Your work has been saved as "${newProjectName}".`,
    });
    setNewProjectName('');
    setIsSaveAsDialogOpen(false);
    setIsSaveDialogOpen(false);
  };
  
  const handleDeleteProject = () => {
    if (activeProject) {
      deleteProject(activeProject.id);
      toast({
        title: 'Project Deleted',
        description: `The project has been deleted.`,
      });
    }
    setIsDeleteDialogOpen(false);
    setIsSaveDialogOpen(false);
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
       <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button disabled={!isReady}>
            <Save className="mr-2 h-4 w-4" />
            Save Project
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
            <DialogDescription>
              Save your current progress or create a new project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button 
                onClick={handleUpdateCurrentProject} 
                disabled={!activeProject || activeProject.id === 'default'} 
                className="w-full justify-between"
            >
                Save Current Project ({activeProject?.name})
                <Save className="h-4 w-4" />
            </Button>

            <Dialog open={isSaveAsDialogOpen} onOpenChange={setIsSaveAsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    Save as New Project
                    <PlusCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save as New Project</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="project-name">New Project Name</Label>
                    <Input
                        id="project-name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Q3 Inspection Plan"
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSaveAsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveAsNewProject}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <DialogFooter className='justify-between'>
            {activeProject && activeProject.id !== 'default' && (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className='mr-auto'>
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Project
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the project
                        <span className="font-bold"> {activeProject?.name}</span>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteProject}>
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            )}
            <div className="flex gap-2 ml-auto">
                <DialogClose asChild>
                    <Button type="button" variant="outline">
                        Close
                    </Button>
                </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
