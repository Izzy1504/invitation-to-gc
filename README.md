# Invitation to Graduation Ceremony — Đoàn Minh Khôi

A tech/cyberpunk-styled digital invitation for Khôi's graduation ceremony at
Sài Gòn University (SGU), District 5, HCMC — **August 9, 2026, 11:00 AM–1:00 PM**.

## Features
- Boot-sequence preloader + glitch/typewriter hero animation
- Live countdown to the ceremony
- Animated circuit-style background (canvas)
- Event details & ceremony timeline
- Stylized animated SVG campus map with a glowing route from the main gate
  (273 An Dương Vương) to the venue (Hội Trường A), plus the motorbike-parking
  gate (6 Nguyễn Trãi)
- RSVP form backed by a small Express API (JSON file storage)
- Simple admin page (`admin.html`) to view RSVP responses

## Project structure
```
Invitation_to_GC/
├── frontend/          static site (HTML/CSS/JS, no build step)
│   ├── index.html
│   ├── admin.html
│   ├── css/style.css
│   └── js/{main.js,particles.js}
├── backend/           Express server (serves API + the frontend)
│   ├── server.js
│   ├── package.json
│   └── data/rsvps.json   (created/updated at runtime)
└── render.yaml        Render.com deployment blueprint
```

## Run locally
```bash
cd backend
npm install
copy .env.example .env   # then edit ADMIN_KEY
npm start
```
Open http://localhost:4000 — the backend also serves the frontend, so
everything runs on one port and there are no CORS issues.

## Viewing RSVPs
Open `http://localhost:4000/admin.html`, enter the `ADMIN_KEY` you set in
`.env`, and click **Load Responses**.

## Deploying
Push to GitHub, then use the included `render.yaml` blueprint on
[Render](https://render.com) (free tier). Set the `ADMIN_KEY` secret in the
Render dashboard after the first deploy.

## Customizing
- Event date/time: `frontend/js/main.js` → `initCountdown()` target date.
- Campus map layout: `frontend/index.html` → the inline `<svg id="campus-map">`.
- Colors/theme: CSS variables at the top of `frontend/css/style.css`.
