// Live activity line — last commit, follower count, repo count.
// Written into Readme.md between the LIVE markers. Runs from heartbeat.yml
// and roast.yml.
const fs = require("fs");
const path = require("path");

const USER = "bansal1806";
const README = path.join(__dirname, "..", "Readme.md");

const ago = (date) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

async function gh(url) {
  const headers = { "User-Agent": "profile-live-bot" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  const [profile, events] = await Promise.all([
    gh(`https://api.github.com/users/${USER}`),
    gh(`https://api.github.com/users/${USER}/events/public?per_page=100`),
  ]);
  const push = events.find((e) => e.type === "PushEvent");

  const parts = [];
  if (push) parts.push(`⚡ **Last commit:** ${ago(push.created_at)} in **${push.repo.name.split("/")[1]}**`);
  parts.push(`👥 **${profile.followers}** followers`);
  parts.push(`📦 **${profile.public_repos}** public repos`);
  const stamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const line = `<div align="center">\n\n${parts.join(" · ")} · 🕒 *updated ${stamp} IST*\n\n</div>`;

  const md = fs.readFileSync(README, "utf8");
  fs.writeFileSync(
    README,
    md.replace(/<!-- LIVE:START -->[\s\S]*?<!-- LIVE:END -->/, `<!-- LIVE:START -->\n${line}\n<!-- LIVE:END -->`)
  );
  console.log("Live stats updated.");
}

main().catch((e) => { console.error(e); process.exit(0); });
