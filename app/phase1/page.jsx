"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Sparkles, Lock, Unlock, Search, Filter } from "lucide-react"


export default function Phase1Page() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [objective, setObjective] = useState("")
  const [prompt, setPrompt] = useState("")
  const [questions, setQuestions] = useState([])
  const [lockedQuestions, setLockedQuestions] = useState([])
  const [searchString, setSearchString] = useState("")
  const [yearRange, setYearRange] = useState({ start: "2018", end: "2023" })
  const [dataSources, setDataSources] = useState(["IEEE", "Elsevier"])
  const [isPeerReviewed, setIsPeerReviewed] = useState(true)
  const [sortBy, setSortBy] = useState("relevance")

  const steps = ["Research Objective", "Research Questions", "Search Criteria", "Paper Retrieval"]

  const handleGenerateObjective = () => {
    // Simulate AI generation
    setTimeout(() => {
      setObjective(
        "To systematically analyze and evaluate the effectiveness of AI-based approaches in automating systematic literature reviews across different domains.",
      )
      setCurrentStep(1)
    }, 1500)
  }

  const handleGenerateQuestions = () => {
    // Simulate AI generation
    setTimeout(() => {
      setQuestions([
        "What are the current AI techniques used in automating systematic literature reviews?",
        "How effective are these AI techniques compared to traditional manual methods?",
        "What are the challenges and limitations of using AI for systematic literature reviews?",
        "How do AI-based SLR tools perform across different research domains?",
      ])
      setLockedQuestions([false, false, false, false])
      setCurrentStep(2)
    }, 1500)
  }

  const toggleQuestionLock = (index) => {
    const newLockedQuestions = [...lockedQuestions]
    newLockedQuestions[index] = !newLockedQuestions[index]
    setLockedQuestions(newLockedQuestions)
  }

  const handleGenerateSearchString = () => {
    // Simulate AI generation
    setTimeout(() => {
      setSearchString(
        '("systematic literature review" OR "SLR") AND ("artificial intelligence" OR "AI" OR "machine learning" OR "natural language processing" OR "NLP") AND ("automation" OR "automated" OR "automatic")',
      )
      setCurrentStep(3)
    }, 1500)
  }

  const handleFindPapers = () => {
    // Simulate paper retrieval and navigate to phase 2
    setTimeout(() => {
      router.push("/phase2")
    }, 1500)
  }

  return (
    <div className="container px-4 py-8 max-w-5xl mx-auto">
      <PhaseHeader
        phase={1}
        title="Research Setup"
        description="Define your research objective, generate questions, and set search criteria."
        backLink="/"
      />

      <ProgressBar steps={steps} currentStep={currentStep} />

      <Tabs defaultValue="objective" value={`step${currentStep}`}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="step0" disabled={currentStep !== 0}>
            Research Objective
          </TabsTrigger>
          <TabsTrigger value="step1" disabled={currentStep < 1}>
            Research Questions
          </TabsTrigger>
          <TabsTrigger value="step2" disabled={currentStep < 2}>
            Search Criteria
          </TabsTrigger>
          <TabsTrigger value="step3" disabled={currentStep < 3}>
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
                  <div className="p-4 bg-blue-50 rounded-md mt-1 border border-blue-100">{objective}</div>
                </div>

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
              <Button onClick={handleGenerateQuestions} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Questions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="step2">
          <Card>
            <CardHeader>
              <CardTitle>Generate Search String</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label>Research Questions</Label>
                  <div className="space-y-2 mt-2">
                    {questions.map((question, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-md border border-blue-100">
                        {question}
                      </div>
                    ))}
                  </div>
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
                  <div>
                    <Label>Year Range</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={yearRange.start}
                        onChange={(e) => setYearRange({ ...yearRange, start: e.target.value })}
                        min="1900"
                        max={new Date().getFullYear().toString()}
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        value={yearRange.end}
                        onChange={(e) => setYearRange({ ...yearRange, end: e.target.value })}
                        min="1900"
                        max={new Date().getFullYear().toString()}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select sort criteria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="citations">Most Cited</SelectItem>
                        <SelectItem value="recent">Most Recent</SelectItem>
                      </SelectContent>
                    </Select>
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
                    {["IEEE", "Elsevier", "Springer", "ACM", "Wiley", "MDPI"].map((source) => (
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
                <Button variant="outline" onClick={handleGenerateSearchString} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Search String
                </Button>
                <Button onClick={() => setCurrentStep(3)} disabled={!searchString.trim()} className="gap-2">
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
              <Button onClick={handleFindPapers} className="gap-2">
                <Search className="h-4 w-4" />
                Find Papers
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
