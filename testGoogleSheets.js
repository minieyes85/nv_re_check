
require('./config.js'); // .env 파일 로드
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const logger = require('./logger').child({ label: 'testGoogleSheets' });

async function testSheetConnection() {
  logger.info('--- Google Sheets Connection Test Start ---');

  // 1. 환경 변수 확인
  const mode = process.env.MODE || 'DEV';
  const spreadsheetId = process.env[`GOOGLE_SHEET_ID_${mode}`];
  
  if (!spreadsheetId) {
    logger.error(`[FAIL] Google Sheet ID not found for MODE: ${mode}. Make sure GOOGLE_SHEET_ID_${mode} is set in your .env file.`);
    return;
  }
  logger.info(`[OK] Found Spreadsheet ID for MODE=${mode}: ${spreadsheetId}`);

  // 2. 인증 파일 확인
  let credentials;
  try {
    const authFilePath = path.join(__dirname, 'google_auth.json');
    const fileContent = fs.readFileSync(authFilePath, 'utf8');
    credentials = JSON.parse(fileContent);
    logger.info('[OK] Successfully read and parsed google_auth.json.');
  } catch (error) {
    logger.error(`[FAIL] Could not read or parse google_auth.json. Error: ${error.message}`);
    logger.error('       Please ensure the file exists in the project root and is valid JSON.');
    return;
  }

  // 3. Google 인증
  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    logger.info('[OK] GoogleAuth client created successfully.');
  } catch(error) {
      logger.error(`[FAIL] Failed to create GoogleAuth client. Error: ${error.message}`);
      return;
  }

  // 4. API 요청
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    logger.info('Attempting to fetch spreadsheet properties...');
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetTitle = response.data.properties.title;
    logger.info('------------------------------------------------');
    logger.info(`[SUCCESS] Successfully connected to Google Sheets API.`);
    logger.info(`          Spreadsheet Title: ${sheetTitle}`);
    logger.info('------------------------------------------------');

  } catch (error) {
    logger.error('------------------------------------------------');
    logger.error(`[FAIL] Error during API call to Google Sheets.`);
    if (error.response && error.response.data && error.response.data.error) {
        const err = error.response.data.error;
        logger.error(`       API Error Status: ${err.code} - ${err.status}`);
        logger.error(`       API Error Message: ${err.message}`);
        logger.error(`       Check if the service account has permission for this sheet.`);
    } else {
        logger.error(`       Error Message: ${error.message}`);
    }
    logger.error('------------------------------------------------');
  }
}

testSheetConnection();
