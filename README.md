# SyncPaint <img align="left" src="public/img/logo.png?raw=true" alt="Logo" width="40" height="40">

SyncPaint allows multiple users to draw on one canvas at the same time. You can draw together with other people simply by sharing the link to your room.

[![Version](https://img.shields.io/github/package-json/v/pkrasicki/SyncPaint?color=green&style=for-the-badge)](https://github.com/pkrasicki/SyncPaint/releases)
[![Open issues](https://img.shields.io/github/stars/pkrasicki/SyncPaint?style=for-the-badge)](https://github.com/pkrasicki/SyncPaint/stargazers)
[![Open issues](https://img.shields.io/github/issues/pkrasicki/SyncPaint?style=for-the-badge)](https://github.com/pkrasicki/SyncPaint/issues)
[![License](https://img.shields.io/github/license/pkrasicki/SyncPaint?style=for-the-badge)](https://github.com/pkrasicki/SyncPaint/blob/master/LICENSE)
[![Website](https://img.shields.io/website?down_message=offline&style=for-the-badge&up_message=online&url=https%3A%2F%2Fsyncpaint.com)](https://syncpaint.com)

![screenshot](screenshot.png?raw=true)

## Dependencies
- [Node.js](https://nodejs.org)
- [Npm](https://www.npmjs.com)

## Build from source
```
npm install
npm run build
```
For a production build use `npm run build-prod`.

## Run
Run `node app.js` to start the app. Then navigate to `http://localhost:3000`.

Live version is available at: [syncpaint.com](https://syncpaint.com).

## Build and run with Docker

```
docker build . -t syncpaint:latest
docker run -p 3000:3000 syncpaint:latest
```