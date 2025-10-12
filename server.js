require('./config.js');
const express = require('express');
const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });
const { initDatabase } = require('./database');
const { runComplexLoad } = require('./mainTask');

const app = express();
const PORT = process.env.PORT || 3000;

// 작업 상태를 추적하기 위한 변수
let isWorking = false;

// 기본 루트 엔드포인트
app.get('/', (req, res) => {
  res.send({ message: 'Naver Real Estate Data Collector API is running.' });
});

// 데이터 수집 상태 확인 엔드포인트
app.get('/status', (req, res) => {
  res.send({ status: isWorking ? 'working' : 'idle' });
});

// 데이터 수집 시작 엔드포인트
app.get('/complex_load', (req, res) => {
  if (isWorking) {
    logger.warn('Attempted to start a task while another is already in progress.');
    return res.status(409).send({ message: 'A data collection task is already in progress.' });
  }

  res.status(202).send({ message: 'Data collection has been initiated.' });

  // 백그라운드에서 비동기 작업 실행
  isWorking = true;
  logger.info('Starting background task for complex load...');
  
  runComplexLoad()
    .then(result => {
      logger.info(`Background task finished with result: ${result}`);
    })
    .catch(error => {
      logger.error('Background task failed:', error);
    })
    .finally(() => {
      isWorking = false;
      logger.info('Background task completed. Status set to idle.');
    });
});

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 초기화
    await initDatabase();
    
    // 서버 리스닝 시작
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();