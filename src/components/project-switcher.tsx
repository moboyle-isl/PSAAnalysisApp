
'use client';

import { useState } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Trash, PlusCircle, ChevronsRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

export function ProjectSwitcher() {
  const {
    projects,
    activeProjectId,
    loadProject,
    saveProject,
    deleteProject,
    updateCurrentProject,
  } = useProjects();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { toast } = useToast();
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    toast({
      title: 'Project Loaded',
      description: `Switched to project: ${projects.find(p => p.id === projectId)?.name}`,
    });
  };

  const handleUpdateCurrentProject = () => {
    if (activeProjectId) {
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
    if (activeProjectId) {
      deleteProject(activeProjectId);
      toast({
        title: 'Project Deleted',
        description: `The project has been deleted.`,
      });
    }
    setIsDeleteDialogOpen(false);
    setIsSaveDialogOpen(false);
  };

  return (
    <>
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
        <Button onClick={() => setIsSaveDialogOpen(true)}>
          <Save className="mr-2 h-4 w-4" />
          Save Project
        </Button>
      </div>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
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
                disabled={activeProjectId === 'default'} 
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
            {activeProjectId !== 'default' && (
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
    </>
  );
}
