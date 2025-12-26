@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Fashion AI 앱 실행 중...
echo ========================================
echo.
echo 브라우저가 자동으로 열립니다.
echo 종료하려면 이 창을 닫으세요.
echo.

start http://localhost:8000

python -m http.server 8000

