# base image (npm을 갖고 있는 baseimage 중 하나)
FROM node:14

# Working Directory 생성
WORKDIR  /user/src/app

# COPY package.json ./
COPY ./ ./

# node의 종속성 다운로드
RUN npm install

# 서버 가동 (nodemon 사용)
CMD ["npm", "start"]