const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const { port, botName } = require("./config");

const app = express();
const SESSION_FILE = "./session/creds.json";

fs.ensureFileSync(SESSION_FILE);
const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

let sock;

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const msgType = Object.keys(m.message)[0];
    const from = m.key.remoteJid;

    if (
      ["audioMessage", "documentMessage", "videoMessage", "imageMessage"].includes(msgType)
    ) {
      const buffer = await sock.downloadMediaMessage(m);
      const ext = mime.extension(mime.lookup(buffer) || "bin");
      const fileName = `${Date.now()}.${ext}`;
      const filePath = path.join(__dirname, "media", fileName);

      await fs.ensureDir("media");
      await fs.writeFile(filePath, buffer);

      const downloadLink = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/songdl/${fileName}`;

      await sock.sendMessage(from, {
        text: `🎵 *${botName}*\n\n✅ File downloaded successfully!\n\n🔗 Download: ${downloadLink}`,
      });
    }
  });
}

startSock();

// API route
app.get("/songdl/:file", (req, res) => {
  const file = req.params.file;
  const filePath = path.join(__dirname, "media", file);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

app.listen(port, () => {
  console.log(`${botName} API running on port ${port}`);
});
