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
assert(trackDirs.length >= 6, `Found ${trackDirs.length} tracks (track1 ~ track6)`);

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

assert(totalTopicsCount === 37, `Total topics count is 37 (Track1: 7, Track2: 6, Track3: 7, Track4: 6, Track5: 5, Track6: 6)`);

const xpRules = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "xp-rules.json"), "utf-8"));
assert(xpRules.awards.quizPass === 20, "xpRules quizPass is 20");

const badges = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, "badges.json"), "utf-8"));
assert(badges.badges.length === 24, "Badges config has 24 badges");

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
