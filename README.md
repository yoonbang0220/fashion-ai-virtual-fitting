# Fashion AI - 가상 피팅 앱 👔

AI 기반 가상 피팅 웹 애플리케이션입니다. 사진을 업로드하면 자동으로 의상을 감지하고, 다양한 옷으로 가상 피팅을 시도할 수 있습니다.

## 주요 기능 ✨

- 📸 **메인 사진 업로드** - 사용자 사진 업로드
- 🤖 **AI 의상 자동 감지** - Gemini API를 사용한 자동 의상 인식
- 👕 **의상 슬롯 관리** - Outer, Inner, Bottoms 카테고리별 의상 관리
- 🎨 **가상 피팅** - Nano Banana (Gemini) API를 통한 실시간 가상 착용
- ❌ **X 버튼으로 의상 제거** - 착용한 의상 간편하게 제거
- 💾 **상태 저장** - Local Storage 기반 자동 저장
- 🎯 **Figma UI 디자인** - 세련된 사용자 인터페이스

## 시작하기 🚀

### 1. API 키 설정

`config.example.js` 파일을 복사하여 `config.js`로 저장하고 실제 API 키를 입력하세요:

\`\`\`javascript
// config.js
window.GEMINI_API_KEY = 'your-gemini-api-key';
window.OPENAI_API_KEY = 'your-openai-api-key';
window.SUPABASE_URL = 'your-supabase-url';
window.SUPABASE_ANON_KEY = 'your-supabase-key';
\`\`\`

### 2. `index.html` 수정

`index.html` 파일에서 API 키 스크립트 다음에 `config.js`를 추가하세요:

\`\`\`html
<!-- API Keys -->
<script src="config.js"></script>
\`\`\`

### 3. 로컬 서버 실행

#### Windows:
\`\`\`bash
# PowerShell
.\\실행.ps1

# 또는 배치 파일
실행.bat
\`\`\`

#### Mac/Linux:
\`\`\`bash
python -m http.server 8000
# 또는
python3 -m http.server 8000
\`\`\`

### 4. 브라우저에서 열기

http://localhost:8000 접속

## 기술 스택 🛠

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI API**: 
  - Google Gemini (Nano Banana) - 이미지 생성 및 가상 피팅
  - OpenAI DALL-E 3 - 폴백 이미지 생성
- **Storage**: Local Storage (Base64 압축)
- **UI Design**: Figma 기반

## 프로젝트 구조 📁

\`\`\`
fashionAI/
├── index.html              # 메인 HTML
├── app.js                  # 앱 로직
├── api/
│   ├── image-generation.js # AI 이미지 생성
│   ├── detect-garments.js  # 의상 감지
│   └── supabase-config.js  # 상태 관리
├── config.js               # API 키 설정 (git 제외)
├── config.example.js       # API 키 예시
├── reset-storage.html      # 스토리지 초기화
├── 실행.bat               # Windows 실행 스크립트
└── 실행.ps1               # PowerShell 실행 스크립트
\`\`\`

## 사용 방법 📖

1. **준비됨** 버튼을 클릭하여 사진 업로드
2. AI가 자동으로 의상을 감지하고 슬롯에 썸네일 생성
3. 슬롯을 클릭하여 다른 의상으로 교체 가능
4. **X 버튼**을 눌러 의상 제거
5. 새로고침해도 상태가 유지됩니다

## 주의사항 ⚠️

- **API 키 보안**: `config.js` 파일은 절대 GitHub에 업로드하지 마세요
- **로컬 서버**: `file://` 프로토콜로는 ES6 모듈이 작동하지 않으므로 반드시 로컬 서버를 사용하세요
- **브라우저 호환성**: Chrome, Edge, Firefox 최신 버전 권장

## 문제 해결 🔧

### Storage 초기화
http://localhost:8000/reset-storage.html 접속

### 콘솔 명령어로 초기화
\`\`\`javascript
localStorage.clear();
location.reload();
\`\`\`

## 라이선스 📄

MIT License

## 제작자 👨‍💻

yoonbang0220

