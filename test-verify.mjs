import fs from "fs";
import path from "path";

console.log("=== PyDataLab Dynamic Multi-Track Verification Suite ===");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// 1. Test Level Formula
function getLevel(xp) {
  if (xp <= 0) return 1;
  const n = (-175 + Math.sqrt(175 * 175 + 100 * (xp + 200))) / 50;
  return Math.max(1, Math.floor(n));
}

assert(getLevel(0) === 1, "getLevel(0) === 1");
assert(getLevel(100) === 1, "getLevel(100) === 1");
assert(getLevel(249) === 1, "getLevel(249) === 1");
assert(getLevel(250) === 2, "getLevel(250) === 2");
assert(getLevel(2660) >= 6, "getLevel(2660) >= 6");

// 2. Test Normalization
function normalizeCodeString(s) {
  return s.trim().replace(/['"]/g, '"').replace(/\s+/g, "");
}
function checkFillInBlank(input, answers) {
  if (!input) return false;
  const normalizedInput = normalizeCodeString(input);
  return answers.some((a) => normalizeCodeString(a) === normalizedInput);
}

assert(normalizeCodeString("  'name'  ") === '"name"', "normalizeCodeString replaces single quotes with double quotes and trims");
assert(normalizeCodeString(" ' score ' ") === '"score"', "normalizeCodeString strips inner whitespace");
assert(checkFillInBlank(" 'age' ", ["age", "'age'"]), "checkFillInBlank matches quote variation");
assert(checkFillInBlank("len", ["len"]), "checkFillInBlank('len') matches ['len']");

// 3. Test Content Loading directly from content/
const CONTENT_DIR = path.join(process.cwd(), "content");
const TRACKS_DIR = path.join(CONTENT_DIR, "tracks");
const CONFIG_DIR = path.join(CONTENT_DIR, "config");

const trackDirs = fs.readdirSync(TRACKS_DIR).filter((d) => fs.statSync(path.join(TRACKS_DIR, d)).isDirectory());
assert(trackDirs.length >= 7, `Found ${trackDirs.length} tracks (track1 ~ track7)`);

let totalTopicsCount = 0;

trackDirs.forEach((dir) => {
  const trackPath = path.join(TRACKS_DIR, dir, "track.json");
  assert(fs.existsSync(trackPath), `${dir}/track.json exists`);

  const trackJson = JSON.parse(fs.readFileSync(trackPath, "utf-8"));
  assert(trackJson.id === dir, `Track id matches directory: ${dir}`);
  assert(trackJson.topicOrder.length === trackJson.topicFiles.length, `${dir} topicOrder and topicFiles have matching length (${trackJson.topicOrder.length})`);

  totalTopicsCount += trackJson.topicOrder.length;

  trackJson.topicFiles.forEach((tf, idx) => {
    const topicFilePath = path.join(TRACKS_DIR, dir, tf);
    assert(fs.existsSync(topicFilePath), `Topic file exists: ${tf}`);
    const topJson = JSON.parse(fs.readFileSync(topicFilePath, "utf-8"));
    assert(topJson.id === trackJson.topicOrder[idx], `Topic file ${tf} matches expected id ${topJson.id}`);
    assert(topJson.fillBlanks.length > 0, `Topic ${topJson.id} has ${topJson.fillBlanks.length} fillBlanks`);
    assert(topJson.quiz.questions.length > 0, `Topic ${topJson.id} has ${topJson.quiz.questions.length} quiz questions`);
    assert(topJson.faq.length > 0, `Topic ${topJson.id} has ${topJson.faq.length} faq items`);
  });

  if (trackJson.projectFile) {
    const projectFilePath = path.join(TRACKS_DIR, dir, trackJson.projectFile);
    assert(fs.existsSync(projectFilePath), `${dir} project file exists: ${trackJson.projectFile}`);
    const projJson = JSON.parse(fs.readFileSync(projectFilePath, "utf-8"));
    assert(projJson.missions.length > 0, `${dir} project has ${projJson.missions.length} missions`);
    assert(projJson.report && projJson.report.template, `${dir} project has valid report template`);
  }
});

assert(totalTopicsCount === 43, `Total topics count is 43 (Track1: 7, Track2: 6, Track3: 7, Track4: 6, Track5: 5, Track6: 6, Track7: 6)`);

const xpRules = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "xp-rules.json"), "utf-8"));
assert(xpRules.awards.quizPass === 20, "xpRules quizPass is 20");

const badges = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "badges.json"), "utf-8"));
assert(badges.badges.length === 24, "Badges config has 24 badges");

// Test describeBadgeCondition
const trackTitles = {
  track1: "파이썬 기초 다지기",
  track2: "NumPy로 수치 다루기",
  track3: "pandas 핵심 - 데이터 구조",
  track4: "pandas 실전 - 데이터 가공",
  track5: "그룹화와 집계",
  track6: "데이터 시각화",
  track7: "종합 분석 프로젝트",
};

function describeBadgeCondition(condition, titles) {
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
      return `전체 토픽의 ${gte}%를 완료하면 획득`;
    case "streak":
      return `${gte}일 연속 접속하면 획득`;
    case "level":
      return `레벨 ${gte}에 도달하면 획득`;
    case "track_complete": {
      const trackName = (condition.trackId && titles?.[condition.trackId]) || condition.trackId || "해당 트랙";
      return `${trackName}의 모든 토픽을 완료하면 획득`;
    }
    case "all_tracks_complete":
      return "모든 트랙을 완주하면 획득";
    case "flawless_track":
      return "한 트랙의 모든 퀴즈를 만점 통과하면 획득";
    default:
      return "조건 달성 시 획득";
  }
}

badges.badges.forEach((b) => {
  const desc = describeBadgeCondition(b.condition, trackTitles);
  assert(!desc.includes("gte"), `Badge ${b.id} condition does not expose raw 'gte': "${desc}"`);
  assert(!desc.includes("trackId"), `Badge ${b.id} condition does not expose raw 'trackId': "${desc}"`);
  assert(desc.endsWith("획득"), `Badge ${b.id} condition ends with '획득': "${desc}"`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

