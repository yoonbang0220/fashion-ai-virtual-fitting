# Fashion AI 앱 실행 스크립트

Write-Host ""
Write-Host "========================================"
Write-Host "  Fashion AI 앱 실행 중..."
Write-Host "========================================"
Write-Host ""
Write-Host "브라우저가 자동으로 열립니다."
Write-Host "종료하려면 Ctrl+C를 누르세요."
Write-Host ""

# 브라우저 열기
Start-Process "http://localhost:8000"

# Python 서버 실행
python -m http.server 8000

