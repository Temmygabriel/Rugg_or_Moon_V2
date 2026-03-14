# 🎮 RUG OR MOON v2.0

**The Ultimate Web3 Degen Party Game** - Now with Single Player Mode!

Play solo against AI Degen 🤖, or challenge a friend to guess if crypto projects are rugs or moons. First to 3 wins!

---

## 🆕 What's New in v2.0

### ✨ Single Player Mode
- **Play solo** when you don't have friends online
- Battle against **AI Degen**, a smart AI opponent
- AI makes its own picks and arguments
- Same competitive gameplay, no waiting!

### 🐱 Mochi Mascot Integration
- Official **GenLayer mascot** (Mochi) featured throughout
- Mochi floats in the hero section
- Dynamic reactions: **stonks-up** 🚀 when MOON, **stonks-down** 🪤 when RUG
- Credits kellyboom888, the mascot designer

---

## 🎯 How It Works

### Game Flow

1. **Enter your name**
2. **Choose mode:**
   - **Play with Friend** → Share Game ID, wait for opponent
   - **Play Solo 🤖** → AI Degen joins instantly
3. **Each Round:**
   - AI generates a fake crypto project (name, ticker, tagline, flags, whitepaper)
   - Both players pick **RUG 🪤** or **MOON 🚀** + argue their case (1-2 sentences)
   - AI Oracle reveals outcome + picks the best argument
   - Winner gets a point
4. **First to 3 points wins!**

### The AI Does Everything:
- ✅ Generates absurd fake projects (DegenDogeCoin, RugPullMaster, etc.)
- ✅ Mixes green flags (✅) with red flags (🚩) to make it hard
- ✅ Determines if it's actually a RUG or MOON
- ✅ Judges arguments based on reasoning quality
- ✅ (In solo mode) Plays as AI Degen opponent

---

## 📁 Project Structure

```
rug-or-moon-v2/
├── app/
│   ├── layout.tsx          ← Next.js layout
│   ├── page.tsx            ← Main game component (with Mochi + solo mode)
│   └── globals.css         ← Tailwind styles
├── public/
│   ├── images/
│   │   ├── mochi-main.png          ← Hero mascot (129KB)
│   │   ├── mochi-stonks-up.png     ← MOON reaction (54KB)
│   │   ├── mochi-stonks-down.png   ← RUG reaction (52KB)
│   │   └── mochi-faces.png         ← Bonus faces (284KB)
│   └── logo/
│       └── mark.svg                ← GenLayer triangle logo
├── rug_or_moon_contract.py  ← Smart contract (with single_player support)
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 🚀 Deployment Guide

### Step 1: Deploy Contract to GenLayer Studio

1. Open **GenLayer Studio** (https://studio.genlayer.com)
2. Create new contract
3. Copy-paste **rug_or_moon_contract.py**
4. Deploy it
5. **Copy the contract address** (e.g., `0x123abc...`)

### Step 2: Create GitHub Repo

1. Go to GitHub → **New Repository**
2. Name it: `rug-or-moon` (or whatever you want)
3. Create it (public or private)

### Step 3: Upload Files to GitHub

**METHOD: GitHub Web UI (since you don't use terminal)**

For each file in the zip:

1. Click **"Add file"** → **"Create new file"**
2. Type the **full path** in the filename box:
   - `app/layout.tsx`
   - `app/page.tsx`
   - `app/globals.css`
   - `public/images/mochi-main.png`
   - `public/images/mochi-stonks-up.png`
   - `public/images/mochi-stonks-down.png`
   - `public/images/mochi-faces.png`
   - `public/logo/mark.svg`
   - `package.json`
   - `next.config.js`
   - `tsconfig.json`
   - `tailwind.config.js`
   - `postcss.config.js`
3. For code files: paste the content
4. For images/SVG: click **"Choose your files"** and upload
5. Commit each file

**⚠️ CRITICAL:** Make sure to create `app/layout.tsx` and `app/page.tsx` as separate files, not nested in one operation.

### Step 4: Update Contract Address

1. In GitHub, navigate to **app/page.tsx**
2. Click the **pencil icon** (edit)
3. Find **line 10:**
   ```typescript
   const CONTRACT_ADDRESS = "PASTE_YOUR_CONTRACT_ADDRESS_HERE";
   ```
4. Replace with your actual contract address (from Step 1)
5. Commit the change

### Step 5: Deploy to Vercel

1. Go to **Vercel Dashboard** (https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repo
4. **⚠️ IMPORTANT:** Set **Framework Preset** to **"Next.js"**
5. Click **"Deploy"**

**If build fails:**
- Go to Settings → Framework Preset → select "Next.js" → Redeploy

---

## 🎨 Design Features

### GenLayer Brand Kit Applied
- **Background:** Deep navy `#05050f`
- **Gradient:** Purple to pink to blue (`#E37DF7` → `#9B6AF6` → `#110FFF`)
- **Fonts:**
  - **Outfit** (headings) - Google Fonts
  - **Switzer** (body) - Fontshare CDN
  - **DM Mono** (code/numbers) - Google Fonts
- **Animations:**
  - Floating blobs (gradient backgrounds)
  - Floating triangles (GenLayer motif)
  - Shimmer gradient text
  - Mochi float animation
  - Result overlay scale-in

### Mochi Placement
- **Hero section:** Floats on right side (desktop only)
- **Round results:** Stonks reactions based on outcome
- **Footer:** Credit to kellyboom888

### Color Coding
- **RUG:** Red `#f87171` (danger vibes)
- **MOON:** Yellow `#fbbf24` (gold vibes)
- **Green flags:** `✅` with green background
- **Red flags:** `🚩` with red background

---

## 🔧 Contract Functions

### Read Functions
- `get_game(game_id: int) -> str` - Get game state as JSON
- `get_game_count() -> int` - Total games created

### Write Functions
- `create_game(player_name: str, single_player: bool = False) -> str`
  - Creates new game
  - If `single_player=True`, AI Degen auto-joins
  - Returns game ID

- `join_game(game_id: int, player_name: str) -> None`
  - Join existing multiplayer game
  - Triggers first project generation

- `submit_pick(game_id: int, player_name: str, pick: str, argument: str) -> None`
  - Submit "RUG" or "MOON" with your argument
  - In solo mode: AI auto-picks when you submit
  - When both submitted: AI judges, awards point, generates next project

---

## 🐛 Common Issues & Fixes

### "Couldn't find app directory" (Vercel build fails)
**Fix:** GitHub may have dropped the `app/` folder. Create `app/layout.tsx` and `app/page.tsx` manually via GitHub web UI.

### "No Output Directory named public"
**Fix:** Go to Vercel Settings → Framework Preset → set to **"Next.js"** → Redeploy.

### "Cannot find module 'genlayer-js'"
**Fix:** Make sure `package.json` uses `"genlayer-js": "latest"` (NOT `@genlayer/js`).

### Images not showing
**Fix:** Make sure you created the path `public/images/mochi-main.png` correctly (not just `mochi-main.png`).

### Contract call fails
**Fix:** Double-check the `CONTRACT_ADDRESS` on line 10 of `app/page.tsx` matches your deployed contract.

---

## 🎯 Single Player vs Multiplayer

| Feature | Single Player | Multiplayer |
|---------|--------------|-------------|
| **Opponent** | AI Degen 🤖 | Real human player |
| **Wait time** | None (instant) | Wait for friend to join |
| **Game ID** | Yes (for resuming) | Yes (share with friend) |
| **AI picks** | Auto-generated | N/A |
| **Difficulty** | Consistent AI quality | Depends on opponent |
| **Fun for** | Solo practice, testing | Trash talk, competition |

---

## 💡 Tips for Players

### Winning Strategies
1. **Read the flags carefully** - green flags vs red flags matter
2. **Whitepaper quotes reveal tone** - professional? scammy?
3. **Ticker matters** - "SCAM" is probably a rug 😂
4. **Argue quality over quantity** - AI judges best reasoning
5. **Contrarian plays** - sometimes the obvious pick loses to better argument

### Example Winning Arguments
- ✅ "The whitepaper mentions 'revolutionary tokenomics' but no technical details - classic rug setup"
- ✅ "Doxxed team + working product + 2 years track record = moon despite the meme ticker"
- ❌ "I just feel like it's a rug" (too vague)
- ❌ "MOON because I want it to moon" (no reasoning)

---

## 🎨 Credits

### Mascot
- **Design:** kellyboom888 ([@Kellybeam888](https://twitter.com/Kellybeam888))
- **Project:** GenLayer ([genlayer.com](https://genlayer.com))
- **License:** CC0-1.0 (free to use!)

### Built With
- **GenLayer Protocol** - AI Oracle + Intelligent Contracts
- **Next.js 15.2.0** - React framework
- **genlayer-js** - GenLayer JavaScript SDK
- **Tailwind CSS** - Styling

---

## 📜 License

This project is built for the **GenLayer Playverse Challenge**.

Mochi mascot assets are licensed under **CC0-1.0** (public domain).

---

## 🔗 Links

- **GenLayer:** https://genlayer.com
- **GenLayer Docs:** https://docs.genlayer.com
- **GenLayer Studio:** https://studio.genlayer.com
- **Playverse Challenge:** (link from GenLayer Discord)

---

**Built with 💜 for GenLayer Playverse Challenge**

Good luck, degen! 🚀🪤
