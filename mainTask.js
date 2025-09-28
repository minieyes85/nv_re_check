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
    console.log('Starting complex load process...');
    
    // 1. Get complex numbers from Google Sheets
    const complexNumbers = await getComplexNumbers();
    await sendMessage(`총 ${complexNumbers.length}개의 단지 목록을 가져왔습니다.`);
    // const complexNumbers = ['1138']; // For testing a single complex

    if (!complexNumbers || complexNumbers.length === 0) {
      console.log('No complex numbers to process.');
      return 'success';
    }

    // 2. Get DB connection
    connection = await pool.getConnection();
    console.log('Database connection acquired.');

    const current_date = new Date().toISOString().slice(0, 10);
    const current_time = new Date().toTimeString().slice(0, 8);

    // 3. Iterate through each complex number
    for (const [index, complexNo] of complexNumbers.entries()) {
      try {
        const progressMessage = `단지 처리중: ${complexNo} (${index + 1}/${complexNumbers.length})`;
        console.log(`\nProcessing complex ${complexNo} (${index + 1}/${complexNumbers.length})`);
        await sendMessage(progressMessage);
        await sleep(2000); // To avoid overwhelming the API

        // 4. Fetch articles from Naver API
        const articles = await fetchAptArticles(complexNo);

        if (!articles || articles.length === 0) {
          console.log(`No articles found for complex ${complexNo}.`);
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
          console.log(`No relevant (매매, 전세) articles found for complex ${complexNo}.`);
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
        console.log(`Successfully inserted ${listingsToInsert.length} listings for complex ${complexNo}.`);
        await sendMessage(`✅ ${complexNo}: ${listingsToInsert.length}개 매물 저장 완료.`);

      } catch (error) {
        console.error(`Error processing complex ${complexNo}:`, error);
        await sendMessage(`❌ ${complexNo} 처리 중 오류 발생`);
        await sleep(5000); // Wait longer if an error occurs
        continue; // Continue to the next complex number
      }
    }

    // 7. Get summary data from DB view
    console.log('\nFetching summary data from sumToday view...');
    const [summaryRows] = await connection.query(`
      SELECT complexNo, tradeTypeName, maxPrice, minPrice, areaName, date 
      FROM sumToday
    `);
    
    console.log(`Found ${summaryRows.length} summary rows.`);

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
        const endTime = new Date();
        const durationInSeconds = Math.round((endTime - startTime) / 1000);
        const durationFormatted = formatDuration(durationInSeconds);
        await sendMessage(`🚀 데이터 수집 및 구글 시트 업데이트가 모두 완료되었습니다. (총 소요시간: ${durationFormatted})`);
    }

    console.log('Complex load process finished successfully.');
    return 'success';

  } catch (error) {
    console.error('The entire complex load process failed:', error);
    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - startTime) / 1000);
    const durationFormatted = formatDuration(durationInSeconds);
    await sendMessage(`🚨 전체 작업 실패: ${error.message} (총 소요시간: ${durationFormatted})`);
    return 'failed';
  } finally {
    if (connection) {
      connection.release();
      console.log('Database connection released.');
    }
  }
}

module.exports = { runComplexLoad };