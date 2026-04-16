@echo off
REM WhatsApp Load Testing Script for Windows
REM Usage: run-load-test.bat [environment]
REM Environments: local, staging, production

setlocal enabledelayedexpansion

REM Default environment
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=local

echo 🚀 Starting WhatsApp Load Testing...
echo Environment: %ENVIRONMENT%

REM Set base URL based on environment
if "%ENVIRONMENT%"=="local" (
    set BASE_URL=http://localhost:3000
) else if "%ENVIRONMENT%"=="staging" (
    set BASE_URL=https://staging.kokohin.com
    set API_KEY=%STAGING_API_KEY%
) else if "%ENVIRONMENT%"=="production" (
    set BASE_URL=https://kokohin.com
    set API_KEY=%PRODUCTION_API_KEY%
) else (
    echo ❌ Invalid environment. Use: local, staging, or production
    exit /b 1
)

echo Base URL: %BASE_URL%
echo Target: 10,000 concurrent users
echo Threshold: Response time ^< 200ms
echo.

REM Check if k6 is installed
where k6 >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ k6 is not installed. Installing...
    echo Please install k6 manually from: https://k6.io/docs/getting-started/installation/#windows
    echo After installation, add k6 to your PATH and run this script again.
    exit /b 1
)

REM Create results directory
set RESULTS_DIR=load-test-results
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set RESULTS_FILE=%RESULTS_DIR%/whatsapp_load_test_%TIMESTAMP%.json

if not exist "%RESULTS_DIR%" mkdir "%RESULTS_DIR%"

REM Run load test
echo 🏃 Running load test...
k6 run ^
  --env BASE_URL="%BASE_URL%" ^
  --env API_KEY="%API_KEY%" ^
  --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" ^
  --summary-export="%RESULTS_FILE%" ^
  scripts/load-test.js

echo.
echo ✅ Load test completed!
echo Results saved to: %RESULTS_FILE%
echo.

REM Display summary
echo 📊 Test Summary:
echo ================
if exist "%RESULTS_FILE%" (
    echo Full results available in: %RESULTS_FILE%
    echo.
    echo To view detailed results, run:
    echo   k6 show %RESULTS_FILE%
    echo.
    echo To generate HTML report, run:
    echo   k6 run --out html=report.html scripts/load-test.js
)

REM Performance analysis
echo 🔍 Performance Analysis:
echo ========================
echo Key metrics to check:
echo - HTTP request duration (p95) ^< 200ms
echo - Error rate ^< 10%%
echo - No memory leaks or connection issues
echo - Database query performance
echo - Cache hit rates
echo.

REM Next steps
echo 📝 Next Steps:
echo ===============
echo 1. Analyze the results file for detailed metrics
echo 2. Check application logs for any errors
echo 3. Monitor database performance during the test
echo 4. Review cache hit rates and optimize if needed
echo 5. Consider implementing additional optimizations
echo.

echo 🎉 Load testing completed successfully!
pause