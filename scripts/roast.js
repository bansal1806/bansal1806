// Daily AI commit roast — fetches the last 24h of public commits and asks
// Claude for a one-liner roast/hype, written into Readme.md between the
// ROAST markers. Runs from .github/workflows/roast.yml.
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const USER = "bansal1806";
const README = path.join(__dirname, "..", "Readme.md");

async function recentCommits() {
  const headers = { "User-Agent": "profile-roast-bot" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=100`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const events = await res.json();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const commits = [];
  for (const e of events) {
    if (e.type !== "PushEvent" || new Date(e.created_at).getTime() < cutoff) continue;
    for (const c of e.payload.commits || []) {
      commits.push(`[${e.repo.name.split("/")[1]}] ${c.message.split("\n")[0]}`);
    }
  }
  return commits.slice(0, 25);
}

async function main() {
  const commits = await recentCommits();
  const client = new Anthropic();

  const prompt = commits.length
    ? `Here are my git commit messages from the last 24 hours:\n\n${commits.join("\n")}\n\nWrite ONE witty sentence (max 30 words) that playfully roasts or hypes my day of coding, based on these commits. Be specific to what the commits actually say. No preamble, no quotes around it, just the sentence. A fitting emoji or two is welcome.`
    : `I made zero public commits in the last 24 hours. Write ONE witty sentence (max 30 words) playfully calling me out for it, as if you're my sarcastic AI pair programmer. No preamble, no quotes, just the sentence.`;

  let roast;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      output_config: { effort: "low" },
      system: "You write short, punchy, good-natured one-liners about a developer's daily git activity for their GitHub profile. Never mean-spirited, always funny.",
      messages: [{ role: "user", content: prompt }],
    });
    roast = response.content.find((b) => b.type === "text")?.text.trim();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.error("Rate limited — keeping yesterday's roast.");
    else if (err instanceof Anthropic.AuthenticationError) console.error("Bad ANTHROPIC_API_KEY — check the repo secret.");
    else if (err instanceof Anthropic.APIError) console.error(`API error ${err.status}: ${err.message}`);
    else console.error(err);
    return; // leave the existing roast in place; don't fail the workflow
  }
  if (!roast) return;

  const date = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
  const block = [
    `> 🔥 **Claude's verdict on my last 24h of commits** *(${date})*:`,
    `>`,
    `> *"${roast.replace(/^"|"$/g, "")}"*`,
  ].join("\n");

  const md = fs.readFileSync(README, "utf8");
  fs.writeFileSync(
    README,
    md.replace(/<!-- ROAST:START -->[\s\S]*?<!-- ROAST:END -->/, `<!-- ROAST:START -->\n${block}\n<!-- ROAST:END -->`)
  );
  console.log("Roast updated:", roast);
}

main().catch((e) => { console.error(e); });
