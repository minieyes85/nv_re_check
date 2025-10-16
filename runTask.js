require('./config.js');
const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });
const { initDatabase, pool } = require('./database');
const { getComplexNumbers } = require('./googleSheets'); // googleSheets에서 getComplexNumbers 가져오기
const { collectComplexData, summarizeAndUpload } = require('./mainTask');

// .env에서 NAVER_API_COOKIE_1, NAVER_API_COOKIE_2, ... 와 같은 모든 인증 정보를 읽어옵니다.
function getAuthCredentials() {
  const credentials = [];
  let i = 1;
  while (process.env[`NAVER_API_COOKIE_${i}`] && process.env[`NAVER_API_AUTHORIZATION_${i}`]) {
    credentials.push({
      id: `worker-${i}`,
      cookie: process.env[`NAVER_API_COOKIE_${i}`],
      authorization: process.env[`NAVER_API_AUTHORIZATION_${i}`],
    });
    i++;
  }
  // 기본 인증 정보 추가 (만약 _1, _2 형태가 없을 경우)
  if (credentials.length === 0 && process.env.NAVER_API_COOKIE && process.env.NAVER_API_AUTHORIZATION) {
      credentials.push({
          id: 'worker-1',
          cookie: process.env.NAVER_API_COOKIE,
          authorization: process.env.NAVER_API_AUTHORIZATION,
      });
  }
  return credentials;
}

async function main() {
  const args = process.argv.slice(2);
  const taskToRun = args[0];

  if (!taskToRun) {
    logger.error('Please specify a task to run: \'collect\' or \'summary\'');
    process.exit(1);
  }

  logger.info(`Starting task '${taskToRun}' from command line...`);
  let exitCode = 0;

  try {
    await initDatabase();

    switch (taskToRun) {
      case 'collect':
        const credentials = getAuthCredentials();
        if (credentials.length === 0) {
          logger.error('No Naver API credentials found in .env file. Please add NAVER_API_COOKIE_1, NAVER_API_AUTHORIZATION_1 etc.');
          exitCode = 1;
          break;
        }
        logger.info(`Found ${credentials.length} credential(s). Starting parallel collection.`);

        const allComplexNumbers = await getComplexNumbers();
        if (!allComplexNumbers || allComplexNumbers.length === 0) {
            logger.warn('No complex numbers to process from Google Sheets.');
            break;
        }

        const totalComplexes = allComplexNumbers.length;
        const numWorkers = credentials.length;
        const chunkSize = Math.ceil(totalComplexes / numWorkers);

        const tasks = [];
        for (let i = 0; i < numWorkers; i++) {
          const chunk = allComplexNumbers.slice(i * chunkSize, (i + 1) * chunkSize);
          if (chunk.length > 0) {
            tasks.push(collectComplexData(chunk, credentials[i]));
          }
        }

        const results = await Promise.all(tasks);
        const totalProcessed = results.reduce((sum, result) => sum + result.processed, 0);
        const totalListings = results.reduce((sum, result) => sum + result.total, 0);

        logger.info(`All collection tasks finished. Total processed complexes: ${totalProcessed}, Total listings: ${totalListings}`);

        logger.info('Data collection finished, starting summary and upload...');
        await summarizeAndUpload();
        break;

      case 'summary':
        await summarizeAndUpload();
        break;

      default:
        logger.error(`Unknown task: ${taskToRun}. Available tasks: 'collect', 'summary'`);
        exitCode = 1;
        break;
    }

    if (exitCode === 0) {
      logger.info(`Task '${taskToRun}' finished successfully.`);
    }

  } catch (error) {
    logger.error(`Task execution failed for '${taskToRun}':`, error);
    exitCode = 1;
  } finally {
    logger.info('Closing database pool...');
    await pool.end();
    logger.info('Database pool closed.');
    process.exit(exitCode);
  }
}

main();