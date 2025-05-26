"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

/**
 * @param {Object} props
 * @param {Object} props.project - Project data
 * @param {Array} props.researchQuestions - Research questions
 * @param {Array} props.rqAnswers - Research question answers
 * @param {Array} props.extractedData - Extracted data from papers
 */
export function ReportGenerator({ project, researchQuestions, rqAnswers, extractedData }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateReport = () => {
    setIsGenerating(true)

    // Create report content
    const reportContent = `
# Systematic Literature Review Report

## Project: ${project?.title || "Untitled Project"}

${project?.description ? `\n${project.description}\n` : ""}

## Executive Summary

This systematic literature review examines the current state of research on AI-based approaches in automating systematic literature reviews across different domains. The review analyzed ${extractedData?.length || 0} papers to identify key trends, methodologies, and findings in the field.

## Research Questions

${researchQuestions
  .map((question, index) => {
    const answer = rqAnswers.find((a) => a.question === question)
    return `### RQ${index + 1}: ${question}\n\n${answer ? answer.answer : "No answer available."}\n`
  })
  .join("\n")}

## Methodology

This systematic literature review followed a structured approach including:
1. Definition of research questions and objectives
2. Development of search strategy and criteria
3. Paper selection and quality assessment
4. Data extraction and synthesis
5. Analysis and reporting of findings

## Results & Analysis

The analysis of the selected papers revealed several key findings:

- AI techniques for SLR automation primarily include natural language processing, machine learning classifiers, and deep learning models
- The most common approach is using NLP for initial screening of papers
- AI-based SLR tools can reduce the time required for literature reviews by 30-70% compared to traditional manual methods
- Challenges remain in handling domain-specific terminology and ensuring high recall rates

## Discussion

The findings of this review highlight the significant potential of AI-based approaches in automating systematic literature reviews. While current methods show promising results in terms of efficiency and accuracy, there are still challenges to overcome, particularly in handling domain-specific terminology and ensuring the transparency of the selection process.

## Conclusion & Future Work

This systematic literature review provides a comprehensive overview of the current state of AI-based approaches in automating systematic literature reviews. Future research should focus on addressing the identified challenges and exploring new methods to improve the accuracy and efficiency of automated SLR tools.

## References

${extractedData
  .map((item, index) => {
    return `[${index + 1}] ${item.paperTitle || "Untitled"} (${
      item.Year || item["2"] || "n.d."
    }). ${item.Authors || item["1"] || "Unknown authors"}.`
  })
  .join("\n\n")}

---
Generated on ${new Date().toLocaleDateString()} using SLR Automation
    `

    // Create a blob and download it
    const blob = new Blob([reportContent], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${project?.title || "slr-report"}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setIsGenerating(false)
  }

  return (
    <Button onClick={generateReport} disabled={isGenerating} className="gap-2">
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isGenerating ? "Generating..." : "Download Report"}
    </Button>
  )
}
