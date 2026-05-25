@echo off
chcp 65001 >nul
echo ========================================
echo   拼多多运营计算器 - 一键部署
echo ========================================
echo.
echo 请选择部署平台:
echo   [1] Vercel (推荐 - 全球CDN, 自动HTTPS)
echo   [2] Netlify (自动HTTPS, 免费)
echo   [3] GitHub Pages (需要先push到GitHub)
echo.
set /p choice="请输入 1/2/3: "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto netlify
if "%choice%"=="3" goto github
echo 无效选择
pause
exit /b

:vercel
echo.
echo 正在部署到 Vercel...
npx vercel --prod --yes
if %errorlevel% equ 0 (
  echo.
  echo ========================================
  echo   部署成功! 
  echo   打开浏览器查看你的网址
  echo ========================================
)
pause
exit /b

:netlify
echo.
echo 正在部署到 Netlify...
npx netlify-cli deploy --prod --dir=dist
if %errorlevel% equ 0 (
  echo.
  echo ========================================
  echo   部署成功!
  echo ========================================
)
pause
exit /b

:github
echo.
echo GitHub Pages 部署步骤:
echo   1. 在GitHub创建仓库
echo   2. git init ^&^& git add . ^&^& git commit -m "deploy"
echo   3. git push 到你的仓库
echo   4. Settings ^> Pages ^> Source: GitHub Actions
echo.
pause
exit /b