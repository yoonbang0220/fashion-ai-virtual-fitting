/**
 * AI 이미지 생성 API 모듈
 * Nano Banana (Gemini) 및 DALL-E 3 지원
 */

/**
 * 이미지 URL을 Base64로 변환
 */
async function imageUrlToBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[이미지 변환] Base64 변환 실패:', error);
    throw error;
  }
}

/**
 * 의상 감지 및 추출을 위한 프롬프트 생성
 */
function generatePromptForGarment(garmentType, category) {
  // 🆕 카테고리별 구체적인 의상 설명
  const garmentDescriptions = {
    // Outer
    'heavyOuter': '헤비 아우터: 코트, 패딩, 무스탕, 롱코트 등 (두꺼운 겉옷)',
    'lightOuter': '라이트 아우터: 블레이저, 재킷, 자켓, 점퍼, 데님자켓, 가죽자켓 등 (얇은 겉옷)',
    // Inner
    'midLayer': '미드 레이어: 가디건, 집업, 후드집업 등 (중간 레이어)',
    'mainTop': '메인 상의: 니트, 스웨터, 후드티, 맨투맨, 조끼, 베스트 등 (메인 상의)',
    'baseInner': '베이스 이너: 티셔츠, 셔츠, 남방, 목폴라, 반팔티, 긴팔티 등 (기본 이너웨어)',
    // Bottoms
    'bottoms': '하의: 바지, 청바지, 슬랙스, 치마, 반바지 등',
    // 기본값 (fallback)
    'outer': '아우터 (재킷, 자켓, 코트, 블레이저, 패딩 등)',
    'inner': '이너 상의 (티셔츠, 셔츠, 니트, 맨투맨, 후드티 등)',
    'default': '의상'
  };

  // category가 있으면 우선 사용, 없으면 garmentType 사용
  const garmentDescription = garmentDescriptions[category] || garmentDescriptions[garmentType] || garmentDescriptions['default'];

  return `🔍 CRITICAL: Check if this garment EXISTS in the photo

GARMENT TO CHECK: ${garmentDescription}

STEP 1: TEXT RESPONSE FIRST
Answer ONLY with one word: "YES" or "NO"

STEP 2: If YES, then extract the garment image
- Show the garment on white background
- Only if you answered "YES" in Step 1
- IMPORTANT: Return the image as BASE64 inline data (NOT as external URL)
- Prefer inline base64 image over external URL

❌ DO NOT CREATE garments that don't exist
❌ DO NOT generate fake clothing
❌ DO NOT return external URLs that may expire
✅ ONLY extract if the garment is clearly visible
✅ Return base64 inline image data for reliable storage

EXAMPLES:
1. Photo: man wearing jacket + t-shirt + pants
   Looking for: jacket → Answer: "YES" then extract jacket as base64 inline image
   
2. Photo: man wearing jacket + t-shirt + pants  
   Looking for: sweater → Answer: "NO" (no sweater visible)

ANSWER FORMAT:
First line: "YES" or "NO"
Then (only if YES): garment image as base64 inline data`;
}

/**
 * 나노바나나 API 호출 (Gemini 3 우선)
 */
async function callNanoBananaAPI(prompt, originalImageUrl = null) {
  const apiKey = window.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  // 🆕 텍스트 기반 모델 우선 (YES/NO 판단용), 이미지 생성 모델은 나중에
  const models = [
    'gemini-2.5-flash',                      // 텍스트 모델 (YES/NO 판단 우선)
    'gemini-2.5-pro',                        // 텍스트 프로 (YES/NO 판단 우선)
    'gemini-3-pro-preview',                  // Gemini 3 프로 (텍스트)
    'gemini-3-flash-preview',                // Gemini 3 플래시 (텍스트)
    'gemini-3-pro-image-preview',            // Gemini 3 프로 이미지 생성
    'gemini-2.0-flash-exp-image-generation', // 이미지 생성 전용
    'gemini-2.5-flash-image',                // 이미지 생성 최적화
    'nano-banana-pro-preview'                // 나노바나나
  ];

  // Parts 배열 구성
  const parts = [{ text: prompt }];

  // 원본 이미지가 있으면 추가
  if (originalImageUrl) {
    try {
      const imageBase64 = await imageUrlToBase64(originalImageUrl);
      parts.unshift({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    } catch (error) {
      console.warn('[나노바나나] 원본 이미지 변환 실패, 텍스트만 사용:', error);
    }
  }

  for (const model of models) {
    try {
      // 🆕 타임아웃 추가 (30초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            generationConfig: {
              temperature: 0.1,  // 낮춤: 더 정확한 YES/NO 판단
              topK: 10,          // 낮춤: 더 보수적으로
              topP: 0.7,         // 낮춤: 더 일관성 있게
              maxOutputTokens: 8192,
            }
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // 마지막 모델이 아니면 조용히 다음 모델 시도 (로그 최소화)
        if (response.status === 429 || response.status === 404 || response.status === 400) {
          continue; // 다음 모델 시도
        }
        // 심각한 오류만 throw
        if (model === models[models.length - 1]) {
          const errorText = await response.text();
          console.warn(`[나노바나나] 모든 모델 실패: ${response.status}`);
        }
        continue; // 다음 모델 시도
      }

      const data = await response.json();

      // 응답 파싱
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const responseParts = data.candidates[0].content.parts;

        // 🆕 1순위: 텍스트 응답 먼저 확인 (YES/NO 판단)
        let textResponse = '';
        for (const part of responseParts) {
          if (part.text) {
            textResponse += part.text;
          }
        }
        
        if (textResponse) {
          const upperText = textResponse.toUpperCase();
          
          // NO 응답 감지 (의상 없음) - 즉시 null 반환 (다른 모델 시도 안 함)
          if (upperText.includes('NO') || 
              upperText.includes('NOT_FOUND') || 
              upperText.includes('NOT FOUND') ||
              textResponse.includes('없음') ||
              textResponse.includes('감지되지 않') ||
              textResponse.includes('없습니다')) {
            // NO는 정상적인 응답이므로 특별한 에러 코드로 반환
            return 'NOT_FOUND';
          }
        }

        // 2순위: base64 이미지 찾기
        for (const part of responseParts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }

        // 3순위: 텍스트 응답에서 URL 추출 시도
        if (textResponse) {
          const urlMatch = textResponse.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
          if (urlMatch) {
            const imageUrl = urlMatch[1];
            
            // Placeholder URL 체크
            if (imageUrl.includes('placeholder') || imageUrl.includes('imgur.com/result_')) {
              continue; // 다음 모델 시도
            }
            
            console.log('[나노바나나] ✅ 이미지 URL 발견:', imageUrl);
            return imageUrl;
          }
        }
      }

      // 이미지가 없으면 다음 모델 시도 (에러 throw 안 함)
      continue;
    } catch (error) {
      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        // 마지막 모델이 아니면 조용히 다음 모델 시도
        if (model !== models[models.length - 1]) {
          continue;
        }
        continue; // 마지막 모델도 타임아웃이면 그냥 다음으로
      }
      
      // NOT_FOUND는 정상 응답이므로 즉시 반환 (에러가 아님)
      if (error.message && (error.message.includes('NOT_FOUND') || error.message.includes('의상이 사진에 없습니다'))) {
        return 'NOT_FOUND';
      }
      
      // 마지막 모델이 아니면 조용히 다음 모델 시도 (로그 출력 안 함)
      if (model !== models[models.length - 1]) {
        continue;
      }
      // 마지막 모델 실패 시에만 로그 출력 (NOT_FOUND 제외)
      continue;
    }
  }

  // 모든 모델 실패 - null 반환 (에러 throw 안 함)
  return null;
}

/**
 * DALL-E 3 API 호출
 */
async function callDALLEAPI(prompt) {
  const apiKey = window.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  try {
    console.log('[DALL-E] API 호출 시작...');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
        n: 1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DALL-E API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (data.data && data.data[0]?.url) {
      console.log('[DALL-E] ✅ 이미지 생성 성공!');
      return data.data[0].url;
    }

    throw new Error('DALL-E 응답에 이미지 URL이 없음');
  } catch (error) {
    console.error('[DALL-E] API 호출 실패:', error);
    throw error;
  }
}

/**
 * 더미 썸네일 생성 (SVG)
 */
function generateDummyThumbnail(garmentType, category) {
  const garmentNames = {
    outer: '아우터',
    inner: '이너',
    bottoms: '하의'
  };

  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="white"/>
      <text x="256" y="256" font-size="24" text-anchor="middle" fill="#ccc">
        ${garmentNames[garmentType] || '의상'}
      </text>
    </svg>
  `;

  // UTF-8 인코딩을 위해 btoa 대신 encodeURIComponent 사용
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 외부 URL을 Blob URL로 변환 (만료 방지)
 */
async function convertExternalUrlToBlob(imageUrl) {
  try {
    // 접근 불가능한 URL 패턴 사전 체크
    const invalidPatterns = ['replicate.delivery', 'file-cdn.flyai.com', 'file-s3.omniwear.com'];
    for (const pattern of invalidPatterns) {
      if (imageUrl.includes(pattern)) {
        console.warn(`[의상 감지] 접근 불가능한 외부 URL 감지: ${pattern}`);
        return null;
      }
    }
    
    // 외부 URL fetch 시도
    const response = await fetch(imageUrl, { 
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      console.warn(`[의상 감지] 외부 URL fetch 실패: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const blob = await response.blob();
    
    // 이미지 타입 확인
    if (!blob.type.startsWith('image/')) {
      console.warn('[의상 감지] 이미지가 아닌 파일 타입:', blob.type);
      return null;
    }
    
    // Blob URL 생성
    const blobUrl = URL.createObjectURL(blob);
    console.log(`[의상 감지] 외부 URL → Blob URL 변환 성공: ${imageUrl.substring(0, 60)}...`);
    return blobUrl;
    
  } catch (error) {
    console.warn(`[의상 감지] 외부 URL 변환 실패: ${error.message}`);
    return null;
  }
}

/**
 * 의상 감지 및 추출 (메인 함수)
 */
export async function generateGarmentThumbnail(garmentType, category, originalImageUrl = null) {
  try {
    const prompt = generatePromptForGarment(garmentType, category);
    
    // 원본 이미지가 없으면 감지 불가
    if (!originalImageUrl) {
      console.warn(`[의상 감지] 원본 이미지 없음: ${garmentType}/${category}`);
      return null;
    }
    
    // 나노바나나 API로 의상 감지 시도 (로그 간소화)
    try {
      const result = await callNanoBananaAPI(prompt, originalImageUrl);
      
      // "NOT_FOUND" 또는 null이면 의상 없음
      if (!result || result === 'NOT_FOUND' || (typeof result === 'string' && result.includes('NOT_FOUND'))) {
        return null;
      }
      
      // 🆕 외부 URL인 경우 즉시 Blob URL로 변환 (만료 방지)
      if (result.startsWith('http://') || result.startsWith('https://')) {
        const blobUrl = await convertExternalUrlToBlob(result);
        if (blobUrl) {
          return blobUrl; // Blob URL 반환
        } else {
          // 변환 실패 시 원본 URL 반환 (나중에 다시 시도 가능)
          console.warn(`[의상 감지] 외부 URL 변환 실패, 원본 URL 유지: ${result.substring(0, 60)}...`);
          return result;
        }
      }
      
      // data: URL 또는 blob: URL은 그대로 반환
      return result;
      
    } catch (error) {
      // 에러 로그 최소화 (NOT_FOUND는 정상 응답)
      if (!error.message.includes('NOT_FOUND') && !error.message.includes('의상이 사진에 없습니다')) {
        console.warn(`[의상 감지] ${garmentType}/${category} 실패: ${error.message}`);
      }
      return null;
    }

  } catch (error) {
    console.error(`[의상 감지] 오류 발생: ${garmentType}/${category}`, error);
    return null;
  }
}

// 전역 함수로도 export (window 객체에 추가)
window.generateGarmentThumbnail = generateGarmentThumbnail;
window.callNanoBananaAPI = callNanoBananaAPI;
window.imageUrlToBase64 = imageUrlToBase64;

