/**
 * Fashion AI 메인 애플리케이션
 */

// 상태 정의
const STATUS = {
  EMPTY: 'EMPTY',
  ANALYZING: 'ANALYZING',
  READY: 'READY',
  GENERATING: 'GENERATING',
  DONE: 'DONE',
  ERROR: 'ERROR'
};

// 전역 상태
let appState = {
  status: STATUS.EMPTY,
  basePersonImageUrl: null,
  slots: {
    outer: [null, null],      // Figma: 2개
    inner: [null, null, null], // Figma: 3개
    bottoms: [null, null]      // Figma: 2개
  },
  composedImageUrl: null,
  detectedGarments: null,
  prompt: '',
  errorMessage: null
};

/**
 * 상태 전이
 */
function transitionTo(newStatus, errorMessage = null) {
  appState.status = newStatus;
  appState.errorMessage = errorMessage || null;
  updateUI();
  saveAppState();
}

/**
 * 사진 업로드 처리
 */
async function handlePhotoUpload(file) {
  try {
    console.log('[업로드] 새 메인 사진 등록 시작...');
    
    const imageUrl = URL.createObjectURL(file);
    
    // 🔄 상태 완전 초기화
    appState.basePersonImageUrl = imageUrl;
    appState.composedImageUrl = null;
    appState.slots = {
      outer: [null, null],
      inner: [null, null, null],
      bottoms: [null, null]
    };
    appState.detectedGarments = null;
    appState.errorMessage = null;
    
    console.log('[업로드] 모든 슬롯 초기화 완료');
    
    transitionTo(STATUS.ANALYZING);
    
    // 자동 감지 시작
    await startAutoDetection(imageUrl);
  } catch (error) {
    console.error('[업로드] 실패:', error);
    transitionTo(STATUS.ERROR, `사진 업로드에 실패했습니다: ${error.message}`);
  }
}

/**
 * 자동 감지 시작
 */
async function startAutoDetection(imageUrl) {
  try {
    console.log('[자동 감지] 시작...');
    await mockAutoDetection(imageUrl);
  } catch (error) {
    console.error('[자동 감지] 실패:', error);
    transitionTo(STATUS.ERROR, `의상 인식에 실패했습니다: ${error.message}`);
  }
}

/**
 * 더미 자동 감지 (AI 썸네일 생성)
 */
async function mockAutoDetection(imageUrl) {
  await runInlinePipeline(imageUrl);
}

/**
 * 인라인 파이프라인 실행 (AI 썸네일 생성)
 */
async function runInlinePipeline(imageUrl) {
  try {
    // 더미 감지 데이터
    const detectedGarments = {
      outer: [{ confidence: 0.9 }],
      inner: [{ confidence: 0.85 }],
      bottoms: [{ confidence: 0.9 }]
    };
    
    appState.detectedGarments = detectedGarments;
    
    // 각 카테고리별로 썸네일 생성
    const categories = [
      { type: 'outer', index: 0 },
      { type: 'inner', index: 0 },
      { type: 'bottoms', index: 0 }
    ];
    
    for (const { type, index } of categories) {
      try {
        console.log(`[파이프라인] ${type}[${index}] 썸네일 생성 시작...`);
        const thumbnailUrl = await window.generateGarmentThumbnail(type, 'default', imageUrl);
        
        if (thumbnailUrl) {
          appState.slots[type][index] = thumbnailUrl;
          console.log(`[파이프라인] ${type}[${index}] 썸네일 생성 완료`);
        }
      } catch (error) {
        console.error(`[파이프라인] ${type}[${index}] 썸네일 생성 실패:`, error);
      }
    }
    
    transitionTo(STATUS.READY);
    
    // 슬롯이 있으면 자동 합성
    const hasAnySlot = appState.slots.outer.some(s => s) ||
                       appState.slots.inner.some(s => s) ||
                       appState.slots.bottoms.some(s => s);
    
    if (hasAnySlot) {
      console.log('[파이프라인] 자동 합성 시작...');
      transitionTo(STATUS.GENERATING);
      
      // 첫 번째 슬롯을 변경된 슬롯으로 설정
      let changedSlot = null;
      if (appState.slots.outer[0]) {
        changedSlot = { category: 'outer', index: 0 };
      } else if (appState.slots.inner[0]) {
        changedSlot = { category: 'inner', index: 0 };
      } else if (appState.slots.bottoms[0]) {
        changedSlot = { category: 'bottoms', index: 0 };
      }
      
      if (changedSlot) {
        await requestTryOn(changedSlot);
      }
    }
  } catch (error) {
    console.error('[파이프라인] 실패:', error);
    throw error;
  }
}

/**
 * 슬롯에 의상 추가/교체
 */
async function replaceSlot(category, index, garmentImageUrl) {
  try {
    console.log(`[슬롯 교체] 시작: ${category}[${index}]`);
    
    // 카테고리와 인덱스 검증
    if (!category || !['outer', 'inner', 'bottoms'].includes(category)) {
      throw new Error(`잘못된 카테고리: ${category}`);
    }
    
    const maxIndex = category === 'outer' ? 2 : category === 'inner' ? 3 : 2;
    if (index < 0 || index >= maxIndex) {
      throw new Error(`잘못된 인덱스: ${category}[${index}] (최대: ${maxIndex - 1})`);
    }
    
    // 슬롯 변경
    appState.slots[category][index] = garmentImageUrl;
    
    // UI 즉시 업데이트
    updateUI();
    
    console.log(`[슬롯 교체] UI 업데이트 완료: ${category}[${index}]`);
    console.log(`[슬롯 교체] 변경 후 상태:`, {
      outer: appState.slots.outer.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`),
      inner: appState.slots.inner.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`),
      bottoms: appState.slots.bottoms.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`),
      현재메인사진: appState.composedImageUrl ? '합성 이미지' : (appState.basePersonImageUrl ? 'Base 이미지' : '없음')
    });
    
    // 상태 전이: READY/DONE → GENERATING
    if (appState.status === 'READY' || appState.status === 'DONE') {
      console.log(`[슬롯 교체] 가상 피팅 시작: ${category}[${index}]`);
      transitionTo(STATUS.GENERATING);
      
      // AI 재합성 요청 (변경된 슬롯 정보 전달)
      await requestTryOn({
        category,
        index
      });
    } else {
      console.log(`[슬롯 교체] 상태가 READY/DONE이 아니어서 가상 피팅 생략: ${appState.status}`);
    }
    
    console.log(`[슬롯 교체] 완료: ${category}[${index}]`);
  } catch (error) {
    console.error('[슬롯 교체] 실패:', error);
    transitionTo(STATUS.ERROR, `의상 교체에 실패했습니다: ${error.message}`);
  }
}

/**
 * 슬롯의 의상 제거 (옷 벗기기)
 */
async function removeGarment(category, index) {
  try {
    console.log(`[옷 벗기기] 시작: ${category}[${index}]`);
    
    // 슬롯 비우기
    appState.slots[category][index] = null;
    
    // detectedGarments에서도 제거
    if (appState.detectedGarments[category] && appState.detectedGarments[category][index]) {
      appState.detectedGarments[category][index] = null;
    }
    
    // basePersonImageUrl이 있으면 그것으로 복원, 없으면 composedImageUrl 유지
    if (appState.basePersonImageUrl) {
      console.log('[옷 벗기기] 원래 Base 사진으로 복원');
      appState.composedImageUrl = null;
    } else {
      console.log('[옷 벗기기] Base 이미지 없음, composed 이미지 유지');
      // composedImageUrl을 유지하고 다른 슬롯들로 재생성해야 하지만,
      // 일단은 그대로 둠 (나중에 개선 가능)
    }
    
    // 상태 변경
    appState.status = appState.composedImageUrl ? STATUS.DONE : STATUS.READY;
    
    // UI 업데이트
    updateUI();
    
    // 상태 저장 (에러 무시)
    try {
      if (window.saveState) {
        const sessionId = window.getSessionId();
        await window.saveState(sessionId, appState);
      }
    } catch (saveError) {
      console.warn('[옷 벗기기] 상태 저장 실패 (무시):', saveError);
    }
    
    console.log(`[옷 벗기기] 완료: ${category}[${index}]`);
  } catch (error) {
    console.error('[옷 벗기기] 실패:', error);
    transitionTo(STATUS.ERROR, `의상 제거에 실패했습니다: ${error.message}`);
  }
}

/**
 * 가상 피팅 요청
 */
async function requestTryOn(changedSlot) {
  try {
    // 현재 메인 사진 결정: 합성 이미지 또는 Base 이미지 (둘 중 하나는 있어야 함)
    const currentMainImage = appState.composedImageUrl || appState.basePersonImageUrl;
    
    if (!currentMainImage) {
      throw new Error('Base image is required');
    }
    
    console.log('[가상 피팅] 현재 메인 사진:', appState.composedImageUrl ? '합성 이미지' : 'Base 이미지');
    
    // 변경된 슬롯의 의상 이미지 가져오기
    if (!changedSlot || !changedSlot.category || changedSlot.index === undefined) {
      throw new Error('변경된 슬롯 정보가 필요합니다');
    }
    
    const changedCategory = changedSlot.category;
    const changedIndex = changedSlot.index;
    const changedGarmentUrl = appState.slots[changedCategory]?.[changedIndex];
    
    if (!changedGarmentUrl) {
      throw new Error(`변경된 슬롯 ${changedCategory}[${changedIndex}]에 의상 이미지가 없습니다`);
    }
    
    console.log(`[가상 피팅] ${changedCategory}[${changedIndex}] 의상 교체 시작...`);
    
    // 변경된 슬롯만 처리
    const result = await mockTryOn({
      basePersonImageUrl: currentMainImage, // 현재 메인 사진 사용
      slots: {
        outer: appState.slots.outer.map(s => typeof s === 'string' ? s : (s?.url || null)),
        inner: appState.slots.inner.map(s => typeof s === 'string' ? s : (s?.url || null)),
        bottoms: appState.slots.bottoms.map(s => typeof s === 'string' ? s : (s?.url || null))
      },
      changedSlot: changedSlot,
      prompt: appState.prompt
    });
    
    // 합성 결과 업데이트
    appState.composedImageUrl = result.resultImageUrl;
    
    // 상태 전이: GENERATING → DONE
    transitionTo(STATUS.DONE);
  } catch (error) {
    console.error('[가상 피팅] Try-on failed:', error);
    transitionTo(STATUS.ERROR, `가상 피팅 생성에 실패했습니다: ${error.message}`);
  }
}

/**
 * 더미 Try-on (실제 AI 합성 호출)
 */
async function mockTryOn(params) {
  const resultImageUrl = await generateVirtualTryOn(params);
  return {
    resultImageUrl
  };
}

/**
 * 가상 피팅 생성 (나노바나나 API 사용)
 */
async function generateVirtualTryOn(params) {
  const apiKey = window.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  // 변경된 슬롯 정보 확인
  const changedCategory = params.changedSlot?.category;
  const changedIndex = params.changedSlot?.index;
  
  if (!changedCategory || changedIndex === undefined) {
    throw new Error('변경된 슬롯 정보가 필요합니다');
  }
  
  const changedGarmentUrl = params.slots[changedCategory]?.[changedIndex];
  if (!changedGarmentUrl) {
    throw new Error(`변경된 슬롯 ${changedCategory}[${changedIndex}]에 의상 이미지가 없습니다`);
  }
  
  console.log(`[가상 피팅] ${changedCategory}[${changedIndex}] 의상만 교체 시작...`);
  console.log('[가상 피팅] 현재 메인 사진:', params.basePersonImageUrl ? '사용 중' : '없음');
  
  // 변경된 슬롯의 의상 이미지만 사용
  const garmentImageUrl = changedGarmentUrl;
  
  console.log(`[가상 피팅] 변경할 의상: ${changedCategory}[${changedIndex}]`);
  
  // 현재 메인 사진(첫 번째 이미지)과 변경할 의상 이미지(두 번째 이미지)를 base64로 변환
  const [currentMainImageBase64, garmentImageBase64] = await Promise.all([
    window.imageUrlToBase64(params.basePersonImageUrl),
    window.imageUrlToBase64(garmentImageUrl)
  ]);
  
  // 카테고리에 따른 의상 이름
  const garmentNames = {
    outer: '아우터 (블라우저/자켓/코트)',
    inner: '이너 (티셔츠/셔츠)',
    bottoms: '하의 (바지/청바지)'
  };
  
  const garmentName = garmentNames[changedCategory] || '의상';
  
  // 프롬프트 생성: 현재 메인 사진에 변경할 의상만 입히기
  const prompt = `다음 두 이미지를 보세요:
1. 첫 번째 이미지: 현재 메인 사진 (사람이 이미 옷을 입고 있는 사진)
2. 두 번째 이미지: 새로 입을 ${garmentName} 의상

작업 요청:
- 첫 번째 이미지(현재 메인 사진)의 체형, 자세, 얼굴, 비율을 절대 변경하지 마세요
- 첫 번째 이미지의 사람이 입고 있는 다른 옷들(이너, 아우터, 하의 등)은 그대로 유지하세요
- 첫 번째 이미지의 ${garmentName}만 두 번째 이미지의 ${garmentName}로 교체하세요
- 자연스럽고 현실적인 가상 피팅 결과를 생성하세요
- 배경과 조명은 첫 번째 이미지와 유사하게 유지하세요

결과: 첫 번째 이미지의 사람이 입고 있는 ${garmentName}만 두 번째 이미지의 ${garmentName}로 교체된 합성 이미지를 생성하세요.`;
  
  // 나노바나나 API 호출 (멀티모달: 현재 메인 사진 + 변경할 의상 이미지)
  console.log('[가상 피팅] 나노바나나 API 호출 (멀티모달)...');
  
  // 나노바나나 API 호출을 위한 parts 배열 구성
  const parts = [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: currentMainImageBase64
      }
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: garmentImageBase64
      }
    },
    {
      text: prompt
    }
  ];
  
  // 나노바나나 API 호출 (Gemini 3 모델 우선)
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
  
  for (const model of models) {
    try {
      console.log(`[가상 피팅] ${model} 모델 시도... (현재 메인 사진 + 의상 이미지)`);
      
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
              temperature: 0.4, // 합성은 일관성 중요 (낮은 temperature)
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[가상 피팅] ${model} 실패: ${response.status}`, errorText.substring(0, 200));
        if (response.status === 429 || response.status === 404 || response.status === 400) {
          continue; // 다음 모델 시도
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[가상 피팅] API 응답 수신:', model);
      
      // 응답에서 이미지 추출
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const responseParts = data.candidates[0].content.parts;
        
        // base64 이미지 찾기
        for (const part of responseParts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            console.log('[가상 피팅] ✅ 합성 이미지 생성 성공!');
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        
        // 텍스트 응답에서 URL 추출 시도
        if (responseParts[0]?.text) {
          const urlMatch = responseParts[0].text.match(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i);
          if (urlMatch) {
            console.log('[가상 피팅] ✅ 이미지 URL 발견:', urlMatch[1]);
            return urlMatch[1];
          }
        }
      }
      
      throw new Error('이미지가 응답에 포함되지 않음');
    } catch (error) {
      console.warn(`[가상 피팅] ${model} 실패:`, error.message);
      if (model === models[models.length - 1]) {
        // 모든 모델 실패
        throw error;
      }
      // 다음 모델 시도
      continue;
    }
  }
  
  throw new Error('모든 나노바나나 모델 실패');
}

/**
 * 상태 저장
 */
let saveTimeout = null;
async function saveAppState() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    try {
      const sessionId = window.getSessionId();
      if (sessionId && window.saveState) {
        await window.saveState(sessionId, appState);
      }
    } catch (error) {
      console.error('[상태 저장] 실패:', error);
    }
  }, 1000);
}

/**
 * 상태 복원
 */
async function restoreAppState() {
  try {
    const sessionId = window.getSessionId();
    if (sessionId && window.loadState) {
      const savedState = await window.loadState(sessionId);
      
      if (savedState) {
        console.log('[상태 복원] 저장된 상태 발견');
        
        // Base64 이미지를 Blob URL로 복원
        const restoredState = window.restoreImagesFromBase64 
          ? window.restoreImagesFromBase64(savedState) 
          : savedState;
        
        Object.assign(appState, restoredState);
        
        // ⚠️ blob URL 검증 및 제거 (새로고침 시 무효화됨)
        if (appState.basePersonImageUrl && appState.basePersonImageUrl.startsWith('blob:')) {
          console.warn('[상태 복원] 유효하지 않은 blob URL 감지, 제거:', appState.basePersonImageUrl);
          appState.basePersonImageUrl = null;
        }
        
        if (appState.composedImageUrl && appState.composedImageUrl.startsWith('blob:')) {
          console.warn('[상태 복원] 유효하지 않은 composed blob URL 감지, 제거:', appState.composedImageUrl);
          appState.composedImageUrl = null;
        }
        
        // 슬롯의 blob URL도 제거
        for (const category of ['outer', 'inner', 'bottoms']) {
          if (appState.slots && appState.slots[category]) {
            for (let i = 0; i < appState.slots[category].length; i++) {
              if (appState.slots[category][i] && appState.slots[category][i].startsWith('blob:')) {
                console.warn(`[상태 복원] 유효하지 않은 슬롯 blob URL 감지, 제거: ${category}[${i}]`);
                appState.slots[category][i] = null;
              }
            }
          }
        }
        
        console.log('[상태 복원] blob URL 제거 후:', {
          basePersonImageUrl: appState.basePersonImageUrl,
          composedImageUrl: appState.composedImageUrl,
          status: appState.status
        });
        
        // 상태에 따라 status 설정
        if (appState.composedImageUrl) {
          // composedImage가 있으면 DONE (basePersonImageUrl 없어도 OK)
          appState.status = STATUS.DONE;
        } else if (appState.basePersonImageUrl) {
          appState.status = STATUS.READY;
        } else {
          appState.status = STATUS.EMPTY;
        }
        
        console.log('[상태 복원] 최종 status:', appState.status);
        
        updateUI();
        console.log('[상태 복원] 완료');
      }
    }
  } catch (error) {
    console.error('[상태 복원] 실패:', error);
  }
}

/**
 * UI 업데이트
 */
function updateUI() {
  const { status, basePersonImageUrl, slots, composedImageUrl, detectedGarments, errorMessage } = appState;
  
  console.log('[UI 업데이트] 시작, 상태:', { status, slots });
  
  // 슬롯이 없으면 초기화
  if (!slots.outer || slots.outer.length === 0) {
    appState.slots.outer = [null, null];
  }
  if (!slots.inner || slots.inner.length === 0) {
    appState.slots.inner = [null, null, null];
  }
  if (!slots.bottoms || slots.bottoms.length === 0) {
    appState.slots.bottoms = [null, null];
  }
  
  // 메인 캔버스 업데이트
  updateMainCanvas(basePersonImageUrl, composedImageUrl, status);
  
  // 슬롯 UI 업데이트 (항상 실행)
  updateSlotsUI(appState.slots, detectedGarments);
  
  // 상태 텍스트 업데이트
  updateStatusText(status);
  
  // 에러 배너 업데이트
  updateErrorBanner(errorMessage);
  
  // 로딩 오버레이 업데이트
  updateLoadingOverlay(status);
}

/**
 * 메인 캔버스 업데이트
 */
function updateMainCanvas(baseImage, composedImage, status) {
  const mainCanvas = document.getElementById('mainCanvas');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const mainCanvasImage = document.getElementById('mainCanvasImage');
  
  console.log('🖼️ [메인 캔버스 업데이트]', {
    mainCanvas: !!mainCanvas,
    uploadPlaceholder: !!uploadPlaceholder,
    mainCanvasImage: !!mainCanvasImage,
    baseImage: !!baseImage,
    baseImageType: typeof baseImage,
    baseImageValue: baseImage ? baseImage.substring(0, 50) : null,
    composedImage: !!composedImage,
    composedImageType: typeof composedImage,
    composedImageValue: composedImage ? composedImage.substring(0, 50) : null,
    status
  });
  
  // 이미지 URL 유효성 검사
  const isValidImage = (url) => {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    if (url.startsWith('blob:')) return false; // blob URL은 무효
    if (url.trim() === '') return false; // 빈 문자열
    return true;
  };
  
  const validBaseImage = isValidImage(baseImage) ? baseImage : null;
  const validComposedImage = isValidImage(composedImage) ? composedImage : null;
  
  if (!validBaseImage && !validComposedImage) {
    console.log('📤 [업로드 UI 표시] - 유효한 이미지 없음');
    if (uploadPlaceholder) {
      uploadPlaceholder.style.display = 'flex';
    }
    if (mainCanvasImage) {
      mainCanvasImage.style.display = 'none';
    }
    if (mainCanvas) {
      mainCanvas.classList.remove('has-image');
    }
    return;
  }
  
  if (uploadPlaceholder) {
    uploadPlaceholder.style.display = 'none';
  }
  if (mainCanvas) {
    mainCanvas.classList.add('has-image');
  }
  
  const imageToShow = (status === STATUS.DONE && validComposedImage) ? validComposedImage : validBaseImage;
  
  console.log('🖼️ [표시할 이미지]', imageToShow ? imageToShow.substring(0, 50) : 'null');
  
  if (imageToShow && mainCanvasImage) {
    mainCanvasImage.src = imageToShow;
    mainCanvasImage.style.display = 'block';
    
    // 🆕 메인 이미지 클릭 이벤트 등록 (이미지가 표시될 때마다)
    mainCanvasImage.style.cursor = 'pointer';
    mainCanvasImage.onclick = () => {
      console.log('[메인 캔버스] 이미지 클릭 - 재등록 시작');
      
      const confirmed = confirm('새로운 메인 사진을 등록하시겠습니까?\n(현재 피팅된 모든 의상이 초기화됩니다)');
      
      if (confirmed) {
        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
          photoInput.click();
        }
      }
    };
  }
}

/**
 * 슬롯 UI 업데이트
 */
function updateSlotsUI(slots, detectedGarments) {
  console.log('[슬롯 UI] 업데이트 시작:', slots);
  
  const slotConfigs = [
    { category: 'outer', elementId: 'outerSlots', max: 2 },
    { category: 'inner', elementId: 'innerSlots', max: 3 },
    { category: 'bottoms', elementId: 'bottomsSlots', max: 2 }
  ];
  
  slotConfigs.forEach(({ category, elementId, max }) => {
    const container = document.getElementById(elementId);
    if (!container) {
      console.error(`[슬롯 UI] ⚠️ 컨테이너를 찾을 수 없음: ${elementId}`);
      console.error('[슬롯 UI] 현재 DOM 상태:', {
        outerSlots: !!document.getElementById('outerSlots'),
        innerSlots: !!document.getElementById('innerSlots'),
        bottomsSlots: !!document.getElementById('bottomsSlots')
      });
      return;
    }
    
    console.log(`[슬롯 UI] ${category} 렌더링 시작 (max: ${max}), 컨테이너:`, container);
    
    // 기존 버튼들의 이벤트 리스너 제거 후 재생성
    const existingButtons = container.querySelectorAll('.slot-button');
    existingButtons.forEach(btn => btn.remove());
    
    // slots가 없거나 카테고리가 없으면 초기화
    if (!slots) {
      console.warn('[슬롯 UI] slots가 없음, 초기화');
      slots = {
        outer: [null, null],
        inner: [null, null, null],
        bottoms: [null, null]
      };
    }
    
    if (!slots[category]) {
      console.warn(`[슬롯 UI] ${category} 배열이 없음, 초기화`);
      slots[category] = Array(max).fill(null);
    }
    
    // 길이가 부족하면 확장
    while (slots[category].length < max) {
      slots[category].push(null);
    }
    
    for (let i = 0; i < max; i++) {
      const slotButton = document.createElement('div');
      slotButton.className = 'slot-button';
      slotButton.dataset.category = category;
      slotButton.dataset.index = i;
      
      const slotValue = slots[category] && slots[category][i];
      if (slotValue) {
        slotButton.classList.add('has-image');
        
        const img = document.createElement('img');
        img.src = slotValue;
        img.alt = `${category} ${i + 1}`;
        slotButton.appendChild(img);
        
        // X 버튼 추가 (onclick으로 직접 설정)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = '옷 벗기기';
        removeBtn.type = 'button'; // 명시적으로 button 타입 설정
        
        // onclick 속성으로 직접 할당 (가장 확실한 방법)
        removeBtn.onclick = function(e) {
          console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
          console.log(`🔴🔴🔴 [X 버튼 onclick 발생!!!] ${category}[${i}]`);
          console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
          e.stopPropagation();
          e.preventDefault();
          alert(`X 버튼 클릭됨: ${category}[${i}]`);
          removeGarment(category, i);
          return false;
        };
        
        // 추가로 이벤트 리스너도 달아서 확인
        removeBtn.addEventListener('click', function(e) {
          console.log('★★★★★ [X 버튼 addEventListener 클릭!] ★★★★★');
        }, true);
        
        slotButton.appendChild(removeBtn);
        
        console.log(`✅ [X 버튼 생성 완료] ${category}[${i}]`, removeBtn);
        console.log(`   - tagName: ${removeBtn.tagName}, className: ${removeBtn.className}`);
        console.log(`   - innerHTML: ${removeBtn.innerHTML}, type: ${removeBtn.type}`);
        
        // 슬롯 클릭 (이미지가 있을 때만)
        slotButton.onclick = function(e) {
          console.log('═══════════════════════════════════');
          console.log(`🔍 [슬롯 onclick 발생] ${category}[${i}]`);
          console.log('클릭된 요소(e.target):', e.target);
          console.log('e.target.tagName:', e.target.tagName);
          console.log('e.target.className:', e.target.className);
          console.log('e.target === removeBtn:', e.target === removeBtn);
          console.log('removeBtn 요소:', removeBtn);
          console.log('═══════════════════════════════════');
          
          // X 버튼을 클릭한 경우 무시
          if (e.target === removeBtn || e.target.classList.contains('remove-btn')) {
            console.log('⚠️ X 버튼 클릭이므로 파일 선택 차단');
            return false;
          }
          
          e.stopPropagation();
          console.log(`🖼️ [슬롯 클릭] ${category}[${i}] - 파일 선택 열기`);
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const url = URL.createObjectURL(file);
              replaceSlot(category, i, url);
            }
          };
          input.click();
        };
        
        console.log(`[슬롯 UI] ${category}[${i}] 이미지 추가`);
      } else {
        slotButton.classList.add('empty');
        
        // 빈 슬롯 클릭 시 파일 선택
        slotButton.onclick = function(e) {
          e.stopPropagation();
          console.log(`➕ [빈 슬롯 클릭] ${category}[${i}] - 파일 선택 열기`);
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const url = URL.createObjectURL(file);
              replaceSlot(category, i, url);
            }
          };
          input.click();
        };
        
        console.log(`[슬롯 UI] ${category}[${i}] 빈 슬롯 생성`);
      }
      
      container.appendChild(slotButton);
    }
    
    console.log(`[슬롯 UI] ✅ ${category} 렌더링 완료: ${container.children.length}개 버튼 생성`);
  });
  
  // attachSlotListeners() 호출 제거 - 이미 onclick으로 이벤트를 설정했음
  console.log('[슬롯 UI] 이벤트 리스너는 onclick으로 이미 설정됨');
}

/**
 * 드래그 스크롤 설정 - 완전히 새로 작성
 */
function setupDragScroll() {
  const container = document.querySelector('.control-buttons-container');
  if (!container) {
    console.error('컨테이너를 찾을 수 없습니다');
    return;
  }

  let pos = { top: 0, left: 0, x: 0, y: 0 };

  const mouseDownHandler = function (e) {
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';

    pos = {
      left: container.scrollLeft,
      top: container.scrollTop,
      x: e.clientX,
      y: e.clientY,
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  };

  const mouseMoveHandler = function (e) {
    const dx = e.clientX - pos.x;
    const dy = e.clientY - pos.y;

    container.scrollTop = pos.top - dy;
    container.scrollLeft = pos.left - dx;
  };

  const mouseUpHandler = function () {
    container.style.cursor = 'grab';
    container.style.removeProperty('user-select');

    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  };

  container.addEventListener('mousedown', mouseDownHandler);
  
  console.log('✅ 드래그 스크롤 설정 완료');
}

/**
 * 슬롯 버튼에 이벤트 리스너 추가
 */
function attachSlotListeners() {
  const allSlotButtons = document.querySelectorAll('.slot-button');
  allSlotButtons.forEach(button => {
    // 기존 리스너 제거 (중복 방지)
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // 새 리스너 추가
    newButton.addEventListener('click', () => {
      const category = newButton.dataset.category;
      const index = parseInt(newButton.dataset.index);
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          replaceSlot(category, index, url);
        }
      };
      input.click();
    });
  });
}

/**
 * 상태 텍스트 업데이트
 */
function updateStatusText(status) {
  const statusText = document.getElementById('statusText');
  if (!statusText) return;
  
  const statusMessages = {
    [STATUS.EMPTY]: '',
    [STATUS.ANALYZING]: '의상 분석 중...',
    [STATUS.READY]: '준비됨',
    [STATUS.GENERATING]: '가상 피팅 생성 중...',
    [STATUS.DONE]: '완료',
    [STATUS.ERROR]: '오류 발생'
  };
  
  statusText.textContent = statusMessages[status] || '';
  if (statusMessages[status]) {
    statusText.classList.add('visible');
  } else {
    statusText.classList.remove('visible');
  }
}

/**
 * 에러 배너 업데이트
 */
function updateErrorBanner(errorMessage) {
  const errorBanner = document.getElementById('errorBanner');
  if (!errorBanner) return;
  
  if (errorMessage) {
    errorBanner.textContent = errorMessage;
    errorBanner.classList.add('active');
  } else {
    errorBanner.classList.remove('active');
  }
}

/**
 * 로딩 오버레이 업데이트
 */
function updateLoadingOverlay(status) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  
  if (!loadingOverlay) return;
  
  const isLoading = status === STATUS.ANALYZING || status === STATUS.GENERATING;
  
  if (isLoading) {
    loadingOverlay.classList.add('active');
    if (loadingText) {
      loadingText.textContent = status === STATUS.ANALYZING ? '의상 분석 중...' : '가상 피팅 생성 중...';
    }
  } else {
    loadingOverlay.classList.remove('active');
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  // 사진 업로드 영역
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const mainCanvas = document.getElementById('mainCanvas');
  const photoInput = document.getElementById('photoInput');
  
  if (uploadPlaceholder) {
    uploadPlaceholder.addEventListener('click', () => {
      photoInput.click();
    });
  }
  
  // 메인 캔버스 이미지 클릭 이벤트는 updateMainCanvas에서 처리
  
  if (mainCanvas) {
    mainCanvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      mainCanvas.style.border = '2px dashed #667eea';
    });
    
    mainCanvas.addEventListener('dragleave', () => {
      mainCanvas.style.border = 'none';
    });
    
    mainCanvas.addEventListener('drop', (e) => {
      e.preventDefault();
      mainCanvas.style.border = 'none';
      
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        handlePhotoUpload(files[0]);
      }
    });
  }
  
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handlePhotoUpload(file);
      }
    });
  }
  
  // 프롬프트 버튼
  const promptButton = document.getElementById('promptButton');
  
  if (promptButton) {
    promptButton.addEventListener('click', () => {
      const prompt = prompt('프롬프트를 입력하세요:', appState.prompt || '');
      if (prompt !== null) {
        appState.prompt = prompt;
        console.log('[프롬프트] 업데이트:', appState.prompt);
        
        // 상태가 READY 또는 DONE이면 재합성
        if (appState.status === STATUS.READY || appState.status === STATUS.DONE) {
          const hasAnySlot = appState.slots.outer.some(s => s) ||
                             appState.slots.inner.some(s => s) ||
                             appState.slots.bottoms.some(s => s);
          
          if (hasAnySlot) {
            // 첫 번째 슬롯 찾기
            let changedSlot = null;
            if (appState.slots.outer[0]) {
              changedSlot = { category: 'outer', index: 0 };
            } else if (appState.slots.inner[0]) {
              changedSlot = { category: 'inner', index: 0 };
            } else if (appState.slots.bottoms[0]) {
              changedSlot = { category: 'bottoms', index: 0 };
            }
            
            if (changedSlot) {
              transitionTo(STATUS.GENERATING);
              requestTryOn(changedSlot);
            }
          }
        }
      }
    });
  }
}

/**
 * 애플리케이션 초기화
 */
async function initApp() {
  console.log('[앱] 초기화 시작...');
  
  // DOM 요소 확인
  const outerSlots = document.getElementById('outerSlots');
  const innerSlots = document.getElementById('innerSlots');
  const bottomsSlots = document.getElementById('bottomsSlots');
  
  console.log('[앱] DOM 요소 확인:', {
    outerSlots: !!outerSlots,
    innerSlots: !!innerSlots,
    bottomsSlots: !!bottomsSlots
  });
  
  if (!outerSlots || !innerSlots || !bottomsSlots) {
    console.error('[앱] ⚠️ 슬롯 컨테이너를 찾을 수 없습니다!');
    setTimeout(initApp, 200); // 재시도
    return;
  }
  
  // 🔧 한 번만 실행: blob URL 정리
  const cleanupDone = localStorage.getItem('fashionAI_cleanup_done');
  if (!cleanupDone) {
    console.log('🔧 [정리] 유효하지 않은 데이터 정리 중...');
    const sessionId = localStorage.getItem('fashionAI_sessionId');
    if (sessionId) {
      localStorage.removeItem(`fashionAI_state_${sessionId}`);
    }
    localStorage.setItem('fashionAI_cleanup_done', 'true');
    console.log('✅ [정리] 완료');
  }
  
  // Supabase 초기화
  if (window.initSupabase) {
    await window.initSupabase();
  }
  
  // 상태 복원
  await restoreAppState();
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 드래그 스크롤 설정
  setupDragScroll();
  
  // UI 초기 업데이트
  updateUI();
  
  // 슬롯 렌더링 확인 및 재설정
  setTimeout(() => {
    const outerButtons = document.querySelectorAll('#outerSlots .slot-button');
    if (outerButtons.length === 0) {
      updateSlotsUI(appState.slots, null);
    }
    setupDragScroll(); // 한 번 더 설정
  }, 300);
  
  console.log('[앱] 초기화 완료');
}

// 모듈 import (정적)
import { saveState, loadState, initSupabase, getSessionId } from './api/supabase-config.js';

// 전역 함수 등록
window.saveState = saveState;
window.loadState = loadState;
window.initSupabase = initSupabase;
window.getSessionId = getSessionId;

// DOM 로드 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // 이미 로드된 경우 약간의 지연 후 초기화 (DOM이 완전히 준비될 때까지)
  setTimeout(initApp, 100);
}

