const { default: makeWASocket, useSingleFileAuthState, downloadMediaMessage, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const fs = require('fs')
const path = require('path')

const { state, saveState } = useSingleFileAuthState('./auth_info_multi.json')

const app = express()
const PORT = process.env.PORT || 3000

let sock

async function startSock() {
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if(connection === 'close') {
      if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
        startSock()
      } else {
        console.log('Logged out from WhatsApp')
        process.exit(1) // exit if logged out
      }
    } else if(connection === 'open') {
      console.log('Connected to WhatsApp')
    }
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if(type !== 'notify') return
    const msg = messages[0]
    if (!msg.message) return
    const messageType = Object.keys(msg.message)[0]

    if(['audioMessage', 'voiceMessage', 'documentMessage', 'videoMessage'].includes(messageType)) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { 
          logger: sock.logger, 
          reuploadRequestOptions: { skipIfExist: true } 
        })

        if(!fs.existsSync('./downloads')) fs.mkdirSync('./downloads')

        let ext = ''
        switch(messageType) {
          case 'audioMessage': ext = '.mp3'; break
          case 'voiceMessage': ext = '.ogg'; break
          case 'documentMessage': ext = '.' + (msg.message.documentMessage.fileName?.split('.').pop() || 'bin'); break
          case 'videoMessage': ext = '.mp4'; break
          default: ext = '.bin'
        }

        const fileName = msg.key.id + ext
        const filePath = path.join(__dirname, 'downloads', fileName)
        fs.writeFileSync(filePath, buffer)

        console.log(`Saved media file: ${fileName}`)
      } catch (e) {
        console.log('Error downloading media:', e)
      }
    }
  })
}

startSock()

app.get('/api/riika-teach-song-dl/:msgId', (req, res) => {
  const msgId = req.params.msgId
  const downloadsDir = path.join(__dirname, 'downloads')

  if (!fs.existsSync(downloadsDir)) return res.status(404).send({ status: false, message: 'No downloads folder yet.' })

  const files = fs.readdirSync(downloadsDir).filter(f => f.startsWith(msgId))

  if(files.length === 0) {
    return res.status(404).send({ status: false, message: 'Media file not found for msgId' })
  }

  const filePath = path.join(downloadsDir, files[0])

  res.download(filePath, files[0], (err) => {
    if(err) {
      console.log('Error sending file:', err)
      res.status(500).send({ status: false, message: 'Error sending file' })
    }
  })
})

app.listen(PORT, () => {
  console.log(`RIKA XMD Media API running on port ${PORT}`)
})
