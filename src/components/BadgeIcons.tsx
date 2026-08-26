import React from "react";
import {
  Footprints,
  CheckCircle2,
  Rocket,
  Code2,
  Calculator,
  Smile,
  Sparkles,
  Layers,
  BarChart3,
  Medal,
  PieChart,
  Trophy,
  Briefcase,
  Star,
  Award,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Zap,
  Crown,
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
    case "panda":
      return <Smile className={className} />;
    case "broom":
      return <Sparkles className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "chart":
      return <BarChart3 className={className} />;
    case "medal":
      return <Medal className={className} />;
    case "half":
      return <PieChart className={className} />;
    case "trophy":
      return <Trophy className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    case "star":
      return <Star className={className} />;
    case "stars":
      return <Award className={className} />;
    case "shield":
      return <ShieldCheck className={className} />;
    case "flame":
      return <Flame className={className} />;
    case "level":
      return <Zap className={className} />;
    case "crown":
      return <Crown className={className} />;
    default:
      return <Award className={className} />;
  }
}
