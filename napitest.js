// 네이버 부동산 API의 원본 응답을 직접 확인하기 위한 테스트 파일입니다.
// 사용법: 터미널에서 node napitest.js 실행

require('dotenv').config();
const axios = require('axios');

// 테스트할 아파트 단지 번호 (예시: 래미안 원베일리, 127725)
const TEST_COMPLEX_NO = '27424';

(async () => {
  console.log(`[Test Start] Direct Naver API call for complex number: ${TEST_COMPLEX_NO}`);

  const url = `https://new.land.naver.com/api/articles/complex/${TEST_COMPLEX_NO}`;
  
  const headers = {
    'accept': '*/*',
    'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
    'authorization': process.env.NAVER_API_AUTHORIZATION,
    'cookie': process.env.NAVER_API_COOKIE,
    'referer': `https://new.land.naver.com/complexes/${TEST_COMPLEX_NO}`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  // 필수적인 파라미터만 포함하여 첫 페이지만 테스트합니다.
  const params = {
    realEstateType: "APT:PRE:ABYG:JGC",
    tradeType: "",
    page: 1,
    order: "rank",
  };

  try {
    const response = await axios.get(url, { headers, params });
    
    console.log(`
--- Full API Response (Status: ${response.status}) ---`);
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error(`
--- An error occurred during the API call ---`);
    if (error.response) {
      // 서버가 2xx 범위를 벗어나는 상태 코드로 응답한 경우
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // 요청이 이루어졌으나 응답을 받지 못한 경우
      console.error("No response received for the request.");
    } else {
      // 요청을 설정하는 중에 오류가 발생한 경우
      console.error('Error', error.message);
    }
  }
  
  console.log(`
[Test Finished]`);
})();
