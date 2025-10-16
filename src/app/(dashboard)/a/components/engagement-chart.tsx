"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { date: "Jan 1", impressions: 4000, engagement: 2400, followers: 2400 },
  { date: "Jan 5", impressions: 3000, engagement: 1398, followers: 2210 },
  { date: "Jan 10", impressions: 2000, engagement: 9800, followers: 2290 },
  { date: "Jan 15", impressions: 2780, engagement: 3908, followers: 2000 },
  { date: "Jan 20", impressions: 1890, engagement: 4800, followers: 2181 },
  { date: "Jan 25", impressions: 2390, engagement: 3800, followers: 2500 },
  { date: "Jan 30", impressions: 3490, engagement: 4300, followers: 2100 },
];

export function EngagementChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impressions Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
            <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: "#0ea5e9", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

