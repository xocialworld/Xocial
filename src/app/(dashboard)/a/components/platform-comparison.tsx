"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { platform: "Facebook", impressions: 12000, engagement: 850, followers: 5200 },
  { platform: "Instagram", impressions: 15000, engagement: 1200, followers: 6800 },
  { platform: "Twitter", impressions: 8000, engagement: 650, followers: 3400 },
  { platform: "LinkedIn", impressions: 5000, engagement: 420, followers: 2200 },
  { platform: "YouTube", impressions: 20000, engagement: 1800, followers: 8500 },
];

export function PlatformComparison() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="platform" stroke="#64748b" style={{ fontSize: "12px" }} />
            <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="impressions" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            <Bar dataKey="engagement" fill="#22c55e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

