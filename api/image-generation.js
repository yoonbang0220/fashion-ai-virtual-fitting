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
 * 의상 썸네일 생성을 위한 프롬프트 생성
 */
function generatePromptForGarment(garmentType, category) {
  const garmentNames = {
    outer: '아우터 (블라우저/자켓/코트)',
    inner: '이너 (티셔츠/셔츠)',
    bottoms: '하의 (바지/청바지)'
  };

  const garmentName = garmentNames[garmentType] || '의상';

  return `온라인 쇼핑몰 스타일의 의상 썸네일을 생성하세요:
- ${garmentName} 제품 사진
- 깔끔한 흰색 배경
- 의상이 중앙에 위치하고 적절한 여백이 있음
- 자연스러운 조명
- 제품 디테일이 선명하게 보임
- 전면 뷰, 입체감 있게
- 고품질, 전문적인 촬영 스타일`;
}

/**
 * 나노바나나 API 호출 (Gemini 3 우선)
 */
async function callNanoBananaAPI(prompt, originalImageUrl = null) {
  const apiKey = window.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  // Gemini 3 모델 우선, 그 다음 이미지 생성 최적화 모델
  const models = [
    'gemini-3-pro-image-preview',            // Gemini 3 프로 이미지 생성 (최우선)
    'gemini-3-flash-preview',                // Gemini 3 플래시 (최우선)
    'gemini-3-pro-preview',                  // Gemini 3 프로 (최우선)
    'gemini-2.0-flash-exp-image-generation', // 이미지 생성 전용
    'gemini-2.5-flash-image',                // 이미지 생성 최적화
    'nano-banana-pro-preview',               // 나노바나나
    'gemini-2.5-flash',                      // 일반 텍스트 (Fallback)
    'gemini-2.5-pro'                         // 일반 텍스트 프로 (Fallback)
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
      console.log(`[나노바나나] ${model} 모델 시도...`);

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
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[나노바나나] ${model} 실패: ${response.status}`, errorText.substring(0, 200));
        
        if (response.status === 429 || response.status === 404 || response.status === 400) {
          continue; // 다음 모델 시도
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[나노바나나] API 응답 수신:', model);

      // 응답에서 이미지 추출
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const responseParts = data.candidates[0].content.parts;

        // base64 이미지 찾기
        for (const part of responseParts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            console.log('[나노바나나] ✅ 이미지 생성 성공!');
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }

        // 텍스트 응답에서 URL 추출 시도
        if (responseParts[0]?.text) {
          const urlMatch = responseParts[0].text.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
          if (urlMatch) {
            console.log('[나노바나나] ✅ 이미지 URL 발견:', urlMatch[1]);
            return urlMatch[1];
          }
        }
      }

      throw new Error('이미지가 응답에 포함되지 않음');
    } catch (error) {
      console.warn(`[나노바나나] ${model} 실패:`, error.message);
      if (model === models[models.length - 1]) {
        throw error;
      }
      continue;
    }
  }

  throw new Error('모든 나노바나나 모델 실패');
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
 * 의상 썸네일 생성 (메인 함수)
 */
export async function generateGarmentThumbnail(garmentType, category, originalImageUrl = null) {
  try {
    const prompt = generatePromptForGarment(garmentType, category);
    
    // 1순위: 나노바나나 API (Gemini 3 우선)
    try {
      console.log(`[썸네일 생성] 나노바나나 API 시도: ${garmentType}/${category}`);
      const result = await callNanoBananaAPI(prompt, originalImageUrl);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('[썸네일 생성] 나노바나나 실패, DALL-E 시도:', error.message);
    }

    // 2순위: DALL-E 3 API
    if (window.OPENAI_API_KEY) {
      try {
        console.log(`[썸네일 생성] DALL-E 3 API 시도: ${garmentType}/${category}`);
        const result = await callDALLEAPI(prompt);
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('[썸네일 생성] DALL-E 실패:', error.message);
      }
    }

    // 3순위: 더미 이미지
    console.warn('[썸네일 생성] 모든 API 실패, 더미 이미지 사용');
    return generateDummyThumbnail(garmentType, category);

  } catch (error) {
    console.error('[썸네일 생성] 전체 실패:', error);
    return generateDummyThumbnail(garmentType, category);
  }
}

// 전역 함수로도 export (window 객체에 추가)
window.generateGarmentThumbnail = generateGarmentThumbnail;
window.callNanoBananaAPI = callNanoBananaAPI;
window.imageUrlToBase64 = imageUrlToBase64;

