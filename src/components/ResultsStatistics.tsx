
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface ResultsStatisticsProps {
  results: any[];
}

const ResultsStatistics = ({ results }: ResultsStatisticsProps) => {
  const [statType, setStatType] = useState("placements");

  const getYearFromDate = (dateString: string) => {
    try {
      return dateString.split('-')[0];
    } catch (error) {
      return "Okänt år";
    }
  };

  // Statistik för placeringar (topp 3, topp 10)
  const calculatePlacementStats = () => {
    const yearStats: Record<string, { top3: number; top10: number; total: number }> = {};
    
    results.forEach(result => {
      const year = getYearFromDate(result.date);
      if (!yearStats[year]) {
        yearStats[year] = { top3: 0, top10: 0, total: 0 };
      }
      
      if (result.position <= 3) {
        yearStats[year].top3++;
      }
      if (result.position <= 10) {
        yearStats[year].top10++;
      }
      yearStats[year].total++;
    });
    
    return Object.entries(yearStats)
      .map(([year, stats]) => ({
        year,
        top3: stats.top3,
        top10: stats.top10,
        total: stats.total,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  };

  // Statistik för genomsnittsplacering per år
  const calculateAveragePlacements = () => {
    const yearStats: Record<string, { totalPosition: number; count: number }> = {};
    
    results.forEach(result => {
      if (!result.position) return;
      
      const year = getYearFromDate(result.date);
      if (!yearStats[year]) {
        yearStats[year] = { totalPosition: 0, count: 0 };
      }
      
      yearStats[year].totalPosition += result.position;
      yearStats[year].count++;
    });
    
    return Object.entries(yearStats)
      .map(([year, stats]) => ({
        year,
        averagePosition: Math.round((stats.totalPosition / stats.count) * 10) / 10,
        count: stats.count,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  };

  // Statistik för antal starter per år
  const calculateParticipations = () => {
    const yearStats: Record<string, number> = {};
    
    results.forEach(result => {
      const year = getYearFromDate(result.date);
      if (!yearStats[year]) {
        yearStats[year] = 0;
      }
      yearStats[year]++;
    });
    
    return Object.entries(yearStats)
      .map(([year, count]) => ({
        year,
        count,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  };

  let chartData = [];
  let chartConfig = {};
  
  switch (statType) {
    case "placements":
      chartData = calculatePlacementStats();
      chartConfig = {
        top3: { color: "#3498db", label: "Topp 3" },
        top10: { color: "#2ecc71", label: "Topp 10" },
      };
      break;
    case "average":
      chartData = calculateAveragePlacements();
      chartConfig = {
        averagePosition: { color: "#e74c3c", label: "Genomsnitt" },
      };
      break;
    case "participations":
      chartData = calculateParticipations();
      chartConfig = {
        count: { color: "#9b59b6", label: "Antal starter" },
      };
      break;
  }

  // Funktion för att skapa rätt BarCharts baserat på statistiktyp
  const renderChart = () => {
    switch (statType) {
      case "placements":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="top3" fill="#3498db" name="Topp 3" />
            <Bar dataKey="top10" fill="#2ecc71" name="Topp 10" />
          </BarChart>
        );
      case "average":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="averagePosition" fill="#e74c3c" name="Genomsnitt" />
          </BarChart>
        );
      case "participations":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#9b59b6" name="Antal starter" />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Statistik</CardTitle>
        <CardDescription>
          Översikt över klubbens resultat över tid
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Visa statistik för:</h3>
            <Select value={statType} onValueChange={setStatType}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Välj typ av statistik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placements">Placeringar (Topp 3, Topp 10)</SelectItem>
                <SelectItem value="average">Genomsnittsplacering per år</SelectItem>
                <SelectItem value="participations">Antal starter per år</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[300px] mt-2">
            <ChartContainer className="h-full" config={chartConfig}>
              {renderChart()}
              <ChartLegend verticalAlign="bottom">
                <ChartLegendContent />
              </ChartLegend>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsStatistics;
