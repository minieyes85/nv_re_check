require('dotenv').config();
const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 특정 아파트 단지 번호에 대한 모든 매물 목록을 네이버 부동산 API로부터 가져옵니다.
 * @param {string} complexNo - 아파트 단지 번호
 * @returns {Promise<Array>} 매물 목록 Promise
 */
async function fetchAptArticles(complexNo) {
  const baseUrl = `https://new.land.naver.com/api/articles/complex/${complexNo}`;
  const headers = {
    'accept': '*/*',
    'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
    'authorization': process.env.NAVER_API_AUTHORIZATION,
    'cookie': process.env.NAVER_API_COOKIE,
    'referer': `https://new.land.naver.com/complexes/${complexNo}`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  // const headers = {
  //   'accept': '*/*',
  //   'accept-language': 'ko,en-US;q=0.9,en;q=0.8,id;q=0.7',
  //   'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlJFQUxFU1RBVEUiLCJpYXQiOjE3NTg4ODU4NDIsImV4cCI6MTc1ODg5NjY0Mn0.8w1BdabjS1kjzo39LyDVtSiqWpB7UBS5CO10dPYwnco',
  //   'priority': 'u=1, i',
  //   'referer': 'https://new.land.naver.com/complexes/130826?ms=37.517007,126.866546,15&a=APT:PRE:ABYG:JGC&e=RETAIL',
  //   'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  //   'sec-ch-ua-mobile': '?0',
  //   'sec-ch-ua-platform': '"Windows"',
  //   'sec-fetch-dest': 'empty',
  //   'sec-fetch-mode': 'cors',
  //   'sec-fetch-site': 'same-origin',
  //   'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  //   'cookie': 'NAC=TRCNBwwVkkhm; NNB=ZLDENSPXXW5GQ; ASID=d33a62640000019929afc1030000001b; ab.storage.deviceId.add4daf4-2272-42ee-9e25-1515d8081b62=g%3A6fe2acea-1229-7871-09d0-58e8d7f74598%7Ce%3Aundefined%7Cc%3A1758157257188%7Cl%3A1758157257188; ab.storage.sessionId.add4daf4-2272-42ee-9e25-1515d8081b62=g%3A43169920-b230-3988-5fa2-235d453c0951%7Ce%3A1758159868198%7Cc%3A1758157257187%7Cl%3A1758158068198; nhn.realestate.article.rlet_type_cd=A01; nhn.realestate.article.trade_type_cd=""; nhn.realestate.article.ipaddress_city=2800000000; _fwb=77pgMMGvn9fLWyS19KXlBQ.1758610945199; landHomeFlashUseYn=Y; _fwb=77pgMMGvn9fLWyS19KXlBQ.1758610945199; NACT=1; SRT30=1758853566; bnb_tooltip_shown_finance_v1=true; SRT5=1758885653; realestate.beta.lastclick.cortar=1147000000; REALESTATE=Fri%20Sep%2026%202025%2020%3A24%3A02%20GMT%2B0900%20(Korean%20Standard%20Time); PROP_TEST_KEY=1758885842683.6d948cbbc74f0c47be53df6a2024bbc8735ac31fff01d9acba755234ff6f4813; PROP_TEST_ID=75092aaca4b66f73d160f72518437bf977d8b90aa426e40929f23757ca9ac64c; BUC=t-Pzi-ebLjXm9sVTyIWTk8xJ4zrSBMkfn0D7G78_1Uk='
  // }
  
  // {
  //   'accept': '*/*',
  //   'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
  //   'authorization': process.env.NAVER_API_AUTHORIZATION,
  //   'cookie': process.env.NAVER_API_COOKIE,
  //   'referer': `https://new.land.naver.com/complexes/${complexNo}`,
  //   'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  //   'sec-ch-ua-mobile': '?0',
  //   'sec-ch-ua-platform': '"Windows"',
  //   'sec-fetch-dest': 'empty',
  //   'sec-fetch-mode': 'cors',
  //   'sec-fetch-site': 'same-origin',
  //   'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  // };


  const params = {
    realEstateType: "APT:PRE:ABYG:JGC",
    tradeType: "",
    page: 1,
    order: "rank",
  };

  let allArticles = [];
  let isMoreData = true;

  console.log(`Fetching articles for complex: ${complexNo}`);

  while (isMoreData) {
    try {
      const response = await axios.get(baseUrl, { headers, params });
      
      if (response.status === 200 && response.data) {
        const articleList = response.data.articleList || [];
        allArticles = allArticles.concat(articleList);
        isMoreData = response.data.isMoreData || false;
        
        if (isMoreData) {
          console.log(`Page ${params.page} fetched, more data exists...`);
          params.page++;
          await sleep(1000); // 다음 페이지 요청 전 1초 대기
        } else {
          console.log(`Page ${params.page} fetched, no more data.`);
        }
      } else {
        console.error(`Failed to fetch data for page ${params.page}. Status: ${response.status}`);
        isMoreData = false;
      }
    } catch (error) {
      console.error(`An error occurred while fetching page ${params.page}:`, error.message);
      isMoreData = false;
    }
  }
  
  console.log(`Total articles fetched for complex ${complexNo}: ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAptArticles };
