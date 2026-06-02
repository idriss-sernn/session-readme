import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { initialize, type ActivationContext } from "@ableton-extensions/sdk";
import dialogHtml from "./dialog.html";

const VAULT_PATH = path.join(os.homedir(), "Documents", "Obsidian Vault");

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  context.commands.registerCommand("sessionReadme.open", async () => {
    const song = context.application.song;
    const storageDir = context.environment.storageDirectory;

    const trackNames = song.tracks.map(t => t.name).sort().join("|");
    const fingerprint = crypto
      .createHash("md5")
      .update(`${Math.round(song.tempo)}:${trackNames}`)
      .digest("hex")
      .slice(0, 12);

    const noteDir = path.join(storageDir ?? ".", `note-${fingerprint}`);
    const currentPath = path.join(noteDir, "current.txt");
    const historyDir = path.join(noteDir, "history");

    let currentNote = "";
    let history: Array<{ timestamp: string; content: string }> = [];

    try {
      currentNote = await fs.readFile(currentPath, "utf8");
    } catch { /* pas encore de note */ }

    try {
      const files = await fs.readdir(historyDir);
      history = (
        await Promise.all(
          files
            .filter(f => f.endsWith(".txt"))
            .sort()
            .reverse()
            .slice(0, 10)
            .map(async f => ({
              timestamp: f.replace(/\.txt$/, "").replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3"),
              content: await fs.readFile(path.join(historyDir, f), "utf8"),
            }))
        )
      );
    } catch { /* no history */ }

    const sessionLabel = "NotePad ++";

    let status = "wip";
    try {
      const statusPath = path.join(noteDir, "status.txt");
      status = (await fs.readFile(statusPath, "utf8")).trim() || "wip";
    } catch { /* no status file */ }

    const payload = {
      note: currentNote,
      label: sessionLabel,
      tempo: Math.round(song.tempo),
      tracks: song.tracks.length,
      history: history.slice(0, 5),
      status,
    };

    const safePayload = JSON.stringify(payload).replace(/</g, "\\u003c");
    const html = dialogHtml.replace("__PAYLOAD__", safePayload);

    const result = await context.ui.showModalDialog(
      `data:text/html,${encodeURIComponent(html)}`,
      560,
      520
    );

    console.log("[readme] result:", result);
    if (!result) {
      console.log("[readme] no result, exiting");
      return;
    }

    try {
      const parsed = JSON.parse(result);
      console.log("[readme] action:", parsed.action, "note length:", (parsed.note ?? "").length);

      if (parsed.action === "save" || parsed.action === "export") {
        await fs.mkdir(noteDir, { recursive: true });

        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, match => (match === ":" ? "-" : match))
          .slice(0, 19);

        const historyPath = path.join(historyDir, `${timestamp}.txt`);
        await fs.mkdir(historyDir, { recursive: true });

        if (currentNote) {
          await fs.writeFile(historyPath, currentNote, "utf8");
        }

        await fs.writeFile(currentPath, parsed.note ?? "", "utf8");
        if (parsed.status) {
          await fs.writeFile(path.join(noteDir, "status.txt"), parsed.status, "utf8");
        }
        console.log("[readme] note saved to:", currentPath);
      }

      if (parsed.action === "restore") {
        await fs.mkdir(noteDir, { recursive: true });
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, match => (match === ":" ? "-" : match))
          .slice(0, 19);
        const historyPath = path.join(historyDir, `${timestamp}.txt`);
        await fs.mkdir(historyDir, { recursive: true });

        if (currentNote) {
          await fs.writeFile(historyPath, currentNote, "utf8");
        }

        await fs.writeFile(currentPath, parsed.note ?? "", "utf8");
        console.log("[readme] restored from history");
      }

      if (parsed.action === "export") {
        console.log("[readme] exporting to Desktop...");
        await exportToDesktop(parsed.note ?? "", sessionLabel, payload);
        console.log("[readme] export done");
      }
    } catch (e) {
      console.error("[readme] error:", e);
    }
  });

  const scopes = ["MidiClip", "AudioClip", "MidiTrack", "AudioTrack", "ClipSlot", "Scene"] as const;
  scopes.forEach(scope => {
    context.ui.registerContextMenuAction(scope, "Session Note", "sessionReadme.open");
  });
}

async function exportToDesktop(note: string, label: string, meta: Record<string, unknown>) {
  const desktopPath = path.join(os.homedir(), "Desktop");
  const timestamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "-");
  const filename = `memory-${label}-${timestamp}.md`;
  const filepath = path.join(desktopPath, filename);

  const content = `# ${label}\n\n`
    + `**${meta.tempo} BPM · ${meta.tracks} tracks · ${meta.status}**\n\n`
    + note;

  try {
    await fs.writeFile(filepath, content, "utf8");
    console.log(`[readme] exported to Desktop: ${filepath}`);
  } catch (e) {
    console.error("Export Desktop failed:", e);
  }
}
