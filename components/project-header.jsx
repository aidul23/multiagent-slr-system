import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { ChevronLeft } from "lucide-react"

/**
 * @param {Object} props
 * @param {Object} props.project - The project object
 */
export function ProjectHeader({ project }) {
  // Get user from localStorage
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null

  if (!project) return null

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{project.title}</h1>
            <p className="text-xs text-gray-500">{project.description}</p>
          </div>
        </div>
        {user && <UserNav user={user} />}
      </div>
    </header>
  )
}
