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
import { BASE_URL } from "../../../../lib/url";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export default function ProjectPhase3Page() {
  const router = useRouter()
  const params = useParams()
  const { projectId } = params

  const [project, setProject] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [generatedReport, setGeneratedReport] = useState("")
  const [reportGenerated, setReportGenerated] = useState(false)
  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [reportModel, setReportModel] = useState("gpt-3.5-turbo")
  const [queryModel, setQueryModel] = useState("gpt-3.5-turbo")
  const [extractedData, setExtractedData] = useState([])
  const [extractionFields, setExtractionFields] = useState([])
  const [researchQuestions, setResearchQuestions] = useState([])
  const [rqAnswers, setRqAnswers] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [refinementPrompt, setRefinementPrompt] = useState("")
  const [isRefining, setIsRefining] = useState(false)
  const [reportSources, setReportSources] = useState([])
  const [objective, setObjective] = useState("")


  const steps = ["Report Generation", "Interactive Query"]

  const renderFormattedReport = (text) => {
    // Try Markdown headings (##)
    let sections = text.split(/^##\s+/gm).filter(Boolean);

    // If no headings found, try old style (**...**)
    if (sections.length === 1) {
      sections = text.split(/\*\*(.*?)\*\*/).filter(Boolean);
      return sections.reduce((acc, curr, idx) => {
        if (idx % 2 === 0) return acc; // skip heading titles
        const title = sections[idx - 1]?.trim() || `Section ${idx / 2}`;
        const body = curr.trim();
        acc.push(
          <div key={idx} className="mb-6">
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-gray-800 whitespace-pre-line">{body}</p>
          </div>
        );
        return acc;
      }, []);
    }

    // Standard rendering with Markdown headings
    return sections.map((section, index) => {
      const lines = section.trim().split("\n");
      const title = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();

      return (
        <div key={index} className="mb-6">
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-gray-800 whitespace-pre-line">{body}</p>
        </div>
      );
    });
  };

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
      if (data.objective) {
        // Strip the "Research Objective:\n" prefix if needed
        const clean = data.objective.replace(/^Research Objective:\s*/i, "").trim()
        setObjective(clean)
      }
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
    console.log("🔍 Phase 3 LocalStorage:", phaseData)

    if (phaseData) {
      try {
        const data = JSON.parse(phaseData);
        // Always maintain existing chatHistory if it exists in state
        setChatHistory(prev =>
          data.chatHistory?.length
            ? data.chatHistory
            : prev.length
              ? prev
              : [{ role: "system", content: "Welcome to the SLR Assistant..." }]
        );
        setCurrentStep(data.currentStep || 0);
        setReportModel(data.reportModel || "gpt-4o");
        setQueryModel(data.queryModel || "gpt-4o");
        if (data.rqAnswers) {
          setRqAnswers(data.rqAnswers);
        }
      } catch (e) {
        console.error("Failed to parse phase data:", e);
        // Maintain existing chat history if parse fails
        setChatHistory(prev => prev.length ? prev : [{ role: "system", content: "Welcome..." }]);
      }
    } else {
      // Only set default if no history exists at all
      setChatHistory(prev => prev.length ? prev : [{ role: "system", content: "Welcome..." }]);
    }

    const savedReport = localStorage.getItem(`project_${projectId}_report`)
    if (savedReport) {
      setGeneratedReport(JSON.parse(savedReport))
      setReportGenerated(true)
    }

  }, [projectId, router])

  useEffect(() => {
    const saved = localStorage.getItem(`project_${projectId}_report_sources`);
    if (saved) setReportSources(JSON.parse(saved));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    // 1) Load report (string)
    const savedReportRaw = localStorage.getItem(`project_${projectId}_report`);
    if (savedReportRaw) {
      try {
        const savedReport = JSON.parse(savedReportRaw);
        if (typeof savedReport === "string" && savedReport.trim()) {
          setGeneratedReport(savedReport);
          setReportGenerated(true);
        }
      } catch { }
    }

    // 2) Load sources from either key & normalize to the canonical key
    const rawCanon = localStorage.getItem(sourcesKey(projectId));
    const rawDeep = localStorage.getItem(deepSourcesKey(projectId)); // Phase 1 wrote this key

    let src = [];
    try { if (rawCanon) src = JSON.parse(rawCanon) } catch { }
    if (!src?.length) {
      try { if (rawDeep) src = JSON.parse(rawDeep) } catch { }
      if (src?.length) {
        // re-save under canonical key so future loads are consistent
        localStorage.setItem(sourcesKey(projectId), JSON.stringify(src));
      }
    }
    if (src?.length) {
      setReportSources(src);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (!generatedReport) return;
    if (!reportSources?.length) return;

    const hasSourcesSection = /^\s*##\s*Sources\b/im.test(generatedReport);
    if (!hasSourcesSection) {
      const merged = `${generatedReport.trim()}\n\n${sourcesToMarkdown(reportSources)}`.trim();
      setGeneratedReport(merged);
      localStorage.setItem(`project_${projectId}_report`, JSON.stringify(merged));
    }
    // run when sources arrive or when report loads
  }, [projectId, reportSources, generatedReport]);



  useEffect(() => {
    if (!generatedReport) return;
    if (reportSources?.length && !/^\s*##\s*Sources\b/im.test(generatedReport)) {
      const merged = `${generatedReport.trim()}\n\n${sourcesToMarkdown(reportSources)}`.trim();
      setGeneratedReport(merged);
      localStorage.setItem(`project_${projectId}_report`, JSON.stringify(merged));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSources]); // run when sources arrive

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
        generatedReport,
        reportSources,
      }
      localStorage.setItem(`project_${projectId}_phase3`, JSON.stringify(phaseData))

      const fetchProject = async () => {
        try {
          const response = await fetch(`${BASE_URL}/get_project/${projectId}`);
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
  }, [projectId, currentStep, reportGenerated, chatHistory, reportModel, queryModel, rqAnswers, generatedReport, reportSources])

  const sourcesKey = (projectId) => `project_${projectId}_report_sources`;
  const deepSourcesKey = (projectId) => `project_${projectId}_deep_sources`;

  function sourcesToMarkdown(sources = []) {
    if (!Array.isArray(sources) || sources.length === 0) return "";
    const lines = sources.map((s, i) => {
      const title = s.title || `Source ${i + 1}`;
      const meta = [s.venue, s.year].filter(Boolean).join(", ");
      const url = s.url ? `\n${s.url}` : "";
      return `${i + 1}. **${title}**${meta ? ` — _${meta}_` : ""}${url}`;
    });
    return `## Sources\n\n${lines.join("\n")}\n`;
  }

  function wireCitationsToSources(md, sources = []) {
    if (!md) return md;

    // Link [#13] → [13](#source-13)
    let out = md.replace(/\[#(\d+)\]/g, (_m, n) => `[${n}](#source-${n})`);

    // Add anchors to each numbered source line "1. **Title** ..."
    // so the links can target them.
    out = out.replace(
      /^(\d+)\.\s+\*\*(.+?)\*\*/gm,
      (_m, n, title) => `<a id="source-${n}"></a>${n}. **${title}**`
    );

    return out;
  }


  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${BASE_URL}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          research_questions: researchQuestions,
          objective: objective,
        }),
      });

      if (!res.ok) {
        console.error("Backend error:", await res.text());
        return;
      }

      const data = await res.json();

      // 1) Get fresh data from backend
      const rawReport = (data.report || "").trim();
      const src = Array.isArray(data.sources) ? data.sources : [];

      // 2) Build the final Markdown we want to show/save
      const merged = `${rawReport}\n\n${sourcesToMarkdown(src)}`.trim();

      // 3) Wire [1] / [#1] to anchors using the NEW report + sources
      const display = wireCitationsToSources(merged, src);

      // 4) Update state first with the new values
      setReportSources(src);
      setGeneratedReport(display);
      setReportGenerated(true);

      // 5) Persist canonically
      localStorage.setItem(sourcesKey(projectId), JSON.stringify(src));
      localStorage.setItem(`project_${projectId}_report`, JSON.stringify(display));
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };




  const handleRefineReport = async () => {
    setIsRefining(true)
    try {
      const res = await fetch(`${BASE_URL}/refine_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          existing_report: generatedReport,
          refinement_prompt: refinementPrompt,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to refine report");
        return;
      }

      const data = await res.json();

      // ✅ Correctly extract the string content
      const refined = data.report?.refined_report;
      if (!refined) {
        alert("Refined report not found in response.");
        return;
      }

      setGeneratedReport(refined); // ✅ string only
      localStorage.setItem(`project_${projectId}_report`, JSON.stringify(refined));
      setRefinementPrompt(""); // clear prompt box
    } catch (err) {
      console.error("Refinement failed:", err);
    } finally {
      setIsRefining(false);
    }
  }

  const handleDownloadDocx = async () => {
    if (!generatedReport) return;

    const sections = generatedReport.split(/^##\s+/gm).filter(Boolean);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections.map((section) => {
            const lines = section.trim().split("\n");
            const heading = lines[0].trim();
            const body = lines.slice(1).join("\n").trim();

            return [
              new Paragraph({
                children: [new TextRun({ text: heading, bold: true, size: 28 })],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [new TextRun({ text: body, size: 24 })],
                spacing: { after: 300 },
              }),
            ];
          }).flat(),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `SLR_Report_${projectId}.docx`);
  };

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

  const handleSendQuery = async () => {
    if (!query.trim()) return;

    const userMessage = { role: "user", content: query };
    const thinkingMessage = { role: "system", content: "Thinking..." };

    setChatHistory((prev) => [...prev, userMessage, thinkingMessage]);
    setQuery("");
    setIsThinking(true);

    try {
      const res = await fetch(`${BASE_URL}/rag_chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, query }),
      });

      const data = await res.json();

      if (data.answer) {
        // Replace the "Thinking..." message with the actual response
        setChatHistory((prev) => [
          ...prev.slice(0, -1), // remove "Thinking..."
          { role: "system", content: data.answer },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev.slice(0, -1),
          { role: "system", content: "Error: Could not get a response." },
        ]);
      }
    } catch (err) {
      console.error("Failed to get response:", err);
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "system", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsThinking(false);
    }
  };


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
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="step0" onClick={() => setCurrentStep(0)}>
              Report Generation
            </TabsTrigger>
            {/* <TabsTrigger value="step1" onClick={() => setCurrentStep(1)}>
              Research Questions
            </TabsTrigger> */}
            <TabsTrigger value="step1" onClick={() => setCurrentStep(1)}>
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
                            <h4 className="text-lg font-semibold mb-2">Generated Report</h4>
                            <div className="max-h-[400px] overflow-y-auto p-4 border rounded-md bg-gray-50">
                              {/* <div className="whitespace-pre-wrap text-sm text-gray-800">{renderFormattedReport(generatedReport)}</div> */}
                              <div className="prose prose-sm md:prose md:prose-blue max-w-none">
                                <ReactMarkdown
                                  // GitHub-flavored Markdown: tables, lists, etc.
                                  remarkPlugins={[remarkGfm]}
                                  // Adds ids to headings and clickable anchors
                                  rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
                                  components={{
                                    h2: (props) => <h2 className="mt-6 scroll-m-20 text-2xl font-bold" {...props} />,
                                    h3: (props) => <h3 className="mt-5 scroll-m-20 text-xl font-semibold" {...props} />,
                                    p: (props) => <p className="leading-7" {...props} />,
                                    li: (props) => <li className="my-1" {...props} />,
                                    a: (props) => <a className="text-blue-600 underline" target="_blank" rel="noreferrer" {...props} />,
                                    code: (props) => <code className="rounded bg-gray-100 px-1 py-0.5" {...props} />,
                                  }}
                                >
                                  {generatedReport /* from step 2; or just generatedReport if you skip citations */}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <Button onClick={handleGenerateReport} disabled={isGenerating} className="gap-2">
                              {isGenerating && (
                                <svg
                                  className="animate-spin h-4 w-4 mr-2 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                              )}
                              {isGenerating ? "Generating..." : (
                                <>
                                  <Sparkles className="h-4 w-4" />
                                  Generate Report
                                </>
                              )}
                            </Button>

                          </div>
                        )}
                        {reportGenerated && (
                          <div className="mt-6 space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Suggest refinements to improve this report:
                            </label>
                            <textarea
                              value={refinementPrompt}
                              onChange={(e) => setRefinementPrompt(e.target.value)}
                              rows={4}
                              className="w-full border rounded-md p-2 text-sm text-gray-700"
                              placeholder="e.g., Make the report more concise and add a summary of findings at the end."
                            />

                            <Button onClick={handleRefineReport} disabled={!refinementPrompt.trim() || isRefining} className="gap-2">
                              {isRefining ? (
                                <>
                                  <Sparkles className="h-4 w-4 animate-spin" />
                                  Refining...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4" />
                                  Refine Report
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {reportGenerated && generatedReport && (
                          <Button onClick={handleDownloadDocx} className="gap-2 mt-4">
                            <FileText className="h-4 w-4" />
                            Download as Word Document
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="step1">
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
          </TabsContent> */}

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
                          className={`inline-block p-3 rounded-lg ${message.role === "user"
                            ? "bg-blue-600 text-white"
                            : message.content === "Thinking..."
                              ? "bg-yellow-100 text-yellow-800 italic animate-pulse"
                              : "bg-gray-100 text-gray-800"
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
                  {/* {chatHistory.length > 2 && <ChatVisualization chatHistory={chatHistory} />} */}
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

      <footer className="border-t py-6 w-full flex justify-center">
        <p className="text-center text-sm text-gray-600">
          © {new Date().getFullYear()} SLR Automation. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
