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
    
    // 🔄 상태 완전 초기화 (새 분석 전 필수!)
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
    
    // 🆕 로컬 스토리지의 이전 데이터도 명시적으로 초기화
    const sessionId = window.getSessionId();
    if (sessionId && window.saveState) {
      console.log('[업로드] 🔄 로컬 스토리지 초기화 중...');
      await window.saveState(sessionId, appState);
      console.log('[업로드] ✅ 로컬 스토리지 초기화 완료');
    }
    
    console.log('[업로드] 모든 슬롯 초기화 완료');
    console.log('[업로드] initialOutfitState:', JSON.stringify(appState.initialOutfitState));
    
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
    
    // 🆕 새 분석 시작 전 initialOutfitState 명시적 초기화 확인
    console.log('[파이프라인] 📊 초기 상태 확인:');
    console.log('   initialOutfitState:', JSON.stringify(appState.initialOutfitState));
    
    // 초기화되지 않았으면 강제 초기화
    if (!appState.initialOutfitState) {
      appState.initialOutfitState = {
        outer: [null, null],
        inner: [null, null, null],
        bottoms: [null, null]
      };
      console.log('[파이프라인] ⚠️ initialOutfitState 없음, 새로 생성');
    } else {
      // 각 카테고리를 null로 초기화
      appState.initialOutfitState.outer = [null, null];
      appState.initialOutfitState.inner = [null, null, null];
      appState.initialOutfitState.bottoms = [null, null];
      console.log('[파이프라인] ✅ initialOutfitState 초기화 완료');
    }
    
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
    
    console.log('\n🎨 메인 사진 의상 분석 시작...\n');
    
    // 🆕 initialOutfitState에 저장 (UI에는 표시 안 함)
    const categoriesToAnalyze = [
      { type: 'outer', index: 0, category: 'heavyOuter', garmentName: '헤비 아우터', description: '코트, 패딩, 무스탕' },
      { type: 'outer', index: 1, category: 'lightOuter', garmentName: '라이트 아우터', description: '블레이저, 재킷, 점퍼' },
      { type: 'inner', index: 0, category: 'midLayer', garmentName: '미드 레이어', description: '가디건, 집업' },
      { type: 'inner', index: 1, category: 'mainTop', garmentName: '메인 상의', description: '니트, 후드티, 조끼' },
      { type: 'inner', index: 2, category: 'baseInner', garmentName: '베이스 이너', description: '티셔츠, 셔츠' },
      { type: 'bottoms', index: 0, category: 'bottoms', garmentName: '하의', description: '바지, 치마' }
    ];
    
    // 간단한 분석 진행 표시만
    const analysisResults = [];
    for (const { type, index, category, garmentName, description } of categoriesToAnalyze) {
      // 🆕 구체적인 카테고리 전달
      const thumbnailUrl = await window.generateGarmentThumbnail(type, category, imageUrl);
      
      if (thumbnailUrl && thumbnailUrl !== null) {
        appState.initialOutfitState[type][index] = thumbnailUrl;
        analysisResults.push({ type, index, garmentName, description, detected: true });
      } else {
        analysisResults.push({ type, index, garmentName, description, detected: false });
      }
    }
    
    // 🆕 간단하고 직관적인 initialOutfitState 표시
    console.log('✅ 메인 사진 분석 완료!\n');
    console.log('📋 initialOutfitState (감지된 의상):');
    
    // 의상 이름 매핑 (description에서 대표 의상 추출)
    const getGarmentLabel = (result) => {
      if (!result.detected) return 'null';
      // description에서 첫 번째 의상 추출
      const firstGarment = result.description.split(',')[0].trim();
      return `base64(${firstGarment})`;
    };
    
    // Outer 표시
    const outerResults = analysisResults.filter(r => r.type === 'outer');
    const outerDisplay = outerResults.map(r => `[${r.index}]: ${getGarmentLabel(r)}`).join(', ');
    console.log(`   Outer: ${outerDisplay}`);
    
    // Inner 표시
    const innerResults = analysisResults.filter(r => r.type === 'inner');
    const innerDisplay = innerResults.map(r => `[${r.index}]: ${getGarmentLabel(r)}`).join(', ');
    console.log(`   Inner: ${innerDisplay}`);
    
    // Bottoms 표시
    const bottomsResults = analysisResults.filter(r => r.type === 'bottoms');
    const bottomsDisplay = bottomsResults.map(r => `[${r.index}]: ${getGarmentLabel(r)}`).join(', ');
    console.log(`   Bottoms: ${bottomsDisplay}`);
    console.log('');
    
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
    
    // 🆕 레이어 정보 출력
    const layerInfo = {
      'outer': { 0: '레이어 7 (헤비 아우터 - 가장 바깥쪽)', 1: '레이어 6 (라이트 아우터)' },
      'inner': { 0: '레이어 5 (미드 레이어)', 1: '레이어 4 (메인 상의)', 2: '레이어 3 (베이스 이너)' },
      'bottoms': { 0: '레이어 1 (하의 - 가장 안쪽)', 1: '레이어 2 (하의 2)' }
    };
    
    console.log('\n👕 ═══════════════════════════════════════════════════════════');
    console.log(`👕 의상 등록: ${category.toUpperCase()}[${index}]`);
    console.log(`👕 ${layerInfo[category][index]}`);
    console.log('👕 ═══════════════════════════════════════════════════════════\n');
    
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
    
    // 🆕 URL 유효성 검사 함수
    function isValidImageUrl(url) {
      if (!url) return false;
      
      // blob: 또는 data: URL은 항상 유효
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        return true;
      }
      
      // 외부 URL 중 유효하지 않은 패턴 체크
      const invalidPatterns = [
        'replicate.delivery',
        'file-cdn.flyai.com',
        'file-s3.omniwear.com',  // DNS 조회 실패 가능성 있는 도메인
        'placeholder',
        'imgur.com/result_'
      ];
      
      for (const pattern of invalidPatterns) {
        if (url.includes(pattern)) {
          return false;
        }
      }
      
      // http/https URL은 유효한 것으로 간주 (나중에 압축 시 실제 검증)
      return url.startsWith('http://') || url.startsWith('https://');
    }
    
    // 🔄 slots와 initialOutfitState를 병합 + 유효성 검사
    // - slots가 null이면 initialOutfitState 사용 (원본 의상)
    // - slots에 값이 있으면 slots 우선 (사용자가 추가한 의상)
    // - 유효하지 않은 URL은 null로 변환
    const mergedSlots = {
      outer: appState.slots.outer.map((slot, i) => {
        const merged = slot || appState.initialOutfitState.outer[i];
        return isValidImageUrl(merged) ? merged : null;
      }),
      inner: appState.slots.inner.map((slot, i) => {
        const merged = slot || appState.initialOutfitState.inner[i];
        return isValidImageUrl(merged) ? merged : null;
      }),
      bottoms: appState.slots.bottoms.map((slot, i) => {
        const merged = slot || appState.initialOutfitState.bottoms[i];
        return isValidImageUrl(merged) ? merged : null;
      })
    };
    
    console.log('[가상 피팅] 병합된 슬롯 상태 (slots + initialOutfitState, 유효성 검사 적용):', {
      outer: mergedSlots.outer.map((s, i) => {
        if (!s) return `[${i}]:없음`;
        const type = s.startsWith('blob:') ? 'blob' : s.startsWith('data:') ? 'data' : '외부';
        return `[${i}]:${type}`;
      }),
      inner: mergedSlots.inner.map((s, i) => {
        if (!s) return `[${i}]:없음`;
        const type = s.startsWith('blob:') ? 'blob' : s.startsWith('data:') ? 'data' : '외부';
        return `[${i}]:${type}`;
      }),
      bottoms: mergedSlots.bottoms.map((s, i) => {
        if (!s) return `[${i}]:없음`;
        const type = s.startsWith('blob:') ? 'blob' : s.startsWith('data:') ? 'data' : '외부';
        return `[${i}]:${type}`;
      })
    });
    
    // 🆕 유효하지 않은 URL 경고 및 감지
    const invalidUrls = [];
    const layerNames = {
      outer: ['헤비 아우터 (레이어 7)', '라이트 아우터 (레이어 6)'],
      inner: ['미드 레이어 (레이어 5)', '메인 상의 (레이어 4)', '베이스 이너 (레이어 3)'],
      bottoms: ['하의 (레이어 2)', '하의 (레이어 1)']
    };
    
    ['outer', 'inner', 'bottoms'].forEach(category => {
      mergedSlots[category].forEach((url, index) => {
        const original = appState.slots[category][index] || appState.initialOutfitState[category][index];
        if (original && !isValidImageUrl(original)) {
          const layerName = layerNames[category]?.[index] || `${category}[${index}]`;
          invalidUrls.push({
            category,
            index,
            layerName,
            url: original.substring(0, 100)
          });
        }
      });
    });
    
    if (invalidUrls.length > 0) {
      console.warn('\n⚠️ ═══════════════════════════════════════════════════════════');
      console.warn('⚠️ 유효하지 않은 이미지 URL 감지');
      console.warn('⚠️ ═══════════════════════════════════════════════════════════');
      invalidUrls.forEach(({ layerName, url, category, index }) => {
        console.warn(`   ❌ ${layerName} (${category}[${index}]):`);
        console.warn(`      URL: ${url}...`);
        
        // 어떤 패턴이 문제인지 확인
        if (url.includes('file-s3.omniwear.com')) {
          console.warn(`      문제: 외부 도메인 접근 불가 (DNS 조회 실패)`);
        } else if (url.includes('replicate.delivery')) {
          console.warn(`      문제: 만료된 외부 URL`);
        } else if (url.includes('file-cdn.flyai.com')) {
          console.warn(`      문제: 외부 도메인 접근 불가`);
        }
        console.warn(`      해결: 해당 의상을 제거(X 버튼)하거나 메인 사진을 다시 업로드하세요.`);
        console.warn('');
      });
      console.warn('⚠️ ═══════════════════════════════════════════════════════════\n');
    }
    
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
    const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';
    console.error('[가상 피팅] 에러 상세:', {
      message: errorMessage,
      name: error?.name,
      stack: error?.stack?.substring(0, 200)
    });
    transitionTo(STATUS.ERROR, `가상 피팅 생성에 실패했습니다: ${errorMessage}`);
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
  // 레이어 번호: 1=가장 안쪽, 7=가장 바깥쪽
  const layerOrder = [
    { category: 'bottoms', index: 0, name: '하의 레이어1', layer: 1 },
    { category: 'bottoms', index: 1, name: '하의 레이어2', layer: 2 },
    { category: 'inner', index: 2, name: '이너 레이어3 (베이스)', layer: 3 },  // 셔츠 (가장 안쪽 상의)
    { category: 'inner', index: 1, name: '이너 레이어2 (메인)', layer: 4 },    // 니트
    { category: 'inner', index: 0, name: '이너 레이어1 (미드)', layer: 5 },    // 가디건
    { category: 'outer', index: 1, name: '아우터 레이어2 (라이트)', layer: 6 }, // 재킷
    { category: 'outer', index: 0, name: '아우터 레이어1 (헤비)', layer: 7 }    // 코트 (가장 바깥쪽)
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
  
  // 🆕 이미지 압축 함수 (API 전송용)
  async function compressImageForAPI(imageUrl, maxSize = 384) {
    return new Promise((resolve, reject) => {
      if (!imageUrl) {
        return reject(new Error('Image URL is null or empty.'));
      }
      
      // 🆕 접근 불가능한 외부 URL 패턴 사전 거부
      const invalidPatterns = [
        'replicate.delivery',
        'file-cdn.flyai.com',
        'file-s3.omniwear.com',  // DNS 조회 실패 가능성 있는 도메인
      ];
      
      for (const pattern of invalidPatterns) {
        if (imageUrl.includes(pattern)) {
          const errorMsg = `접근 불가능한 외부 이미지 URL입니다 (${pattern}). 메인 사진을 다시 업로드하거나 다른 이미지를 사용해주세요.`;
          console.error(`[압축] ❌ 접근 불가 URL 감지: ${pattern}`);
          return reject(new Error(errorMsg));
        }
      }
      
      // 🆕 blob URL 또는 data URL이 아니면 fetch로 먼저 확인
      if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
        // 외부 URL인 경우 먼저 fetch로 확인
        fetch(imageUrl, { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            // no-cors 모드에서는 response.ok를 확인할 수 없으므로 바로 이미지 로드 시도
            loadImage();
          })
          .catch(err => {
            // ERR_NAME_NOT_RESOLVED는 DNS 조회 실패 (도메인이 존재하지 않음)
            if (err.message.includes('ERR_NAME_NOT_RESOLVED') || err.message.includes('Failed to fetch')) {
              const errorMsg = `외부 이미지 URL에 접근할 수 없습니다 (DNS 조회 실패 또는 도메인 없음). 메인 사진을 다시 업로드하거나 다른 이미지를 사용해주세요.`;
              console.error(`[압축] ❌ 외부 URL 접근 실패: ${imageUrl.substring(0, 100)}`);
              return reject(new Error(errorMsg));
            }
            console.warn(`[압축] 외부 URL HEAD 요청 실패: ${imageUrl.substring(0, 100)}`, err.message);
            // CORS 문제는 무시하고 이미지 로드 시도 (Image 객체는 CORS 제약이 덜함)
            console.log('[압축] CORS 문제 가능성, Image 객체로 직접 로드 시도');
            loadImage();
          });
      } else {
        // blob 또는 data URL은 바로 로드
        loadImage();
      }
      
      function loadImage() {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // 최대 크기로 리사이즈
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // JPEG로 압축 (품질 0.6)
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            console.log(`[압축] ${img.width}x${img.height} → ${width}x${height} (${(base64.length / 1024).toFixed(1)}KB)`);
            resolve(base64);
          } catch (err) {
            reject(new Error(`이미지 압축 실패: ${err.message}`));
          }
        };
        
        // 🆕 에러 핸들링 개선
        img.onerror = (event) => {
          const urlType = imageUrl.startsWith('blob:') ? 'blob URL' : 
                          imageUrl.startsWith('data:') ? 'data URL' : '외부 URL';
          
          // 유효하지 않은 URL 패턴 감지
          const invalidPatterns = ['replicate.delivery', 'file-cdn.flyai.com', 'file-s3.omniwear.com'];
          const matchedPattern = invalidPatterns.find(pattern => imageUrl.includes(pattern));
          
          if (matchedPattern) {
            const errorMsg = `접근 불가능한 외부 이미지 URL입니다 (${matchedPattern}). 메인 사진을 다시 업로드하거나 다른 이미지를 사용해주세요.`;
            console.error(`[압축] ❌ 접근 불가 URL 감지: ${matchedPattern}`);
            reject(new Error(errorMsg));
          } else {
            const errorMsg = `이미지 로드 실패 (${urlType}): ${imageUrl.substring(0, 80)}${imageUrl.length > 80 ? '...' : ''}`;
            console.error(`[압축] ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        };
        
        img.src = imageUrl;
      }
    });
  }
  
  // Base64 변환할 이미지들 (압축 적용)
  console.log('[가상 피팅] 🔄 이미지 압축 중...');
  const imagesToConvert = [
    { url: params.basePersonImageUrl, name: '메인 사진' },
    ...garmentsToWear.map(g => ({ url: g.url, name: g.name }))
  ];
  
  // 🆕 개별 에러 처리
  const base64Images = [];
  for (let i = 0; i < imagesToConvert.length; i++) {
    const { url, name } = imagesToConvert[i];
    try {
      console.log(`[압축] ${i + 1}/${imagesToConvert.length}: ${name}`);
      const base64 = await compressImageForAPI(url, 384);
      base64Images.push(base64);
    } catch (error) {
      console.error(`[압축] 실패: ${name}`, error.message);
      throw new Error(`${name} 이미지를 불러올 수 없습니다: ${error.message}`);
    }
  }
  
  const basePersonImageBase64 = base64Images[0];
  const garmentImagesBase64 = base64Images.slice(1);
  
  console.log(`[가상 피팅] ✅ 압축 완료: 총 ${base64Images.length}개 이미지`);
  
  // 🆕 프롬프트 단순화 (핵심만 간결하게)
  const prompt = `🚨 CRITICAL: KEEP THE SAME PERSON FROM IMAGE 1! 🚨

Task: Change clothes only, NOT the person.

Image 1: ORIGINAL PERSON (preserve face, body, background)
Images 2-${garmentsToWear.length + 1}: CLOTHING ONLY (extract garments, ignore people)

Rules:
1. SAME PERSON = Same face, same body, same pose, same background
2. ONLY change clothes from images 2-${garmentsToWear.length + 1}
3. Layer order: ${garmentsToWear.map((g, idx) => `${idx + 2}:Layer${g.layer}`).join(', ')}
4. Higher layer number = worn on top

Output: Image 1's person wearing new clothes, naturally fitted.`;
  
  console.log('[가상 피팅] 프롬프트:', prompt);
  
  // 🆕 프롬프트 더 명확하게 출력
  console.log('\n🤖 ═══════════════════════════════════════════════════════════');
  console.log('🤖 나노바나나(Gemini)에게 전송하는 프롬프트');
  console.log('🤖 ═══════════════════════════════════════════════════════════');
  console.log(prompt);
  console.log('🤖 ═══════════════════════════════════════════════════════════\n');
  
  // 🆕 의상 목록 명확하게 출력
  console.log('📦 전송할 의상 이미지 목록:');
  garmentsToWear.forEach((g, idx) => {
    console.log(`   ${idx + 1}. 이미지 ${idx + 2}: ${g.name} (레이어 ${g.layer}) - ${g.category}[${g.index}]`);
  });
  console.log('');
  
  // 나노바나나 API 호출을 위한 parts 배열 구성 (단순화)
  const parts = [
    // 1. 메인 사진
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: basePersonImageBase64
      }
    },
    {
      text: "↑ Image 1: ORIGINAL PERSON (keep this person exactly as is)"
    },
    // 2. 의상 이미지들
    ...garmentImagesBase64.map((base64, idx) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64
      }
    })),
    {
      text: `↑ Images 2-${garmentsToWear.length + 1}: CLOTHING ONLY (extract these clothes)`
    },
    // 3. 프롬프트
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
              temperature: 0.0,  // 완전히 0으로: 무작위성 제거
              topK: 5,           // 매우 보수적으로
              topP: 0.5,         // 매우 엄격하게
              maxOutputTokens: 8192,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
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
            const imageUrl = urlMatch[1];
            
            // ⚠️ Placeholder URL 감지 (실제 이미지 아님)
            if (imageUrl.includes('placeholder') || imageUrl.includes('imgur.com/result_') || imageUrl.includes('example.com')) {
              console.warn('[가상 피팅] ⚠️ Placeholder URL 감지, 실제 이미지 아님:', imageUrl);
              throw new Error('API returned placeholder URL instead of real image');
            }
            
            console.log('[가상 피팅] ✅ 이미지 URL 발견:', imageUrl);
            
            // 🆕 replicate.delivery URL 체크 (잘못된 URL 패턴 감지)
            if (imageUrl.includes('replicate.delivery') && imageUrl.match(/\/[a-zA-Z0-9]{20,}\//)) {
              console.warn('[가상 피팅] ⚠️ 의심스러운 replicate.delivery URL 감지:', imageUrl.substring(0, 100));
              throw new Error('Invalid replicate.delivery URL detected - likely placeholder or malformed');
            }
            
            // 🆕 외부 URL을 Blob URL로 변환 (저장 가능하게)
            try {
              const response = await fetch(imageUrl, { method: 'HEAD' }); // 먼저 HEAD로 확인
              
              if (!response.ok) {
                console.warn(`[가상 피팅] ⚠️ URL 접근 실패: ${response.status} ${response.statusText}`);
                throw new Error(`Image URL not accessible: ${response.status}`);
              }
              
              // 실제 이미지 다운로드
              const imageResponse = await fetch(imageUrl);
              if (!imageResponse.ok) {
                throw new Error(`Image download failed: ${imageResponse.status}`);
              }
              
              const blob = await imageResponse.blob();
              
              // 빈 blob 체크
              if (blob.size === 0) {
                throw new Error('Downloaded image is empty');
              }
              
              const blobUrl = URL.createObjectURL(blob);
              console.log('[가상 피팅] 🔄 외부 URL → Blob URL 변환 완료');
              return blobUrl;
            } catch (err) {
              console.error('[가상 피팅] ❌ URL 변환 실패:', err.message, 'URL:', imageUrl.substring(0, 100));
              throw new Error(`Failed to load image from URL: ${err.message}`);
            }
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
  
  throw new Error('이미지 생성 실패: Gemini API가 이미지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요. (500 Internal Server Error 또는 모델 응답 없음)');
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
        const hasInvalidBlobUrl = 
          (appState.basePersonImageUrl && appState.basePersonImageUrl.startsWith('blob:')) ||
          (appState.composedImageUrl && appState.composedImageUrl.startsWith('blob:'));
        
        if (hasInvalidBlobUrl) {
          console.warn('[상태 복원] 🔄 유효하지 않은 blob URL 감지, 전체 상태 초기화');
          
          if (appState.basePersonImageUrl && appState.basePersonImageUrl.startsWith('blob:')) {
            appState.basePersonImageUrl = null;
          }
          if (appState.composedImageUrl && appState.composedImageUrl.startsWith('blob:')) {
            appState.composedImageUrl = null;
          }
          
          // 🆕 blob URL이 무효하면 initialOutfitState도 초기화 (이전 분석 결과 무효)
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
          appState.status = STATUS.EMPTY;
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
          e.preventDefault();
          console.log(`➕ [빈 슬롯 클릭] ${category}[${i}] - 파일 선택 열기`);
          console.log('   클릭 대상:', e.target);
          console.log('   슬롯 버튼:', this);
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              console.log(`   ✅ 파일 선택됨: ${file.name}`);
              const url = URL.createObjectURL(file);
              replaceSlot(category, i, url);
            }
          };
          console.log('   파일 선택 다이얼로그 열기...');
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
 * 드래그 스크롤 설정 - 클릭과 드래그 구분
 */
function setupDragScroll() {
  const container = document.querySelector('.control-buttons-container');
  if (!container) {
    console.error('컨테이너를 찾을 수 없습니다');
    return;
  }

  let pos = { top: 0, left: 0, x: 0, y: 0 };
  let isDragging = false;
  let hasMoved = false;

  const mouseDownHandler = function (e) {
    // 슬롯 버튼이나 X 버튼을 클릭한 경우 드래그 방지
    if (e.target.closest('.slot-button') || e.target.closest('.remove-btn')) {
      return;
    }
    
    isDragging = true;
    hasMoved = false;
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
    if (!isDragging) return;
    
    const dx = e.clientX - pos.x;
    const dy = e.clientY - pos.y;
    
    // 5px 이상 움직였을 때만 드래그로 판단
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true;
    }

    if (hasMoved) {
      container.scrollTop = pos.top - dy;
      container.scrollLeft = pos.left - dx;
    }
  };

  const mouseUpHandler = function () {
    isDragging = false;
    container.style.cursor = 'grab';
    container.style.removeProperty('user-select');

    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  };

  container.addEventListener('mousedown', mouseDownHandler);
  
  console.log('✅ 드래그 스크롤 설정 완료 (클릭/드래그 구분)');
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
// 🆕 전역 플래그로 중복 실행 방지
let uploadHandler = null;
let photoChangeHandler = null;

function setupEventListeners() {
  console.log('[이벤트 리스너] 설정 시작...');
  
  // 사진 업로드 영역
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const mainCanvas = document.getElementById('mainCanvas');
  const photoInput = document.getElementById('photoInput');
  
  console.log('[이벤트 리스너] DOM 요소 확인:', {
    uploadPlaceholder: !!uploadPlaceholder,
    mainCanvas: !!mainCanvas,
    photoInput: !!photoInput
  });
  
  if (uploadPlaceholder) {
    // 🆕 기존 이벤트 리스너 제거 (중복 방지)
    if (uploadHandler) {
      uploadPlaceholder.removeEventListener('click', uploadHandler);
      uploadPlaceholder.onclick = null;
    }
    
    // 새 핸들러 생성 (한 번만 실행되도록)
    uploadHandler = function(e) {
      e.stopPropagation();
      e.preventDefault();
      console.log('📸 [업로드 플레이스홀더 클릭] 파일 선택 열기 (한 번만)');
      const currentPhotoInput = document.getElementById('photoInput');
      if (currentPhotoInput) {
        currentPhotoInput.click();
      } else {
        console.error('   ⚠️ photoInput을 찾을 수 없습니다!');
      }
    };
    
    // onclick만 사용 (addEventListener 제거)
    uploadPlaceholder.onclick = uploadHandler;
    
    console.log('[이벤트 리스너] ✅ uploadPlaceholder 이벤트 등록 완료');
  } else {
    console.error('[이벤트 리스너] ❌ uploadPlaceholder를 찾을 수 없습니다!');
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
    // 🆕 기존 change 이벤트 리스너 제거 (중복 방지)
    if (photoChangeHandler) {
      photoInput.removeEventListener('change', photoChangeHandler);
    }
    
    // 새 핸들러 생성
    photoChangeHandler = function(e) {
      console.log('📁 [photoInput change] 파일 선택됨 (한 번만)');
      const file = e.target.files[0];
      if (file) {
        console.log('   파일:', file.name, file.type, file.size);
        handlePhotoUpload(file);
        // 🆕 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
        e.target.value = '';
      } else {
        console.warn('   ⚠️ 파일이 선택되지 않았습니다');
      }
    };
    
    photoInput.addEventListener('change', photoChangeHandler);
    console.log('[이벤트 리스너] ✅ photoInput change 이벤트 등록 완료');
  } else {
    console.error('[이벤트 리스너] ❌ photoInput을 찾을 수 없습니다!');
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

