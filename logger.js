const winston = require('winston');
const { combine, timestamp, printf, colorize, errors } = winston.format;

// 콘솔 출력용 포맷을 정의합니다. info 객체에 label이 있으면 함께 출력합니다.
const consolePrintf = printf(({ level, message, label, timestamp }) => {
  // label이 없는 경우를 대비하여 기본값을 'main'으로 설정합니다.
  const finalLabel = label || 'main';
  return `${timestamp} ${level}: [${finalLabel}] ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // 파일용 포맷입니다. JSON 형식은 자식 로거의 메타데이터(label 포함)를 자동으로 기록합니다.
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// 운영 환경이 아닐 경우, 콘솔에도 로그를 출력합니다.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consolePrintf // 위에서 정의한 콘솔용 포맷을 사용합니다.
    ),
  }));
}

module.exports = logger;