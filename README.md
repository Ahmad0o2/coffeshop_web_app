# Cortina.D Coffee House WebApp

## Structure
- `client/` React + Tailwind frontend
- `server/` Node.js + Express + MongoDB backend

## Setup
1. Backend
   - Copy `server/.env.example` to `server/.env` and fill values
   - Run:
     - `npm install`
     - `npm run dev`
2. Frontend
   - Copy `client/.env.example` to `client/.env`
   - Run:
     - `npm install`
     - `npm run dev`

## Notes
- API base: `http://localhost:5000/api/v1`
- Socket.io: `http://localhost:5000`
- To create an admin account, register a user then update its `role` to `Admin` in MongoDB.
