import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Brain, CheckCircle, TrendingUp, Zap, Plus } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-primary text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-block rounded-2xl bg-accent/20 p-4">
              <Brain className="h-16 w-16 text-accent" />
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
              AI-Powered Fintech Hiring
            </h1>
            <p className="mb-8 text-xl text-white/90 md:text-2xl">
              NovaHire streamlines your technical recruitment with end-to-end AI automation. 
              From resume screening to interviews, we deliver your top 3 candidates automatically.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row justify-center">
              <Button 
                asChild 
                size="lg"
                className="h-14 px-8 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Link to="/apply">Apply for Jobs</Link>
              </Button>
              <Button 
                asChild 
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg border-2 border-white text-white hover:bg-white hover:text-primary"
              >
                <Link to="/post-job">
                  <Plus className="mr-2 h-5 w-5" />
                  Post a Job
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg border-2 border-white text-white hover:bg-white hover:text-primary"
              >
                <Link to="/dashboard">Admin Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Four AI-powered stages to find the perfect fintech talent
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="mb-4 rounded-xl bg-accent/10 p-3 w-fit">
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">1. Resume Analysis</h3>
              <p className="text-muted-foreground">
                AI extracts skills and fintech experience, scoring job fit 0-10. 
                Score ≥7 advances to assignment stage.
              </p>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="mb-4 rounded-xl bg-primary/10 p-3 w-fit">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">2. Assignment</h3>
              <p className="text-muted-foreground">
                AI generates role-specific coding challenges with fintech context. 
                Evaluates accuracy, clarity, and relevance.
              </p>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="mb-4 rounded-xl bg-accent/10 p-3 w-fit">
                <Brain className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">3. AI Interview</h3>
              <p className="text-muted-foreground">
                Text-based interview with 5-7 fintech-relevant technical questions. 
                Instant evaluation and scoring.
              </p>
            </Card>

            <Card className="p-6 shadow-card hover:shadow-elevated transition-shadow">
              <div className="mb-4 rounded-xl bg-primary/10 p-3 w-fit">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">4. Ranking</h3>
              <p className="text-muted-foreground">
                Composite score: Resume 20% + Assignment 40% + Interview 40%. 
                Get your top 3 ranked candidates automatically.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="mb-6 text-4xl font-bold">Why Choose NovaHire?</h2>
              <ul className="space-y-4">
                {[
                  "Save 80% of screening time with AI automation",
                  "Eliminate unconscious bias with data-driven scoring",
                  "Fintech-specific technical assessments",
                  "Real-time candidate tracking and analytics",
                  "Seamless integration with your workflow"
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Zap className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Card className="p-8 shadow-elevated bg-gradient-accent">
              <div className="text-accent-foreground">
                <h3 className="mb-4 text-3xl font-bold">Ready to Transform Your Hiring?</h3>
                <p className="mb-6 text-lg opacity-90">
                  Join leading fintech companies using AI to find exceptional talent faster.
                </p>
                <Button 
                  asChild 
                  size="lg"
                  className="h-12 bg-white text-primary hover:bg-white/90 w-full"
                >
                  <Link to="/apply">Start Application</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
