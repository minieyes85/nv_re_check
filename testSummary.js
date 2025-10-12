const { pool } = require('./database');
const { updateSummarySheet } = require('./googleSheets');
require('dotenv').config(); // .env 파일 로드

async function testSummary() {
  let connection;
  try {
    console.log('요약 데이터 테스트를 시작합니다...');

    // 1. 데이터베이스 연결 가져오기
    connection = await pool.getConnection();
    console.log('데이터베이스 연결을 성공했습니다.');

    // 2. DB 뷰에서 요약 데이터 가져오기
    console.log('sumToday 뷰에서 요약 데이터를 조회합니다...');
    const [summaryRows] = await connection.query(`
      SELECT complexNo, tradeTypeName, maxPrice, minPrice, areaName, date 
      FROM sumToday
    `);

    console.log(`${summaryRows.length}개의 요약 데이터를 찾았습니다.`);

    if (summaryRows.length > 0) {
      // 3. 구글 시트용 데이터로 변환
      const sheetData = summaryRows.map(row => ({
        '단지번호': row.complexNo,
        '거래유형': row.tradeTypeName,
        '최고가': row.maxPrice,
        '최저가': row.minPrice,
        '면적': row.areaName,
        '날짜': row.date
      }));

      // 4. 구글 시트 업데이트
      await updateSummarySheet(sheetData);
      console.log('구글 시트 업데이트가 완료되었습니다.');
    } else {
      console.log('업데이트할 요약 데이터가 없습니다.');
    }

    console.log('요약 데이터 테스트를 성공적으로 마쳤습니다.');

  } catch (error) {
    console.error('요약 데이터 테스트 중 오류가 발생했습니다:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('데이터베이스 연결을 해제했습니다.');
    }
    // 스크립트가 종료될 수 있도록 DB 풀을 닫습니다.
    pool.end();
    console.log('데이터베이스 풀을 닫았습니다.');
  }
}

testSummary();
