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
  
  // 🆕 초기 원본 의상 상태 (분석 직후 저장, 변경 안 됨, UI 노출 안 됨)
  initialOutfitState: {
    outer: [null, null],      // 아우터1(헤비), 아우터2(라이트)
    inner: [null, null, null], // 이너1(미드), 이너2(메인), 이너3(베이스)
    bottoms: [null, null]      // 하의1, 하의2
  },
  
  // 현재 슬롯 UI 상태 (유저 액션에 따라 변경)
  slots: {
    outer: [null, null],      // 아우터1(헤비), 아우터2(라이트)
    inner: [null, null, null], // 이너1(미드), 이너2(메인), 이너3(베이스)
    bottoms: [null, null]      // 하의1, 하의2
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
 * 전체 상태 초기화
 */
function resetAllState() {
  try {
    console.log('[전체 초기화] 시작...');
    
    // 상태 완전 초기화
    appState.status = STATUS.EMPTY;
    appState.basePersonImageUrl = null;
    appState.composedImageUrl = null;
    appState.initialOutfitState = {
      outer: [null, null],
      inner: [null, null, null],
      bottoms: [null, null]
    };
    appState.slots = {
      outer: [null, null],
      inner: [null, null, null],
      bottoms: [null, null]
    };
    appState.detectedGarments = null;
    appState.prompt = '';
    appState.errorMessage = null;
    
    console.log('[전체 초기화] 완료');
    
    // UI 업데이트
    updateUI();
    
    // 상태 저장
    saveAppState();
  } catch (error) {
    console.error('[전체 초기화] 실패:', error);
  }
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
    appState.initialOutfitState = {
      outer: [null, null],
      inner: [null, null, null],
      bottoms: [null, null]
    };
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
  await runInlinePipeline(imageUrl, appState.slots);
}

/**
 * 인라인 파이프라인 실행 (AI 썸네일 생성 + initialOutfitState 저장)
 */
async function runInlinePipeline(imageUrl, slots = null) {
  try {
    console.log('[파이프라인] 시작, imageUrl:', imageUrl ? '있음' : '없음');
    
    // 레이어 매핑 정의
    const layerMapping = {
      // Layer 5: 헤비 아우터 (Heavy Outer) - 아우터1
      heavyOuter: { category: 'outer', index: 0, name: '헤비 아우터', keywords: ['코트', '트렌치', '패딩', '푸퍼', '무스탕', '다운'] },
      
      // Layer 4: 라이트 아우터 (Light Outer) - 아우터2
      lightOuter: { category: 'outer', index: 1, name: '라이트 아우터', keywords: ['블레이저', '재킷', '데님', '블루종', '트러커', '가죽', '점퍼'] },
      
      // Layer 3: 미드 레이어 (Mid Layer) - 이너1
      midLayer: { category: 'inner', index: 0, name: '미드 레이어', keywords: ['가디건', '집업', '오픈'] },
      
      // Layer 2: 메인 상의 (Main Top) - 이너2
      mainTop: { category: 'inner', index: 1, name: '메인 상의', keywords: ['니트', '스웨터', '후드티', '풀오버', '맨투맨', '스웨트', '조끼', '베스트'] },
      
      // Layer 1: 베이스 이너 (Base Inner) - 이너3
      baseInner: { category: 'inner', index: 2, name: '베이스 이너', keywords: ['티셔츠', '셔츠', '남방', '목폴라', '반팔', '긴팔'] }
    };
    
    // 더미 감지 데이터
    const detectedGarments = {
      outer: [{ confidence: 0.9 }, { confidence: 0.85 }],
      inner: [{ confidence: 0.9 }, { confidence: 0.85 }, { confidence: 0.9 }],
      bottoms: [{ confidence: 0.9 }]
    };
    
    appState.detectedGarments = detectedGarments;
    
    console.log('\n🎨 ═══════════════════════════════════════════════════════════');
    console.log('🎨 의상 분석 시작 - 레이어별 분류');
    console.log('🎨 ═══════════════════════════════════════════════════════════\n');
    
    // 🆕 initialOutfitState에 저장 (UI에는 표시 안 함)
    const categoriesToAnalyze = [
      { type: 'outer', index: 0, layerName: '헤비 아우터', layerNum: 'Layer 5', description: '코트, 패딩, 무스탕 등' },
      { type: 'outer', index: 1, layerName: '라이트 아우터', layerNum: 'Layer 4', description: '블레이저, 재킷, 점퍼 등' },
      { type: 'inner', index: 0, layerName: '미드 레이어', layerNum: 'Layer 3', description: '가디건, 집업 등' },
      { type: 'inner', index: 1, layerName: '메인 상의', layerNum: 'Layer 2', description: '니트, 후드티, 조끼 등' },
      { type: 'inner', index: 2, layerName: '베이스 이너', layerNum: 'Layer 1', description: '티셔츠, 셔츠 등' },
      { type: 'bottoms', index: 0, layerName: '하의', layerNum: 'Bottoms 1', description: '바지, 치마 등' }
    ];
    
    const analysisResults = [];
    
    for (const { type, index, layerName, layerNum, description } of categoriesToAnalyze) {
      try {
        console.log(`📍 [${layerNum}] ${layerName} 분석 중...`);
        console.log(`   └─ 카테고리: ${type}[${index}]`);
        console.log(`   └─ 포함: ${description}`);
        
        const thumbnailUrl = await window.generateGarmentThumbnail(type, 'default', imageUrl);
        
        if (thumbnailUrl) {
          // initialOutfitState에만 저장 (UI 슬롯은 비워둠)
          appState.initialOutfitState[type][index] = thumbnailUrl;
          console.log(`   ✅ 성공: initialOutfitState[${type}][${index}] 저장\n`);
          
          analysisResults.push({
            layerNum,
            layerName,
            category: type,
            index,
            status: '✅ 감지됨',
            description
          });
        }
      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}\n`);
        
        analysisResults.push({
          layerNum,
          layerName,
          category: type,
          index,
          status: '❌ 감지 안됨',
          description
        });
      }
    }
    
    // 분석 결과 요약 테이블
    console.log('\n📊 ═══════════════════════════════════════════════════════════');
    console.log('📊 의상 분석 결과 요약');
    console.log('📊 ═══════════════════════════════════════════════════════════\n');
    
    console.table(analysisResults.map(r => ({
      '레이어': r.layerNum,
      '이름': r.layerName,
      '위치': `${r.category}[${r.index}]`,
      '상태': r.status,
      '설명': r.description
    })));
    
    console.log('\n💾 저장된 초기 의상 상태 (initialOutfitState):');
    console.log('   📦 Outer:', appState.initialOutfitState.outer.map((s, i) => s ? `[${i}]:✅` : `[${i}]:❌`).join(' '));
    console.log('   📦 Inner:', appState.initialOutfitState.inner.map((s, i) => s ? `[${i}]:✅` : `[${i}]:❌`).join(' '));
    console.log('   📦 Bottoms:', appState.initialOutfitState.bottoms.map((s, i) => s ? `[${i}]:✅` : `[${i}]:❌`).join(' '));
    
    console.log('\n🎯 UI 슬롯 상태 (사용자가 직접 추가):');
    console.log('   📌 모든 슬롯 비어있음 (사용자가 의상을 추가할 수 있습니다)');
    
    console.log('\n🎨 ═══════════════════════════════════════════════════════════');
    console.log('🎨 의상 분석 완료!');
    console.log('🎨 ═══════════════════════════════════════════════════════════\n');
    
    transitionTo(STATUS.READY);
    
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
 * 슬롯의 의상 제거 (옷 벗기기) - initialOutfitState에서 복원
 */
async function removeGarment(category, index) {
  try {
    console.log(`[옷 벗기기/복원] 시작: ${category}[${index}]`);
    
    // 🔄 해당 슬롯을 비움 (UI에서 제거)
    appState.slots[category][index] = null;
    console.log(`[옷 벗기기/복원] 슬롯 비움: ${category}[${index}]`);
    
    // initialOutfitState에서 원본 의상 확인 (로그용)
    const originalGarment = appState.initialOutfitState[category]?.[index];
    if (originalGarment) {
      console.log(`[옷 벗기기/복원] ✅ 원본 의상 존재 → 메인 사진에만 복원`);
    } else {
      console.log(`[옷 벗기기/복원] ❌ 원본 의상 없음 → 슬롯 제거만`);
    }
    
    // 모든 슬롯이 비어있는지 확인
    const allSlotsEmpty = ['outer', 'inner', 'bottoms'].every(cat =>
      appState.slots[cat].every(slot => !slot)
    );
    
    if (allSlotsEmpty) {
      // 모든 슬롯이 비어있으면 base 이미지로 복원
      console.log('[옷 벗기기/복원] 모든 슬롯 비어있음, Base 이미지로 복원');
      appState.composedImageUrl = null;
      appState.status = STATUS.READY;
    } else {
      // 다른 슬롯에 옷이 남아있으면, Base 이미지부터 재합성
      // 재합성 시 slots와 initialOutfitState를 병합하여 사용
      console.log('[옷 벗기기/복원] 남은 슬롯 유지, Base 이미지부터 재합성');
      transitionTo(STATUS.GENERATING);
      await requestTryOn({ category, index }); // 재합성
    }
    
    updateUI();
    
    try {
      if (window.saveState) {
        const sessionId = window.getSessionId();
        await window.saveState(sessionId, appState);
      }
    } catch (saveError) {
      console.warn('[옷 벗기기/복원] 상태 저장 실패 (무시):', saveError);
    }
    
    console.log(`[옷 벗기기/복원] 완료: ${category}[${index}]`);
  } catch (error) {
    console.error('[옷 벗기기/복원] 실패:', error);
    transitionTo(STATUS.ERROR, `의상 제거에 실패했습니다: ${error.message}`);
  }
}

/**
 * 가상 피팅 요청 - Base 이미지부터 모든 레이어를 순서대로 합성
 */
async function requestTryOn(changedSlot) {
  try {
    console.log('[가상 피팅] 요청 시작 - Base 이미지부터 전체 레이어 재합성');
    
    // ⚠️ 중요: Base 이미지부터 시작 (composedImage 사용 안 함)
    if (!appState.basePersonImageUrl) {
      throw new Error('Base 이미지가 필요합니다');
    }
    
    console.log('[가상 피팅] Base 이미지 사용:', appState.basePersonImageUrl.substring(0, 50));
    
    // 🔄 slots와 initialOutfitState를 병합
    // - slots가 null이면 initialOutfitState 사용 (원본 의상)
    // - slots에 값이 있으면 slots 우선 (사용자가 추가한 의상)
    const mergedSlots = {
      outer: appState.slots.outer.map((slot, i) => 
        slot || appState.initialOutfitState.outer[i]
      ),
      inner: appState.slots.inner.map((slot, i) => 
        slot || appState.initialOutfitState.inner[i]
      ),
      bottoms: appState.slots.bottoms.map((slot, i) => 
        slot || appState.initialOutfitState.bottoms[i]
      )
    };
    
    console.log('[가상 피팅] 병합된 슬롯 상태 (slots + initialOutfitState):', {
      outer: mergedSlots.outer.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`),
      inner: mergedSlots.inner.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`),
      bottoms: mergedSlots.bottoms.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`)
    });
    
    // 전체 레이어 합성 (병합된 슬롯 사용)
    const result = await mockTryOn({
      basePersonImageUrl: appState.basePersonImageUrl, // Base 이미지 사용
      slots: mergedSlots, // 병합된 슬롯 사용
      changedSlot: changedSlot,
      prompt: appState.prompt
    });
    
    // 합성 결과 업데이트
    appState.composedImageUrl = result.resultImageUrl;
    console.log('[가상 피팅] 합성 완료!');
    
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
 * 가상 피팅 생성 (나노바나나 API 사용) - 레이어 순서대로 합성
 */
async function generateVirtualTryOn(params) {
  const apiKey = window.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }
  
  console.log('[가상 피팅] 레이어 순서 합성 시작...');
  console.log('[가상 피팅] 현재 슬롯 상태:', params.slots);
  
  // 🎨 레이어 순서 정의 (입는 순서 - Z-Index 아래부터 위로)
  const layerOrder = [
    { category: 'bottoms', index: 0, name: '하의 레이어 1' },
    { category: 'bottoms', index: 1, name: '하의 레이어 2' },
    { category: 'inner', index: 2, name: '베이스 이너 (Layer 1)' },  // 이너3: 셔츠 (가장 먼저)
    { category: 'inner', index: 1, name: '메인 상의 (Layer 2)' },    // 이너2: 니트
    { category: 'inner', index: 0, name: '미드 레이어 (Layer 3)' },  // 이너1: 가디건
    { category: 'outer', index: 1, name: '라이트 아우터 (Layer 4)' }, // 아우터2: 재킷
    { category: 'outer', index: 0, name: '헤비 아우터 (Layer 5)' }    // 아우터1: 코트 (가장 나중)
  ];
  
  // 실제로 입을 의상들만 필터링 (레이어 순서대로)
  const garmentsToWear = layerOrder
    .filter(layer => params.slots[layer.category]?.[layer.index])
    .map(layer => ({
      ...layer,
      url: params.slots[layer.category][layer.index]
    }));
  
  console.log('[가상 피팅] 입을 의상 목록 (레이어 순서):', garmentsToWear.map(g => g.name));
  
  if (garmentsToWear.length === 0) {
    throw new Error('입을 의상이 없습니다');
  }
  
  // Base64 변환할 이미지들
  const imagesToConvert = [params.basePersonImageUrl, ...garmentsToWear.map(g => g.url)];
  const base64Images = await Promise.all(imagesToConvert.map(url => window.imageUrlToBase64(url)));
  
  const basePersonImageBase64 = base64Images[0];
  const garmentImagesBase64 = base64Images.slice(1);
  
  // 프롬프트 생성: 얼굴과 체형 유지를 최우선으로 강조
  let layerDescription = garmentsToWear.map((g, idx) => 
    `${idx + 2}번째 이미지: ${g.name} (의상만 참고)`
  ).join('\n');
  
  const prompt = `🚨🚨🚨 절대 규칙: 1번째 이미지의 사람 얼굴과 체형을 절대 변경하지 마세요! 🚨🚨🚨

📸 이미지 분석:
1번째 이미지: **원본 사람** (이 사람의 얼굴, 체형, 자세, 피부톤을 그대로 유지!)
${layerDescription}

🎯 작업 목표:
**1번째 이미지의 사람이 2~${garmentsToWear.length + 1}번째 이미지의 의상만 입는 사진을 만드세요.**

⚠️⚠️⚠️ 절대 금지 사항 (반드시 지켜야 함!):
❌ 1번째 이미지의 사람 얼굴을 절대 바꾸지 마세요
❌ 1번째 이미지의 사람 체형을 절대 바꾸지 마세요
❌ 1번째 이미지의 사람 피부톤을 절대 바꾸지 마세요
❌ 1번째 이미지의 사람 자세를 절대 바꾸지 마세요
❌ 1번째 이미지의 사람 머리 스타일을 절대 바꾸지 마세요
❌ 2~${garmentsToWear.length + 1}번째 이미지의 사람은 무시하세요 (의상만 참고)

✅ 해야 할 일:
✅ 1번째 이미지의 사람을 그대로 유지
✅ 2~${garmentsToWear.length + 1}번째 이미지의 **의상만** 1번째 사람에게 입히기
✅ 의상 레이어 순서: ${garmentsToWear.map((g, idx) => `${idx + 1}. ${g.name}`).join(' → ')}
✅ 배경과 조명은 1번째 이미지와 동일하게 유지

🎨 최종 결과물:
"1번째 이미지의 동일한 사람"이 "${garmentsToWear.map(g => g.name).join(', ')}"을 입은 자연스러운 사진

다시 한번 강조: **1번째 이미지의 사람 얼굴과 체형을 절대 변경하지 마세요!**`;
  
  console.log('[가상 피팅] 프롬프트:', prompt);
  
  // 나노바나나 API 호출을 위한 parts 배열 구성
  const parts = [
    // 첫 번째: 메인 사진
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: basePersonImageBase64
      }
    },
    // 이후: 의상 이미지들 (레이어 순서대로)
    ...garmentImagesBase64.map(base64 => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64
      }
    })),
    // 마지막: 프롬프트
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
              temperature: 0.2, // 더 낮게: 일관성 최대화, 창의성 최소화
              topK: 20,
              topP: 0.8,
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
    if (url.trim() === '') return false; // 빈 문자열
    // blob URL과 data URL은 모두 유효
    if (url.startsWith('blob:') || url.startsWith('data:')) return true;
    // 일반 URL도 유효
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
    
    console.log('🖼️ [X 버튼] mainCanvas 확인:', !!mainCanvas);
    console.log('🖼️ [X 버튼] mainCanvas 클래스:', mainCanvas?.className);
    
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
    
    // 🆕 메인 캔버스 X 버튼 추가
    if (mainCanvas) {
      let removeMainBtn = mainCanvas.querySelector('.remove-main-btn');
      console.log('🖼️ [X 버튼] 기존 버튼 존재:', !!removeMainBtn);
      
      if (!removeMainBtn) {
        removeMainBtn = document.createElement('button');
        removeMainBtn.className = 'remove-main-btn';
        removeMainBtn.innerHTML = '×';
        removeMainBtn.title = '전체 초기화';
        removeMainBtn.type = 'button';
        
        // 강제로 스타일 적용 (테스트용 - 항상 보이게)
        removeMainBtn.style.cssText = `
          position: absolute !important;
          top: 16px !important;
          right: 16px !important;
          width: 32px !important;
          height: 32px !important;
          background: rgba(239, 68, 68, 0.9) !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          color: white !important;
          font-size: 20px !important;
          font-weight: bold !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          z-index: 10000 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
          pointer-events: auto !important;
          line-height: 1 !important;
          padding: 0 !important;
          margin: 0 !important;
        `;
        
        mainCanvas.appendChild(removeMainBtn);
        console.log('🖼️ [X 버튼] 새 버튼 생성 완료');
        console.log('🖼️ [X 버튼] 버튼 위치:', removeMainBtn.getBoundingClientRect());
      }
      
      // X 버튼 클릭 이벤트
      removeMainBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('[메인 캔버스] X 버튼 클릭 - 전체 초기화');
        
        const confirmed = confirm('모든 데이터를 초기화하시겠습니까?\n(메인 사진과 모든 의상이 제거됩니다)');
        
        if (confirmed) {
          resetAllState();
        }
        return false;
      };
      
      console.log('🖼️ [X 버튼] 이벤트 등록 완료');
      console.log('🖼️ [X 버튼] 최종 확인 - DOM에 존재:', !!document.querySelector('.remove-main-btn'));
    } else {
      console.warn('🖼️ [X 버튼] ⚠️ mainCanvas가 null입니다!');
    }
  } else {
    // 이미지가 없을 때 X 버튼 제거
    const removeMainBtn = mainCanvas?.querySelector('.remove-main-btn');
    if (removeMainBtn) {
      removeMainBtn.remove();
      console.log('🖼️ [X 버튼] 제거 완료');
    }
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

