"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * @param {Object} props
 * @param {string} props.value - The currently selected model
 * @param {Function} props.onValueChange - Function to call when selection changes
 * @param {string} [props.label] - Optional label for the selector
 * @param {string} [props.description] - Optional description text
 */
export function ModelSelector({ value, onValueChange, label = "AI Model", description }) {
  const models = [
    {
      id: "gpt-3.5-turbo",
      name: "GPT-4o",
      provider: "OpenAI",
      description: "Advanced model with strong reasoning capabilities",
    },
    { id: "llama-3", name: "Llama 3", provider: "Meta", description: "Open-source model with good performance" },
    {
      id: "claude-3",
      name: "Claude 3",
      provider: "Anthropic",
      description: "Specialized in detailed analysis and reasoning",
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      provider: "Google",
      description: "Multimodal model with strong capabilities",
    },
    { id: "mistral", name: "Mistral", provider: "Mistral AI", description: "Efficient model with good performance" },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="model-select">{label}</Label>
        {description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="model-select" className="w-full">
          <SelectValue placeholder="Select AI model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span>{model.name}</span>
                <span className="text-xs text-gray-500">{model.provider}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
