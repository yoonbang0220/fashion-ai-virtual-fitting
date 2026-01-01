/**
 * Supabase 설정 및 상태 저장/로드 모듈
 */

let supabaseClient = null;

/**
 * Supabase 클라이언트 초기화
 */
export function initSupabase() {
  try {
    const supabaseUrl = window.SUPABASE_URL;
    const supabaseKey = window.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Supabase] URL 또는 키가 설정되지 않음');
      return null;
    }

    // Supabase 클라이언트는 CDN에서 로드되어야 함
    if (typeof window.supabase === 'undefined') {
      console.warn('[Supabase] Supabase 클라이언트가 로드되지 않음');
      return null;
    }

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] 클라이언트 초기화 완료');
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase] 초기화 실패:', error);
    return null;
  }
}

/**
 * 이미지 압축
 */
function compressImage(base64, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      resolve(compressedBase64);
    };
    img.onerror = () => resolve(base64); // 실패 시 원본 반환
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * 이미지 URL을 Base64로 변환 (저장용)
 */
async function imageUrlToBase64ForStorage(imageUrl, isThumbnail = false) {
  try {
    // null 또는 undefined 체크
    if (!imageUrl) {
      return null;
    }
    
    // 이미 data: URL이면 Base64 추출
    if (imageUrl.startsWith('data:')) {
      // SVG는 그대로 반환 (압축 불가)
      if (imageUrl.includes('svg+xml')) {
        return imageUrl;
      }
      
      // data:image/jpeg;base64,xxxxxx 형식에서 base64 부분만 추출
      const base64Match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        const base64 = base64Match[1];
        // 압축 시도 (실패하면 원본 반환)
        try {
          if (isThumbnail) {
            return await compressImage(base64, 512, 512, 0.7);
          } else {
            return await compressImage(base64, 800, 800, 0.7);
          }
        } catch (compressError) {
          console.warn('[저장] 압축 실패, 원본 반환:', compressError);
          return base64;
        }
      }
      return imageUrl; // 파싱 실패 시 원본 반환
    }
    
    // blob URL 처리
    if (imageUrl.startsWith('blob:')) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Blob 크기 체크 (10MB 초과 시 경고)
      if (blob.size > 10 * 1024 * 1024) {
        console.warn('[저장] 이미지 크기가 너무 큼 (>10MB):', blob.size);
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // 청크 단위로 처리하여 스택 오버플로우 방지
      const CHUNK_SIZE = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      
      // 압축
      try {
        if (isThumbnail) {
          return await compressImage(base64, 512, 512, 0.7);
        } else {
          return await compressImage(base64, 800, 800, 0.7);
        }
      } catch (compressError) {
        console.warn('[저장] 압축 실패, 원본 반환:', compressError);
        return base64;
      }
    }
    
    // 🆕 외부 URL (http/https) 처리
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 접근 불가능한 URL 패턴 사전 체크
      const invalidPatterns = ['replicate.delivery', 'file-cdn.flyai.com', 'file-s3.omniwear.com'];
      for (const pattern of invalidPatterns) {
        if (imageUrl.includes(pattern)) {
          console.warn(`[저장] 접근 불가능한 외부 URL 감지: ${pattern}`);
          return null;
        }
      }
      
      try {
        console.log(`[저장] 외부 URL fetch 시도: ${imageUrl.substring(0, 80)}...`);
        const response = await fetch(imageUrl, { 
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          console.warn(`[저장] 외부 URL fetch 실패: ${response.status} ${response.statusText}`);
          return null;
        }
        
        const blob = await response.blob();
        
        // 이미지 타입 확인
        if (!blob.type.startsWith('image/')) {
          console.warn('[저장] 이미지가 아닌 파일 타입:', blob.type);
          return null;
        }
        
        // Blob 크기 체크 (10MB 초과 시 경고)
        if (blob.size > 10 * 1024 * 1024) {
          console.warn('[저장] 이미지 크기가 너무 큼 (>10MB):', blob.size);
        }
        
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // 청크 단위로 처리하여 스택 오버플로우 방지
        const CHUNK_SIZE = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        
        // 압축
        try {
          if (isThumbnail) {
            return await compressImage(base64, 512, 512, 0.7);
          } else {
            return await compressImage(base64, 800, 800, 0.7);
          }
        } catch (compressError) {
          console.warn('[저장] 압축 실패, 원본 반환:', compressError);
          return base64;
        }
      } catch (error) {
        console.warn(`[저장] 외부 URL 변환 실패: ${error.message}`);
        return null;
      }
    }
    
    // 기타 URL 형식은 지원하지 않음
    console.warn('[저장] 지원하지 않는 URL 형식:', imageUrl.substring(0, 50));
    return null;
    
  } catch (error) {
    console.error('[저장] 이미지 변환 실패:', error);
    return null;
  }
}

/**
 * 이미지 URL이 실제로 유효한 이미지를 가리키는지 검증
 */
async function validateImageUrl(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, 3000); // 3초 타임아웃
    
    img.onload = () => {
      clearTimeout(timeout);
      // 이미지가 실제로 로드되었고 크기가 0이 아닌지 확인
      const isValid = img.width > 0 && img.height > 0;
      resolve(isValid);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = imageUrl;
  });
}

/**
 * Base64를 Blob URL로 변환 (유효성 검증 포함)
 */
function base64ToImageUrl(base64) {
  try {
    // data: URL 형식이면 그대로 반환
    if (base64.startsWith('data:image/svg+xml')) {
      return base64;
    }
    
    // Base64 디코딩 검증
    if (!base64 || typeof base64 !== 'string' || base64.length < 100) {
      console.error('[복원] Base64 변환 실패: 유효하지 않은 Base64 문자열 (너무 짧거나 없음)');
      return null;
    }
    
    // Base64 문자열 유효성 검증 (문자/숫자/+/= 만 허용)
    if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
      console.error('[복원] Base64 변환 실패: 잘못된 Base64 형식 (특수문자 포함)');
      return null;
    }
    
    let decodedData;
    try {
      decodedData = atob(base64);
    } catch (decodeError) {
      console.error('[복원] Base64 디코딩 실패:', decodeError.message);
      return null;
    }
    
    // 디코딩된 데이터 크기 검증 (최소 100바이트 이상이어야 이미지)
    if (decodedData.length < 100) {
      console.error('[복원] Base64 변환 실패: 디코딩된 데이터가 너무 작음 (이미지가 아님)');
      return null;
    }
    
    const blob = new Blob([Uint8Array.from(decodedData, c => c.charCodeAt(0))], { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Blob 크기 검증 (최소 1KB 이상)
    if (blob.size < 1024) {
      console.error('[복원] Base64 변환 실패: Blob 크기가 너무 작음 (1KB 미만)');
      URL.revokeObjectURL(blobUrl);
      return null;
    }
    
    return blobUrl;
  } catch (error) {
    console.error('[복원] Base64 변환 실패:', error);
    return null;
  }
}

/**
 * 세션 ID 가져오기 또는 생성
 */
export function getSessionId() {
  let sessionId = localStorage.getItem('fashionAI_sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('fashionAI_sessionId', sessionId);
  }
  return sessionId;
}

/**
 * 상태 저장
 */
export async function saveState(sessionId, state) {
  try {
    console.log('\n💾 ═══════════════════════════════════════════════════════════');
    console.log('💾 백엔드 저장 시작');
    console.log('💾 ═══════════════════════════════════════════════════════════');
    console.log(`📦 세션 ID: ${sessionId}`);
    console.log('📤 저장 전 상태 요약:');
    console.log('   - basePersonImageUrl:', state.basePersonImageUrl ? 
      (state.basePersonImageUrl.startsWith('blob:') ? 'blob URL' : 
       state.basePersonImageUrl.startsWith('data:') ? 'data URL' : 
       '외부 URL') + ` (${state.basePersonImageUrl.substring(0, 50)}...)` : 'null');
    console.log('   - composedImageUrl:', state.composedImageUrl ? '있음' : 'null');
    console.log('   - status:', state.status);
    
    // initialOutfitState 요약
    if (state.initialOutfitState) {
      const outfitSummary = {
        outer: state.initialOutfitState.outer.map((s, i) => s ? `[${i}]:${s.substring(0, 30)}...` : `[${i}]:null`),
        inner: state.initialOutfitState.inner.map((s, i) => s ? `[${i}]:${s.substring(0, 30)}...` : `[${i}]:null`),
        bottoms: state.initialOutfitState.bottoms.map((s, i) => s ? `[${i}]:${s.substring(0, 30)}...` : `[${i}]:null`)
      };
      console.log('   - initialOutfitState:', JSON.stringify(outfitSummary, null, 2).substring(0, 200) + '...');
    }
    
    console.log('\n🔄 이미지 변환 중... (blob URL → Base64)');
    
    // 이미지 URL을 Base64로 변환
    const stateWithBase64 = await convertImagesToBase64(state);

    console.log('\n📊 변환 후 저장 데이터 요약:');
    // base64 문자열인지 확인 (data: 접두사 있거나, base64 문자열인 경우)
    const isBase64 = (str) => {
      if (!str) return false;
      if (str.startsWith('data:')) return true;
      // base64 문자열 체크 (대략적인 패턴)
      if (str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str)) return true;
      return false;
    };
    console.log('   - basePersonImageUrl:', stateWithBase64.basePersonImageUrl ? 
      (isBase64(stateWithBase64.basePersonImageUrl) ? 'base64 이미지' : 'null') : 'null');
    console.log('   - composedImageUrl:', stateWithBase64.composedImageUrl ? 
      (isBase64(stateWithBase64.composedImageUrl) ? 'base64 이미지' : 'null') : 'null');
    
    // initialOutfitState 변환 결과 (간소화)
    if (stateWithBase64.initialOutfitState) {
      const convertedOutfit = {
        outer: stateWithBase64.initialOutfitState.outer.map((s, i) => {
          if (!s) return `[${i}]:null`;
          return `[${i}]:base64`;
        }),
        inner: stateWithBase64.initialOutfitState.inner.map((s, i) => {
          if (!s) return `[${i}]:null`;
          return `[${i}]:base64`;
        }),
        bottoms: stateWithBase64.initialOutfitState.bottoms.map((s, i) => {
          if (!s) return `[${i}]:null`;
          return `[${i}]:base64`;
        })
      };
      console.log('   - initialOutfitState (변환 후):');
      console.log('      Outer:', convertedOutfit.outer.join(', '));
      console.log('      Inner:', convertedOutfit.inner.join(', '));
      console.log('      Bottoms:', convertedOutfit.bottoms.join(', '));
    }

    // Local Storage에 저장 (압축된 버전)
    try {
      const stateStr = JSON.stringify(stateWithBase64);
      const stateSizeMB = new Blob([stateStr]).size / (1024 * 1024);
      const stateSizeKB = (new Blob([stateStr]).size / 1024).toFixed(1);

      console.log(`\n💾 저장 데이터 크기: ${stateSizeKB}KB (${stateSizeMB.toFixed(2)}MB)`);

      if (stateSizeMB > 5) {
        console.warn('[저장] ⚠️ 상태 크기가 5MB를 초과하여 Local Storage 저장 스킵');
      } else {
        localStorage.setItem(`fashionAI_state_${sessionId}`, stateStr);
        console.log(`[저장] ✅ Local Storage 저장 완료`);
        console.log(`   → 키: fashionAI_state_${sessionId}`);
        console.log(`   → 크기: ${stateSizeKB}KB`);
        console.log(`   → 위치: 브라우저 Local Storage`);
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[저장] ⚠️ Local Storage 용량 초과, Supabase에만 저장');
      } else {
        console.warn('[저장] ⚠️ Local Storage 저장 실패:', error);
      }
    }

    // Supabase에 저장
    if (supabaseClient) {
      try {
        console.log('\n☁️ Supabase 저장 시도 중...');
        const { error } = await supabaseClient
          .from('fashion_ai_states')
          .upsert({
            session_id: sessionId,
            state_data: stateWithBase64,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });

        if (error) {
          console.error('[저장] ❌ Supabase 저장 실패:', error);
        } else {
          console.log('[저장] ✅ Supabase 저장 완료');
          console.log('   → 테이블: fashion_ai_states');
          console.log('   → 세션 ID:', sessionId);
          console.log('   → 업데이트 시간:', new Date().toISOString());
        }
      } catch (error) {
        console.error('[저장] ❌ Supabase 저장 오류:', error);
      }
    } else {
      console.log('[저장] ⚠️ Supabase 클라이언트 없음, Local Storage만 사용');
    }
    
    console.log('💾 ═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('[저장] ❌ 전체 저장 실패:', error);
  }
}

/**
 * 상태 로드
 */
export async function loadState(sessionId) {
  try {
    console.log('\n📥 ═══════════════════════════════════════════════════════════');
    console.log('📥 백엔드에서 상태 로드 시작');
    console.log('📥 ═══════════════════════════════════════════════════════════');
    console.log(`📦 세션 ID: ${sessionId}`);
    
    // 1순위: Local Storage
    const localStateStr = localStorage.getItem(`fashionAI_state_${sessionId}`);
    if (localStateStr) {
      try {
        const stateSizeKB = (new Blob([localStateStr]).size / 1024).toFixed(1);
        console.log(`\n💾 [1순위] Local Storage에서 로드 시도...`);
        console.log(`   → 키: fashionAI_state_${sessionId}`);
        console.log(`   → 크기: ${stateSizeKB}KB`);
        
        const localState = JSON.parse(localStateStr);
        console.log('   ✅ 파싱 성공');
        
        console.log('\n🔄 Base64 → Blob URL 변환 중...');
        const restored = await restoreImagesFromBase64(localState);
        
        console.log('\n📊 로드된 상태 요약:');
        console.log('   - basePersonImageUrl:', restored.basePersonImageUrl ? 
          (restored.basePersonImageUrl.startsWith('blob:') ? 'blob URL' : 'data URL') : 'null');
        console.log('   - composedImageUrl:', restored.composedImageUrl ? '있음' : 'null');
        console.log('   - status:', restored.status);
        if (restored.initialOutfitState) {
          console.log('   - initialOutfitState:');
          console.log('      Outer:', restored.initialOutfitState.outer.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`).join(', '));
          console.log('      Inner:', restored.initialOutfitState.inner.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`).join(', '));
          console.log('      Bottoms:', restored.initialOutfitState.bottoms.map((s, i) => s ? `[${i}]:있음` : `[${i}]:없음`).join(', '));
        }
        console.log('📥 ═══════════════════════════════════════════════════════════\n');
        return restored;
      } catch (error) {
        console.warn('[로드] ❌ Local Storage 파싱 실패:', error);
      }
    } else {
      console.log('\n💾 [1순위] Local Storage: 데이터 없음');
    }

    // 2순위: Supabase
    if (supabaseClient) {
      try {
        console.log('\n☁️ [2순위] Supabase에서 로드 시도...');
        console.log(`   → 테이블: fashion_ai_states`);
        console.log(`   → 세션 ID: ${sessionId}`);
        
        const { data, error } = await supabaseClient
          .from('fashion_ai_states')
          .select('state_data, updated_at')
          .eq('session_id', sessionId)
          .single();

        if (error) {
          console.warn(`   ❌ 로드 실패: ${error.message}`);
          console.log('📥 ═══════════════════════════════════════════════════════════\n');
          return null;
        }

        if (data && data.state_data) {
          console.log('   ✅ 데이터 발견');
          console.log(`   → 업데이트 시간: ${data.updated_at}`);
          
          console.log('\n🔄 Base64 → Blob URL 변환 중...');
          const restored = await restoreImagesFromBase64(data.state_data);
          
          console.log('\n📊 로드된 상태 요약:');
          console.log('   - basePersonImageUrl:', restored.basePersonImageUrl ? 'blob URL' : 'null');
          console.log('   - composedImageUrl:', restored.composedImageUrl ? '있음' : 'null');
          console.log('   - status:', restored.status);
          console.log('📥 ═══════════════════════════════════════════════════════════\n');
          return restored;
        } else {
          console.log('   ⚠️ 데이터 없음');
        }
      } catch (error) {
        console.error('[로드] ❌ Supabase 로드 오류:', error);
      }
    } else {
      console.log('\n☁️ [2순위] Supabase: 클라이언트 없음');
    }

    console.log('📥 ═══════════════════════════════════════════════════════════\n');
    return null;
  } catch (error) {
    console.error('[로드] ❌ 전체 로드 실패:', error);
    return null;
  }
}

/**
 * 이미지를 Base64로 변환
 */
async function convertImagesToBase64(state) {
  const converted = JSON.parse(JSON.stringify(state));
  let conversionCount = 0;
  let conversionSuccess = 0;
  let conversionFailed = 0;

  // basePersonImageUrl 변환
  if (converted.basePersonImageUrl && !converted.basePersonImageUrl.startsWith('data:')) {
    conversionCount++;
    console.log('   🔄 [1] basePersonImageUrl 변환 중...');
    try {
      const base64 = await imageUrlToBase64ForStorage(converted.basePersonImageUrl, false);
      if (base64) {
        const sizeKB = (base64.length / 1024).toFixed(1);
        converted.basePersonImageUrl = base64;
        converted._basePersonImageIsBase64 = true;
        conversionSuccess++;
        console.log(`      ✅ 변환 완료: ${sizeKB}KB`);
      } else {
        console.warn('      ❌ 변환 실패, 제거함');
        converted.basePersonImageUrl = null;
        conversionFailed++;
      }
    } catch (error) {
      console.warn(`      ❌ 변환 오류: ${error.message}`);
      converted.basePersonImageUrl = null;
      conversionFailed++;
    }
  } else if (converted.basePersonImageUrl) {
    console.log('   ⏭️ [1] basePersonImageUrl: 이미 Base64 (변환 불필요)');
  }

  // composedImageUrl 변환
  if (converted.composedImageUrl && !converted.composedImageUrl.startsWith('data:')) {
    conversionCount++;
    console.log('   🔄 [2] composedImageUrl 변환 중...');
    try {
      const base64 = await imageUrlToBase64ForStorage(converted.composedImageUrl, false);
      if (base64) {
        const sizeKB = (base64.length / 1024).toFixed(1);
        converted.composedImageUrl = base64;
        converted._composedImageIsBase64 = true;
        conversionSuccess++;
        console.log(`      ✅ 변환 완료: ${sizeKB}KB`);
      } else {
        console.warn('      ❌ 변환 실패, 제거함');
        converted.composedImageUrl = null;
        conversionFailed++;
      }
    } catch (error) {
      console.warn(`      ❌ 변환 오류: ${error.message}`);
      converted.composedImageUrl = null;
      conversionFailed++;
    }
  } else if (converted.composedImageUrl) {
    console.log('   ⏭️ [2] composedImageUrl: 이미 Base64 (변환 불필요)');
  }

  // initialOutfitState 이미지 변환
  let outfitImageIndex = 3;
  for (const category of ['outer', 'inner', 'bottoms']) {
    if (converted.initialOutfitState && converted.initialOutfitState[category]) {
      for (let i = 0; i < converted.initialOutfitState[category].length; i++) {
        const outfit = converted.initialOutfitState[category][i];
        if (outfit && typeof outfit === 'string' && !outfit.startsWith('data:')) {
          conversionCount++;
          console.log(`   🔄 [${outfitImageIndex}] initialOutfitState.${category}[${i}] 변환 중...`);
          try {
            const base64 = await imageUrlToBase64ForStorage(outfit, true);
            if (base64) {
              const sizeKB = (base64.length / 1024).toFixed(1);
              converted.initialOutfitState[category][i] = base64;
              if (!converted._initialOutfitStateBase64) converted._initialOutfitStateBase64 = {};
              if (!converted._initialOutfitStateBase64[category]) converted._initialOutfitStateBase64[category] = {};
              converted._initialOutfitStateBase64[category][i] = true;
              conversionSuccess++;
              console.log(`      ✅ 변환 완료: ${sizeKB}KB`);
            } else {
              console.warn(`      ❌ 변환 실패, 제거함`);
              converted.initialOutfitState[category][i] = null;
              conversionFailed++;
            }
          } catch (error) {
            console.warn(`      ❌ 변환 오류: ${error.message}`);
            converted.initialOutfitState[category][i] = null;
            conversionFailed++;
          }
          outfitImageIndex++;
        }
      }
    }
  }

  // 슬롯 이미지 변환
  for (const category of ['outer', 'inner', 'bottoms']) {
    if (converted.slots && converted.slots[category]) {
      for (let i = 0; i < converted.slots[category].length; i++) {
        const slot = converted.slots[category][i];
        if (slot && typeof slot === 'string' && !slot.startsWith('data:')) {
          conversionCount++;
          console.log(`   🔄 [${outfitImageIndex}] slots.${category}[${i}] 변환 중...`);
          try {
            const base64 = await imageUrlToBase64ForStorage(slot, true);
            if (base64) {
              const sizeKB = (base64.length / 1024).toFixed(1);
              converted.slots[category][i] = base64;
              if (!converted._slotsBase64) converted._slotsBase64 = {};
              if (!converted._slotsBase64[category]) converted._slotsBase64[category] = {};
              converted._slotsBase64[category][i] = true;
              conversionSuccess++;
              console.log(`      ✅ 변환 완료: ${sizeKB}KB`);
            } else {
              console.warn(`      ❌ 변환 실패, 제거함`);
              converted.slots[category][i] = null;
              conversionFailed++;
            }
          } catch (error) {
            console.warn(`      ❌ 변환 오류: ${error.message}`);
            converted.slots[category][i] = null;
            conversionFailed++;
          }
          outfitImageIndex++;
        }
      }
    }
  }

  console.log(`\n📊 변환 요약: 총 ${conversionCount}개 이미지 중 ${conversionSuccess}개 성공, ${conversionFailed}개 실패`);

  return converted;
}

/**
 * Base64 이미지를 Blob URL로 복원
 */
async function restoreImagesFromBase64(state) {
  const restored = JSON.parse(JSON.stringify(state));
  let restoreCount = 0;
  let restoreSuccess = 0;
  let restoreFailed = 0;

  // basePersonImageUrl 복원 (가장 중요!)
  if (restored._basePersonImageIsBase64 && restored.basePersonImageUrl) {
    restoreCount++;
    console.log('   🔄 [1] basePersonImageUrl: Base64 → Blob URL 변환 중...');
    try {
      const base64SizeKB = (restored.basePersonImageUrl.length / 1024).toFixed(1);
      const blobUrl = base64ToImageUrl(restored.basePersonImageUrl);
      
      if (!blobUrl) {
        console.error(`      ❌ 복원 실패: Base64 → Blob URL 변환 실패 (손상된 데이터 가능성)`);
        restored.basePersonImageUrl = null;
        restoreFailed++;
        delete restored._basePersonImageIsBase64;
      } else {
        // 🔍 추가 유효성 검증: 실제로 이미지를 로드할 수 있는지 테스트
        const isValid = await validateImageUrl(blobUrl);
        if (!isValid) {
          console.error(`      ❌ 복원 실패: Blob URL이 유효한 이미지를 가리키지 않음 (손상된 이미지)`);
          URL.revokeObjectURL(blobUrl);
          restored.basePersonImageUrl = null;
          restoreFailed++;
        } else {
          restored.basePersonImageUrl = blobUrl;
          restoreSuccess++;
          console.log(`      ✅ 복원 완료 (원본: ${base64SizeKB}KB → 유효한 Blob URL)`);
        }
        delete restored._basePersonImageIsBase64;
      }
    } catch (error) {
      console.error(`      ❌ 복원 실패: ${error.message}`);
      restored.basePersonImageUrl = null;
      restoreFailed++;
      delete restored._basePersonImageIsBase64;
    }
  } else if (restored.basePersonImageUrl && restored.basePersonImageUrl.startsWith('blob:')) {
    console.warn('   ⚠️ [1] basePersonImageUrl: 유효하지 않은 blob URL 감지, 제거함');
    restored.basePersonImageUrl = null;
  } else if (restored.basePersonImageUrl && !restored.basePersonImageUrl.startsWith('data:')) {
    // Base64 플래그가 없지만 값이 있는 경우 (이전 버전 호환성)
    // Base64인지 확인 후 복원 시도
    const isLikelyBase64 = restored.basePersonImageUrl.length > 100 && 
                           /^[A-Za-z0-9+/=]+$/.test(restored.basePersonImageUrl);
    if (isLikelyBase64) {
      console.log('   🔄 [1] basePersonImageUrl: 플래그 없지만 Base64로 보임, 복원 시도...');
      const blobUrl = base64ToImageUrl(restored.basePersonImageUrl);
      if (blobUrl) {
        const isValid = await validateImageUrl(blobUrl);
        if (isValid) {
          restored.basePersonImageUrl = blobUrl;
          restoreSuccess++;
          console.log(`      ✅ 복원 완료 (호환성 모드)`);
        } else {
          URL.revokeObjectURL(blobUrl);
          restored.basePersonImageUrl = null;
          console.error(`      ❌ 복원 실패: 유효하지 않은 이미지`);
        }
      } else {
        restored.basePersonImageUrl = null;
        console.error(`      ❌ 복원 실패: Base64 변환 실패`);
      }
    }
  }

  // composedImageUrl 복원
  if (restored._composedImageIsBase64 && restored.composedImageUrl) {
    restoreCount++;
    console.log('   🔄 [2] composedImageUrl: Base64 → Blob URL 변환 중...');
    try {
      const base64SizeKB = (restored.composedImageUrl.length / 1024).toFixed(1);
      restored.composedImageUrl = base64ToImageUrl(restored.composedImageUrl);
      delete restored._composedImageIsBase64;
      restoreSuccess++;
      console.log(`      ✅ 복원 완료 (원본: ${base64SizeKB}KB → Blob URL)`);
    } catch (error) {
      console.warn(`      ❌ 복원 실패: ${error.message}`);
      restored.composedImageUrl = null;
      restoreFailed++;
    }
  } else if (restored.composedImageUrl && restored.composedImageUrl.startsWith('blob:')) {
    console.warn('   ⚠️ [2] composedImageUrl: 유효하지 않은 blob URL 감지, 제거함');
    restored.composedImageUrl = null;
  }

  // initialOutfitState 이미지 복원
  let outfitImageIndex = 3;
  if (restored._initialOutfitStateBase64) {
    for (const category of ['outer', 'inner', 'bottoms']) {
      if (restored._initialOutfitStateBase64[category] && restored.initialOutfitState && restored.initialOutfitState[category]) {
        for (let i = 0; i < restored.initialOutfitState[category].length; i++) {
          if (restored._initialOutfitStateBase64[category][i] && restored.initialOutfitState[category][i]) {
            restoreCount++;
            console.log(`   🔄 [${outfitImageIndex}] initialOutfitState.${category}[${i}]: Base64 → Blob URL 변환 중...`);
            try {
              const base64SizeKB = (restored.initialOutfitState[category][i].length / 1024).toFixed(1);
              restored.initialOutfitState[category][i] = base64ToImageUrl(restored.initialOutfitState[category][i]);
              restoreSuccess++;
              console.log(`      ✅ 복원 완료 (원본: ${base64SizeKB}KB → Blob URL)`);
            } catch (error) {
              console.warn(`      ❌ 복원 실패: ${error.message}`);
              restored.initialOutfitState[category][i] = null;
              restoreFailed++;
            }
            outfitImageIndex++;
          }
        }
      }
    }
    delete restored._initialOutfitStateBase64;
  }

  // 슬롯 이미지 복원
  if (restored._slotsBase64) {
    for (const category of ['outer', 'inner', 'bottoms']) {
      if (restored._slotsBase64[category] && restored.slots && restored.slots[category]) {
        for (let i = 0; i < restored.slots[category].length; i++) {
          if (restored._slotsBase64[category][i] && restored.slots[category][i]) {
            restoreCount++;
            console.log(`   🔄 [${outfitImageIndex}] slots.${category}[${i}]: Base64 → Blob URL 변환 중...`);
            try {
              const base64SizeKB = (restored.slots[category][i].length / 1024).toFixed(1);
              restored.slots[category][i] = base64ToImageUrl(restored.slots[category][i]);
              restoreSuccess++;
              console.log(`      ✅ 복원 완료 (원본: ${base64SizeKB}KB → Blob URL)`);
            } catch (error) {
              console.warn(`      ❌ 복원 실패: ${error.message}`);
              restored.slots[category][i] = null;
              restoreFailed++;
            }
            outfitImageIndex++;
          }
        }
      }
    }
    delete restored._slotsBase64;
  } else if (restored.slots) {
    // 플래그가 없지만 슬롯에 blob URL이 있는 경우 제거
    for (const category of ['outer', 'inner', 'bottoms']) {
      if (restored.slots[category]) {
        for (let i = 0; i < restored.slots[category].length; i++) {
          if (restored.slots[category][i] && restored.slots[category][i].startsWith('blob:')) {
            console.warn(`   ⚠️ slots.${category}[${i}]: 유효하지 않은 blob URL 감지, 제거함`);
            restored.slots[category][i] = null;
          }
        }
      }
    }
  }

  if (restoreCount > 0) {
    console.log(`\n📊 복원 요약: 총 ${restoreCount}개 이미지 중 ${restoreSuccess}개 성공, ${restoreFailed}개 실패`);
  }

  return restored;
}

/**
 * Local Storage 초기화 (디버깅용)
 */
function clearLocalStorage() {
  const sessionId = localStorage.getItem('fashionAI_sessionId');
  if (sessionId) {
    localStorage.removeItem(`fashionAI_${sessionId}`);
    console.log('[Local Storage] 초기화 완료');
  }
}

// 전역 함수로 export
window.restoreImagesFromBase64 = restoreImagesFromBase64;
window.clearFashionAIStorage = clearLocalStorage;

