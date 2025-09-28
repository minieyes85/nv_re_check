/**
 * "1억 5,000"과 같은 한국어 가격 문자열을 "15000"과 같은 숫자 형식의 문자열로 변환합니다.
 * @param {string} priceStr - 변환할 가격 문자열
 * @returns {string} 변환된 숫자 형식의 문자열
 */
function convertPrice(priceStr) {
  if (!priceStr) {
    return '';
  }
  
  const cleanedStr = priceStr.replace(/,/g, '');
  
  if (cleanedStr.includes('억')) {
    const parts = cleanedStr.split('억');
    const eok = parseInt(parts[0].trim(), 10) || 0;
    const man = parts[1] ? parseInt(parts[1].trim(), 10) || 0 : 0;
    return String(eok * 10000 + man);
  } else {
    return cleanedStr.trim();
  }
}

function formatDuration(seconds) {
  if (seconds < 0) return "0초";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = "";
  if (hours > 0) result += `${hours}시간 `;
  if (minutes > 0) result += `${minutes}분 `;
  result += `${secs}초`;

  return result.trim();
}

module.exports = { convertPrice, formatDuration };
