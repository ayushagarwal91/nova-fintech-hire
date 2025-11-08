import { Card } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import { CandidateStats } from "@/types";

interface StatsCardsProps {
  stats: CandidateStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-3 mb-8">
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
  );
};
