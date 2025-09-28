require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

// --- Authentication ---
// google_auth.json 파일을 직접 읽어 인증합니다.
let credentials;
try {
    const fileContent = fs.readFileSync('google_auth.json', 'utf8');
    credentials = JSON.parse(fileContent);
} catch (error) {
    throw new Error(`Could not read or parse google_auth.json. Make sure the file exists and is valid JSON. Error: ${error.message}`);
}

// 공식 라이브러리용 인증 객체를 생성합니다.
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;


// --- Functions ---

/**
 * '수도권' 시트에서 아파트 단지 번호 목록을 가져옵니다.
 */
async function getComplexNumbers() {
  console.log("Using official googleapis library to get complex numbers...");
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '수도권!E4:E', // E열 4행부터 끝까지 모든 데이터를 가져옵니다.
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      console.log('No complex numbers found in Google Sheet.');
      return [];
    }

    // 2D 배열을 1D로 만들고, 빈 값 제거 후 Set을 사용해 중복을 제거합니다.
    const complexNumbers = new Set(values.flat().filter(Boolean));
    const result = Array.from(complexNumbers);
    console.log(`Found ${result.length} unique complex numbers.`);
    return result;

  } catch (error) {
    console.error('Error reading from Google Sheets with googleapis:', error.message);
    throw error;
  }
}

/**
 * '수집요약' 시트에 요약 데이터를 업데이트합니다.
 */
async function updateSummarySheet(data) {
  console.log("Using official googleapis library to update summary sheet...");
  try {
    // 1. 시트의 모든 내용을 먼저 삭제합니다.
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: '수집요약',
    });
    console.log("Cleared '수집요약' sheet.");

    if (data.length === 0) {
        console.log('No summary data to write.');
        return;
    }

    // 2. 헤더와 데이터 행들을 준비합니다.
    const header = ['단지번호', '거래유형', '최고가', '최저가', '면적', '날짜'];
    const rowsToWrite = data.map(row => [
        row['단지번호'],
        row['거래유형'],
        row['최고가'],
        row['최저가'],
        row['면적'],
        row['날짜']
    ]);

    const resource = {
      values: [header, ...rowsToWrite],
    };

    // 3. 준비된 모든 데이터를 시트에 한 번에 추가합니다.
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '수집요약!A1',
      valueInputOption: 'USER_ENTERED',
      resource,
    });

    console.log(`Successfully updated '수집요약' sheet with ${data.length} rows.`);

  } catch (error) {
    console.error('Error writing to Google Sheets with googleapis:', error.message);
    throw error;
  }
}

module.exports = { getComplexNumbers, updateSummarySheet };