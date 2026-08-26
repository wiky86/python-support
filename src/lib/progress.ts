import { Track, Topic } from "@/types/content";
import { UserProgressRow, TopicStatus } from "@/types/database";

/**
 * Normalizes user input and expected answer strings for fill-in-the-blank comparisons.
 * Spec 3.4:
 * 1. Trim leading/trailing whitespace
 * 2. Unify single quotes and double quotes to double quotes
 * 3. Remove all inner whitespace
 * Note: Case-sensitive (Python syntax)
 */
export function normalizeCodeString(s: string): string {
  return s.trim().replace(/['"]/g, '"').replace(/\s+/g, "");
}

/**
 * Checks if user's input matches any of the accepted answer variations.
 */
export function checkFillInBlank(input: string, answers: string[]): boolean {
  if (!input) return false;
  const normalizedInput = normalizeCodeString(input);
  return answers.some((a) => normalizeCodeString(a) === normalizedInput);
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
  // If the user already completed this topic:
  if (progress[topicId]?.status === "completed" && progress[topicId]?.quiz_passed) {
    return "completed";
  }

  // Find the track and the index of topic within the track
  const trackIndex = allTracks.findIndex((t) => t.id === trackId);
  if (trackIndex === -1) return "locked";

  const track = allTracks[trackIndex];
  const topicIndex = track.topicOrder.indexOf(topicId);
  if (topicIndex === -1) return "locked";

  // First topic of the first track is ALWAYS unlocked
  if (trackIndex === 0 && topicIndex === 0) {
    return progress[topicId]?.status || "in_progress";
  }

  // If it's the first topic of a subsequent track, check if the previous track is completed
  if (topicIndex === 0 && trackIndex > 0) {
    const prevTrack = allTracks[trackIndex - 1];
    const prevTrackAllTopicsDone = prevTrack.topicOrder.every(
      (tid) => progress[tid]?.status === "completed" && progress[tid]?.quiz_passed
    );
    if (prevTrackAllTopicsDone) {
      return progress[topicId]?.status || "in_progress";
    }
    return "locked";
  }

  // Otherwise, check if the immediate previous topic in the current track is completed
  const prevTopicId = track.topicOrder[topicIndex - 1];
  const prevTopicDone =
    progress[prevTopicId]?.status === "completed" &&
    progress[prevTopicId]?.quiz_passed;

  if (prevTopicDone) {
    return progress[topicId]?.status || "in_progress";
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
  return track.topicOrder.every(
    (topicId) => progress[topicId]?.status === "completed" && progress[topicId]?.quiz_passed
  );
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
