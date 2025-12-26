/**
 * 의상 감지 및 분할 모듈
 */

/**
 * 의상 바운딩 박스 추정 (더미 데이터)
 */
export function estimateBBoxForGarment(imageUrl, garmentType) {
  // 실제 구현은 ML 모델을 사용하거나 외부 API를 호출
  // 현재는 더미 데이터 반환
  return {
    x: 0.2,
    y: 0.1,
    width: 0.6,
    height: 0.8
  };
}

/**
 * 의상 분할 (더미 구현)
 */
export async function segmentGarments(imageUrl) {
  // 실제 구현은 세그멘테이션 모델 사용
  // 현재는 더미 데이터 반환
  return {
    outer: [{ confidence: 0.9, bbox: { x: 0.2, y: 0.1, width: 0.6, height: 0.5 } }],
    inner: [{ confidence: 0.85, bbox: { x: 0.25, y: 0.15, width: 0.5, height: 0.4 } }],
    bottoms: [{ confidence: 0.9, bbox: { x: 0.2, y: 0.55, width: 0.6, height: 0.45 } }]
  };
}

