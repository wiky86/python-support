import React from "react";
import {
  Footprints,
  CheckCircle2,
  Rocket,
  Code2,
  Calculator,
  Table,
  Filter,
  Sigma,
  BarChart3,
  Brain,
  Milestone,
  Trophy,
  Award,
  Star,
  Sparkles,
  Gem,
  Flame,
  ChevronsUp,
  Crown,
  BookOpen,
  TrendingUp,
  Building2,
  LineChart,
  Globe,
  GitBranch,
  ShieldCheck,
  Cpu,
  Smartphone,
  Layers,
  Medal,
  Zap,
  ListChecks,
  Terminal,
  Landmark,
} from "lucide-react";

interface BadgeIconProps {
  icon: string;
  className?: string;
}

export function BadgeIcon({ icon, className = "w-6 h-6" }: BadgeIconProps) {
  switch (icon) {
    case "footprints":
      return <Footprints className={className} />;
    case "check":
      return <CheckCircle2 className={className} />;
    case "rocket":
      return <Rocket className={className} />;
    case "python":
      return <Code2 className={className} />;
    case "calculator":
      return <Calculator className={className} />;
    case "table":
      return <Table className={className} />;
    case "filter":
      return <Filter className={className} />;
    case "sigma":
      return <Sigma className={className} />;
    case "bar-chart":
    case "chart":
      return <BarChart3 className={className} />;
    case "brain":
      return <Brain className={className} />;
    case "milestone":
    case "half":
      return <Milestone className={className} />;
    case "trophy":
      return <Trophy className={className} />;
    case "award":
    case "briefcase":
      return <Award className={className} />;
    case "star":
      return <Star className={className} />;
    case "stars":
      return <Sparkles className={className} />;
    case "gem":
      return <Gem className={className} />;
    case "flame":
      return <Flame className={className} />;
    case "chevrons-up":
      return <ChevronsUp className={className} />;
    case "crown":
      return <Crown className={className} />;
    case "book-open":
      return <BookOpen className={className} />;
    case "trending-up":
      return <TrendingUp className={className} />;
    case "building":
      return <Building2 className={className} />;
    case "line-chart":
      return <LineChart className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "git-branch":
      return <GitBranch className={className} />;
    case "shield":
      return <ShieldCheck className={className} />;
    case "cpu":
      return <Cpu className={className} />;
    case "smartphone":
      return <Smartphone className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "medal":
      return <Medal className={className} />;
    case "zap":
    case "level":
      return <Zap className={className} />;
    case "list-checks":
      return <ListChecks className={className} />;
    case "terminal":
      return <Terminal className={className} />;
    case "landmark":
      return <Landmark className={className} />;
    default:
      return <Award className={className} />;
  }
}
