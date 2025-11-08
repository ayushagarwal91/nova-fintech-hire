import { Card } from "@/components/ui/card";
import { Assignment } from "@/hooks/useAssignments";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

interface AssignmentStatsProps {
  assignments: Assignment[];
}

export const AssignmentStats = ({ assignments }: AssignmentStatsProps) => {
  const pending = assignments.filter(a => a.status === 'pending').length;
  const submitted = assignments.filter(a => a.status === 'submitted').length;
  const passed = assignments.filter(a => a.status === 'passed').length;
  const failed = assignments.filter(a => a.status === 'failed').length;

  const stats = [
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
    {
      label: "Submitted",
      value: submitted,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Passed",
      value: passed,
      icon: CheckCircle,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Failed",
      value: failed,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
