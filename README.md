# Taleeq | طليق

Taleeq is a bilingual web app for rehearsing job interviews and presentations. The dashboard opens in Arabic with a right-to-left layout, and users can switch to English.

[Open the live site](https://rama53.github.io/TALEEK/)

## Current features

| Practice mode | Setup |
| --- | --- |
| Job interview | Choose a personal or technical interview, enter a job title and optional job description, attach an optional CV, select one to three interviewers, and set a duration of up to 20 minutes. |
| Presentation | Choose a small or large audience, set the duration, and optionally attach your presentation material. |

The current frontend provides a practice prompt, a countdown, and assessment criteria. Recent Sessions shows the last five completed practices in the current browser. Attachments stay in the browser for the active session. The practice analysis panel accepts typed text or a transcript from the browser’s speech recognition service. The browser may send audio to that service. The panel generates rule-based feedback and a follow-up from the transcript. Camera access, model-generated conversations, and delivery analysis are planned.

## Next milestone — interactive simulation room

The simulation room will open after setup and use the selected panel or audience size.

- **Camera and microphone:** Preview the camera and test the microphone before entering. During practice, users can mute, turn off the camera, or end the session.
- **Interview:** One to three AI interviewers take turns asking questions. Questions and follow-ups use the interview type, job details, any attached CV, and the user's answers. The room shows who's speaking and when it's the user's turn.
- **Presentation:** A small or large virtual audience reacts during the talk and can ask questions afterward.
- **Feedback:** After the session, show specific feedback on clarity, tone of voice, and body language. For presentations, also assess the talk against the material the user provided.

## Development

Use Node.js 24 and Corepack. Run these commands from the repository root.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Run the TypeScript check with `corepack pnpm exec tsc --noEmit`.

## GitHub Pages

In the GitHub repository, open **Settings → Pages** and select **GitHub Actions** under **Build and deployment → Source**. Pushes to `main` deploy automatically. You can also trigger a deployment from **Actions → Deploy to GitHub Pages → Run workflow**.

The workflow reads the Pages base path from GitHub, builds the static export, and publishes `out/`. To build the same export locally, run this command from the repository root.

```sh
NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH=/TALEEK corepack pnpm build
```


## Optional AI audience questions

The FastAPI service generates a question grounded in the presentation transcript and returns matching synthesized speech. The static site uses its prepared audio questions when the service URL is absent. Start the service locally with Python 3.10 or later.

```sh
python -m pip install -r backend/requirements.txt
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Set `OPENAI_API_KEY` in the backend environment before starting it. Set `NEXT_PUBLIC_AUDIENCE_API_URL=http://127.0.0.1:8000` in the frontend environment before starting Next.js. The frontend sends the transcript and optional topic after the presenter selects **Generate a question from my talk**.

For hosted use, deploy the service separately over HTTPS, set `TALEEK_WEB_ORIGINS` to the comma-separated allowed frontend origins, and set the public URL at frontend build time. Before exposing the paid endpoint to public traffic, put it behind authentication and a request quota. CORS controls browser access and does not authenticate requests.
