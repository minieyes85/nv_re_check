require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { initDatabase, pool } = require('./database');
const { runComplexLoad } = require('./mainTask');

async function main() {
  console.log('Starting task directly from command line...');
  let exitCode = 0;
  try {
    // 1. 데이터베이스 초기화 (테이블 및 뷰 존재 보장)
    await initDatabase();

    // 2. 메인 작업 실행
    const result = await runComplexLoad();
    console.log(`Task finished with result: ${result}`);

  } catch (error) {
    console.error('Task execution failed:', error);
    exitCode = 1; // 오류 발생 시 종료 코드 1로 설정
  } finally {
    // 3. 스크립트가 깔끔하게 종료될 수 있도록 데이터베이스 풀을 닫습니다.
    console.log('Closing database pool...');
    await pool.end();
    console.log('Database pool closed.');
    process.exit(exitCode); // 적절한 종료 코드로 프로세스 종료
  }
}

main();
