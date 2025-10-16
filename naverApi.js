require('./config.js');
const axios = require('axios');
const path = require('path');
const logger = require('./logger').child({ label: path.basename(__filename) });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 특정 아파트 단지 번호에 대한 모든 매물 목록을 네이버 부동산 API로부터 가져옵니다.
 * @param {string} complexNo - 아파트 단지 번호
 * @returns {Promise<Array>} 매물 목록 Promise
 */
async function fetchAptArticles(complexNo, auth) {
  const baseUrl = `https://new.land.naver.com/api/articles/complex/${complexNo}`;
  const headers = {
    'accept': '*/*',
    'accept-language': 'ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7',
    'authorization': auth.authorization,
    'cookie': auth.cookie,
    'referer': `https://new.land.naver.com/complexes/${complexNo}`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  const params = {
    realEstateType: "APT:PRE:ABYG:JGC",
    tradeType: "",
    page: 1,
    order: "rank",
  };

  let allArticles = [];
  let isMoreData = true;

  logger.info(`Fetching articles for complex: ${complexNo}`);

  while (isMoreData) {
    try {
      const response = await axios.get(baseUrl, { headers, params });
      
      if (response.status === 200 && response.data) {
        const articleList = response.data.articleList || [];
        allArticles = allArticles.concat(articleList);
        isMoreData = response.data.isMoreData || false;
        
        if (isMoreData) {
          logger.info(`Page ${params.page} for complex ${complexNo} fetched, more data exists...`);
          params.page++;
          await sleep(1000); // 다음 페이지 요청 전 1초 대기
        } else {
          logger.info(`Page ${params.page} for complex ${complexNo} fetched, no more data.`);
        }
      } else {
        logger.error(`Failed to fetch data for complex ${complexNo}, page ${params.page}. Status: ${response.status}`);
        isMoreData = false;
      }
    } catch (error) {
      logger.error(`An error occurred while fetching complex ${complexNo}, page ${params.page}: ${error.message}`);
      isMoreData = false;
    }
  }
  
  logger.info(`Total articles fetched for complex ${complexNo}: ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAptArticles };