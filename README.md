# This is for our DeCAF seminar series site


## Usage

- **Add/Update an event**
  - Create a folder per event under `public/assets/blog/YYYY-MM-DD/`.
  - Inside, add `info.md` with YAML frontmatter, and optional poster image (e.g., `info.png`).
  - Supported frontmatter fields in `info.md`:
    - `title`, `speaker`, `affiliation`, `date` (`YYYY-MM-DD`), `time`, `location`, `posterUrl` (e.g., `./info.png`).
  - The homepage shows the nearest upcoming event (fallback to most recent past). The full Markdown body of `info.md` renders on the front page.
  - see the example in the `public/assets/blog/2025-10-01/` folder.

- **APOD background (optional)**
  - Server-side fetch of NASA APOD sets the homepage background.
  - To avoid DEMO_KEY rate limits, set `PUBLIC_NASA_API_KEY` in your environment.


## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```
/
├── public/
│   ├── robots.txt
│   └── favicon.ico
├── public/assets/
│   └── blog/
│       └── YYYY-MM-DD/
│           ├── info.md       # frontmatter + markdown body for the event
│           └── info.png      # optional poster (refer via posterUrl: "./info.png")
├── src/
│   ├── components/
│   │   ├── Logo.astro
│   │   └── Nav.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── events.ts         # reads events from public/assets/blog
│   ├── pages/
│   │   ├── index.astro       # homepage shows latest/nearest event
│   │   └── blog/
│   │       └── index.astro   # Past Events list
│   └── styles/
│       └── home.css
└── package.json
```

## 🧞 Commands for local development

All commands are run from the root of the project, from a terminal:

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Installs dependencies                        |
| `npm run dev`     | Starts local dev server at `localhost:3030`  |
| `npm run build`   | Build your production site to `./dist/`      |
| `npm run preview` | Preview your build locally, before deploying |

## 👀 Want to learn more?

Feel free to check [Astro's documentation](https://github.com/withastro/astro) or jump into Astro's [Discord server](https://astro.build/chat).

## 📝 License

MIT

## Contact

Weiguang Cui
weiguang.cui@uam.es

