const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
app.set("trust proxy", 1);
app.use(bodyParser.urlencoded({ extended: true }));

// 🚨 Rate limiter for answer submissions
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 submissions per minute per IP
  message: `
    <html>
      <head><title>Rate Limited</title></head>
      <body style="font-family: Poppins, sans-serif; background: #2b2b2b; color: #ff6b81; text-align: center; padding: 40px;">
        <h2>⛔ Too many attempts!</h2>
        <p>Please wait a minute before trying again.</p>
        <a href="/" style="color:#fff0ff; text-decoration:underline;">Go back</a>
      </body>
    </html>
  `,
});

// Serve static files from root, e.g., audio.wav
app.use(express.static(path.join(__dirname, "..")));

// Homepage with puzzle form
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Riddle Puzzle</title>
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
          h1, h2 { margin: 0 0 20px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
          p { font-size: 1.1rem; margin: 0 0 24px 0; opacity: 0.9; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
          form input {
            font-size: 1.1rem;
            padding: 12px 16px;
            border-radius: 40px;
            border: none;
            width: 260px;
            outline: none;
            transition: box-shadow 0.3s ease;
          }
          form input:focus { box-shadow: 0 0 12px #efb3ff; }
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
          button:hover { background: #d7289f; box-shadow: 0 6px 18px #d7289faa; }
        </style>
      </head>
      <body>
        <div>
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

// POST handler for answer checking (rate limited)
// POST handler for answer checking (rate limited)
app.post("/check", limiter, (req, res) => {
  const ans = (req.body.answer || "").trim().toLowerCase();

  if (ans === "echo") {
    res.send(`
      <html>
        <head>
          <title>Correct Answer</title>
          <style>
            /* Same styles as homepage for consistency */
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
              text-align: center;
            }
            h2 {
              margin-bottom: 20px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.4);
            }
            p {
              font-size: 1.1rem;
              opacity: 0.9;
              text-shadow: 0 1px 3px rgba(0,0,0,0.3);
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
            @keyframes pulse {
              0%, 100% { box-shadow: 0 4px 15px #3fffcfaa; }
              50% { box-shadow: 0 8px 24px #3fffcfcc; }
            }
            .fade-in {
              animation: fadeIn 1.2s ease forwards;
              opacity: 0;
            }
            @keyframes fadeIn { to {opacity:1;} }
          </style>
        </head>
        <body>
          <div class="fade-in">
            <h2>✅ Well done! Your answer is correct.</h2>
            <p>Echoes will guide you to the audio puzzle. Download and listen carefully!</p>
            <a href="/audio.wav" class="download-link" download>Download audio.wav</a>
          </div>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head>
          <title>Try Again</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #f0c0f0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              overflow: hidden;
              text-align: center;
            }
            h2 {
              margin-bottom: 20px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.4);
              color: #ff6b81;
            }
            a.tryagain-link {
              font-size: 1.1rem;
              color: #f0c0ff;
              text-decoration: underline;
            }
            a.tryagain-link:hover {
              color: #fff0ff;
            }
            .fade-in {
              animation: fadeIn 1.2s ease forwards;
              opacity: 0;
            }
            @keyframes fadeIn { to {opacity:1;} }
          </style>
        </head>
        <body>
          <div class="fade-in">
            <h2>❌ Oops! That’s not the right answer.</h2>
            <a href="/" class="tryagain-link">Try again</a>
          </div>
        </body>
      </html>
    `);
  }
});


// Serve audio file statically
app.get("/audio.wav", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "audio.wav"));
});

// Export app for Vercel serverless
module.exports = app;
