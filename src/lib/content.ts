import fs from "fs";
import path from "path";
import {
  Course,
  CoursesConfig,
  Track,
  Topic,
  Project,
  BadgeDefinition,
  BadgesConfig,
  GlobalBadgesConfig,
  XpRulesConfig,
} from "@/types/content";

const CONTENT_DIR = path.join(process.cwd(), "content");
const COURSES_JSON_PATH = path.join(CONTENT_DIR, "courses.json");
const GLOBAL_BADGES_JSON_PATH = path.join(CONTENT_DIR, "global-badges.json");

/**
 * Returns all courses defined in content/courses.json sorted by order.
 */
export function getAllCourses(): Course[] {
  if (!fs.existsSync(COURSES_JSON_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(COURSES_JSON_PATH, "utf-8");
    const data = JSON.parse(raw) as CoursesConfig;
    return (data.courses || []).sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error("Error reading courses.json:", err);
    return [];
  }
}

/**
 * Returns a specific course by ID (e.g. "python", "finance")
 */
export function getCourse(courseId: string): Course | null {
  const courses = getAllCourses();
  return courses.find((c) => c.id === courseId) || null;
}

/**
 * Reads global badges defined in content/global-badges.json
 */
export function getGlobalBadges(): BadgeDefinition[] {
  if (!fs.existsSync(GLOBAL_BADGES_JSON_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(GLOBAL_BADGES_JSON_PATH, "utf-8");
    const data = JSON.parse(raw) as GlobalBadgesConfig;
    return (data.badges || []).map((b) => ({
      ...b,
      scope: "global",
    }));
  } catch (err) {
    console.error("Error reading global-badges.json:", err);
    return [];
  }
}

/**
 * Reads course-scoped badges for a specific course (e.g. "python", "finance")
 */
export function getCourseBadges(courseId: string): BadgeDefinition[] {
  const badgesPath = path.join(CONTENT_DIR, courseId, "config", "badges.json");
  if (!fs.existsSync(badgesPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(badgesPath, "utf-8");
    const data = JSON.parse(raw) as BadgesConfig;
    return (data.badges || []).map((b) => ({
      ...b,
      scope: "course",
      course: courseId,
    }));
  } catch (err) {
    console.error(`Error reading badges.json for course ${courseId}:`, err);
    return [];
  }
}

/**
 * Returns all badges (global + all courses)
 */
export function getAllBadges(): BadgeDefinition[] {
  const globalBadges = getGlobalBadges();
  const courses = getAllCourses();
  const courseBadges: BadgeDefinition[] = [];

  for (const course of courses) {
    courseBadges.push(...getCourseBadges(course.id));
  }

  return [...globalBadges, ...courseBadges];
}

/**
 * Returns badges config for a specific course or combined
 */
export function getBadgesConfig(courseId?: string): BadgesConfig {
  if (courseId) {
    const badgesPath = path.join(CONTENT_DIR, courseId, "config", "badges.json");
    if (fs.existsSync(badgesPath)) {
      try {
        const raw = fs.readFileSync(badgesPath, "utf-8");
        return JSON.parse(raw) as BadgesConfig;
      } catch (err) {
        console.error(`Error parsing badges.json for ${courseId}:`, err);
      }
    }
  }

  return {
    conditionTypes: {},
    badges: getAllBadges(),
  };
}

/**
 * Reads and returns xp-rules.json for a given course
 */
export function getXpRules(courseId: string = "python"): XpRulesConfig {
  const filePath = path.join(CONTENT_DIR, courseId, "config", "xp-rules.json");
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as XpRulesConfig;
    } catch (err) {
      console.error(`Error parsing xp-rules.json for ${courseId}:`, err);
    }
  }

  // Fallback to python
  const fallbackPath = path.join(CONTENT_DIR, "python", "config", "xp-rules.json");
  if (fs.existsSync(fallbackPath)) {
    const data = fs.readFileSync(fallbackPath, "utf-8");
    return JSON.parse(data) as XpRulesConfig;
  }

  return {
    levelFormula: {
      type: "quadratic",
      baseCost: 200,
      increment: 50,
      description: "Lv(n)->Lv(n+1) = 200 + 50n",
      levelFromXpFormula: "(-175 + sqrt(175*175 + 100*(xp + 200))) / 50",
    },
    awards: {
      dailyLogin: 20,
      streakMilestone: { "3": 50, "7": 100, "14": 150, "30": 300 },
      streakRepeating: { everyDays: 30, xp: 300 },
      topicComplete: 50,
      quizPass: 30,
      quizPerfectBonus: 20,
      trackComplete: 200,
      projectComplete: 300,
    },
    rules: {
      oneTimePerItem: ["topicComplete", "quizPass", "quizPerfectBonus", "trackComplete", "projectComplete"],
      dailyOncePerDay: ["dailyLogin"],
      streakMilestoneOnce: true,
      streakRepeatingEvery: 30,
      quizPerfectBonusBasis: "firstPassScore",
    },
  };
}

/**
 * Dynamically reads all tracks for a given course (e.g. "python", "finance").
 * Returns tracks sorted by order.
 */
export function getAllTracks(courseId: string = "python"): Track[] {
  const tracksDir = path.join(CONTENT_DIR, courseId, "tracks");
  if (!fs.existsSync(tracksDir)) {
    return [];
  }

  const entries = fs.readdirSync(tracksDir, { withFileTypes: true });
  const trackDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const tracks: Track[] = [];

  for (const dirName of trackDirs) {
    const trackJsonPath = path.join(tracksDir, dirName, "track.json");
    if (fs.existsSync(trackJsonPath)) {
      try {
        const fileContent = fs.readFileSync(trackJsonPath, "utf-8");
        const trackData = JSON.parse(fileContent) as Track;
        tracks.push({
          ...trackData,
          courseId,
        });
      } catch (err) {
        console.error(`Error parsing track.json in ${courseId}/${dirName}:`, err);
      }
    }
  }

  return tracks.sort((a, b) => a.order - b.order);
}

/**
 * Returns a specific track by its ID and courseId (e.g. trackId="track1", courseId="python")
 */
export function getTrack(trackId: string, courseId: string = "python"): Track | null {
  const trackJsonPath = path.join(CONTENT_DIR, courseId, "tracks", trackId, "track.json");
  if (!fs.existsSync(trackJsonPath)) {
    return null;
  }
  try {
    const fileContent = fs.readFileSync(trackJsonPath, "utf-8");
    const track = JSON.parse(fileContent) as Track;
    return {
      ...track,
      courseId,
    };
  } catch (err) {
    console.error(`Error parsing track ${courseId}/${trackId}:`, err);
    return null;
  }
}

/**
 * Returns all topics across all tracks for a given course, or across all courses if courseId is omitted.
 */
export function getAllTopics(courseId?: string): Topic[] {
  if (courseId) {
    const tracks = getAllTracks(courseId);
    const topics: Topic[] = [];
    const tracksDir = path.join(CONTENT_DIR, courseId, "tracks");

    for (const track of tracks) {
      const trackFolder = path.join(tracksDir, track.id);
      for (const relativeTopicFile of track.topicFiles) {
        const topicPath = path.join(trackFolder, relativeTopicFile);
        if (fs.existsSync(topicPath)) {
          try {
            const content = fs.readFileSync(topicPath, "utf-8");
            const topic = JSON.parse(content) as Topic;
            topics.push({
              ...topic,
              courseId,
            });
          } catch (err) {
            console.error(`Error parsing topic file ${topicPath}:`, err);
          }
        }
      }
    }
    return topics;
  }

  // If no courseId specified, aggregate across ALL courses
  const allCourses = getAllCourses();
  const allTopics: Topic[] = [];
  for (const course of allCourses) {
    allTopics.push(...getAllTopics(course.id));
  }
  return allTopics;
}

/**
 * Returns a specific topic by trackId, topicId, and courseId
 */
export function getTopic(trackId: string, topicId: string, courseId: string = "python"): Topic | null {
  const track = getTrack(trackId, courseId);
  if (!track) return null;

  const trackFolder = path.join(CONTENT_DIR, courseId, "tracks", trackId);

  // Search topic files
  for (const relativeTopicFile of track.topicFiles) {
    const topicPath = path.join(trackFolder, relativeTopicFile);
    if (fs.existsSync(topicPath)) {
      try {
        const fileContent = fs.readFileSync(topicPath, "utf-8");
        const topic = JSON.parse(fileContent) as Topic;
        if (topic.id === topicId) {
          return {
            ...topic,
            courseId,
          };
        }
      } catch (err) {
        console.error(`Error parsing topic file ${topicPath}:`, err);
      }
    }
  }

  return null;
}

/**
 * Returns the mini project for a given track and course
 */
export function getProject(trackId: string, courseId: string = "python"): Project | null {
  const track = getTrack(trackId, courseId);
  if (!track || !track.projectFile) return null;

  const projectPath = path.join(CONTENT_DIR, courseId, "tracks", trackId, track.projectFile);
  if (!fs.existsSync(projectPath)) return null;

  try {
    const content = fs.readFileSync(projectPath, "utf-8");
    const project = JSON.parse(content) as Project;
    return {
      ...project,
      courseId,
    };
  } catch (err) {
    console.error(`Error parsing project in ${courseId}/${trackId}:`, err);
    return null;
  }
}
