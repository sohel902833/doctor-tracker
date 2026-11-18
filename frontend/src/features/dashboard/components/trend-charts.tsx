"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPeriod, type Dashboard } from "../api";

const visitsConfig = {
  firstVisits: { label: "First visits", color: "var(--series-1)" },
  followUps: { label: "Follow-ups", color: "var(--series-2)" },
} satisfies ChartConfig;

const newPatientsConfig = {
  newPatients: { label: "New patients", color: "var(--series-1)" },
} satisfies ChartConfig;

const axisProps = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  fontSize: 12,
} as const;

/**
 * Consultations over time, split into first visits and follow-ups.
 * Stacked bars (parts of one total); a table view is one click away.
 */
export function ConsultationTrendChart({ dashboard }: { dashboard: Dashboard }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const { trend, range } = dashboard;
  const data = trend.map((t) => ({ ...t, label: formatPeriod(t.period, range.interval) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultations</CardTitle>
        <CardDescription>
          {dashboard.period.consultations.toLocaleString()} in this period, per {range.interval}
        </CardDescription>
        <CardAction>
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="View">
            {(["chart", "table"] as const).map((v) => (
              <Button key={v} size="xs" variant={view === v ? "secondary" : "ghost"} onClick={() => setView(v)} aria-pressed={view === v}>
                {v === "chart" ? "Chart" : "Table"}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {view === "chart" ? (
          <ChartContainer config={visitsConfig} className="aspect-auto h-72 w-full">
            <BarChart data={data} margin={{ left: 0, right: 4 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} allowDecimals={false} width={40} />
              <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {/* 2px surface stroke separates the stacked segments. */}
              <Bar dataKey="firstVisits" stackId="visits" fill="var(--color-firstVisits)" stroke="var(--card)" strokeWidth={2} />
              <Bar dataKey="followUps" stackId="visits" fill="var(--color-followUps)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">First visits</TableHead>
                  <TableHead className="text-right">Follow-ups</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data].reverse().map((row) => (
                  <TableRow key={row.period}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.firstVisits}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.followUps}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{row.consultations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** New patients over time: one series, so the title names it (no legend). */
export function NewPatientsChart({ dashboard }: { dashboard: Dashboard }) {
  const { trend, range, scope } = dashboard;
  const data = trend.map((t) => ({ ...t, label: formatPeriod(t.period, range.interval) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>New patients</CardTitle>
        <CardDescription>
          {dashboard.period.newPatients.toLocaleString()} {scope === "doctor" ? "first visits with you" : "registered"} in this period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={newPatientsConfig} className="aspect-auto h-72 w-full">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} allowDecimals={false} width={40} />
            <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent indicator="line" />} />
            <Line
              dataKey="newPatients"
              type="monotone"
              stroke="var(--color-newPatients)"
              strokeWidth={2}
              dot={data.length <= 31 ? { r: 3, strokeWidth: 2, fill: "var(--card)" } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
