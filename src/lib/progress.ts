import { Track, Topic } from "@/types/content";
import { UserProgressRow, TopicStatus } from "@/types/database";

/**
 * Normalizes user input and expected answer strings for fill-in-the-blank comparisons.
 * 1. Trim leading/trailing whitespace
 * 2. Unify single quotes and double quotes to double quotes
 * 3. Remove all inner whitespace
 */
export function normalizeCodeString(s: string): string {
  if (!s) return "";
  return s.trim().replace(/['"]/g, '"').replace(/\s+/g, "");
}

/**
 * Checks if user's input matches any of the accepted answer variations.
 */
export function checkFillInBlank(input: string, answers: string[]): boolean {
  if (!input || !answers || answers.length === 0) return false;
  const normalizedInput = normalizeCodeString(input);
  return answers.some((a) => normalizeCodeString(a) === normalizedInput);
}

/**
 * Helper to get progress row by composite key or plain topic ID
 */
function getRow(progress: Record<string, UserProgressRow>, topicId: string, courseId?: string): UserProgressRow | undefined {
  if (courseId && progress[`${courseId}:${topicId}`]) {
    return progress[`${courseId}:${topicId}`];
  }
  return progress[topicId];
}

/**
 * Determines whether a topic is unlocked, in_progress, or completed.
 */
export function getTopicStatus(
  trackId: string,
  topicId: string,
  allTracks: Track[],
  progress: Record<string, UserProgressRow>
): TopicStatus {
  const trackIndex = allTracks.findIndex((t) => t.id === trackId);
  if (trackIndex === -1) return "locked";

  const track = allTracks[trackIndex];
  const courseId = track.courseId;

  const currentTopicRow = getRow(progress, topicId, courseId);

  // If the user already completed this topic:
  if (currentTopicRow?.status === "completed" && currentTopicRow?.quiz_passed) {
    return "completed";
  }

  const topicIndex = track.topicOrder.indexOf(topicId);
  if (topicIndex === -1) return "locked";

  // First topic of the first track is ALWAYS unlocked
  if (trackIndex === 0 && topicIndex === 0) {
    return currentTopicRow?.status || "in_progress";
  }

  // If it's the first topic of a subsequent track, check if the previous track is completed
  if (topicIndex === 0 && trackIndex > 0) {
    const prevTrack = allTracks[trackIndex - 1];
    const prevTrackAllTopicsDone = prevTrack.topicOrder.every((tid) => {
      const r = getRow(progress, tid, prevTrack.courseId);
      return r?.status === "completed" && r?.quiz_passed;
    });
    if (prevTrackAllTopicsDone) {
      return currentTopicRow?.status || "in_progress";
    }
    return "locked";
  }

  // Otherwise, check if the immediate previous topic in the current track is completed
  const prevTopicId = track.topicOrder[topicIndex - 1];
  const prevTopicRow = getRow(progress, prevTopicId, courseId);
  const prevTopicDone = prevTopicRow?.status === "completed" && prevTopicRow?.quiz_passed;

  if (prevTopicDone) {
    return currentTopicRow?.status || "in_progress";
  }

  return "locked";
}

/**
 * Determines if a track's mini-project is unlocked.
 * A mini project unlocks when ALL topics in that track are completed.
 */
export function isProjectUnlocked(
  track: Track,
  progress: Record<string, UserProgressRow>
): boolean {
  if (!track || !track.topicOrder || track.topicOrder.length === 0) return false;
  return track.topicOrder.every((topicId) => {
    const r = getRow(progress, topicId, track.courseId);
    return r?.status === "completed" && r?.quiz_passed;
  });
}

/**
 * Checks if a track is fully completed (all topics completed).
 */
export function isTrackCompleted(
  track: Track,
  progress: Record<string, UserProgressRow>
): boolean {
  return isProjectUnlocked(track, progress);
}

/**
 * Diagnostic Test Evaluation Thresholds
 * - Strong (강함): >= 80%
 * - Fair (보통): 40% ~ 79%
 * - Weak (약함): < 40%
 */
export const DIAGNOSTIC_STRONG_THRESHOLD = 0.8;
export const DIAGNOSTIC_FAIR_THRESHOLD = 0.4;

export type DiagnosticGradeKey = "strong" | "fair" | "weak";

export interface DiagnosticGrade {
  key: DiagnosticGradeKey;
  label: string; // '강함' | '보통' | '약함'
  badgeClass: string;
  barClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export function getDiagnosticGrade(scoreRatio: number): DiagnosticGrade {
  if (scoreRatio >= DIAGNOSTIC_STRONG_THRESHOLD) {
    return {
      key: "strong",
      label: "강함",
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      barClass: "bg-emerald-500",
      bgClass: "bg-emerald-50/50 dark:bg-emerald-950/20",
      borderClass: "border-emerald-200 dark:border-emerald-800/60",
      textClass: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (scoreRatio >= DIAGNOSTIC_FAIR_THRESHOLD) {
    return {
      key: "fair",
      label: "보통",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      barClass: "bg-amber-500",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
      borderClass: "border-amber-200 dark:border-amber-800/60",
      textClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    key: "weak",
    label: "약함",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    barClass: "bg-rose-500",
    bgClass: "bg-rose-50/50 dark:bg-rose-950/20",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    textClass: "text-rose-600 dark:text-rose-400",
  };
}
