"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UserNav } from "@/components/user-nav"
import { Plus, FileText, Calendar, ArrowRight, Trash2 } from "lucide-react"
import axios from 'axios';
import { BASE_URL } from "../../lib/url";

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ title: "", description: "" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)


  useEffect(() => {
    const fetchProjects = async (userId) => {
      try {
        const response = await axios.get(`${BASE_URL}/get_projects`, {
          params: { user_id: userId },
        });

        if (response.status === 200) {
          setProjects(response.data.projects); // Set projects from API
        } else {
          console.error('Failed to fetch projects:', response.data.error);
        }
      } catch (error) {
        console.error('Error fetching projects:', error.response?.data || error.message);
      }
    };

    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser && parsedUser.id) {
      fetchProjects(parsedUser.id); // Call API with user id
    }
  }, [router]);


  const handleCreateProject = async () => {
    if (!newProject.title.trim()) return;

    try {
      // Get user from localStorage
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/login");
        return;
      }

      const parsedUser = JSON.parse(userData);

      console.log(parsedUser);
      

      // Prepare payload
      const payload = {
        user_id: parsedUser.id,
        project_name: newProject.title,
        description: newProject.description,
        review_type: "SLR", // You can change or make this dynamic later
      };

      // Call backend API
      const response = await axios.post(`${BASE_URL}/create_project`, payload);

      if (response.status === 201) {
        // Add the newly created project to the state
        const newProjectFromBackend = response.data;
        setProjects((prevProjects) => [...prevProjects, newProjectFromBackend]);
        setNewProject({ title: "", description: "" });
        setIsDialogOpen(false);
      } else {
        console.error("Failed to create project:", response.data.error);
      }
    } catch (error) {
      console.error("Error creating project:", error.response?.data || error.message);
    }
  };

  const handleDeleteProject = async (projectIdToDelete) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    try {
      const response = await axios.delete(`${BASE_URL}/delete_project/${projectIdToDelete}`);
      if (response.status === 200) {
        // Remove from local state
        setProjects((prev) => prev.filter((p) => p.project_id !== projectIdToDelete));
      } else {
        alert(response.data.error || "Failed to delete project.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Something went wrong during deletion.");
    }
  };


  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  if (!user) {
    return null // Loading state
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="flex h-16 items-center justify-between w-full px-4 sm:px-6">
          <h1 className="text-2xl font-bold">SLR Automation</h1>
          <UserNav user={user} />
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-gray-500">Manage your systematic literature review projects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>Add a new systematic literature review project</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter project title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter project description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newProject.title.trim()}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
            <p className="mt-2 text-gray-500">Create your first SLR project to get started</p>
            <Button className="mt-4 gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {projects.map((project) => (
              <Card key={project.project_id} className="flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle>{project.project_name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    Created on {formatDate(project.created_at?.$date)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <p className="text-sm text-gray-500 line-clamp-3">{project.description}</p>
                </CardContent>

                <CardFooter className="pt-3 flex justify-between items-center">
                  <Link href={`/projects/${project.project_id}/phase1`} className="w-full mr-2">
                    <Button className="w-full gap-2">
                      Open Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProject(project.project_id)}
                    className="text-red-500 hover:bg-red-100 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>

              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-6 w-full flex justify-center">
        <p className="text-center text-sm text-gray-600">
          © {new Date().getFullYear()} SLR Automation. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
