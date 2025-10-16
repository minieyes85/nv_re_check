const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });
const { pool } = require('./database');
const { getComplexNumbers, updateSummarySheet } = require('./googleSheets');
const { fetchAptArticles } = require('./naverApi');
const { convertPrice, formatDuration } = require('./utils');
const { sendMessage } = require('./telegram');

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function collectComplexData(complexNumbers, auth) {
  const startTime = new Date();
  const today = startTime.toISOString().slice(0, 10);
  const workerId = auth.id || 'worker'; // 워커 ID를 구별하기 위한 값
  await sendMessage(`[${today}] [${workerId}] 네이버 부동산 데이터 수집 작업을 시작합니다. 담당 단지: ${complexNumbers.length}개`);
  let connection;
  try {
    logger.info(`[${workerId}] Starting data collection process for ${complexNumbers.length} complexes...`);

    if (!complexNumbers || complexNumbers.length === 0) {
      logger.warn(`[${workerId}] No complex numbers to process.`);
      return { success: true, processed: 0, total: 0 };
    }

    let processedComplexCount = 0;
    let totalListingsCount = 0;

    connection = await pool.getConnection();
    logger.info(`[${workerId}] Database connection acquired.`);

    const current_date = new Date().toISOString().slice(0, 10);
    const current_time = new Date().toTimeString().slice(0, 8);

    for (const [index, complexNo] of complexNumbers.entries()) {
      try {
        logger.info(`[${workerId}] Processing complex ${complexNo} (${index + 1}/${complexNumbers.length})`);
        await sleep(2000);

        const articles = await fetchAptArticles(complexNo, auth);
        if (!articles || articles.length === 0) {
          logger.info(`[${workerId}] No articles found for complex ${complexNo}.`);
          continue;
        }

        const listingsToInsert = articles
          .filter(article => ['매매', '전세'].includes(article.tradeTypeName))
          .map(article => {
            const [floor, maxFloor] = article.floorInfo ? article.floorInfo.split('/') : [null, null];
            return [
              complexNo, article.articleName, article.realEstateTypeName, article.tradeTypeName,
              article.floorInfo, floor, maxFloor, convertPrice(article.dealOrWarrantPrc),
              article.areaName, article.area1, article.area2, article.direction,
              article.buildingName, current_date, current_time
            ];
          });

        if (listingsToInsert.length === 0) {
          logger.info(`[${workerId}] No relevant (매매, 전세) articles found for complex ${complexNo}.`);
          continue;
        }

        const sql = `
          INSERT INTO apartment_listings 
          (complexNo, articleName, realEstateTypeName, tradeTypeName, 
          floorInfo, floor, maxFloor, dealOrWarrantPrc, areaName, 
          area1, area2, direction, buildingName, date, time)
          VALUES ?;
        `;
        await connection.query(sql, [listingsToInsert]);
        logger.info(`[${workerId}] Successfully inserted ${listingsToInsert.length} listings for complex ${complexNo}.`);
        
        processedComplexCount++;
        totalListingsCount += listingsToInsert.length;

      } catch (error) {
        logger.error(`[${workerId}] Error processing complex ${complexNo}:`, error);
        await sleep(5000);
        continue;
      }
    }

    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = formatDuration(durationInSeconds);
    
    const summaryMessage = `
🚀 [${workerId}] 데이터 수집이 완료되었습니다.
- 처리 단지: ${processedComplexCount} / ${complexNumbers.length}개
- 수집된 매물: ${totalListingsCount}개
- 소요시간: ${durationFormatted}
    `.trim();

    await sendMessage(summaryMessage);
    logger.info(`[${workerId}] Data collection process finished successfully.`);
    return { success: true, processed: processedComplexCount, total: totalListingsCount };

  } catch (error) {
    logger.error(`[${workerId}] The data collection process failed:`, error);
    await sendMessage(`[${workerId}] 데이터 수집 중 오류가 발생했습니다.`);
    return { success: false, processed: 0, total: 0 };
  } finally {
    if (connection) {
      connection.release();
      logger.info(`[${workerId}] Database connection released.`);
    }
  }
}

async function summarizeAndUpload() {
  const startTime = new Date();
  const today = startTime.toISOString().slice(0, 10);
  await sendMessage(`[${today}] 데이터 요약 및 구글 시트 업데이트를 시작합니다.`);
  let connection;
  try {
    logger.info('Starting summary and upload process...');
    
    connection = await pool.getConnection();
    logger.info('Database connection acquired.');

    logger.info('Fetching summary data from sumToday view...');
    const [summaryRows] = await connection.query(`
      SELECT complexNo, tradeTypeName, maxPrice, minPrice, areaName, date 
      FROM sumToday
    `);
    
    logger.info(`Found ${summaryRows.length} summary rows.`);

    if (summaryRows.length > 0) {
        const sheetData = summaryRows.map(row => ({
            '단지번호': row.complexNo,
            '거래유형': row.tradeTypeName,
            '최고가': row.maxPrice,
            '최저가': row.minPrice,
            '면적': row.areaName,
            '날짜': row.date
        }));
        await updateSummarySheet(sheetData);
    }

    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = formatDuration(durationInSeconds);
    
    const summaryMessage = `
✅ 데이터 요약 및 구글 시트 업데이트가 완료되었습니다.
- 취합된 데이터: ${summaryRows.length}개
- 총 소요시간: ${durationFormatted}
    `.trim();

    await sendMessage(summaryMessage);
    logger.info('Summary and upload process finished successfully.');
    return 'success';

  } catch (error) {
    logger.error('The summary and upload process failed:', error);
    await sendMessage('데이터 요약 및 구글 시트 업데이트 중 오류가 발생했습니다.');
    return 'failed';
  } finally {
    if (connection) {
      connection.release();
      logger.info('Database connection released.');
    }
  }
}

module.exports = { collectComplexData, summarizeAndUpload };
