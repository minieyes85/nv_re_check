require('./config.js');
const mysql = require('mysql2/promise');

// 데이터베이스 연결 풀 생성
// .env 파일에서 MODE 값 읽기 (기본값: DEV)
const mode = process.env.MODE || 'DEV';

// MODE 값에 따라 동적으로 데이터베이스 이름 설정
const dbDatabase = process.env[`DB_DATABASE_${mode}`];

if (!dbDatabase) {
  console.error(`Database not found for MODE: ${mode}. Make sure DB_DATABASE_${mode} is set in your .env file.`);
  process.exit(1); // 환경 변수가 없으면 프로세스 종료
}

// 데이터베이스 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: dbDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 데이터베이스 초기화 및 테이블/뷰 생성
async function initDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Successfully connected to the database.");

    // apartment_listings 테이블 생성 (존재하지 않을 경우)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS apartment_listings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          complexNo VARCHAR(50),
          articleName VARCHAR(200),
          realEstateTypeName VARCHAR(50),
          tradeTypeName VARCHAR(50),
          floorInfo VARCHAR(50),
          floor VARCHAR(20),
          maxFloor VARCHAR(20),
          dealOrWarrantPrc VARCHAR(50),
          areaName VARCHAR(50),
          area1 VARCHAR(20),
          area2 VARCHAR(20),
          direction VARCHAR(50),
          buildingName VARCHAR(200),
          date VARCHAR(50),
          time VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table 'apartment_listings' is ready.");

    // sumToday 뷰 생성 (기존 뷰가 있으면 대체)
    await connection.execute(`
      CREATE OR REPLACE VIEW sumToday AS
      SELECT
          date,
          complexNo,
          articleName,
          areaName,
          tradeTypeName,
          COUNT(*) AS articleCount,
          MIN(CAST(dealOrWarrantPrc AS UNSIGNED)) AS minPrice,
          MAX(CAST(dealOrWarrantPrc AS UNSIGNED)) AS maxPrice
      FROM
          apartment_listings
      WHERE
          DATE(created_at) = CURDATE()
      GROUP BY
          date,
          complexNo,
          articleName,
          areaName,
          tradeTypeName
      ORDER BY
          complexNo,
          areaName,
          tradeTypeName;
    `);
    console.log("View 'sumToday' is ready.");

  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { pool, initDatabase };
