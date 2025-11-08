import { Card } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Briefcase, FileText, Calendar, Clock, Percent } from "lucide-react";
import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="space-y-6 mb-8">
      {/* First Row - Existing Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Candidates</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Shortlisted</p>
              <p className="text-3xl font-bold text-foreground">{stats.shortlisted}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Resume Score</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgScore}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Second Row - Job Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Open Positions</p>
              <p className="text-3xl font-bold text-foreground">{stats.openPositions}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Job Postings</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeJobPostings}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Third Row - Interview Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Interviews Scheduled</p>
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.interviewsToday}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.interviewsThisWeek}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Average Time to Hire</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgTimeToHire}</p>
              <p className="text-xs text-muted-foreground mt-1">days</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fourth Row - Conversion Rate */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Conversion Rate (Applied → Hired)</p>
              <p className="text-3xl font-bold text-foreground">{stats.conversionRate}%</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Percent className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
