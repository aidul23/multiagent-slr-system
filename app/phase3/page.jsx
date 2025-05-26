"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PhaseHeader } from "@/components/phase-header"
import { ProgressBar } from "@/components/progress-bar"
import { FileText, Send, Download, Sparkles, Check, ArrowRight } from "lucide-react"

export default function Phase3Page() {
  const [currentStep, setCurrentStep] = useState(0)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState([
    { role: "system", content: "Welcome to the SLR Assistant. You can ask questions about your research papers." },
  ])

  const steps = ["Report Generation", "Interactive Query"]

  const handleGenerateReport = () => {
    // Simulate report generation
    setTimeout(() => {
      setReportGenerated(true)
    }, 2000)
  }

  const handleSendQuery = () => {
    if (!query.trim()) return

    // Add user message to chat
    setChatHistory([...chatHistory, { role: "user", content: query }])

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on the analyzed papers, AI techniques for SLR automation primarily include natural language processing, machine learning classifiers, and deep learning models. The most common approach is using NLP for initial screening of papers.",
        "The research indicates that AI-based SLR tools can reduce the time required for literature reviews by 30-70% compared to traditional manual methods, depending on the domain and specific tasks.",
        "According to the papers, the main challenges in AI-based SLR automation include handling domain-specific terminology, ensuring high recall rates, and maintaining transparency in the selection process.",
      ]

      // Select a response based on query content
      let responseIndex = 0
      if (query.toLowerCase().includes("effective") || query.toLowerCase().includes("comparison")) {
        responseIndex = 1
      } else if (query.toLowerCase().includes("challenge") || query.toLowerCase().includes("limitation")) {
        responseIndex = 2
      }

      setChatHistory([
        ...chatHistory,
        { role: "user", content: query },
        { role: "system", content: responses[responseIndex] },
      ])
      setQuery("")
    }, 1500)
  }

  return (
    <div className="container px-4 py-8 max-w-5xl mx-auto">
      <PhaseHeader
        phase={3}
        title="Analysis & Reporting"
        description="Generate comprehensive reports and query your research data."
        backLink="/phase2"
      />

      <ProgressBar steps={steps} currentStep={currentStep} />

      <Tabs defaultValue="report" value={`step${currentStep}`}>
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="step0" disabled={currentStep !== 0}>
            Report Generation
          </TabsTrigger>
          <TabsTrigger value="step1" disabled={currentStep < 1}>
            Interactive Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="step0">
          <Card>
            <CardHeader>
              <CardTitle>Generate SLR Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-md border">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-md">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Systematic Literature Review Report</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Generate a comprehensive report based on your research objective, questions, and analyzed
                        papers.
                      </p>

                      {reportGenerated ? (
                        <div className="mt-4 p-4 bg-white rounded-md border">
                          <h4 className="font-medium mb-2">Report Sections</h4>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Executive Summary</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Introduction & Research Objectives</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Methodology</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Results & Analysis</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Discussion</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>Conclusion & Future Work</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>References</span>
                            </li>
                          </ul>

                          <div className="mt-4 flex justify-center">
                            <Button className="gap-2">
                              <Download className="h-4 w-4" />
                              Download Report
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <Button onClick={handleGenerateReport} className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Generate Report
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {reportGenerated && (
                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(1)} className="gap-2">
                      Continue to Interactive Query
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step1">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Query System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md border">
                  <p className="text-sm">
                    Ask questions about your research papers. The system uses RAG (Retrieval-Augmented Generation) to
                    provide accurate answers based on your uploaded papers.
                  </p>
                </div>

                <div className="border rounded-md h-96 overflow-y-auto p-4 bg-white">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : ""}`}>
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question about your research..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendQuery()
                      }
                    }}
                  />
                  <Button onClick={handleSendQuery} disabled={!query.trim()} className="gap-2">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Suggested Questions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("What are the main AI techniques used in SLR automation?")}
                    >
                      AI techniques in SLR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("How effective are AI-based SLR tools compared to manual methods?")}
                    >
                      Effectiveness comparison
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery("What are the main challenges in AI-based SLR automation?")}
                    >
                      Challenges and limitations
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
