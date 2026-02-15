"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhaseHeader } from "@/components/phase-header"
import { ProgressBar } from "@/components/progress-bar"
import { ProjectHeader } from "@/components/project-header"
import { DataExtractionConfig } from "@/components/data-extraction-config"
import { ModelSelector } from "@/components/model-selector"
import { ArrowRight, FileUp, Download, Database, Check, FileText, Eye, Plus, TableIcon, Trash, SkipForward } from "lucide-react"
import axios from 'axios';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { BASE_URL } from "../../../../lib/url";

export default function ProjectPhase2Page() {
  const router = useRouter()
  const params = useParams()
  const { projectId } = params
  const fileInputRef = useRef(null)

  const [project, setProject] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPapers, setSelectedPapers] = useState([])
  const [uploadedPapers, setUploadedPapers] = useState([])
  const [processingComplete, setProcessingComplete] = useState(false)
  const [extractionModel, setExtractionModel] = useState()
  const [extractionFields, setExtractionFields] = useState([
    { id: "1", name: "Title", type: "text", required: true },
    { id: "2", name: "Abstract", type: "text", required: true },
    { id: "3", name: "Year", type: "number", required: true },
    { id: "4", name: "Publisher", type: "text", required: false },
    { id: "5", name: "Authors", type: "number", required: false },
    { id: "6", name: "doi", type: "text", required: true },
  ])

  const [papers, setPapers] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [extractedData, setExtractedData] = useState([])

  const steps = ["Paper Selection", "Paper Upload", "Data Extraction", "Data Processing"]

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/login")
      return
    }

    const savedProjects = localStorage.getItem("projects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects)
      const currentProject = projects.find((p) => p.id === projectId)
      setProject(currentProject || { id: projectId })
    } else {
      setProject({ id: projectId })
    }

    // 🛑 Immediately redirect if Phase 2 was completed
    const phase2Data = localStorage.getItem(`project_${projectId}_phase2`)
    if (phase2Data) {
      const parsed = JSON.parse(phase2Data)
      if (parsed.processingComplete) {
        router.replace(`/projects/${projectId}/phase3`)
        return  // ⛔ Ensure no further execution
      }
    }

    // Load papers and step info only if not redirected
    const retrieved = localStorage.getItem(`project_${projectId}_retrievedPapers`);
    let parsedPapers = [];
    if (retrieved) {
      try {
        parsedPapers = JSON.parse(retrieved).map((paper, index) => ({
          ...paper,
          id: paper.doi || paper.key || `paper-${index}`,
        }));
        setPapers(parsedPapers);
        if (parsedPapers.length === 0) {
          setCurrentStep(1); // Skip to Upload Paper tab
        }
      } catch (err) {
        console.error("Failed to parse retrieved papers:", err);
      }
    }

    const storedSelected = localStorage.getItem(`project_${projectId}_selectedPapers`)
    if (storedSelected) {
      const parsedSelected = JSON.parse(storedSelected)
      setSelectedPapers(parsedSelected)
      const hydratedUploads = parsedSelected.map(id => parsedPapers.find(p => p.id === id)).filter(Boolean)
      setUploadedPapers(hydratedUploads)
    }

    const fetchUploadedPdfs = async () => {
      try {
        const res = await fetch(`${BASE_URL}/list_uploaded_pdfs/${projectId}`);
        const files = await res.json();
        const fileObjs = files.map((name) => new File([], name));
        setPdfFiles(fileObjs);

        const statusObj = {};
        files.forEach((name) => { statusObj[name] = "uploaded"; });
        setUploadStatus(statusObj);

        if (files.length > 0) setCurrentStep(1);
      } catch (err) {
        console.error("Failed to load uploaded PDFs:", err);
      }
    };

    fetchUploadedPdfs();
  }, [projectId, router])


  const togglePaperSelection = (id) => {
    setSelectedPapers((prev) => {
      const updated = prev.includes(id) ? prev.filter((paperId) => paperId !== id) : [...prev, id]
      localStorage.setItem(`project_${projectId}_selectedPapers`, JSON.stringify(updated))
      return updated
    })
  }

  const handleUploadPaper = () => {
    const newUploadedPapers = selectedPapers.map((id) => papers.find((p) => p.id === id)).filter(Boolean)
    setUploadedPapers(newUploadedPapers)
    setCurrentStep(1)
  }

  const handleUploadToServer = async () => {
    if (!projectId || !pdfFiles.length) return;

    for (const file of pdfFiles) {
      const matchedPaper =
        papers.find((p) => file.name.includes(p.title?.slice(0, 10) || "")) ||
        uploadedPapers.find((p) => file.name.includes(p.title?.slice(0, 10) || "")) ||
        {
          title: file.name,
          creator: "Unknown",
          year: "N/A",
          doi: "N/A",
          link: "",
        };

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("title", matchedPaper.title || file.name);
      formData.append("creator", matchedPaper.creator || "Unknown");
      formData.append("year", matchedPaper.year || "N/A");
      formData.append("doi", matchedPaper.doi || "N/A");
      formData.append("link", matchedPaper.link || "");
      formData.append("project_id", projectId);

      setUploadStatus((prev) => ({ ...prev, [file.name]: "pending" }))

      try {
        const res = await axios.post(`${BASE_URL}/upload_pdf`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        if (res.status === 200) {
          setUploadStatus((prev) => ({ ...prev, [file.name]: "uploaded" }))
        } else {
          setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
        }
      } catch (err) {
        console.error("Upload failed:", err)
        setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
      }
    }
  }

  const handleDeletePdf = async (fileName) => {
    try {
      const res = await fetch(`${BASE_URL}/delete_pdf?project_id=${projectId}&file_name=${fileName}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (res.ok) {
        setPdfFiles((prev) => prev.filter((file) => file.name !== fileName));
        setUploadStatus((prev) => {
          const updated = { ...prev };
          delete updated[fileName];
          return updated;
        });
      } else {
        alert(result.error || "Failed to delete PDF.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("An error occurred while deleting the PDF.");
    }
  };

  const handleConfigureExtraction = () => {
    setCurrentStep(2)
  }

  const handleExtractData = async () => {
    console.log("Extracting data for project ID:", projectId);

    try {
      const response = await fetch(`${BASE_URL}//extract_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_id: projectId }),
      });

      const contentType = response.headers.get("content-type");

      // Handle non-JSON error responses gracefully
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          alert(errorData.error || "Failed to extract data.");
        } else {
          const errorText = await response.text();
          alert("Server error: " + errorText);
        }
        return;
      }

      // Parse and use the JSON response
      const data = await response.json();
      console.log("✅ Extracted data:", data);

      alert("Data extracted and saved to CSV successfully!");

      // Update frontend state
      setExtractedData(data.data);  // display extracted rows
      setCurrentStep(3);            // go to next step if using stepper
    } catch (error) {
      console.error("❌ Network or parsing error:", error);
      alert("Something went wrong while extracting data.");
    }
  };

  const handleProcessPapers = () => {
    // Simulate processing
    setTimeout(() => {
      setProcessingComplete(true)
    }, 2000)
  }

  const handleGoToPhase3 = () => {
    const phase2Data = {
      currentStep,
      selectedPapers,
      uploadedPapers,
      processingComplete: true,
      extractionModel,
      extractionFields,
      extractedData,
    };
    localStorage.setItem(`project_${projectId}_phase2`, JSON.stringify(phase2Data));
    router.push(`/projects/${projectId}/phase3`)
  }

  const handleClearAndRestart = () => {
    if (confirm("Are you sure you want to clear all retrieved papers and restart Phase 1?")) {
      // Clear relevant localStorage keys
      localStorage.removeItem(`project_${projectId}_retrievedPapers`);
      localStorage.removeItem(`project_${projectId}_selectedPapers`);
      localStorage.removeItem(`project_${projectId}_phase2`);

      // Optionally clear state (not strictly necessary since you'll redirect)
      setPapers([]);
      setSelectedPapers([]);
      setUploadedPapers([]);
      setPdfFiles([]);
      setUploadStatus({});

      // Redirect to phase 1
      router.push(`/projects/${projectId}/phase1`);
    }
  };

  const toTitleCase = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  if (!project) {
    return null // Loading state
  }

  const showSelectionStep = papers.length > 0;

  const visibleSteps = steps.filter((step, index) => {
    // Exclude "Paper Selection" (index 0) if no papers
    return showSelectionStep || index !== 0;
  });

  const adjustedStepIndex = showSelectionStep ? currentStep : currentStep - 1;

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectHeader project={project} />

      <main className="flex-1 container px-4 py-8 max-w-5xl mx-auto">
        <PhaseHeader
          phase={2}
          title="Paper Management"
          description="Select papers, upload full texts, and extract data for analysis."
          backLink={`/projects/${projectId}/phase1`}
        />

        {/*
        <ProgressBar steps={steps} currentStep={currentStep} />
        */}
        <ProgressBar steps={visibleSteps} currentStep={adjustedStepIndex} />

        <Tabs defaultValue="selection" value={`step${currentStep}`}>
          <TabsList className={`grid ${papers.length > 0 ? "grid-cols-4" : "grid-cols-3"} mb-8`}>
            {papers.length > 0 && (
              <TabsTrigger value="step0" disabled={currentStep !== 0}>
                Paper Selection
              </TabsTrigger>
            )}
            <TabsTrigger value="step1" disabled={currentStep < 1}>
              Paper Upload
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={currentStep < 2}>
              Data Extraction
            </TabsTrigger>
            <TabsTrigger value="step3" disabled={currentStep < 3}>
              Data Processing
            </TabsTrigger>
          </TabsList>

          {papers.length > 0 && (
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
                          <TableHead>Publication Name</TableHead>
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
                            <TableCell className="font-medium">{toTitleCase(paper.title)}</TableCell>
                            <TableCell>{paper.creator}</TableCell>
                            <TableCell>{paper.year}</TableCell>
                            <TableCell>{paper.publicationName}</TableCell>
                            <TableCell>{paper.citedby_count}</TableCell>
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
                  <div className="flex gap-4">
                    <Button
                      variant="destructive"
                      onClick={handleClearAndRestart}
                      className="gap-2"
                    >
                      <Trash className="h-4 w-4" />
                      Clear Papers & Restart
                    </Button>

                    <Button
                      onClick={handleUploadPaper}
                      disabled={selectedPapers.length === 0}
                      className="gap-2"
                    >
                      <FileUp className="h-4 w-4" />
                      Upload Selected Papers
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setCurrentStep(1)} // ⬅️ directly skip to "Upload" step
                      className="gap-2"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          )}

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
                          {papers.length > 0 ? <TableHead>Paper Title</TableHead> : (
                            <TableHead>Upload papers for systematic literature review</TableHead>
                          )}

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedPapers.map((paper, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{toTitleCase(paper.title)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md border border-dashed border-gray-300 text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop papers's PDF files here, or click to browse
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length > 0) {
                          const filesArray = Array.from(e.target.files);
                          setPdfFiles((prev) => [...prev, ...filesArray]);
                        }
                      }}
                    />

                    <label htmlFor="pdfUploader">
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                        Browse Files
                      </Button>
                    </label>

                    {pdfFiles.length > 0 && (
                      <div className="mt-6 text-left text-sm">
                        <strong>Selected Files:</strong>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                          {pdfFiles.map((file, idx) => (
                            <li key={file.name}>
                              <div className="flex justify-between items-center">
                                <span>{file.name}</span>
                                <div className="flex gap-2 items-center">
                                  {/* {uploadStatus[file.name] === "uploaded" && (
                                    <span className="text-green-600 text-xs">Uploaded</span>
                                  )} */}
                                  {uploadStatus[file.name] === "pending" && (
                                    <span className="text-yellow-600 text-xs">Uploading...</span>
                                  )}
                                  {uploadStatus[file.name] === "error" && (
                                    <span className="text-red-600 text-xs">Error</span>
                                  )}
                                  {uploadStatus[file.name] === "uploaded" && (
                                    <>
                                      <span className="text-green-600 text-xs">Uploaded</span>
                                      <a
                                        href={`${BASE_URL}/uploads/${projectId}/${file.name}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleDeletePdf(file.name)}
                                      >
                                        <Trash className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <Button
                          variant="default"
                          className="mt-4"
                          onClick={handleUploadToServer}
                          disabled={Object.values(uploadStatus).includes("pending")}
                        >
                          Upload PDF{pdfFiles.length > 1 ? "s" : ""}
                        </Button>
                      </div>
                    )}
                  </div>


                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                <Button onClick={handleConfigureExtraction} disabled={
                  Object.values(uploadStatus).filter((status) => status === "uploaded").length === 0
                } className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  Configure Data Extraction
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="step2">
            <Card>
              <CardHeader>
                <CardTitle>Data Extraction Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-sm text-gray-600">
                    Configure the data extraction process to automatically extract structured data from your papers.
                    This will help you analyze and synthesize the information more effectively.
                  </p>

                  <ModelSelector
                    value={extractionModel}
                    onValueChange={setExtractionModel}
                    label="Extraction Model"
                    description="Select the AI model to extract data from your papers"
                  />

                  {/* <DataExtractionConfig fields={extractionFields} setFields={setExtractionFields} /> */}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={handleExtractData} className="gap-2">
                  <Database className="h-4 w-4" />
                  Extract Data
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="step3">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {extractedData.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {extractionFields.map((field) => (
                              <TableHead key={field.id}>{field.name}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedData.map((item, idx) => (
                            <TableRow key={idx}>
                              {/* Render each field dynamically */}
                              {extractionFields.map((field) => (
                                <TableCell key={field.id}>
                                  {field.name.toLowerCase() === "abstract" ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>{(item[field.name.toLowerCase()]?.slice(0, 100) ?? "-") + "..."}</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-md">
                                        {item[field.name.toLowerCase()] ?? "No abstract"}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    item[field.name.toLowerCase()] ?? "-"
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium">No data extracted yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Configure your extraction fields and run the extraction process
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    <a
                      href={`${BASE_URL}/download_csv?project_id=${projectId}&file_name=extracted_data.csv`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download CSV
                      </Button>
                    </a>
                  </div>

                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button onClick={handleGoToPhase3} className="gap-2">
                  Continue to Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
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
