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
    // 이미 Base64 또는 data URL이면 그대로 반환
    if (!imageUrl || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // blob URL인지 확인
    if (!imageUrl.startsWith('blob:')) {
      console.warn('[저장] 지원하지 않는 URL 형식:', imageUrl);
      return null;
    }
    
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    if (isThumbnail) {
      // 썸네일은 더 작게 압축
      return await compressImage(base64, 512, 512, 0.7);
    } else {
      // 메인 이미지는 800x800으로 압축
      return await compressImage(base64, 800, 800, 0.7);
    }
  } catch (error) {
    console.error('[저장] 이미지 변환 실패:', error);
    return null;
  }
}

/**
 * Base64를 Blob URL로 변환
 */
function base64ToImageUrl(base64) {
  try {
    // data: URL 형식이면 그대로 반환
    if (base64.startsWith('data:image/svg+xml')) {
      return base64;
    }
    
    const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
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
    // 이미지 URL을 Base64로 변환
    const stateWithBase64 = await convertImagesToBase64(state);

    // Local Storage에 저장 (압축된 버전)
    try {
      const stateStr = JSON.stringify(stateWithBase64);
      const stateSizeMB = new Blob([stateStr]).size / (1024 * 1024);

      if (stateSizeMB > 5) {
        console.warn('[저장] 상태 크기가 5MB를 초과하여 Local Storage 저장 스킵');
      } else {
        localStorage.setItem(`fashionAI_state_${sessionId}`, stateStr);
        console.log('[저장] Local Storage 저장 완료:', stateSizeMB.toFixed(2), 'MB');
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[저장] Local Storage 용량 초과, Supabase에만 저장');
      } else {
        console.warn('[저장] Local Storage 저장 실패:', error);
      }
    }

    // Supabase에 저장
    if (supabaseClient) {
      try {
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
          console.error('[저장] Supabase 저장 실패:', error);
        } else {
          console.log('[저장] Supabase 저장 완료');
        }
      } catch (error) {
        console.error('[저장] Supabase 저장 오류:', error);
      }
    }
  } catch (error) {
    console.error('[저장] 전체 저장 실패:', error);
  }
}

/**
 * 상태 로드
 */
export async function loadState(sessionId) {
  try {
    // 1순위: Local Storage
    const localStateStr = localStorage.getItem(`fashionAI_state_${sessionId}`);
    if (localStateStr) {
      try {
        const localState = JSON.parse(localStateStr);
        console.log('[로드] Local Storage에서 상태 로드');
        return restoreImagesFromBase64(localState);
      } catch (error) {
        console.warn('[로드] Local Storage 파싱 실패:', error);
      }
    }

    // 2순위: Supabase
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('fashion_ai_states')
          .select('state_data')
          .eq('session_id', sessionId)
          .single();

        if (error) {
          console.warn('[로드] Supabase 로드 실패:', error);
          return null;
        }

        if (data && data.state_data) {
          console.log('[로드] Supabase에서 상태 로드');
          return restoreImagesFromBase64(data.state_data);
        }
      } catch (error) {
        console.error('[로드] Supabase 로드 오류:', error);
      }
    }

    return null;
  } catch (error) {
    console.error('[로드] 전체 로드 실패:', error);
    return null;
  }
}

/**
 * 이미지를 Base64로 변환
 */
async function convertImagesToBase64(state) {
  const converted = JSON.parse(JSON.stringify(state));

  // basePersonImageUrl 변환
  if (converted.basePersonImageUrl && !converted.basePersonImageUrl.startsWith('data:')) {
    try {
      const base64 = await imageUrlToBase64ForStorage(converted.basePersonImageUrl, false);
      if (base64) {
        converted.basePersonImageUrl = base64;
        converted._basePersonImageIsBase64 = true;
      } else {
        // 변환 실패 시 제거
        console.warn('[저장] basePersonImageUrl 변환 실패, 제거함');
        converted.basePersonImageUrl = null;
      }
    } catch (error) {
      console.warn('[저장] basePersonImageUrl 변환 오류:', error);
      converted.basePersonImageUrl = null;
    }
  }

  // composedImageUrl 변환
  if (converted.composedImageUrl && !converted.composedImageUrl.startsWith('data:')) {
    try {
      const base64 = await imageUrlToBase64ForStorage(converted.composedImageUrl, false);
      if (base64) {
        converted.composedImageUrl = base64;
        converted._composedImageIsBase64 = true;
      } else {
        // 변환 실패 시 제거
        console.warn('[저장] composedImageUrl 변환 실패, 제거함');
        converted.composedImageUrl = null;
      }
    } catch (error) {
      console.warn('[저장] composedImageUrl 변환 오류:', error);
      converted.composedImageUrl = null;
    }
  }

  // 슬롯 이미지 변환
  for (const category of ['outer', 'inner', 'bottoms']) {
    if (converted.slots && converted.slots[category]) {
      for (let i = 0; i < converted.slots[category].length; i++) {
        const slot = converted.slots[category][i];
        if (slot && typeof slot === 'string' && !slot.startsWith('data:')) {
          try {
            const base64 = await imageUrlToBase64ForStorage(slot, true);
            if (base64) {
              converted.slots[category][i] = base64;
              if (!converted._slotsBase64) converted._slotsBase64 = {};
              if (!converted._slotsBase64[category]) converted._slotsBase64[category] = {};
              converted._slotsBase64[category][i] = true;
            } else {
              // 변환 실패 시 제거
              console.warn(`[저장] ${category}[${i}] 변환 실패, 제거함`);
              converted.slots[category][i] = null;
            }
          } catch (error) {
            console.warn(`[저장] ${category}[${i}] 변환 오류:`, error);
            converted.slots[category][i] = null;
          }
        }
      }
    }
  }

  return converted;
}

/**
 * Base64 이미지를 Blob URL로 복원
 */
function restoreImagesFromBase64(state) {
  const restored = JSON.parse(JSON.stringify(state));

  // basePersonImageUrl 복원
  if (restored._basePersonImageIsBase64 && restored.basePersonImageUrl) {
    console.log('[복원] basePersonImageUrl 변환 중...');
    restored.basePersonImageUrl = base64ToImageUrl(restored.basePersonImageUrl);
    delete restored._basePersonImageIsBase64;
  } else if (restored.basePersonImageUrl && restored.basePersonImageUrl.startsWith('blob:')) {
    // 유효하지 않은 blob URL 제거
    console.warn('[복원] 유효하지 않은 blob URL 감지, 제거함:', restored.basePersonImageUrl);
    restored.basePersonImageUrl = null;
  }

  // composedImageUrl 복원
  if (restored._composedImageIsBase64 && restored.composedImageUrl) {
    console.log('[복원] composedImageUrl 변환 중...');
    restored.composedImageUrl = base64ToImageUrl(restored.composedImageUrl);
    delete restored._composedImageIsBase64;
  } else if (restored.composedImageUrl && restored.composedImageUrl.startsWith('blob:')) {
    // 유효하지 않은 blob URL 제거
    console.warn('[복원] 유효하지 않은 blob URL 감지, 제거함:', restored.composedImageUrl);
    restored.composedImageUrl = null;
  }

  // 슬롯 이미지 복원
  if (restored._slotsBase64) {
    for (const category of ['outer', 'inner', 'bottoms']) {
      if (restored._slotsBase64[category] && restored.slots && restored.slots[category]) {
        for (let i = 0; i < restored.slots[category].length; i++) {
          if (restored._slotsBase64[category][i] && restored.slots[category][i]) {
            console.log(`[복원] ${category}[${i}] 변환 중...`);
            restored.slots[category][i] = base64ToImageUrl(restored.slots[category][i]);
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
            console.warn(`[복원] 유효하지 않은 blob URL 감지, 제거함: ${category}[${i}]`);
            restored.slots[category][i] = null;
          }
        }
      }
    }
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

