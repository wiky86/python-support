import fs from "fs";
import path from "path";
import {
  Track,
  Topic,
  Project,
  BadgesConfig,
  XpRulesConfig,
} from "@/types/content";

const CONTENT_DIR = path.join(process.cwd(), "content");
const TRACKS_DIR = path.join(CONTENT_DIR, "tracks");
const CONFIG_DIR = path.join(CONTENT_DIR, "config");

/**
 * Reads and returns xp-rules.json
 */
export function getXpRules(): XpRulesConfig {
  const filePath = path.join(CONFIG_DIR, "xp-rules.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data) as XpRulesConfig;
}

/**
 * Reads and returns badges.json
 */
export function getBadgesConfig(): BadgesConfig {
  const filePath = path.join(CONFIG_DIR, "badges.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data) as BadgesConfig;
}

/**
 * Dynamically reads all tracks in content/tracks/ without hardcoding track count.
 * Returns tracks sorted by order.
 */
export function getAllTracks(): Track[] {
  if (!fs.existsSync(TRACKS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(TRACKS_DIR, { withFileTypes: true });
  const trackDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const tracks: Track[] = [];

  for (const dirName of trackDirs) {
    const trackJsonPath = path.join(TRACKS_DIR, dirName, "track.json");
    if (fs.existsSync(trackJsonPath)) {
      try {
        const fileContent = fs.readFileSync(trackJsonPath, "utf-8");
        const trackData = JSON.parse(fileContent) as Track;
        tracks.push(trackData);
      } catch (err) {
        console.error(`Error parsing track.json in ${dirName}:`, err);
      }
    }
  }

  return tracks.sort((a, b) => a.order - b.order);
}

/**
 * Returns a specific track by its ID (e.g. "track1")
 */
export function getTrack(trackId: string): Track | null {
  const trackJsonPath = path.join(TRACKS_DIR, trackId, "track.json");
  if (!fs.existsSync(trackJsonPath)) {
    return null;
  }
  try {
    const fileContent = fs.readFileSync(trackJsonPath, "utf-8");
    return JSON.parse(fileContent) as Track;
  } catch (err) {
    console.error(`Error parsing track ${trackId}:`, err);
    return null;
  }
}

/**
 * Returns all topics across all tracks
 */
export function getAllTopics(): Topic[] {
  const tracks = getAllTracks();
  const allTopics: Topic[] = [];

  for (const track of tracks) {
    const trackFolder = path.join(TRACKS_DIR, track.id);
    for (const relativeTopicFile of track.topicFiles) {
      const topicPath = path.join(trackFolder, relativeTopicFile);
      if (fs.existsSync(topicPath)) {
        try {
          const content = fs.readFileSync(topicPath, "utf-8");
          allTopics.push(JSON.parse(content) as Topic);
        } catch (err) {
          console.error(`Error parsing topic file ${topicPath}:`, err);
        }
      }
    }
  }

  return allTopics;
}

/**
 * Returns a specific topic by trackId and topicId
 */
export function getTopic(trackId: string, topicId: string): Topic | null {
  const track = getTrack(trackId);
  if (!track) return null;

  const trackFolder = path.join(TRACKS_DIR, trackId);

  // Search topic files
  for (const relativeTopicFile of track.topicFiles) {
    const topicPath = path.join(trackFolder, relativeTopicFile);
    if (fs.existsSync(topicPath)) {
      try {
        const fileContent = fs.readFileSync(topicPath, "utf-8");
        const topic = JSON.parse(fileContent) as Topic;
        if (topic.id === topicId) {
          return topic;
        }
      } catch (err) {
        console.error(`Error parsing topic file ${topicPath}:`, err);
      }
    }
  }

  return null;
}

/**
 * Returns the mini project for a given track
 */
export function getProject(trackId: string): Project | null {
  const track = getTrack(trackId);
  if (!track || !track.projectFile) return null;

  const projectPath = path.join(TRACKS_DIR, trackId, track.projectFile);
  if (!fs.existsSync(projectPath)) return null;

  try {
    const content = fs.readFileSync(projectPath, "utf-8");
    return JSON.parse(content) as Project;
  } catch (err) {
    console.error(`Error parsing project in track ${trackId}:`, err);
    return null;
  }
}
