const winston = require('winston');
const { combine, timestamp, printf, colorize, errors } = winston.format;
const { TelegramTransport } = require('./telegram');

// 콘솔 출력용 포맷을 정의합니다. info 객체에 label이 있으면 함께 출력합니다.
const consolePrintf = printf(({ level, message, label, timestamp, stack }) => {
  // label이 없는 경우를 대비하여 기본값을 'main'으로 설정합니다.
  const finalLabel = label || 'main';
  const logMessage = stack ? stack : message; // 스택이 있으면 스택을, 없으면 메시지를 사용
  return `${timestamp} ${level}: [${finalLabel}] ${logMessage}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    consolePrintf
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new TelegramTransport({ level: 'error' }) // 텔레그램 전송기 추가
  ],
});

// 운영 환경이 아닐 경우, 콘솔에도 로그를 출력합니다.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      printf(({ level, message, label, timestamp, stack }) => {
        const finalLabel = label || 'main';
        const logMessage = stack ? stack : message;
        return `${timestamp} ${level}: [${finalLabel}] ${logMessage}`;
      })
    ),
  }));
}

module.exports = logger;