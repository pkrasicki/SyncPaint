SyncPaint allows multiple users to draw on one canvas at the same time. You can draw together with other people simply by sharing the link to your room.

![screenshot](screenshot.png?raw=true)

## Dependencies
- [Node.js](https://nodejs.org)
- [Npm](https://www.npmjs.com)

## Building
```
npm install
npm run build
```

## Running locally
`node app.js`

It will create a server on `localhost:3000`

Live version is available at [syncpaint.com](https://syncpaint.com).

## Docker

```
docker build . -t syncpaint:latest
docker run -p 3000:3000 syncpaint:latest
```