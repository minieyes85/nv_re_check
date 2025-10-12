require('./config.js');
const axios = require('axios');
const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn('텔레그램 봇 토큰 또는 채팅 ID가 .env 파일에 설정되지 않았습니다.');
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const params = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  };

  try {
    await axios.get(url, { params });
  } catch (error) {
    logger.error('텔레그램 메시지 전송 실패:', error);
  }
}

module.exports = { sendMessage };