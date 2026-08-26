import { BadgeDefinition } from "@/types/content";
import { UserProgressRow, UserStatsRow, UserBadgeRow } from "@/types/database";

/**
 * Calculates current level from cumulative XP.
 * Formula from SPEC 4.1:
 * Lv(k) cumulative XP = 25k^2 + 175k - 200
 * Inverse: level = Math.floor((-175 + Math.sqrt(175 * 175 + 100 * (xp + 200))) / 50), minimum 1
 */
export function getLevel(xp: number): number {
  if (xp <= 0) return 1;
  const n = (-175 + Math.sqrt(175 * 175 + 100 * (xp + 200))) / 50;
  return Math.max(1, Math.floor(n));
}

/**
 * Returns cumulative XP required to reach a specific level.
 * Level 1 = 0 XP
 * Level 2 = 250 XP
 * Level 3 = 550 XP
 */
export function getCumulativeXpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  return 25 * targetLevel * targetLevel + 175 * targetLevel - 200;
}

/**
 * Returns detailed level progress info for UI bars.
 */
export function getLevelProgress(xp: number) {
  const level = getLevel(xp);
  const currentLevelBaseXp = getCumulativeXpForLevel(level);
  const nextLevelBaseXp = getCumulativeXpForLevel(level + 1);
  const xpInCurrentLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpRequiredForNext = Math.max(1, nextLevelBaseXp - currentLevelBaseXp);
  const percent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));

  return {
    level,
    xp,
    currentLevelBaseXp,
    nextLevelBaseXp,
    xpInCurrentLevel,
    xpRequiredForNext,
    percent: Math.round(percent),
  };
}

export interface CheckBadgesParams {
  stats: UserStatsRow;
  progress: Record<string, UserProgressRow>;
  existingBadges: UserBadgeRow[];
  allBadges: BadgeDefinition[];
  allTrackTopicsCount: Record<string, number>;
  totalTopicsCount: number;
  totalTracksCount: number;
}

/**
 * Evaluates conditions in badges.json and returns an array of newly unlocked badge IDs.
 */
export function evaluateBadges({
  stats,
  progress,
  existingBadges,
  allBadges,
  allTrackTopicsCount,
  totalTopicsCount,
  totalTracksCount,
}: CheckBadgesParams): string[] {
  const earnedBadgeIds = new Set(existingBadges.map((b) => b.badge_id));
  const newBadges: string[] = [];

  const completedProgressList = Object.values(progress).filter(
    (p) => p.status === "completed"
  );
  const completedTopicsCount = completedProgressList.filter(
    (p) => !p.topic_id.endsWith(".project")
  ).length;

  const quizPassedList = Object.values(progress).filter((p) => p.quiz_passed);
  const quizPassCount = quizPassedList.length;

  // Perfect quiz count (quiz_score === 1.0 or 100% on first pass)
  const perfectQuizCount = Object.values(progress).filter(
    (p) => p.quiz_passed && (p.quiz_score === 1 || p.quiz_score === 100)
  ).length;

  const completedProjectsCount = Object.values(progress).filter(
    (p) => p.topic_id.endsWith(".project") && p.status === "completed"
  ).length;

  const currentLevel = getLevel(stats.xp);
  const currentStreak = stats.streak_count || 0;

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) {
      continue;
    }

    const { condition } = badge;
    let earned = false;

    switch (condition.type) {
      case "topic_count":
        if (condition.gte && completedTopicsCount >= condition.gte) {
          earned = true;
        }
        break;

      case "topic_percent":
        if (condition.gte && totalTopicsCount > 0) {
          const percent = (completedTopicsCount / totalTopicsCount) * 100;
          if (percent >= condition.gte) {
            earned = true;
          }
        }
        break;

      case "quiz_pass_count":
        if (condition.gte && quizPassCount >= condition.gte) {
          earned = true;
        }
        break;

      case "perfect_quiz_count":
        if (condition.gte && perfectQuizCount >= condition.gte) {
          earned = true;
        }
        break;

      case "project_count":
        if (condition.gte && completedProjectsCount >= condition.gte) {
          earned = true;
        }
        break;

      case "track_complete":
        if (condition.trackId) {
          const totalTrackTopics = allTrackTopicsCount[condition.trackId] || 0;
          if (totalTrackTopics > 0) {
            const trackCompletedCount = completedProgressList.filter(
              (p) =>
                p.topic_id.startsWith(`${condition.trackId}.`) &&
                !p.topic_id.endsWith(".project")
            ).length;
            if (trackCompletedCount >= totalTrackTopics) {
              earned = true;
            }
          }
        }
        break;

      case "all_tracks_complete": {
        let allDone = totalTracksCount > 0;
        for (const [trackId, totalCount] of Object.entries(allTrackTopicsCount)) {
          const trackCompletedCount = completedProgressList.filter(
            (p) =>
              p.topic_id.startsWith(`${trackId}.`) &&
              !p.topic_id.endsWith(".project")
          ).length;
          if (trackCompletedCount < totalCount) {
            allDone = false;
            break;
          }
        }
        if (allDone) {
          earned = true;
        }
        break;
      }

      case "flawless_track": {
        for (const [trackId, totalCount] of Object.entries(allTrackTopicsCount)) {
          if (totalCount === 0) continue;
          const trackPerfectQuizzes = Object.values(progress).filter(
            (p) =>
              p.topic_id.startsWith(`${trackId}.`) &&
              !p.topic_id.endsWith(".project") &&
              p.quiz_passed &&
              (p.quiz_score === 1 || p.quiz_score === 100)
          ).length;
          if (trackPerfectQuizzes >= totalCount) {
            earned = true;
            break;
          }
        }
        break;
      }

      case "streak":
        if (condition.gte && currentStreak >= condition.gte) {
          earned = true;
        }
        break;

      case "level":
        if (condition.gte && currentLevel >= condition.gte) {
          earned = true;
        }
        break;
    }

    if (earned) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}
