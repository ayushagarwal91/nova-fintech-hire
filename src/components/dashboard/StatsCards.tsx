import { Card } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Briefcase, FileText, Calendar, Clock, Percent } from "lucide-react";
import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="mb-8">
      {/* Main Stats Grid - 4 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Candidates</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Shortlisted</p>
              <p className="text-3xl font-bold text-foreground">{stats.shortlisted}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Open Positions</p>
              <p className="text-3xl font-bold text-foreground">{stats.openPositions}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Postings</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeJobPostings}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <FileText className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats Grid - 3 columns */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg Resume Score</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgScore}</p>
              <p className="text-xs text-muted-foreground mt-1">out of 10</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg Time to Hire</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgTimeToHire}</p>
              <p className="text-xs text-muted-foreground mt-1">days</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground">{stats.conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">applied → hired</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Percent className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Interview Stats - Full Width */}
      <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-3">Interviews Scheduled</p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{stats.interviewsToday}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{stats.interviewsThisWeek}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
