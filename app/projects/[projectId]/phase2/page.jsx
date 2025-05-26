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
import { ArrowRight, FileUp, Download, Database, Check, FileText, Eye, Plus, TableIcon, Trash } from "lucide-react"
import axios from 'axios';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
  const [extractionModel, setExtractionModel] = useState("gpt-4o")
  const [extractionFields, setExtractionFields] = useState([
    { id: "1", name: "Title", type: "text", required: true },
    { id: "2", name: "Abstract", type: "text", required: true },
    { id: "3", name: "Year", type: "number", required: true },
    { id: "4", name: "Publisher", type: "text", required: false },
    { id: "5", name: "Authors", type: "number", required: false },
    { id: "6", name: "doi", type: "text", required: true },
  ])

  const [papers, setPapers] = useState([]);

  // const [pdfFiles, setPdfFiles] = useState([]);

  const [pdfFiles, setPdfFiles] = useState([]); // array of File objects
  const [uploadStatus, setUploadStatus] = useState({}); // object with filename keys and status values


  const [extractedData, setExtractedData] = useState([])

  const steps = ["Paper Selection", "Paper Upload", "Data Extraction", "Data Processing"]

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

    const retrieved = localStorage.getItem(`project_${projectId}_retrievedPapers`);
    if (retrieved) {
      try {
        const parsed = JSON.parse(retrieved).map((paper, index) => ({
          ...paper,
          id: paper.doi || paper.key || `paper-${index}`, // Ensure each paper has an ID
        }));
        setPapers(parsed);
      } catch (err) {
        console.error("Failed to parse retrieved papers:", err);
      }
    }

    const phaseData = localStorage.getItem(`project_${projectId}_phase2`);
    if (phaseData) {
      const data = JSON.parse(phaseData);
      setCurrentStep(data.currentStep || 0);
      setSelectedPapers(data.selectedPapers || []);
      setUploadedPapers(data.uploadedPapers || []);
      setProcessingComplete(data.processingComplete || false);
      setExtractionModel(data.extractionModel || "gpt-4o");
      if (data.extractionFields) setExtractionFields(data.extractionFields);
      if (data.extractedData) setExtractedData(data.extractedData);
    }

    const fetchUploadedPdfs = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/list_uploaded_pdfs/${projectId}`);
        const files = await res.json();

        const fileObjs = files.map((name) => new File([], name)); // empty `File` objects for UI
        setPdfFiles(fileObjs);

        const statusObj = {};
        files.forEach((name) => {
          statusObj[name] = "uploaded";
        });
        setUploadStatus(statusObj);
      } catch (err) {
        console.error("Failed to load uploaded PDFs:", err);
      }
    };

    fetchUploadedPdfs();

  }, [projectId, router]);

  // Save phase data when it changes
  useEffect(() => {
    if (projectId) {
      const phaseData = {
        currentStep,
        selectedPapers,
        uploadedPapers,
        processingComplete,
        extractionModel,
        extractionFields,
        extractedData,
      }
      localStorage.setItem(`project_${projectId}_phase2`, JSON.stringify(phaseData))
    }
  }, [
    projectId,
    currentStep,
    selectedPapers,
    uploadedPapers,
    processingComplete,
    extractionModel,
    extractionFields,
    extractedData,
  ])


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

  // const handleUploadToServer = async () => {
  //   if (!pdfFiles.length) return;

  //   for (const file of pdfFiles) {
  //     const formData = new FormData();
  //     formData.append("pdf", file);

  //     formData.append("title", file.name);
  //     formData.append("creator", "Unknown Author"); // optionally replace
  //     formData.append("year", new Date().getFullYear());
  //     formData.append("doi", "N/A");
  //     formData.append("link", "Unknown");
  //     formData.append("project_id", projectId);

  //     try {
  //       const res = await fetch("http://127.0.0.1:5000/api/upload_pdf", {
  //         method: "POST",
  //         body: formData,
  //       });

  //       const result = await res.json();

  //       if (!res.ok) {
  //         alert("Upload failed: " + result.error);
  //       } else {
  //         alert("Uploaded: " + file.name);
  //         console.log("Server response:", result);
  //       }
  //     } catch (err) {
  //       console.error("Upload error:", err);
  //       alert("Upload failed unexpectedly.");
  //     }
  //   }

  //   setPdfFiles([]); // Clear after upload
  // };

  const handleUploadToServer = async () => {
    if (!projectId || !pdfFiles.length) return;

    for (const file of pdfFiles) {
      const matchedPaper = papers.find((p) => file.name.includes(p.title?.slice(0, 10) || "")) || papers[0]; // naive match

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
        const res = await axios.post("http://127.0.0.1:5000/api/upload_pdf", formData, {
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
      const res = await fetch(`http://127.0.0.1:5000/api/delete_pdf?project_id=${projectId}&file_name=${fileName}`, {
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

  // const handleExtractData = () => {
  //   // Simulate data extraction
  //   setTimeout(() => {
  //     // Generate mock extracted data based on the fields
  //     const mockData = uploadedPapers.map((title, index) => {
  //       const paper = papers.find((p) => p.title === title) || papers[index % papers.length]

  //       const extractedItem = {
  //         id: `extract-${Date.now()}-${index}`,
  //         paperTitle: title,
  //       }

  //       // Add values for each extraction field
  //       extractionFields.forEach((field) => {
  //         switch (field.name) {
  //           case "Title":
  //             extractedItem[field.id] = title
  //             break
  //           case "Authors":
  //             extractedItem[field.id] = paper.authors
  //             break
  //           case "Year":
  //             extractedItem[field.id] = paper.year
  //             break
  //           case "Methodology":
  //             extractedItem[field.id] = ["Qualitative", "Quantitative", "Mixed Methods", "Case Study"][
  //               Math.floor(Math.random() * 4)
  //             ]
  //             break
  //           case "Sample Size":
  //             extractedItem[field.id] = Math.floor(Math.random() * 500) + 50
  //             break
  //           case "Key Findings":
  //             extractedItem[field.id] = [
  //               "AI techniques significantly reduce SLR time by 40-60%",
  //               "NLP methods show 85% accuracy in initial paper screening",
  //               "Hybrid approaches combining ML and expert review yield best results",
  //               "Domain-specific training improves automated classification by 25%",
  //               "Challenges remain in handling interdisciplinary research contexts",
  //             ][Math.floor(Math.random() * 5)]
  //             break
  //           default:
  //             if (field.type === "text") {
  //               extractedItem[field.id] = `Sample ${field.name} data`
  //             } else if (field.type === "number") {
  //               extractedItem[field.id] = Math.floor(Math.random() * 100)
  //             } else if (field.type === "date") {
  //               extractedItem[field.id] =
  //                 `2022-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`
  //             } else if (field.type === "boolean") {
  //               extractedItem[field.id] = Math.random() > 0.5
  //             } else if (field.type === "list") {
  //               extractedItem[field.id] = ["Item 1", "Item 2", "Item 3"]
  //                 .slice(0, Math.floor(Math.random() * 3) + 1)
  //                 .join(", ")
  //             }
  //         }
  //       })

  //       return extractedItem
  //     })

  //     setExtractedData(mockData)
  //     setCurrentStep(3)
  //   }, 2000)
  // }

  const handleExtractData = async () => {
    console.log("Extracting data for project ID:", projectId);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/extract_data", {
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
      processingComplete,
      extractionModel,
      extractionFields,
      extractedData,
    };
    localStorage.setItem(`project_${projectId}_phase2`, JSON.stringify(phase2Data));
    router.push(`/projects/${projectId}/phase3`)
  }

  const toTitleCase = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  if (!project) {
    return null // Loading state
  }

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

        <ProgressBar steps={steps} currentStep={currentStep} />

        <Tabs defaultValue="selection" value={`step${currentStep}`}>
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="step0" disabled={currentStep !== 0}>
              Paper Selection
            </TabsTrigger>
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
                      {papers.map((paper) => (
                        <TableRow key={paper.id}>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadedPapers.map((title, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{toTitleCase(title)}</TableCell>
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
                                        href={`http://127.0.0.1:5000/uploads/${projectId}/${file.name}`}
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
                <Button onClick={handleConfigureExtraction} disabled={uploadedPapers.length === 0} className="gap-2">
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
                      href={`http://127.0.0.1:5000/api/download_csv?project_id=${projectId}&file_name=extracted_data.csv`}
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
