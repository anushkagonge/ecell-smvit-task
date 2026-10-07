# E-Cell SMVIT: Executive Selection Task

Landing page (hero + footer) -> Sign up / Log in -> Dashboard.
Stack: HTML, CSS, JavaScript, GSAP (frontend). Node.js + Express, bcrypt, JWT (backend).

## Run it

1. Install Node.js (v18 or newer) from nodejs.org
2. In this folder:

   npm install
   cp .env.example .env      (Windows: copy .env.example .env)
   npm start

3. Open http://localhost:3000

Edit `.env` and set JWT_SECRET to any long random text before you submit.

## Folder map

server.js            backend: API + serves the website
data/users.json      created automatically on first signup (the "database")
public/index.html    landing page (hero + footer)
public/login.html    login page
public/signup.html   signup page
public/dashboard.html  dashboard
public/css/style.css   all styling
public/js/main.js      landing animations + idea board
public/js/api.js       fetch helper + token storage
public/js/auth.js      login and signup form logic
public/js/dashboard.js dashboard logic (token check, user info)

Read EXPLAIN.md for a full walkthrough and interview Q&A.
