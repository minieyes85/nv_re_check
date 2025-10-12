require('./config.js');
const axios = require('axios');
const path = require('path');
const Transport = require('winston-transport');

// 이 파일 자체의 로거는 순환 종속성을 피하기 위해 여기서 직접 생성합니다.
const winston = require('winston');
const localLogger = winston.createLogger({
    transports: [ new winston.transports.Console() ]
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * 텔레그램으로 메시지를 전송합니다.
 * @param {string} message - 전송할 메시지
 */
async function sendMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    localLogger.warn('Telegram Bot Token or Chat ID is not set. Skipping message.');
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
    localLogger.error('Failed to send Telegram message:', error.response ? error.response.data : error.message);
  }
}

/**
 * 에러 로그를 텔레그램으로 보내기 위한 Winston Transport 클래스
 */
class TelegramTransport extends Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, message, label, stack } = info;
    
    if (level === 'error') {
      const finalLabel = label || 'main';
      const errorMessage = stack || message;
      const formattedMessage = `🚨 [${finalLabel}] 에러 발생:\n\n${errorMessage}`;

      sendMessage(formattedMessage);
    }

    callback();
  }
}

module.exports = { sendMessage, TelegramTransport };
