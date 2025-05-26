"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhaseHeader } from "@/components/phase-header"
import { ProgressBar } from "@/components/progress-bar"
import { ProjectHeader } from "@/components/project-header"
import { ModelSelector } from "@/components/model-selector"
import { Sparkles, Lock, Unlock, Search, Filter, CheckCircle } from "lucide-react"
import axios from 'axios';

export default function ProjectPhase1Page() {
  const router = useRouter()
  const params = useParams()
  const { projectId } = params

  const [project, setProject] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [objective, setObjective] = useState("")
  const [prompt, setPrompt] = useState("")
  const [questions, setQuestions] = useState([])
  const [purposes, setPurposes] = useState([]);
  const [lockedQuestions, setLockedQuestions] = useState([])
  const [searchStrategy, setSearchStrategy] = useState("default");
  const [isGeneratingSearchString, setIsGeneratingSearchString] = useState(false);
  const [searchString, setSearchString] = useState("")
  const [yearMode, setYearMode] = useState("range");
  const [yearRange, setYearRange] = useState({ start: "2018", end: "2023" })
  const [dataSources, setDataSources] = useState(["IEEE", "Elsevier"])
  const [isPeerReviewed, setIsPeerReviewed] = useState(true)
  const [sortBy, setSortBy] = useState("relevance")
  const [limit, setLimit] = useState(100);
  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const [questionsWithPurposes, setQuestionsWithPurposes] = useState([]); // [{question: ..., purpose: ...}]
  const [selectedQuestions, setSelectedQuestions] = useState([]); // Selected confirmed questions
  const [lockedConfirmed, setLockedConfirmed] = useState(false); // After confirmation


  // Model selection states
  const [objectiveModel, setObjectiveModel] = useState("gpt-3.5-turbo")
  const [questionsModel, setQuestionsModel] = useState("gpt-3.5-turbo")
  const [searchStringModel, setSearchStringModel] = useState("gpt-3.5-turbo")

  const steps = ["Research Objective", "Research Questions", "Search Criteria", "Paper Retrieval"]

  // useEffect(() => {
  //   // Check if user is logged in
  //   const userData = localStorage.getItem("user")
  //   if (!userData) {
  //     router.push("/login")
  //     return
  //   }

  //   // Load project data
  //   const savedProjects = localStorage.getItem("projects")
  //   if (savedProjects) {
  //     const projects = JSON.parse(savedProjects)
  //     const currentProject = projects.find((p) => p.id === projectId)
  //     if (currentProject) {
  //       setProject(currentProject)
  //     } else {
  //       router.push("/dashboard")
  //     }
  //   } else {
  //     router.push("/dashboard")
  //   }

  //   // Load project phase data if exists
  //   const phaseData = localStorage.getItem(`project_${projectId}_phase1`)
  //   if (phaseData) {
  //     const data = JSON.parse(phaseData)
  //     setCurrentStep(data.currentStep || 0)
  //     setObjective(data.objective || "")
  //     setPrompt(data.prompt || "")
  //     setQuestions(data.questions || [])
  //     setLockedQuestions(data.lockedQuestions || [])
  //     setSearchString(data.searchString || "")
  //     setYearRange(data.yearRange || { start: "2018", end: "2023" })
  //     setDataSources(data.dataSources || ["IEEE", "Elsevier"])
  //     setIsPeerReviewed(data.isPeerReviewed !== undefined ? data.isPeerReviewed : true)
  //     setSortBy(data.sortBy || "relevance")
  //     setObjectiveModel(data.objectiveModel || "gpt-4o")
  //     setQuestionsModel(data.questionsModel || "gpt-4o")
  //     setSearchStringModel(data.searchStringModel || "gpt-4o")
  //   }
  // }, [projectId, router])

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const response = await axios.get(`http://127.0.0.1:5000/api/get_project/${projectId}`);
        if (response.status === 200) {
          const projectData = response.data.project;
          setProject(projectData);

          // If objective is already present in DB
          if (projectData.objective) {
            setObjective(projectData.objective);
            // Move to step 1 or 2 depending on presence of questions
            if (Array.isArray(projectData.questions) && projectData.questions.length > 0) {
              const formatted = projectData.questions.map((q, index) => ({
                question: q.question,
                purpose: q.purpose,
                id: index,
              }));
              setQuestionsWithPurposes(formatted);
              setSelectedQuestions(formatted.map((_, i) => i));
              setLockedConfirmed(true); // prevent further editing
              setCurrentStep(2); // go to Search Criteria step
            } else {
              setCurrentStep(1); // go to Questions step
            }
          } else {
            setCurrentStep(0); // start from Objective generation
          }
        } else {
          console.error("Failed to fetch project:", response.data.error);
          //router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching project:", error.response?.data || error.message);
        router.push("/dashboard");
      }
    };

    const retrieved = localStorage.getItem(`project_${projectId}_retrievedPapers`);
    if (retrieved) {
      try {
        const parsed = JSON.parse(retrieved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("Papers already retrieved, redirecting to Phase 2");
          router.push(`/projects/${projectId}/phase2`);
          return; // prevent further execution
        }
      } catch (err) {
        console.error("Failed to parse retrieved papers:", err);
      }
    }

    if (projectId) {
      fetchProject();
    }
  }, [projectId, router]);



  // Save phase data when it changes
  useEffect(() => {
    if (projectId) {
      const phaseData = {
        currentStep,
        objective,
        prompt,
        questions,
        lockedQuestions,
        searchString,
        yearRange,
        dataSources,
        isPeerReviewed,
        sortBy,
        objectiveModel,
        questionsModel,
        searchStringModel,
      }
      localStorage.setItem(`project_${projectId}_phase1`, JSON.stringify(phaseData))
    }
  }, [
    projectId,
    currentStep,
    objective,
    prompt,
    questions,
    lockedQuestions,
    searchString,
    yearRange,
    dataSources,
    isPeerReviewed,
    sortBy,
    objectiveModel,
    questionsModel,
    searchStringModel,
  ])

  const handleGenerateObjective = async () => {
    if (!prompt.trim()) return;

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/generate_objective', {
        prompt: prompt,
        model: objectiveModel, // you are already storing model selection in state
      });

      if (response.status === 200) {
        const generatedObjective = response.data.research_objective; // Assuming your API returns { "objective": "..." }
        setObjective(generatedObjective.replace("Research Objective:\n", "").trim());
        setCurrentStep(1);
      } else {
        console.error('Failed to generate objective:', response.data.error);
      }
    } catch (error) {
      console.error('Error generating objective:', error.response?.data || error.message);
    }
  };


  const handleGenerateQuestions = async () => {
    if (!objective.trim()) {
      alert("Please enter the research objective before generating questions!");
      return;
    }

    try {
      // Reset previous
      setQuestions([]);
      setLockedQuestions([]);
      setQuestionsWithPurposes([]);
      setSelectedQuestions([]);

      const response = await axios.post("http://127.0.0.1:5000/api/generate_research_questions_and_purpose", {
        objective: objective,
        model: questionsModel,
      });

      const data = response.data;

      if (data && data.research_questions && data.research_questions.research_questions) {
        const processedQuestions = data.research_questions.research_questions.map((item, index) => ({
          question: item.question,
          purpose: item.purpose.replace(/^[-\s]*Purpose:\s*/, ""), // Clean "- Purpose: "
          id: index,
        }));

        setQuestionsWithPurposes(processedQuestions);
        setCurrentStep(2);

        console.log("Processed Questions with Purpose:", processedQuestions);
      } else {
        console.error("Invalid response format:", data);
        alert("Failed to generate research questions. Please try again.");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("An error occurred while generating research questions.");
    }
  };


  const handleConfirmQuestions = async () => {
    if (selectedQuestions.length === 0) {
      alert("Please select at least one question to confirm!");
      return;
    }

    const confirmedQuestions = selectedQuestions.map((index) => ({
      question: questionsWithPurposes[index].question,
      purpose: questionsWithPurposes[index].purpose,
    }));

    try {
      const response = await axios.post("http://127.0.0.1:5000/api/confirm_questions", {
        project_id: projectId,
        objective: objective,
        questions: confirmedQuestions,
      });

      if (response.status === 200) {
        console.log("Questions confirmed:", response.data);
        setLockedConfirmed(true); // Lock after confirmation
        setQuestionsWithPurposes(confirmedQuestions);
        localStorage.setItem(`project_${projectId}_phase1`, JSON.stringify({
          ...JSON.parse(localStorage.getItem(`project_${projectId}_phase1`) || "{}"),
          confirmedQuestions: confirmedQuestions,
        }))
      } else {
        console.error("Failed to confirm questions:", response.data);
        alert(response.data.error || "Failed to confirm questions.");
      }
    } catch (error) {
      console.error("Error confirming questions:", error);
      alert("Error occurred while confirming questions.");
    }
  };


  const toggleQuestionLock = (index) => {
    const newLockedQuestions = [...lockedQuestions]
    newLockedQuestions[index] = !newLockedQuestions[index]
    setLockedQuestions(newLockedQuestions)
  }

  const handleGenerateSearchString = async () => {
    if (!projectId || !objective.trim() || questionsWithPurposes.length === 0 || !searchStringModel) {
      alert("Please ensure all required fields (objective, questions, model) are filled.");
      return;
    }

    const questions = questionsWithPurposes.map(q => q.question);
    setIsGeneratingSearchString(true); // start loading

    try {
      const response = await axios.post("http://127.0.0.1:5000/api/generate_search_string", {
        project_id: projectId,
        objective: objective,
        research_questions: questions,
        model: searchStringModel,
        search_strategy: searchStrategy
      });

      if (response.status === 200 && response.data.search_string) {
        setSearchString(response.data.search_string);
      } else {
        alert(response.data.error || "Failed to generate search string.");
      }
    } catch (error) {
      console.error("Error generating search string:", error);
      alert("An error occurred while generating the search string.");
    } finally {
      setIsGeneratingSearchString(false); // stop loading
    }
  };


  const handleApplyCriteria = () => {
    // Add any validation if needed (e.g., searchString must be non-empty)
    if (!searchString.trim()) {
      alert("Please generate or enter a search string before proceeding.");
      return;
    }

    setCurrentStep(3); // ✅ Move to next step
  };

  const handleFindPapers = async () => {
    if (!searchString || !yearRange.start) {
      alert("Search string and publication year are required.");
      return;
    }

    if (dataSources.length === 0) {
      alert("Please select at least one data source.");
      return;
    }

    setLoadingPapers(true);

    try {
      const startYearToSend = yearRange.start;
      const endYearToSend = yearMode === "single" ? yearRange.start : yearRange.end;

      const response = await axios.post("http://127.0.0.1:5000/api/search_papers", {
        project_id: projectId,
        search_strategy: searchStrategy,
        search_string: searchString,
        start_year: startYearToSend,
        end_year: endYearToSend,
        limit: limit, // from input field
        isEnglish: true,
        isPeerReviewed,
        isMostCited: true,
        selectedDataSources: dataSources,
        keywords: [],
      });

      const data = response.data;
      console.log(data);

      if (Array.isArray(data)) {
        const formattedResults = data.flatMap((group, groupIndex) =>
          group.map((paper, paperIndex) => ({
            ...paper,
            key: `source-${groupIndex}-item-${paperIndex}`,
          }))
        );

        setPapers(formattedResults); // or setDataSourceMapping if you're grouping by source
        localStorage.setItem(`project_${projectId}_retrievedPapers`, JSON.stringify(formattedResults));
        router.push(`/projects/${projectId}/phase2`);
        //setCurrentStep(3); // move to paper viewing tab
      } else {
        alert("Unexpected response format.");
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
      alert("Failed to retrieve papers.");
    } finally {
      setLoadingPapers(false);
    }
  };


  if (!project) {
    return <div>Loading project...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectHeader project={project} />

      <main className="flex-1 container px-4 py-8 max-w-5xl mx-auto">
        <PhaseHeader
          phase={1}
          title="Research Setup"
          description="Define your research objective, generate questions, and set search criteria."
          backLink="/dashboard"
        />

        <ProgressBar steps={steps} currentStep={currentStep} />

        <Tabs defaultValue="objective" value={`step${currentStep}`}>
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="step0">
              Research Objective
            </TabsTrigger>
            <TabsTrigger value="step1" disabled={!objective}>
              Research Questions
            </TabsTrigger>
            <TabsTrigger value="step2" disabled={questionsWithPurposes.length === 0 || !lockedConfirmed}>
              Search Criteria
            </TabsTrigger>
            <TabsTrigger value="step3" disabled={!searchString}>
              Paper Retrieval
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step0">
            <Card>
              <CardHeader>
                <CardTitle>Generate Research Objective</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">Enter a prompt to generate your research objective</Label>
                    <Textarea
                      id="prompt"
                      placeholder="e.g., I want to research the use of AI in automating systematic literature reviews"
                      className="mt-1 h-32"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>

                  <ModelSelector
                    value={objectiveModel}
                    onValueChange={setObjectiveModel}
                    description="Select the AI model to generate your research objective"
                  />

                  {objective && (
                    <div className="mt-6">
                      <Label>Generated Research Objective</Label>
                      <div className="p-4 bg-blue-50 rounded-md mt-1 border border-blue-100">{objective}</div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleGenerateObjective} disabled={!prompt.trim()} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Objective
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="step1">
            <Card>
              <CardHeader>
                <CardTitle>Generate Research Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Research Objective</Label>
                    <Textarea
                      id="objective"
                      className="mt-1 h-32"
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Your research objective here..."
                    />
                  </div>

                  <ModelSelector
                    value={questionsModel}
                    onValueChange={setQuestionsModel}
                    description="Select the AI model to generate your research questions"
                  />

                  {questions.length > 0 && (
                    <div className="mt-6">
                      <Label>Generated Research Questions</Label>
                      <div className="space-y-2 mt-2">
                        {questions.map((question, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-md border">
                            <div className="flex-1">{question}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleQuestionLock(index)}
                              className="h-8 w-8 p-0"
                            >
                              {lockedQuestions[index] ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                {!lockedConfirmed && (
                  <Button onClick={handleGenerateQuestions} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Questions
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="step2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Generate Search String
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label>Research Questions{" "}
                      {lockedConfirmed && (
                        <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Confirmed
                        </span>
                      )}
                    </Label>
                    <div className="space-y-2 mt-2">
                      {questionsWithPurposes.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white border border-gray-200 rounded-md flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{item.question}</div>
                            {!lockedConfirmed && (
                              <input
                                type="checkbox"
                                checked={selectedQuestions.includes(index)}
                                onChange={(e) => {
                                  const updatedSelection = e.target.checked
                                    ? [...selectedQuestions, index]
                                    : selectedQuestions.filter((i) => i !== index);
                                  setSelectedQuestions(updatedSelection);
                                }}
                              />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Purpose: {item.purpose}
                          </div>
                        </div>
                      ))}
                    </div>
                    {!lockedConfirmed && (
                      <div className="flex justify-end mt-6 mb-4">
                        <Button
                          className=""
                          onClick={handleConfirmQuestions}
                          disabled={selectedQuestions.length === 0}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirm Selected Questions
                        </Button>
                      </div>
                    )}
                  </div>


                  <ModelSelector
                    value={searchStringModel}
                    onValueChange={setSearchStringModel}
                    description="Select the AI model to generate your search string"
                  />

                  <div>
                    <Label htmlFor="searchStrategy">Search Strategy</Label>
                    <Select
                      value={searchStrategy}
                      onValueChange={(value) => setSearchStrategy(value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="pico">PICO</SelectItem>
                        {/* Add more strategies as needed */}
                      </SelectContent>
                    </Select>
                  </div>


                  <div>
                    <Label htmlFor="searchString">Search String</Label>
                    <Textarea
                      id="searchString"
                      className="mt-1 h-32 font-mono text-sm"
                      value={searchString}
                      onChange={(e) => setSearchString(e.target.value)}
                      placeholder="Generate a search string or enter manually"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Publication Year Block */}
                    <div>
                      <Label className="block mb-1 text-sm font-medium">Publication Year</Label>

                      {/* Year Mode Selector */}
                      <Select value={yearMode} onValueChange={(value) => setYearMode(value)}>
                        <SelectTrigger className="w-full md:w-48 mb-3">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="range">Year Range</SelectItem>
                          <SelectItem value="single">Single Year</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Year Inputs */}
                      {yearMode === "range" ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            placeholder="Start Year"
                            value={yearRange.start}
                            onChange={(e) => setYearRange({ ...yearRange, start: e.target.value })}
                            min="1900"
                            max={new Date().getFullYear().toString()}
                            className="w-1/2"
                          />
                          <span className="text-gray-600">to</span>
                          <Input
                            type="number"
                            placeholder="End Year"
                            value={yearRange.end}
                            onChange={(e) => setYearRange({ ...yearRange, end: e.target.value })}
                            min="1900"
                            max={new Date().getFullYear().toString()}
                            className="w-1/2"
                          />
                        </div>
                      ) : (
                        <Input
                          type="number"
                          placeholder="Year"
                          value={yearRange.start}
                          onChange={(e) => {
                            setYearRange({ start: e.target.value, end: e.target.value });
                          }}
                          min="1900"
                          max={new Date().getFullYear().toString()}
                          className="w-full mt-2"
                        />
                      )}
                    </div>

                    {/* Sort By Block */}
                    <div>
                      <Label className="block mb-1 text-sm font-medium">Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sort criteria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="citations">Most Cited</SelectItem>
                          <SelectItem value="recent">Most Recent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="limit">Number of Papers to Retrieve</Label>
                      <Input
                        id="limit"
                        type="number"
                        placeholder="e.g., 100"
                        className="w-40 mt-1"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        min={1}
                        max={1000}
                      />
                    </div>
                  </div>


                  <div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="peerReviewed"
                        checked={isPeerReviewed}
                        onCheckedChange={(checked) => setIsPeerReviewed(checked)}
                      />
                      <Label htmlFor="peerReviewed">Peer-reviewed only</Label>
                    </div>
                  </div>

                  <div>
                    <Label>Data Sources</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {["IEEE", "Elsevier", "ACM"].map((source) => (
                        <div key={source} className="flex items-center gap-2">
                          <Checkbox
                            id={source}
                            checked={dataSources.includes(source)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setDataSources([...dataSources, source])
                              } else {
                                setDataSources(dataSources.filter((s) => s !== source))
                              }
                            }}
                          />
                          <Label htmlFor={source}>{source}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateSearchString}
                    className="gap-2"
                    disabled={isGeneratingSearchString}
                  >
                    {isGeneratingSearchString ? (
                      <svg
                        className="animate-spin h-4 w-4 text-gray-600"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Search String
                  </Button>

                  <Button
                    onClick={handleApplyCriteria}
                    disabled={!searchString.trim()}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Apply Criteria
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="step3">
            <Card>
              <CardHeader>
                <CardTitle>Paper Retrieval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label>Search String</Label>
                    <div className="p-4 bg-blue-50 rounded-md mt-1 border border-blue-100 font-mono text-sm">
                      {searchString}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Inclusion Criteria</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>
                          Year range: {yearRange.start} - {yearRange.end}
                        </li>
                        <li>Data sources: {dataSources.join(", ")}</li>
                        {isPeerReviewed && <li>Peer-reviewed publications only</li>}
                        <li>
                          Sort by:{" "}
                          {sortBy === "relevance" ? "Relevance" : sortBy === "citations" ? "Most cited" : "Most recent"}
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Search Summary</h3>
                      <div className="bg-gray-100 p-4 rounded-md">
                        <p className="text-sm">
                          Click "Find Papers" to search across selected databases using your search string and criteria.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>

                <Button
                  onClick={handleFindPapers}
                  className="gap-2"
                  disabled={loadingPapers}
                >
                  {loadingPapers ? (
                    <svg
                      className="animate-spin h-4 w-4 text-gray-600"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Find Papers
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
