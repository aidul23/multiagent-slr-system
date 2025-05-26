"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

/**
 * @param {Object} props
 * @param {string} props.title - Chart title
 * @param {Array} props.data - Data for the chart
 * @param {string} [props.type] - Chart type (bar, pie)
 * @param {string} [props.xKey] - Key for X axis
 * @param {string} [props.yKey] - Key for Y axis
 * @param {Array} [props.fields] - Available fields for selection
 */
export function ChartContainer({ title, data = [], type = "bar", xKey, yKey, fields = [] }) {
  const [chartType, setChartType] = useState(type)
  const [selectedXKey, setSelectedXKey] = useState(xKey || fields[0]?.id || "")
  const [selectedYKey, setSelectedYKey] = useState(yKey || fields[1]?.id || "")

  // Process data for charts
  const processData = () => {
    if (!data || data.length === 0) return []

    if (chartType === "pie") {
      // For pie charts, we need to aggregate data
      const aggregated = {}
      data.forEach((item) => {
        const key = item[selectedXKey]
        if (key) {
          if (!aggregated[key]) {
            aggregated[key] = 0
          }
          const value = item[selectedYKey]
          aggregated[key] += typeof value === "number" ? value : 1
        }
      })

      return Object.keys(aggregated).map((key) => ({
        name: key,
        value: aggregated[key],
      }))
    }

    // For bar charts, we can use the data directly
    return data.map((item) => ({
      name: item[selectedXKey] || "Unknown",
      value: item[selectedYKey] || 0,
    }))
  }

  const chartData = processData()

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Chart Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="pie">Pie Chart</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="x-axis">X Axis / Category</Label>
            <Select value={selectedXKey} onValueChange={setSelectedXKey}>
              <SelectTrigger id="x-axis">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="y-axis">Y Axis / Value</Label>
            <Select value={selectedYKey} onValueChange={setSelectedYKey}>
              <SelectTrigger id="y-axis">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available for visualization</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
