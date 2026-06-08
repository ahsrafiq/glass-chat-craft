# Glass Chat Craft

![Glass Chat Craft Screenshot](file:///c:/Users/HP/Desktop/Chat%20App/glass-chat-craft/image.png)

## 🎯 What It Is

**Glass Chat Craft** is a modern, AI‑powered email‑drafting web application built with **React**, **Vite**, **TailwindCSS**, and **Supabase** for authentication and data storage.  Users can sign‑in with email, manage brands, create AI‑generated drafts, give feedback on generated copy, and view a sleek, glass‑morphism UI that feels premium and responsive.

## ✨ Key Features

- **AI‑generated email drafts** powered by an external LLM (plug‑and‑play).  
- **Real‑time authentication** via Supabase (email sign‑up / sign‑in).  
- **Brand management** – associate multiple brands with a single account.  
- **Feedback loop** – users can rate drafts and improve future generations.  
- **Dark / Light mode** with smooth framer‑motion animations.  
- **Responsive design** that works on desktop and mobile browsers.

## 🛠️ Tech Stack

| Layer | Technology |
|------|------------|
| UI Framework | React 18 (TypeScript) |
| Build Tool | Vite |
| Styling | TailwindCSS, custom glass‑morphism utilities |
| Auth / DB | Supabase (PostgreSQL + Supabase Auth) |
| Animations | Framer Motion |
| Icons | Lucide‑react |
| Form handling | React‑Hook‑Form |
| State / Data fetching | React‑Query |

## 📦 Installation & Development

```bash
# 1️⃣ Clone the repo (already in place)
cd "C:\Users\HP\Desktop\Chat App\glass-chat-craft"

# 2️⃣ Install dependencies
npm install   # or `bun install` if you prefer Bun

# 3️⃣ Create a .env file with your Supabase credentials
#    (you can copy the example from `env.example` if present)

# 4️⃣ Run the development server
npm run dev   # starts Vite on http://localhost:5173
```

> **Tip:** The project uses the Supabase anon‑public key and URL defined in `src/integrations/supabase/client.ts`.  Make sure the keys belong to a Supabase project that contains the required tables (`auth.users`, `public.brands`, etc.).

## 🚀 Production Build

```bash
npm run build   # creates an optimized bundle in `dist/`
npm run preview # locally preview the production build
```

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL of your Supabase project (e.g., `https://xyz.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for client‑side authentication. |

These variables are referenced in `src/integrations/supabase/client.ts`.

## 📂 Project Structure (high‑level)

```
src/
├─ App.tsx                # Root component with routes
├─ main.tsx               # React entry point
├─ pages/                 # Page components (Index, Auth, Chat, …)
├─ components/            # UI building blocks (Sidebar, Buttons, …)
├─ contexts/              # AuthContext (Supabase auth wrapper)
├─ integrations/          # Supabase client & type definitions
├─ lib/                   # Helper utilities
└─ index.css + tailwind   # Global styles & design tokens
```

## 🐞 Common Issues & Debugging

- **Stuck on loading screen** – see the troubleshooting guide in the previous conversation (check Supabase URL/key, network access, console errors).  
- **Missing environment variables** – Vite will fail to start if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are undefined.
- **CORS / network blocks** – ensure your workstation can reach `*.supabase.co` over HTTPS.

## 🎨 Design Philosophy

The UI deliberately uses **glass‑morphism**, soft gradients, and subtle micro‑animations driven by Framer Motion.  All colors are sourced from a curated HSL palette to give a premium, modern feel while remaining accessible (contrast‑checked for WCAG AA).

---

*Ready to craft stunning email drafts? Run `npm run dev` and start exploring!*
