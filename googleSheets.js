require('./config.js');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const logger = require('./logger').child({ label: path.basename(__filename) });

// --- Authentication ---
let credentials;
try {
    const authFilePath = path.join(__dirname, 'google_auth.json');
    const fileContent = fs.readFileSync(authFilePath, 'utf8');
    credentials = JSON.parse(fileContent);
} catch (error) {
    logger.error(`Could not read or parse google_auth.json. Make sure the file exists and is valid JSON. Error: ${error.message}`);
    throw error; // Re-throw after logging
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const mode = process.env.MODE || 'DEV';
const spreadsheetId = process.env[`GOOGLE_SHEET_ID_${mode}`];
const complexListSheetName = process.env[`GOOGLE_SHEET_COMPLEX_LIST_${mode}`] || '수도권_test';
const summarySheetName = process.env[`GOOGLE_SHEET_SUMMARY_${mode}`] || '수집요약_test';

if (!spreadsheetId) {
  logger.error(`Google Sheet ID not found for MODE: ${mode}. Make sure GOOGLE_SHEET_ID_${mode} is set in your .env file.`);
  process.exit(1);
}


// --- Functions ---

async function getComplexNumbers() {
  logger.info(`Fetching complex numbers from sheet: ${complexListSheetName}`);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${complexListSheetName}!E4:E`,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      logger.warn('No complex numbers found in Google Sheet.');
      return [];
    }

    const complexNumbers = new Set(values.flat().filter(Boolean));
    const result = Array.from(complexNumbers);
    logger.info(`Found ${result.length} unique complex numbers.`);
    return result;

  } catch (error) {
    logger.error('Error reading complex numbers from Google Sheets:', error);
    throw error;
  }
}

async function updateSummarySheet(data) {
  logger.info(`Updating summary sheet: ${summarySheetName}`);
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: summarySheetName,
    });
    logger.info(`Cleared sheet: ${summarySheetName}`);

    if (data.length === 0) {
        logger.info('No summary data to write.');
        return;
    }

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

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${summarySheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource,
    });

    logger.info(`Successfully updated ${summarySheetName} with ${data.length} rows.`);

  } catch (error) {
    logger.error('Error writing to Google Sheets:', error);
    throw error;
  }
}

module.exports = { getComplexNumbers, updateSummarySheet };
