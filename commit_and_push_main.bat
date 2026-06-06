@echo off
rem Commit generated deployment files and push to main

git add Dockerfile .dockerignore .github DEPLOYMENT.md GIT_INFO.md

git commit -m "chore: add Dockerfile, CI workflow, .dockerignore and deployment docs

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin main

echo Done.
pause
