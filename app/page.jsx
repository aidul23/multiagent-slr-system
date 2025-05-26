import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="flex h-16 items-center justify-between w-full px-4 sm:px-6">
          <h1 className="text-2xl font-bold">SLR Automation</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center w-full">
        <section className="container px-4 py-12 sm:px-6 lg:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Systematic Literature Review Automation</h2>
            <p className="mt-6 text-lg text-gray-600">
              Streamline your research process with AI-powered SLR automation. Generate research objectives, questions,
              and search strings, manage papers, and create comprehensive reports.
            </p>
            <div className="mt-10">
              <Link href="/register">
                <Button size="lg" className="px-8">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Research Setup</h3>
              <p className="text-gray-600">
                Generate research objectives, questions, and search strings. Set inclusion/exclusion criteria and select
                data sources.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Paper Management</h3>
              <p className="text-gray-600">
                Select and upload papers, generate CSV data, and create text embeddings for analysis.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Analysis & Reporting</h3>
              <p className="text-gray-600">
                Generate comprehensive reports and query your research data using a RAG-based system.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 w-full flex justify-center">
        <p className="text-center text-sm text-gray-600">
          © {new Date().getFullYear()} SLR Automation. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
