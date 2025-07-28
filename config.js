require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  botName: process.env.BOT_NAME || "RIKA XMD",
};
