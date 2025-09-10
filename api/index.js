const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const Redis = require("ioredis");

// CHANGE THIS: Provide your Redis connection string
// Example: "rediss://default:XXXXXXXX@XXXXXX.upstash.io:6379"
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10;   // 10 requests per minute per IP

async function rateLimitMiddleware(req, res, next) {
  const clientIdentifier = req.ip;
  const redisKey = `rate_limit:${clientIdentifier}`;

  try {
    const requestCount = await redis.incr(redisKey);
    if (requestCount === 1) {
      await redis.expire(redisKey, RATE_LIMIT_WINDOW_SECONDS);
    }
    if (requestCount > MAX_REQUESTS_PER_WINDOW) {
      const ttl = await redis.ttl(redisKey);
      res.setHeader('Retry-After', ttl);
      return res.status(429).send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; background: #ffeeee;">
            <h1>⏳ Too Many Requests!</h1>
            <p>Please wait ${ttl} seconds before trying again.</p>
          </body>
        </html>
      `);
    }
    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    return res.status(500).send("Internal server error");
  }
}

// Apply rate limiter globally (or restrict to puzzle/check endpoints)
app.use(rateLimitMiddleware);

const pageStyle = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
    body {
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #f0f0f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    h1, h2 {
      margin: 0 0 20px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }
    p {
      font-size: 1.1rem;
      margin: 0 0 24px 0;
      opacity: 0.9;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    form input {
      font-size: 1.1rem;
      padding: 12px 16px;
      border-radius: 40px;
      border: none;
      width: 260px;
      outline: none;
      transition: box-shadow 0.3s ease;
    }
    form input:focus {
      box-shadow: 0 0 12px #efb3ff;
    }
    button {
      margin-top: 20px;
      font-size: 1.1rem;
      padding: 12px 32px;
      border-radius: 40px;
      border: none;
      background: #ff5ec4;
      color: white;
      cursor: pointer;
      transition: background 0.3s ease;
      box-shadow: 0 4px 15px #ff5ec4aa;
    }
    button:hover {
      background: #d7289f;
      box-shadow: 0 6px 18px #d7289faa;
    }
    a.download-link {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 36px;
      font-size: 1.2rem;
      border-radius: 40px;
      background: #3fffcf;
      color: #2b2b2b;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 4px 15px #3fffcfaa;
      animation: pulse 2.3s infinite;
      transition: background 0.3s ease;
    }
    a.download-link:hover {
      background: #1fc9a1;
      box-shadow: 0 6px 20px #1fc9a1aa;
    }
    a.tryagain-link {
      margin-top: 24px;
      display: inline-block;
      font-size: 1.1rem;
      color: #f0c0ff;
      text-decoration: underline;
      cursor: pointer;
    }
    a.tryagain-link:hover {
      color: #fff0ff;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 4px 15px #3fffcfaa; }
      50% { box-shadow: 0 8px 24px #3fffcfcc; }
    }
    .fade-in {
      animation: fadeIn 1.2s ease forwards;
      opacity: 0;
    }
    @keyframes fadeIn {
      to {opacity:1;}
    }
  </style>
`;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Riddle Puzzle</title>
        ${pageStyle}
      </head>
      <body>
        <div class="fade-in">
          <h1>Welcome to the Puzzle Challenge</h1>
          <p><em>I speak without a mouth and hear without ears.<br>
          I have nobody, but I come alive with the wind.<br>
          What am I?</em></p>
          <form method="POST" action="/check">
            <input name="answer" autocomplete="off" required placeholder="Type your answer here"/>
            <br />
            <button type="submit">Submit</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/check", (req, res) => {
  const ans = req.body.answer.trim().toLowerCase();
  if (ans === "echo") {
    res.send(`
      <html>
        <head>
          <title>Correct Answer</title>
          ${pageStyle}
        </head>
        <body>
          <div class="fade-in" style="text-align:center;">
            <h2>Well done! Your answer is correct.</h2>
            <p>Echoes will guide you to the audio puzzle. Download and listen carefully!</p>
            <a href="/audio.wav" download class="download-link">Download audio.wav</a>
          </div>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head>
          <title>Try Again</title>
          ${pageStyle}
        </head>
        <body>
          <div class="fade-in" style="text-align:center; color:#f7c1ff;">
            <h2>Oops! That’s not the right answer.</h2>
            <a href="/" class="tryagain-link">Try again</a>
          </div>
        </body>
      </html>
    `);
  }
});

app.get("/audio.wav", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "audio.wav"));
});

module.exports = app;
