"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhaseHeader } from "@/components/phase-header"
import { ProgressBar } from "@/components/progress-bar"
import { ArrowRight, FileUp, Download, Database, Check, FileText, Eye, Plus } from "lucide-react"

export default function Phase2Page() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPapers, setSelectedPapers] = useState([])
  const [uploadedPapers, setUploadedPapers] = useState([])
  const [processingComplete, setProcessingComplete] = useState(false)

  const steps = ["Paper Selection", "Paper Upload", "Data Processing"]

  // Mock data for papers
  const papers = [
    {
      id: 1,
      title: "Automating Systematic Literature Reviews with Machine Learning: A Comprehensive Survey",
      authors: "Smith, J., Johnson, A.",
      year: 2022,
      source: "IEEE",
      citations: 45,
    },
    {
      id: 2,
      title: "Natural Language Processing for Systematic Review Automation",
      authors: "Chen, L., Williams, R.",
      year: 2021,
      source: "Elsevier",
      citations: 32,
    },
    {
      id: 3,
      title: "AI-Driven Approaches to Literature Review: Challenges and Opportunities",
      authors: "Garcia, M., Lee, S.",
      year: 2023,
      source: "ACM",
      citations: 18,
    },
    {
      id: 4,
      title: "Evaluating the Effectiveness of Automated SLR Tools in Medical Research",
      authors: "Patel, K., Brown, T.",
      year: 2022,
      source: "Springer",
      citations: 27,
    },
    {
      id: 5,
      title: "A Comparative Analysis of AI Methods for Systematic Reviews in Computer Science",
      authors: "Taylor, R., Anderson, P.",
      year: 2021,
      source: "IEEE",
      citations: 39,
    },
  ]

  const togglePaperSelection = (id) => {
    if (selectedPapers.includes(id)) {
      setSelectedPapers(selectedPapers.filter((paperId) => paperId !== id))
    } else {
      setSelectedPapers([...selectedPapers, id])
    }
  }

  const handleUploadPaper = () => {
    // Simulate paper upload
    const newUploadedPapers = selectedPapers
      .map((id) => {
        const paper = papers.find((p) => p.id === id)
        return paper ? paper.title : ""
      })
      .filter((title) => title)

    setUploadedPapers(newUploadedPapers)
    setCurrentStep(1)
  }

  const handleProcessPapers = () => {
    // Simulate processing
    setTimeout(() => {
      setProcessingComplete(true)
      setCurrentStep(2)
    }, 2000)
  }

  const handleGoToPhase3 = () => {
    router.push("/phase3")
  }

  return (
    <div className="container px-4 py-8 max-w-5xl mx-auto">
      <PhaseHeader
        phase={2}
        title="Paper Management"
        description="Select papers, upload full texts, and process them for analysis."
        backLink="/phase1"
      />

      <ProgressBar steps={steps} currentStep={currentStep} />

      <Tabs defaultValue="selection" value={`step${currentStep}`}>
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="step0" disabled={currentStep !== 0}>
            Paper Selection
          </TabsTrigger>
          <TabsTrigger value="step1" disabled={currentStep < 1}>
            Paper Upload
          </TabsTrigger>
          <TabsTrigger value="step2" disabled={currentStep < 2}>
            Data Processing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="step0">
          <Card>
            <CardHeader>
              <CardTitle>Select Relevant Papers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Authors</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Citations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {papers.map((paper, index) => (
                      <TableRow key={`${paper.doi || 'unknown'}-${index}`}>
                        <TableCell>
                          <Button
                            variant={selectedPapers.includes(paper.id) ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => togglePaperSelection(paper.id)}
                          >
                            {selectedPapers.includes(paper.id) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{paper.title}</TableCell>
                        <TableCell>{paper.authors}</TableCell>
                        <TableCell>{paper.year}</TableCell>
                        <TableCell>{paper.source}</TableCell>
                        <TableCell>{paper.citations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                Selected {selectedPapers.length} of {papers.length} papers
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleUploadPaper} disabled={selectedPapers.length === 0} className="gap-2">
                <FileUp className="h-4 w-4" />
                Upload Selected Papers
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="step1">
          <Card>
            <CardHeader>
              <CardTitle>Upload Full Text Papers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paper Title</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedPapers.map((title, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{title}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Uploaded
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-dashed border-gray-300 text-center">
                  <FileText className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag and drop additional PDF files here, or click to browse
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Browse Files
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button onClick={handleProcessPapers} disabled={uploadedPapers.length === 0} className="gap-2">
                <Database className="h-4 w-4" />
                Process Papers
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="step2">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${processingComplete ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        {processingComplete ? <Check className="h-4 w-4" /> : "1"}
                      </div>
                      <div>
                        <h3 className="font-medium">Text Extraction</h3>
                        <p className="text-sm text-gray-500">Extracting text from PDF documents</p>
                      </div>
                    </div>
                    <div>
                      {processingComplete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Processing...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${processingComplete ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        {processingComplete ? <Check className="h-4 w-4" /> : "2"}
                      </div>
                      <div>
                        <h3 className="font-medium">CSV Generation</h3>
                        <p className="text-sm text-gray-500">Creating structured data from papers</p>
                      </div>
                    </div>
                    <div>
                      {processingComplete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${processingComplete ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        {processingComplete ? <Check className="h-4 w-4" /> : "3"}
                      </div>
                      <div>
                        <h3 className="font-medium">Text Embedding</h3>
                        <p className="text-sm text-gray-500">Creating vector embeddings for RAG system</p>
                      </div>
                    </div>
                    <div>
                      {processingComplete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {processingComplete && (
                  <div className="flex justify-center gap-4 mt-6">
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={handleGoToPhase3} disabled={!processingComplete} className="gap-2">
                Continue to Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
