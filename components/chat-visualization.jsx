"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

/**
 * @param {Object} props
 * @param {Array} props.chatHistory - Chat history data
 */
export function ChatVisualization({ chatHistory }) {
  const [visualizationType, setVisualizationType] = useState("topics")

  // Extract topics from chat history
  const extractTopics = () => {
    const topics = {
      "AI Techniques": 0,
      Effectiveness: 0,
      Challenges: 0,
      Domains: 0,
      Other: 0,
    }

    chatHistory.forEach((message) => {
      if (message.role === "user") {
        const content = message.content.toLowerCase()
        if (content.includes("technique") || content.includes("method") || content.includes("approach")) {
          topics["AI Techniques"]++
        } else if (content.includes("effective") || content.includes("comparison") || content.includes("performance")) {
          topics["Effectiveness"]++
        } else if (content.includes("challenge") || content.includes("limitation") || content.includes("problem")) {
          topics["Challenges"]++
        } else if (content.includes("domain") || content.includes("field") || content.includes("area")) {
          topics["Domains"]++
        } else {
          topics["Other"]++
        }
      }
    })

    return Object.keys(topics)
      .map((key) => ({
        name: key,
        value: topics[key],
      }))
      .filter((item) => item.value > 0)
  }

  // Calculate interaction metrics
  const calculateInteractions = () => {
    const userMessages = chatHistory.filter((msg) => msg.role === "user").length
    const systemMessages = chatHistory.filter((msg) => msg.role === "system").length

    return [
      { name: "User Messages", value: userMessages },
      { name: "System Responses", value: systemMessages },
    ]
  }

  const topicData = extractTopics()
  const interactionData = calculateInteractions()

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Chat Analysis</span>
          <Tabs defaultValue="topics" onValueChange={setVisualizationType}>
            <TabsList>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {visualizationType === "topics" ? (
            topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {topicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No topic data available. Start asking questions to generate insights.</p>
              </div>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
