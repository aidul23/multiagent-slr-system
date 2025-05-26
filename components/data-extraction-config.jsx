"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, MoveUp, MoveDown } from "lucide-react"

/**
 * @param {Object} props
 * @param {Array} props.fields - The extraction fields
 * @param {Function} props.setFields - Function to update fields
 */
export function DataExtractionConfig({ fields, setFields }) {
  const [newField, setNewField] = useState({ name: "", type: "text", required: false })

  const handleAddField = () => {
    if (!newField.name.trim()) return
    setFields([...fields, { ...newField, id: Date.now().toString() }])
    setNewField({ name: "", type: "text", required: false })
  }

  const handleRemoveField = (id) => {
    setFields(fields.filter((field) => field.id !== id))
  }

  const handleMoveField = (index, direction) => {
    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[index + direction]
    newFields[index + direction] = temp
    setFields(newFields)
  }

  const handleFieldChange = (id, key, value) => {
    setFields(fields.map((field) => (field.id === id ? { ...field, [key]: value } : field)))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Data Extraction Fields</h3>
        <p className="text-sm text-gray-500">
          Define the data fields you want to extract from each paper. These fields will be used to structure your data
          for analysis.
        </p>
      </div>

      {fields.length > 0 && (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 p-3 border rounded-md bg-gray-50">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`field-name-${field.id}`}>Field Name</Label>
                  <Input
                    id={`field-name-${field.id}`}
                    value={field.name}
                    onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`field-type-${field.id}`}>Field Type</Label>
                  <Select value={field.type} onValueChange={(value) => handleFieldChange(field.id, "type", value)}>
                    <SelectTrigger id={`field-type-${field.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 h-full pt-6">
                  <Checkbox
                    id={`field-required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(checked) => handleFieldChange(field.id, "required", checked)}
                  />
                  <Label htmlFor={`field-required-${field.id}`}>Required</Label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(field.id)} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveField(index, -1)}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveField(index, 1)}
                  disabled={index === fields.length - 1}
                  className="h-8 w-8"
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-t pt-4">
        <div>
          <Label htmlFor="new-field-name">Field Name</Label>
          <Input
            id="new-field-name"
            placeholder="e.g., Author, Year, Method"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="new-field-type">Field Type</Label>
          <Select value={newField.type} onValueChange={(value) => setNewField({ ...newField, type: value })}>
            <SelectTrigger id="new-field-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="boolean">Yes/No</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-field-required"
              checked={newField.required}
              onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
            />
            <Label htmlFor="new-field-required">Required</Label>
          </div>
          <Button onClick={handleAddField} disabled={!newField.name.trim()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </div>
      </div>
    </div>
  )
}
