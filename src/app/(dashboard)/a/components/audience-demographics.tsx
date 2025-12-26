"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Users, MapPin, Globe, BarChart2, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data for fallback/development if API returns empty
const MOCK_AGE_GENDER = {
  "F.13-17": 5, "M.13-17": 2,
  "F.18-24": 25, "M.18-24": 18,
  "F.25-34": 45, "M.25-34": 32,
  "F.35-44": 15, "M.35-44": 12,
  "F.45-54": 8, "M.45-54": 5,
  "F.55+": 3, "M.55+": 2,
};

const MOCK_COUNTRIES = { "US": 120, "GB": 45, "CA": 32, "AU": 28, "IN": 15 };
const MOCK_CITIES = { "New York": 45, "London": 32, "Toronto": 25, "Sydney": 18, "Los Angeles": 15 };

interface AgeGenderData {
  age: string;
  female: number;
  male: number;
  unknown: number;
}

export function AudienceDemographics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDemographics() {
      try {
        const res = await fetch("/api/analytics/facebook/demographics");
        const json = await res.json();

        // Use Mock data if API returns null/empty (for demo purposes if no account connected)
        // In production, you might want to show empty state instead
        if (!json.demographics || Object.keys(json.demographics.ageGender || {}).length === 0) {
          // Fallback to mock data for visualization if enabled, or just set null
          // For this implementation, I'll allow it to be null to show the empty state, 
          // but uncomment below line to test with mock data during dev
          // setData({ ageGender: MOCK_AGE_GENDER, countries: MOCK_COUNTRIES, cities: MOCK_CITIES });
          setData(null);
        } else {
          setData(json.demographics);
        }
      } catch (err) {
        console.error("Failed to load demographics:", err);
        setError("Failed to load demographic data");
      } finally {
        setLoading(false);
      }
    }
    fetchDemographics();
  }, []);

  const processedData = useMemo(() => {
    if (!data?.ageGender) return [];

    const ageMap: Record<string, AgeGenderData> = {};
    const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

    // Initialize with 0
    ageOrder.forEach(age => {
      ageMap[age] = { age, female: 0, male: 0, unknown: 0 };
    });

    Object.entries(data.ageGender).forEach(([key, value]: [string, any]) => {
      const portions = key.split(".");
      if (portions.length !== 2) return;

      const [genderCode, ageRange] = portions;
      // Handle "65+" usually coming as "65-" or similar variants, verify graph api actuals
      // Standard graph api keys: F.13-17, etc.

      if (!ageMap[ageRange]) {
        // If range not in our predefined list, add it (e.g. 55+ might be different)
        ageMap[ageRange] = { age: ageRange, female: 0, male: 0, unknown: 0 };
      }

      const val = Number(value);
      if (genderCode === "F") ageMap[ageRange].female += val;
      else if (genderCode === "M") ageMap[ageRange].male += val;
      else ageMap[ageRange].unknown += val;
    });

    // Sort by standard age order if possible, else alphabetical
    return Object.values(ageMap).sort((a, b) => {
      const indexA = ageOrder.indexOf(a.age);
      const indexB = ageOrder.indexOf(b.age);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      return a.age.localeCompare(b.age);
    }).filter(item => item.female > 0 || item.male > 0 || item.unknown > 0);

  }, [data]);

  const locationData = useMemo(() => {
    if (!data) return { countries: [], cities: [] };

    const countTotal = (obj: any) => Object.values(obj).reduce((a: any, b: any) => a + b, 0);

    const totalCountries = countTotal(data.countries || {});
    const totalCities = countTotal(data.cities || {});

    const countries = Object.entries(data.countries || {})
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 8)
      .map(([name, count]: any) => ({
        name,
        count,
        percentage: totalCountries ? (count / (totalCountries as number)) * 100 : 0
      }));

    const cities = Object.entries(data.cities || {})
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 8)
      .map(([name, count]: any) => ({
        name,
        count,
        percentage: totalCities ? (count / (totalCities as number)) * 100 : 0
      }));

    return { countries, cities };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-secondary-200 bg-white/50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed bg-secondary-50/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="rounded-full bg-blue-100 p-4 mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900">No Audience Data Available</h3>
          <p className="max-w-xs mx-auto mt-2 text-sm">
            Connect a Facebook page or wait for sufficient audience data to accumulate to see demographics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Age & Gender Distribution */}
      <Card className="col-span-1 border-secondary-100 shadow-lg bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Age & Gender</CardTitle>
              <CardDescription>Distribution of your audience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.4} />
                <XAxis
                  dataKey="age"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                  }}
                  itemStyle={{ color: "#fff" }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '20px' }}
                />
                <Bar
                  dataKey="female"
                  name="Women"
                  fill="hsl(347, 77%, 62%)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="male"
                  name="Men"
                  fill="hsl(199, 89%, 48%)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="unknown"
                  name="Other"
                  fill="hsl(220, 10%, 62%)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Location Breakdown */}
      <Card className="col-span-1 border-secondary-100 shadow-lg bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Globe className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Top Locations</CardTitle>
              <CardDescription>Where your audience is based</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="countries" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="countries">Countries</TabsTrigger>
              <TabsTrigger value="cities">Cities</TabsTrigger>
            </TabsList>

            <TabsContent value="countries" className="space-y-5 animate-in fade-in-50">
              {locationData.countries.map((item, i) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-secondary-400 w-5">{i + 1}</span>
                      <span className="font-medium text-secondary-900">{item.name}</span>
                    </div>
                    <span className="text-secondary-500 font-mono text-xs">{item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-2 bg-secondary-100" indicatorClassName="bg-primary-500" />
                </div>
              ))}
              {locationData.countries.length === 0 && (
                <p className="text-center text-sm text-secondary-400 py-8">No specific country data available</p>
              )}
            </TabsContent>

            <TabsContent value="cities" className="space-y-5 animate-in fade-in-50">
              {locationData.cities.map((item, i) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-secondary-400 w-5">{i + 1}</span>
                      <span className="font-medium text-secondary-900">{item.name}</span>
                    </div>
                    <span className="text-secondary-500 font-mono text-xs">{item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-2 bg-secondary-100" indicatorClassName="bg-accent-indigo" />
                </div>
              ))}
              {locationData.cities.length === 0 && (
                <p className="text-center text-sm text-secondary-400 py-8">No specific city data available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

