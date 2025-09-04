# Self hosting

- npm build
- copy ./frontend/build /appdata/compose/stroptimise/frontend_build
- copy ./frontend/default/conf /appdata/compose/stroptimise/nginx/default.conf
- copy ./server /appdata/compose/stroptimise/server
- copy ./env /appdata/compose/stroptimise/env
- copy ./dockerCompose /appdata/compose/stroptimise/dockerCompose
- copy ./Dockerfile /appdata/compose/stroptimise/Dockerfile

compose up