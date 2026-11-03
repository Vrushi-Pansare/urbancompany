// Production server for Render.
// Serves the built Angular app and proxies /api/* to the MyGenie backend
// (which sends no CORS headers), mirroring the Netlify _redirects setup.
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_TARGET = process.env.API_TARGET || 'https://mygenie.netraax.com';
const DIST_DIR = path.join(__dirname, 'dist', 'urbancompany', 'browser');

// Proxy API calls to the backend, preserving the full /api/... path.
app.use(
  createProxyMiddleware({
    pathFilter: (pathname) => pathname.startsWith('/api'),
    target: API_TARGET,
    changeOrigin: true,
    secure: true,
  })
);

// Serve static build output.
app.use(express.static(DIST_DIR));

// SPA fallback: send index.html for any non-API, non-file route.
app.use((_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}, proxying /api -> ${API_TARGET}`);
});
