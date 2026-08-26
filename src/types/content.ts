export interface Question {
  id: string;
  type: "mcq";
  q: string;
  options: string[];
  answer: number; // 0-based index
  explain: string;
}

export interface Quiz {
  passThreshold: number; // e.g. 0.8
  questions: Question[];
}

export interface FillInBlank {
  id: string;
  prompt: string;
  code: string; // contains ______
  answers: string[]; // correct variations
  output: string; // pre-stored expected stdout
  explain?: string; // detailed explanation (from track2 onwards)
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface Topic {
  id: string; // e.g. "track1.variables"
  trackId: string; // e.g. "track1"
  order: number;
  title: string;
  content: string; // Markdown text
  fillBlanks: FillInBlank[];
  quiz: Quiz;
  faq: FAQItem[];
}

export interface Track {
  id: string; // e.g. "track1"
  order: number;
  title: string;
  description: string;
  topicOrder: string[];
  topicFiles: string[];
  projectFile: string;
}

export interface ProjectDataset {
  description: string;
  code: string;
}

export interface ProjectMission {
  id: string;
  prompt: string;
  code: string;
  answers: string[];
  output: string;
  explain?: string;
}

export interface ProjectReport {
  title: string;
  template: string;
  computedValues: Record<string, string | number>;
  conceptsUsed: string[];
}

export interface Project {
  id: string; // e.g. "track1.project"
  trackId: string;
  title: string;
  intro: string;
  dataset: ProjectDataset;
  missions: ProjectMission[];
  report: ProjectReport;
}

export interface BadgeCondition {
  type:
    | "topic_count"
    | "topic_percent"
    | "quiz_pass_count"
    | "perfect_quiz_count"
    | "project_count"
    | "track_complete"
    | "all_tracks_complete"
    | "flawless_track"
    | "streak"
    | "level";
  gte?: number;
  trackId?: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  desc: string;
  icon: string;
  condition: BadgeCondition;
}

export interface BadgesConfig {
  conditionTypes: Record<string, string>;
  badges: BadgeDefinition[];
}

export interface XpAwards {
  dailyLogin: number;
  streakMilestone: Record<string, number>;
  streakRepeating: {
    everyDays: number;
    xp: number;
  };
  topicComplete: number;
  quizPass: number;
  quizPerfectBonus: number;
  trackComplete: number;
  projectComplete: number;
}

export interface XpRulesConfig {
  levelFormula: {
    type: string;
    baseCost: number;
    increment: number;
    description: string;
    levelFromXpFormula: string;
  };
  awards: XpAwards;
  rules: {
    oneTimePerItem: string[];
    dailyOncePerDay: string[];
    streakMilestoneOnce: boolean;
    streakRepeatingEvery: number;
    quizPerfectBonusBasis: string;
  };
}
