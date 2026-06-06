@echo off
chcp 65001 >nul
echo ========================================
echo   拼多多电商计算器 - GitHub Pages 部署
echo ========================================
echo.
set /p repo="请输入你的GitHub仓库名（如 pdd-calculator）: "
set /p user="请输入你的GitHub用户名: "

echo.
echo 正在推送...
git remote remove origin 2>nul
git remote add origin https://github.com/%user%/%repo%.git
git push -u origin master

if %errorlevel% equ 0 (
  echo.
  echo ========================================
  echo   推送成功!
  echo   现在去 GitHub 仓库 Settings ^> Pages
  echo   Source 选择 "GitHub Actions"
  echo.
  echo   30秒后你的地址:
  echo   https://%user%.github.io/%repo%/
  echo ========================================
) else (
  echo.
  echo 推送失败。请确认:
  echo   1. 已在 GitHub 创建空仓库 %repo%
  echo   2. 仓库地址正确
  echo   3. Git 已登录（git config --global user.name）
)
pause