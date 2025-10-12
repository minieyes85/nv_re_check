require('dotenv').config(); // .env 파일에서 환경 변수를 로드합니다.
const { sendMessage } = require('./telegram');

async function testTelegramMessage() {
  console.log('텔레그램 메시지 발송 테스트를 시작합니다...');

  const testMessage = '이것은 Gemini가 보내는 테스트 메시지입니다. 🚀';

  try {
    await sendMessage(testMessage);
    console.log('테스트 메시지를 성공적으로 발송했습니다.');
  } catch (error) {
    console.error('메시지 발송 중 오류가 발생했습니다:', error);
  }
}

testTelegramMessage();
