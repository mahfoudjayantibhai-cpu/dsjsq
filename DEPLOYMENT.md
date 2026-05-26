Deployment

This repository is configured for containerized deployment and CI.

Docker (local):
1. Build image: docker build -t pdd-calculator:latest .
2. Run: docker run -p 8080:80 pdd-calculator:latest

Local build (static):
1. npm ci
2. npm run build
3. Serve: npx serve dist

GitHub Actions:
- Push to main/master to trigger .github/workflows/docker-image.yml.
- Workflow builds the app and pushes image to GHCR: ghcr.io/mahfoudjayantibhai/e-commerce-calculator:latest

Notes:
- A .dockerignore is included to keep the image small.
- To publish to GHCR, repository must allow packages; workflow uses GITHUB_TOKEN.
