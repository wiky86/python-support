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
