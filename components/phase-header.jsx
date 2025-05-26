import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

/**
 * @param {Object} props
 * @param {number} props.phase
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.backLink]
 */
export function PhaseHeader({ phase, title, description, backLink }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        {backLink && (
          <Link href={backLink}>
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        )}
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-bold text-sm">{phase}</span>
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
