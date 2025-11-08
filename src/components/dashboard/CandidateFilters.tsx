import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

interface CandidateFiltersProps {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  onSearchChange: (query: string) => void;
  onRoleChange: (role: string) => void;
  onStatusChange: (status: string) => void;
}

export const CandidateFilters = ({
  searchQuery,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange
}: CandidateFiltersProps) => {
  return (
    <Card className="p-6 mb-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        
        <Select value={roleFilter} onValueChange={onRoleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Backend">Backend</SelectItem>
            <SelectItem value="Frontend">Frontend</SelectItem>
            <SelectItem value="Data Analyst">Data Analyst</SelectItem>
            <SelectItem value="ML">ML</SelectItem>
            <SelectItem value="DevOps">DevOps</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Applied">Applied</SelectItem>
            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
            <SelectItem value="Assignment">Assignment</SelectItem>
            <SelectItem value="Interview">Interview</SelectItem>
            <SelectItem value="Ranked">Ranked</SelectItem>
            <SelectItem value="Not Shortlisted">Not Shortlisted</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};
