
<div align="center">

```
                          ██╗  ██╗██╗  ██╗ ██████╗██╗  ██╗██╗      ██████╗  ██████╗ 
                          ██║  ██║██║  ██║██╔════╝██║ ██╔╝██║     ██╔═████╗██╔════╝ 
                          ███████║███████║██║     █████╔╝ ██║     ██║██╔██║██║  ███╗
                          ██╔══██║╚════██║██║     ██╔═██╗ ██║     ████╔╝██║██║   ██║
                          ██║  ██║     ██║╚██████╗██║  ██╗███████╗╚██████╔╝╚██████╔╝
                          ╚═╝  ╚═╝     ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ 
```

**Offensive Security & Malware Research Blog**
 
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-00e0ff?style=for-the-badge&logo=opensourceinitiative&logoColor=00e0ff&labelColor=0d1117)](LICENSE)
[![Stack](https://img.shields.io/badge/HTML%20·%20CSS%20·%20JS-vanilla-ff4d6d?style=for-the-badge&logo=javascript&logoColor=ff4d6d&labelColor=0d1117)](#)
[![Status](https://img.shields.io/badge/STATUS-ACTIVE-00ffb3?style=for-the-badge&logo=statuspage&logoColor=00ffb3&labelColor=0d1117)](#)
[![Purpose](https://img.shields.io/badge/PURPOSE-EDU%20ONLY-a78bfa?style=for-the-badge&logo=gitbook&logoColor=a78bfa&labelColor=0d1117)](#)
 
*Knowledge they won't teach you in school.*
 
[Live](https://h4ckl0g.ch4rum.workers.dev/) · [Report Bug](https://github.com/ch4rum/H4ckL0g/issues) · [Request Feature](https://github.com/ch4rum/H4ckL0g/issues)

</div>

---

## 📖 Description

**H4ckL0g** is a static offensive security blog focused on malware analysis, ethical hacking, network protocols, and OSINT. Built entirely with vanilla HTML, CSS, and JavaScript; no frameworks, no build tools, no dependencies.

The site features:
- Technical articles on malware internals, ransomware anatomy, and attack techniques
- CTF and platform writeups (HackTheBox, TryHackMe, PicoCTF)
- Open source offensive security tools with in-browser code viewer
- Fully client-side markdown rendering from `.md` files

> [!WARNING]
>All content is for educational and authorized security research purposes only. Never use any technique or tool against systems you do not own or have explicit written permission to test.

---

## 🗂️ Project Structure

```
H4ckL0g/
├── index.html              # Main page (posts grid)
├── github.html             # Repositories page
├── post.html               # Single post reader
├── writeup.html            # Single writeup reader
├── style.css               # Global styles
│
├── js/
│   ├── utils.js            # Shared: renderMarkdown, escapeHtml, code blocks
│   ├── posts.js            # DATA: post metadata array
│   ├── writeups.js         # DATA: writeup metadata array
│   ├── githubs.js          # DATA: repository metadata array
│   ├── main.js             # Logic: index.html (posts, writeups, repos, prompt)
│   ├── github.js           # Logic: github.html (repo list, modal, MD parser)
│   ├── post.js             # Logic: post.html (fetch & render post MD)
│   └── writeup.js          # Logic: writeup.html (fetch & render writeup MD)
│
├── posts/
├── writeups/
└── github/
    └── 0xLocal_code/       # .zip files for local-only tools
```

---

## ⚙️ Architecture

H4ckL0g is **100% static** — no server, no database, no build step.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Structure | HTML5 | 4 pages, semantic markup |
| Styling | CSS3 (custom vars) | Dark hacker theme, responsive |
| Logic | Vanilla JS (ES2020) | Rendering, filtering, infinite scroll |
| Content | Markdown `.md` files | Posts, writeups, repo READMEs |
| Fonts | Google Fonts (VT323, JetBrains Mono) | Terminal aesthetic |

### Script Load Order

Each page loads only what it needs:

```
index.html   → utils.js · posts.js · writeups.js · githubs.js · github.js · main.js
github.html  → utils.js · githubs.js · github.js
post.html    → utils.js · posts.js · post.js
writeup.html → utils.js · writeups.js · writeup.js
```

### Markdown Rendering

Content lives in `.md` files fetched at runtime. `utils.js` provides `renderMarkdown()` which handles:
- Headings, bold, italic, inline code
- Fenced code blocks with copy button and syntax label
- Blockquotes, horizontal rules, images, links
- Ordered and unordered lists
- **Markdown tables** (`markdown-table` CSS class)

---

## 🚀 Running Locally

Clone and serve with any static file server:

```bash
git clone https://github.com/ch4rum/H4ckL0g.git
cd H4ckL0g

# Python
python3 -m http.server 3333

# Node (npx)
npx serve .

# PHP
php -S localhost:3333
```

Then open `http://localhost:3333`.

> [!NOTE]
>Must be served over HTTP — `fetch()` calls to `.md` files will fail on `file://` protocol due to CORS.

---

## ✍️ Adding Content

### New Post

1. Add an entry to `js/posts.js`:

```js
{
  id:       "my-post-slug",
  title:    "My Post Title",
  category: "malware",          // malware | hacking | networks | osint
  date:     "June 1, 2026",
  author:   "Ch4rum",           // or "" for local
  reading:  "7 min",
  image:    "https://...",
  excerpt:  "Short description shown on the card."
}
```

2. Create `posts/malware/my-post-slug.md` with your content.

---

### New Writeup

1. Add an entry to `js/writeups.js`:

```js
{
  id:         "machine-name",
  title:      "HackTheBox: MachineName",
  category:   "htb",           // htb | tryhackme | ctfs | vulnhub | picoCTF
  platform:   "HackTheBox",
  difficulty: "Medium",
  date:       "June 5, 2026",
  author:     "Ch4rum",        // or "" for local
  image:      "https://...",
  excerpt:    "Brief description of the machine."
}
```

2. Create `writeups/htb/machine-name.md` with your walkthrough.

---

### New Repository

1. Add an entry to `js/githubs.js`:

```js
{
  id:        "Tool-Name",
  name:      "Tool Name",
  category:  "hacking",
  githubUrl: "https://github.com/ch4rum/tool-name",  // or "" for local
  lang:      "Python",
  desc:      "Short description shown on the card."
}
```

2. Create `github/hacking/Tool-Name.md`.


> For local-only tools (no GitHub URL), place a `Tool-Name.zip` in `github/0xLocal_code/`.

---

## 🔒 Security & Ethics

This project is built for **educational purposes only**.

- All tools are designed for **authorized penetration testing** environments
- No content encourages or facilitates unauthorized access to systems
- Writeups are published only for **retired/public** machines and past CTF challenges
- The author complies with responsible disclosure practices

**If you find a security issue in this project itself**, please open a private issue or contact via Discord.

---

## 📡 Contributions
 
Feel free to fork this repository and propose improvements or additional content through pull requests. New posts, writeups, tools, and bug fixes are all welcome.
 
<div align="center">
 
![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=18&pause=1000&color=00FFB3&center=true&vCenter=true&width=500&lines=All+contributions+are+welcome!;Fork+it.+Hack+it.+PR+it.;Knowledge+shared+is+knowledge+multiplied.)
 
</div>
 
<div align="center">

[![Instagram](https://img.shields.io/badge/Instagram-%40Ch4rum-E4405F?style=for-the-badge&logo=instagram&logoColor=white&labelColor=0d1117)](https://www.instagram.com/Ch4rum/)
[![GitHub](https://img.shields.io/badge/GitHub-ch4rum-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/ch4rum)
[![Discord](https://img.shields.io/badge/Discord-Ch4rum-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=0d1117)](https://discord.gg/Z4WwQJqjB)
[![Facebook](https://img.shields.io/badge/Facebook-Ch4rum-1877F2?style=for-the-badge&logo=facebook&logoColor=white&labelColor=0d1117)](https://www.facebook.com/people/Ch4rum/100066815058123/)

</div>

<div align="center">
<sub>Made with ❤️ by <a href="https://www.instagram.com/Ch4rum/">ch4rum</a> · H4ckL0g © 2026</sub>
</div>
