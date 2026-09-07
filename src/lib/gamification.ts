import { BadgeDefinition, BadgeCondition } from "@/types/content";
import { UserProgressRow, UserStatsRow, UserBadgeRow } from "@/types/database";

/**
 * Calculates current level from cumulative XP.
 * Formula from SPEC:
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

/**
 * Calculates XP earned from a set of progress rows (e.g. for a specific course).
 */
export function calculateXpFromProgress(progressRows: UserProgressRow[]): number {
  let total = 0;
  for (const row of progressRows) {
    if (row.status === "completed") {
      if (row.topic_id.endsWith(".project")) {
        total += 300; // Project completion
      } else {
        total += 50; // Topic completion
      }
    }
    if (row.quiz_passed) {
      total += 30; // Quiz pass
      if (row.quiz_score === 1 || row.quiz_score === 100) {
        total += 20; // Perfect bonus
      }
    }
  }
  return total;
}

export interface CheckBadgesParams {
  stats: UserStatsRow;
  allProgress: Record<string, UserProgressRow>; // Keyed by composite e.g. "python:track1.variables" or map
  courseProgressMap?: Record<string, Record<string, UserProgressRow>>; // courseId -> topicId -> row
  existingBadges: UserBadgeRow[];
  allBadges: BadgeDefinition[];
  courseTrackTopicsCount?: Record<string, Record<string, number>>; // courseId -> trackId -> topic count
  courseTotalTopicsCount?: Record<string, number>; // courseId -> total topics count
  courseTotalTracksCount?: Record<string, number>; // courseId -> total tracks count
  currentCourseId?: string;
}

/**
 * Evaluates conditions for both course-scoped and global-scoped badges.
 * Returns array of newly unlocked badge IDs.
 */
export function evaluateBadges({
  stats,
  allProgress,
  courseProgressMap = {},
  existingBadges,
  allBadges,
  courseTrackTopicsCount = {},
  courseTotalTopicsCount = {},
  courseTotalTracksCount = {},
  currentCourseId,
}: CheckBadgesParams): string[] {
  const earnedBadgeIds = new Set(existingBadges.map((b) => b.badge_id));
  const newBadges: string[] = [];

  const progressList = Object.values(allProgress);
  const globalCompletedTopicsCount = progressList.filter(
    (p) => p.status === "completed" && !p.topic_id.endsWith(".project")
  ).length;

  const currentGlobalLevel = getLevel(stats.xp);
  const currentStreak = stats.streak_count || 0;

  // Calculate courses started & completed
  let coursesStartedCount = 0;
  let coursesCompletedCount = 0;

  for (const [cId, totalTopics] of Object.entries(courseTotalTopicsCount)) {
    const cProg = courseProgressMap[cId]
      ? Object.values(courseProgressMap[cId])
      : progressList.filter((p) => p.course === cId);

    const cCompletedTopics = cProg.filter(
      (p) => p.status === "completed" && !p.topic_id.endsWith(".project")
    ).length;

    if (cCompletedTopics >= 1) {
      coursesStartedCount++;
    }

    const cTrackCounts = courseTrackTopicsCount[cId] || {};
    let allTracksDone = Object.keys(cTrackCounts).length > 0;
    for (const [tId, tTotal] of Object.entries(cTrackCounts)) {
      const tDone = cProg.filter(
        (p) => p.topic_id.startsWith(`${tId}.`) && !p.topic_id.endsWith(".project") && p.status === "completed"
      ).length;
      if (tDone < tTotal) {
        allTracksDone = false;
        break;
      }
    }

    if (allTracksDone && cCompletedTopics >= totalTopics) {
      coursesCompletedCount++;
    }
  }

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) {
      continue;
    }

    const { condition, scope, course } = badge;
    const targetCourse = course || currentCourseId || "python";
    let earned = false;

    // A. GLOBAL BADGE EVALUATION
    if (scope === "global") {
      switch (condition.type) {
        case "global_level":
          if (condition.gte && currentGlobalLevel >= condition.gte) {
            earned = true;
          }
          break;

        case "global_xp":
          if (condition.gte && (stats.xp || 0) >= condition.gte) {
            earned = true;
          }
          break;

        case "courses_started":
          if (condition.gte && coursesStartedCount >= condition.gte) {
            earned = true;
          }
          break;

        case "courses_completed":
          if (condition.gte && coursesCompletedCount >= condition.gte) {
            earned = true;
          }
          break;

        case "global_topic_count":
          if (condition.gte && globalCompletedTopicsCount >= condition.gte) {
            earned = true;
          }
          break;

        case "streak":
          if (condition.gte && currentStreak >= condition.gte) {
            earned = true;
          }
          break;
      }
    } else {
      // B. COURSE-SCOPED BADGE EVALUATION
      const cProg = courseProgressMap[targetCourse]
        ? Object.values(courseProgressMap[targetCourse])
        : progressList.filter((p) => p.course === targetCourse);

      const completedProgressList = cProg.filter((p) => p.status === "completed");
      const completedTopicsCount = completedProgressList.filter(
        (p) => !p.topic_id.endsWith(".project")
      ).length;

      const quizPassedList = cProg.filter((p) => p.quiz_passed);
      const quizPassCount = quizPassedList.length;

      const perfectQuizCount = cProg.filter(
        (p) => p.quiz_passed && (p.quiz_score === 1 || p.quiz_score === 100)
      ).length;

      const completedProjectsCount = cProg.filter(
        (p) => p.topic_id.endsWith(".project") && p.status === "completed"
      ).length;

      const courseXp = calculateXpFromProgress(cProg);
      const courseLevel = getLevel(courseXp);
      const trackTopicsCount = courseTrackTopicsCount[targetCourse] || {};
      const totalTopicsCount = courseTotalTopicsCount[targetCourse] || 0;
      const totalTracksCount = courseTotalTracksCount[targetCourse] || 0;

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
            const totalTrackTopics = trackTopicsCount[condition.trackId] || 0;
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
          for (const [trackId, totalCount] of Object.entries(trackTopicsCount)) {
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
          for (const [trackId, totalCount] of Object.entries(trackTopicsCount)) {
            if (totalCount === 0) continue;
            const trackPerfectQuizzes = cProg.filter(
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
          if (condition.gte && courseLevel >= condition.gte) {
            earned = true;
          }
          break;
      }
    }

    if (earned) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
}

/**
 * Converts badge condition object into a natural human-readable Korean sentence.
 */
export function describeBadgeCondition(
  condition: BadgeCondition,
  trackTitles?: Record<string, string>
): string {
  const gte = condition.gte ?? 1;

  switch (condition.type) {
    case "topic_count":
      return `토픽 ${gte}개를 완료하면 획득`;
    case "quiz_pass_count":
      return `퀴즈 ${gte}개를 통과하면 획득`;
    case "project_count":
      return `미니 프로젝트 ${gte}개를 완료하면 획득`;
    case "perfect_quiz_count":
      return `퀴즈를 ${gte}번 만점 통과하면 획득`;
    case "topic_percent":
      return `과목 전체 토픽의 ${gte}%를 완료하면 획득`;
    case "streak":
      return `${gte}일 연속 접속하면 획득`;
    case "level":
      return `과목 레벨 ${gte}에 도달하면 획득`;
    case "global_level":
      return `통합 레벨 ${gte}에 도달하면 획득`;
    case "global_xp":
      return `통합 누적 ${gte.toLocaleString()} XP에 도달하면 획득`;
    case "courses_started":
      return `${gte}개 과목 학습을 시작하면 획득`;
    case "courses_completed":
      return `${gte}개 과목을 모두 완주하면 획득`;
    case "global_topic_count":
      return `전 과목 토픽 ${gte}개를 완료하면 획득`;
    case "track_complete": {
      const trackName = (condition.trackId && trackTitles?.[condition.trackId]) || condition.trackId || "해당 트랙";
      return `${trackName}의 모든 토픽을 완료하면 획득`;
    }
    case "all_tracks_complete":
      return "과목의 모든 트랙을 완주하면 획득";
    case "flawless_track":
      return "한 트랙의 모든 퀴즈를 만점 통과하면 획득";
    default:
      return "조건 달성 시 획득";
  }
}
