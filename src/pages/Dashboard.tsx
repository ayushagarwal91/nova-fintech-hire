import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CandidateFilters } from "@/components/dashboard/CandidateFilters";
import { CandidatesTable } from "@/components/dashboard/CandidatesTable";
import { useCandidates } from "@/hooks/useCandidates";
import { Candidate } from "@/types";

const Dashboard = () => {
  const navigate = useNavigate();
  const { candidates, stats, isLoading } = useCandidates();
  
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    filterCandidates();
  }, [candidates, roleFilter, statusFilter, searchQuery]);

  const filterCandidates = () => {
    let filtered = [...candidates];

    if (roleFilter !== "all") {
      filtered = filtered.filter(c => c.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-gradient-primary">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-white/80">Manage candidates and track hiring progress</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-6">
          <Button 
            onClick={() => navigate('/post-job')} 
            className="bg-gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </div>

        <StatsCards stats={stats} />

        <CandidateFilters 
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onRoleChange={setRoleFilter}
          onStatusChange={setStatusFilter}
        />

        <Card className="shadow-elevated">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Candidates</h2>
            <CandidatesTable 
              candidates={filteredCandidates}
              isLoading={isLoading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
