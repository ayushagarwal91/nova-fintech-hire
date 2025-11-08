import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, TrendingUp, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  resume_score: number;
  created_at: string;
}

interface Stats {
  total: number;
  shortlisted: number;
  avgScore: number;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, shortlisted: 0, avgScore: 0 });
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [candidates, roleFilter, statusFilter, searchQuery]);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCandidates(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const shortlisted = data?.filter(c => c.status === 'Shortlisted' || c.status === 'Assignment' || c.status === 'Interview' || c.status === 'Ranked').length || 0;
      const avgScore = data?.reduce((acc, c) => acc + c.resume_score, 0) / (total || 1);
      
      setStats({ total, shortlisted, avgScore: Math.round(avgScore * 10) / 10 });
    } catch (error: any) {
      toast({
        title: "Error Loading Candidates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Applied': 'bg-muted text-muted-foreground',
      'Shortlisted': 'bg-accent/20 text-accent-foreground',
      'Assignment': 'bg-primary/20 text-primary',
      'Interview': 'bg-primary/30 text-primary',
      'Ranked': 'bg-accent text-accent-foreground',
      'Not Shortlisted': 'bg-destructive/20 text-destructive',
    };
    return colors[status] || 'bg-muted';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-accent';
    if (score >= 7) return 'text-primary';
    return 'text-muted-foreground';
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
        {/* Stats Cards */}
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

        {/* Filters */}
        <Card className="p-6 mb-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        {/* Candidates Table */}
        <Card className="shadow-elevated">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Candidates</h2>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading candidates...</p>
            ) : filteredCandidates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No candidates found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resume Score</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">{candidate.name}</TableCell>
                        <TableCell>{candidate.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{candidate.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(candidate.status)}>
                            {candidate.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getScoreColor(candidate.resume_score)}`}>
                            {candidate.resume_score}/10
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
