# Face-to-face backup server: serves the built dist/ folder with nginx, no internet needed.
#   npm run build
#   docker build -t pdac-web .
#   docker run -d -p 8080:80 pdac-web      → http://localhost:8080
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
