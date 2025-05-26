"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PhaseHeader } from "@/components/phase-header"
import { ProgressBar } from "@/components/progress-bar"
import { ProjectHeader } from "@/components/project-header"
import { ModelSelector } from "@/components/model-selector"
import { ChartContainer } from "@/components/chart-container"
import { ReportGenerator } from "@/components/report-generator"
import { FileText, Send, Sparkles, Check, ArrowRight, BarChart } from "lucide-react"
import { ChatVisualization } from "@/components/chat-visualization"

export default function ProjectPhase3Page() {
  const router = useRouter()
  const params = useParams()
  const { projectId } = params

  const [project, setProject] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState([
    { role: "system", content: "Welcome to the SLR Assistant. You can ask questions about your research papers." },
  ])
  const [reportModel, setReportModel] = useState("gpt-4o")
  const [queryModel, setQueryModel] = useState("gpt-4o")
  const [extractedData, setExtractedData] = useState([])
  const [extractionFields, setExtractionFields] = useState([])
  const [researchQuestions, setResearchQuestions] = useState([])
  const [rqAnswers, setRqAnswers] = useState([])

  const steps = ["Report Generation", "Research Questions", "Interactive Query"]

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    // Load project data
    const savedProjects = localStorage.getItem("projects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects)
      const currentProject = projects.find((p) => p.id === projectId)
      if (currentProject) {
        setProject(currentProject)
      } else {
        console.warn("Project not found in savedProjects; skipping redirect")
        setProject({ id: projectId }) // allow phase2 to work anyway
      }
    } else {
      console.warn("No saved projects; assuming manual navigation")
      setProject({ id: projectId }) // again fallback
    }

    // Load phase 1 data to get research questions
    const phase1Data = localStorage.getItem(`project_${projectId}_phase1`)
    if (phase1Data) {
      const data = JSON.parse(phase1Data)
      if (data.confirmedQuestions) {
        setResearchQuestions(data.confirmedQuestions.map(q => q.question))
      }
    }

    // Load phase 2 data to get extracted data
    const phase2Data = localStorage.getItem(`project_${projectId}_phase2`)
    if (phase2Data) {
      const data = JSON.parse(phase2Data)
      if (data.extractedData) {
        setExtractedData(data.extractedData)
      }
      if (data.extractionFields) {
        setExtractionFields(data.extractionFields)
      }
    }

    // Load project phase data if exists
    const phaseData = localStorage.getItem(`project_${projectId}_phase3`)
    if (phaseData) {
      const data = JSON.parse(phaseData)
      setCurrentStep(data.currentStep || 0)
      setReportGenerated(data.reportGenerated || false)
      setChatHistory(
        data.chatHistory || [
          {
            role: "system",
            content: "Welcome to the SLR Assistant. You can ask questions about your research papers.",
          },
        ],
      )
      setReportModel(data.reportModel || "gpt-4o")
      setQueryModel(data.queryModel || "gpt-4o")
      if (data.rqAnswers) {
        setRqAnswers(data.rqAnswers)
      }
    }
  }, [projectId, router])

  // Save phase data when it changes
  useEffect(() => {
    if (projectId) {
      const phaseData = {
        currentStep,
        reportGenerated,
        chatHistory,
        reportModel,
        queryModel,
        rqAnswers,
      }
      localStorage.setItem(`project_${projectId}_phase3`, JSON.stringify(phaseData))

      const fetchProject = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/get_project/${projectId}`);
          const data = await response.json();

          if (response.ok && data.project) {
            const projectData = data.project;

            // ✅ Load confirmed research questions
            if (Array.isArray(projectData.questions)) {
              setResearchQuestions(projectData.questions.map(q => q.question));  // plain string list
              // OR if you want full objects:
              // setResearchQuestions(projectData.questions)
            }

            // Optionally load objective
            if (projectData.objective) {
              console.log("Loaded objective:", projectData.objective);
            }
          }
        } catch (err) {
          console.error("Error fetching project:", err);
        }
      };

      fetchProject();
    }
  }, [projectId, currentStep, reportGenerated, chatHistory, reportModel, queryModel, rqAnswers])

  const handleGenerateReport = () => {
    // Simulate report generation
    setTimeout(() => {
      setReportGenerated(true)
      setCurrentStep(1)
    }, 2000)
  }

  const handleGenerateRQAnswers = () => {
    // Simulate generating answers to research questions
    setTimeout(() => {
      const answers = researchQuestions.map((question, index) => ({
        id: `rq-${index + 1}`,
        question,
        answer: [
          "Based on the analyzed papers, AI techniques for SLR automation primarily include natural language processing (NLP), machine learning classifiers, and deep learning models. The most common approach is using NLP for initial screening of papers, with 65% of studies employing this technique. Support Vector Machines and Random Forests are used in 42% of papers for classification tasks.",
          "The research indicates that AI-based SLR tools can reduce the time required for literature reviews by 30-70% compared to traditional manual methods, depending on the domain and specific tasks. Accuracy rates range from 75-92%, with higher accuracy in technical domains with standardized terminology.",
          "According to the papers, the main challenges in AI-based SLR automation include handling domain-specific terminology (cited in 78% of papers), ensuring high recall rates (65%), maintaining transparency in the selection process (52%), and dealing with interdisciplinary research contexts (47%). Limited training data remains a significant barrier.",
          "AI-based SLR tools show varying performance across research domains, with medical and computer science domains achieving the highest accuracy (85-92%), while social sciences and humanities show lower performance (70-75%). This variance is attributed to differences in terminology standardization and the qualitative nature of some domains.",
        ][index],
      }))

      setRqAnswers(answers)
      setCurrentStep(2)
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

  // Generate sample data for charts if no extracted data is available
  const getSampleData = () => {
    if (extractedData.length > 0) return extractedData

    return [
      {
        id: "1",
        paperTitle: "Paper 1",
        1: "Smith et al.",
        2: 2022,
        3: "Qualitative",
        4: 150,
        5: "AI techniques significantly reduce SLR time by 40-60%",
      },
      {
        id: "2",
        paperTitle: "Paper 2",
        1: "Johnson et al.",
        2: 2021,
        3: "Quantitative",
        4: 250,
        5: "NLP methods show 85% accuracy in initial paper screening",
      },
      {
        id: "3",
        paperTitle: "Paper 3",
        1: "Williams et al.",
        2: 2023,
        3: "Mixed Methods",
        4: 100,
        5: "Hybrid approaches combining ML and expert review yield best results",
      },
      {
        id: "4",
        paperTitle: "Paper 4",
        1: "Brown et al.",
        2: 2022,
        3: "Qualitative",
        4: 75,
        5: "Domain-specific training improves automated classification by 25%",
      },
      {
        id: "5",
        paperTitle: "Paper 5",
        1: "Davis et al.",
        2: 2020,
        3: "Quantitative",
        4: 300,
        5: "Challenges remain in handling interdisciplinary research contexts",
      },
    ]
  }

  // Generate sample fields if no extraction fields are available
  const getSampleFields = () => {
    if (extractionFields.length > 0) return extractionFields

    return [
      { id: "1", name: "Authors", type: "text", required: true },
      { id: "2", name: "Year", type: "number", required: true },
      { id: "3", name: "Methodology", type: "text", required: false },
      { id: "4", name: "Sample Size", type: "number", required: false },
      { id: "5", name: "Key Findings", type: "text", required: true },
    ]
  }

  if (!project) {
    return null // Loading state
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectHeader project={project} />

      <main className="flex-1 container px-4 py-8 max-w-5xl mx-auto">
        <PhaseHeader
          phase={3}
          title="Analysis & Reporting"
          description="Generate comprehensive reports, answer research questions, and query your research data."
          backLink={`/projects/${projectId}/phase2`}
        />

        <ProgressBar steps={steps} currentStep={currentStep} />

        <Tabs defaultValue="report" value={`step${currentStep}`}>
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="step0" onClick={() => setCurrentStep(0)}>
              Report Generation
            </TabsTrigger>
            <TabsTrigger value="step1" onClick={() => setCurrentStep(1)}>
              Research Questions
            </TabsTrigger>
            <TabsTrigger value="step2" onClick={() => setCurrentStep(2)}>
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
                  <p className="text-sm text-gray-600">
                    Generate a comprehensive systematic literature review report based on your research objective,
                    questions, and the data extracted from your papers.
                  </p>

                  <ModelSelector
                    value={reportModel}
                    onValueChange={setReportModel}
                    label="Report Generation Model"
                    description="Select the AI model to generate your SLR report"
                  />

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
                              <ReportGenerator
                                project={project}
                                researchQuestions={researchQuestions}
                                rqAnswers={rqAnswers}
                                extractedData={getSampleData()}
                              />
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step1">
            <Card>
              <CardHeader>
                <CardTitle>Research Question Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-sm text-gray-600">
                    Generate answers to your research questions based on the extracted data and visualize the results.
                  </p>

                  <ModelSelector
                    value={reportModel}
                    onValueChange={setReportModel}
                    label="Analysis Model"
                    description="Select the AI model to analyze your research questions"
                  />

                  {researchQuestions.length > 0 ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Research Questions</h3>
                        <ul className="space-y-2">
                          {researchQuestions.map((question, index) => (
                            <li key={index} className="p-3 bg-blue-50 rounded-md border border-blue-100">
                              RQ{index + 1}: {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rqAnswers.length > 0 ? (
                        <div className="space-y-8">
                          {rqAnswers.map((rq, index) => (
                            <div key={rq.id} className="space-y-4">
                              <div>
                                <h3 className="text-lg font-medium">
                                  RQ{index + 1}: {rq.question}
                                </h3>
                                <div className="p-4 bg-white rounded-md border mt-2">
                                  <p>{rq.answer}</p>
                                </div>
                              </div>

                              
                            </div>
                          ))}

                          <div className="flex justify-end">
                            <Button onClick={() => setCurrentStep(2)} className="gap-2">
                              Continue to Interactive Query
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Button onClick={handleGenerateRQAnswers} className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Generate Answers
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium">No research questions found</h3>
                      <p className="mt-1 text-sm text-gray-500">Go back to Phase 1 to define your research questions</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step2">
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

                  <ModelSelector
                    value={queryModel}
                    onValueChange={setQueryModel}
                    label="Query Model"
                    description="Select the AI model to answer your queries"
                  />

                  <div className="border rounded-md h-96 overflow-y-auto p-4 bg-white">
                    {chatHistory.map((message, index) => (
                      <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : ""}`}>
                        <div
                          className={`inline-block p-3 rounded-lg ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
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
                  {chatHistory.length > 2 && <ChatVisualization chatHistory={chatHistory} />}
                </div>
                <div className="mt-8 p-4 bg-blue-50 rounded-md border border-blue-100">
                  <h3 className="font-medium mb-2">Next Steps</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Now that you've completed your systematic literature review, here are some suggested next steps:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Download your comprehensive SLR report from the "Report Generation" tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Export your research question answers and visualizations for presentations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Share your findings with colleagues or submit for publication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5" />
                      <span>Start a new SLR project based on insights gained from this review</span>
                    </li>
                  </ul>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={() => router.push("/dashboard")} className="gap-2">
                      Return to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6">
        <div className="container px-4 sm:px-6">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} SLR Automation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
