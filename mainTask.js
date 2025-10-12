const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });
const { pool } = require('./database');
const { getComplexNumbers, updateSummarySheet } = require('./googleSheets');
const { fetchAptArticles } = require('./naverApi');
const { convertPrice, formatDuration } = require('./utils');
const { sendMessage } = require('./telegram');

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runComplexLoad() {
  const startTime = new Date();
  const today = startTime.toISOString().slice(0, 10);
  await sendMessage(`[${today}] 네이버 부동산 데이터 수집 작업을 시작합니다.`);
  let connection;
  try {
    logger.info('Starting complex load process...');
    
    // 1. Get complex numbers from Google Sheets
    const complexNumbers = await getComplexNumbers();
    // const complexNumbers = ['1138']; // For testing a single complex

    if (!complexNumbers || complexNumbers.length === 0) {
      logger.warn('No complex numbers to process.');
      await sendMessage('처리할 단지 목록이 없습니다.');
      return 'success';
    }

    await sendMessage(`총 ${complexNumbers.length}개의 단지에 대한 수집을 시작합니다.`);

    // Initialize counters
    let processedComplexCount = 0;
    let totalListingsCount = 0;

    // 2. Get DB connection
    connection = await pool.getConnection();
    logger.info('Database connection acquired.');

    const current_date = new Date().toISOString().slice(0, 10);
    const current_time = new Date().toTimeString().slice(0, 8);

    // 3. Iterate through each complex number
    for (const [index, complexNo] of complexNumbers.entries()) {
      try {
        logger.info(`Processing complex ${complexNo} (${index + 1}/${complexNumbers.length})`);
        await sleep(2000); // To avoid overwhelming the API

        // 4. Fetch articles from Naver API
        const articles = await fetchAptArticles(complexNo);

        if (!articles || articles.length === 0) {
          logger.info(`No articles found for complex ${complexNo}.`);
          continue;
        }

        // 5. Filter and transform data
        const listingsToInsert = articles
          .filter(article => ['매매', '전세'].includes(article.tradeTypeName))
          .map(article => {
            const [floor, maxFloor] = article.floorInfo ? article.floorInfo.split('/') : [null, null];
            return [
              complexNo,
              article.articleName,
              article.realEstateTypeName,
              article.tradeTypeName,
              article.floorInfo,
              floor,
              maxFloor,
              convertPrice(article.dealOrWarrantPrc),
              article.areaName,
              article.area1,
              article.area2,
              article.direction,
              article.buildingName,
              current_date,
              current_time
            ];
          });

        if (listingsToInsert.length === 0) {
          logger.info(`No relevant (매매, 전세) articles found for complex ${complexNo}.`);
          continue;
        }

        // 6. Bulk insert into database
        const sql = `
          INSERT INTO apartment_listings 
          (complexNo, articleName, realEstateTypeName, tradeTypeName, 
          floorInfo, floor, maxFloor, dealOrWarrantPrc, areaName, 
          area1, area2, direction, buildingName, date, time)
          VALUES ?;
        `;
        await connection.query(sql, [listingsToInsert]);
        logger.info(`Successfully inserted ${listingsToInsert.length} listings for complex ${complexNo}.`);
        
        // Increment counters
        processedComplexCount++;
        totalListingsCount += listingsToInsert.length;

      } catch (error) {
        logger.error(`Error processing complex ${complexNo}:`, error);
        await sleep(5000); // Wait longer if an error occurs
        continue; // Continue to the next complex number
      }
    }

    // 7. Get summary data from DB view
    logger.info('Fetching summary data from sumToday view...');
    const [summaryRows] = await connection.query(`
      SELECT complexNo, tradeTypeName, maxPrice, minPrice, areaName, date 
      FROM sumToday
    `);
    
    logger.info(`Found ${summaryRows.length} summary rows.`);

    if (summaryRows.length > 0) {
        // 8. Map data for Google Sheets
        const sheetData = summaryRows.map(row => ({
            '단지번호': row.complexNo,
            '거래유형': row.tradeTypeName,
            '최고가': row.maxPrice,
            '최저가': row.minPrice,
            '면적': row.areaName,
            '날짜': row.date
        }));

        // 9. Update Google Sheets
        await updateSummarySheet(sheetData);
    }

    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = formatDuration(durationInSeconds);
    
    const summaryMessage = `
🚀 데이터 수집 및 구글 시트 업데이트가 모두 완료되었습니다.
- 총 처리 단지: ${processedComplexCount} / ${complexNumbers.length}개
- 수집된 매물: ${totalListingsCount}개
- 취합된 데이터: ${summaryRows.length}개
- 총 소요시간: ${durationFormatted}
    `.trim();

    await sendMessage(summaryMessage);

    logger.info('Complex load process finished successfully.');
    return 'success';

  } catch (error) {
    logger.error('The entire complex load process failed:', error);
    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = formatDuration(durationInSeconds);
    await sendMessage(`🚨 전체 작업 실패: ${error.message} (총 소요시간: ${durationFormatted})`);
    return 'failed';
  } finally {
    if (connection) {
      connection.release();
      logger.info('Database connection released.');
    }
  }
}

module.exports = { runComplexLoad };
