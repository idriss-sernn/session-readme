import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { initialize, MidiTrack, AudioTrack, type ActivationContext } from "@ableton-extensions/sdk";
import dialogHtml from "./dialog.html";

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  context.commands.registerCommand("sessionReadme.open", async () => {
    const song = context.application.song;
    const storageDir = context.environment.storageDirectory;

    // Fingerprint de la session basé sur les noms de tracks + tempo
    const trackNames = song.tracks.map(t => t.name).sort().join("|");
    const fingerprint = crypto
      .createHash("md5")
      .update(`${Math.round(song.tempo)}:${trackNames}`)
      .digest("hex")
      .slice(0, 12);

    const notePath = path.join(storageDir ?? ".", `note-${fingerprint}.txt`);

    // Lire la note existante
    let existingNote = "";
    try {
      existingNote = await fs.readFile(notePath, "utf8");
    } catch { /* pas encore de note */ }

    const sessionLabel = trackNames.length > 0
      ? song.tracks[0].name
      : `Session ${fingerprint}`;

    // Injecter les données dans le dialog
    const html = dialogHtml
      .replace("__NOTE__", JSON.stringify(existingNote))
      .replace("__LABEL__", JSON.stringify(sessionLabel));

    const result = await context.ui.showModalDialog(
      `data:text/html,${encodeURIComponent(html)}`,
      520,
      420
    );

    // Sauvegarder si l'utilisateur a cliqué Save
    if (result) {
      try {
        const parsed = JSON.parse(result);
        if (parsed.action === "save" && storageDir) {
          await fs.mkdir(storageDir, { recursive: true });
          await fs.writeFile(notePath, parsed.note ?? "", "utf8");
        }
      } catch { /* dialog fermé */ }
    }
  });

  // Apparaît dans le right-click de tous les types d'éléments courants
  const scopes = ["MidiTrack", "AudioTrack", "ClipSlot", "Scene"] as const;
  scopes.forEach(scope => {
    context.ui.registerContextMenuAction(scope, "Session Note", "sessionReadme.open");
  });
}
