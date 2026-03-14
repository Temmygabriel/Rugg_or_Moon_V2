"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// ─────────────────────────────────────────────────────────────────────────────
//  🔧 PASTE YOUR CONTRACT ADDRESS HERE
// ─────────────────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xE9C5691AA890aB01f47a85Cc47BfE45763bB8d55";
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 4000;

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Project {
  name: string;
  ticker: string;
  tagline: string;
  flags: string[];
  whitepaper_quote: string;
}

interface RoundResult {
  outcome: string;
  explanation: string;
  winner: string;
  reasoning: string;
  player1_pick: string;
  player2_pick: string;
  player1_arg: string;
  player2_arg: string;
}

interface GameState {
  game_id: number;
  mode: string;
  status: string;
  player1_name: string;
  player2_name: string | null;
  player1_score: number;
  player2_score: number;
  player1_submitted: boolean;
  player2_submitted: boolean;
  current_round: number;
  current_project: Project | null;
  last_round_result: RoundResult | null;
  game_winner: string | null;
  history: RoundResult[];
}

// ─── GENLAYER HELPERS (same pattern as The Verdict) ──────────────────────────
function makeClient() {
  const account = createAccount();
  return { client: createClient({ chain: studionet, account }), account };
}

async function readContract(gameId: number): Promise<GameState | null> {
  try {
    const { client } = makeClient();
    const result = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_game",
      args: [gameId],
    });
    const raw = result as string;
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

async function readGameCount(): Promise<number> {
  try {
    const { client } = makeClient();
    const result = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_game_count",
      args: [],
    });
    return Number(result);
  } catch {
    return 0;
  }
}

async function writeContract(fn: string, args: (string | number | boolean | bigint)[]): Promise<boolean> {
  try {
    const { client } = makeClient();
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: fn,
      args,
      value: BigInt(0),
      leaderOnly: true,
    });
    await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
      retries: 60,
      interval: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RugOrMoon() {
  const [screen, setScreen] = useState<"home" | "lobby" | "game" | "gameOver">("home");
  const [playerName, setPlayerName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [gameId, setGameId] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pick, setPick] = useState<"RUG" | "MOON" | null>(null);
  const [argument, setArgument] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevHistoryLen = useRef<number>(0);
  const resultDismissed = useRef<number>(0); // tracks which history index was dismissed

  // ─── POLLING ─────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!gameId) return;
    const state = await readContract(gameId);
    if (!state) return;

    if (state.history.length > prevHistoryLen.current) {
      const latest = state.last_round_result;
      if (latest) {
        prevHistoryLen.current = state.history.length;
        if (state.history.length > resultDismissed.current) {
          setLastResult(latest);
          setShowResult(true);
        }
        setSubmitted(false);
        setPick(null);
        setArgument("");
      }
    }

    if (state.status === "finished" && pollRef.current) {
      clearInterval(pollRef.current);
    }

    setGameState(state);
  }, [gameId]);

  useEffect(() => {
    if (gameId && (screen === "lobby" || screen === "game")) {
      poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [gameId, screen, poll]);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === "in_progress" && screen === "lobby") setScreen("game");
    if (gameState.status === "finished") setScreen("gameOver");
  }, [gameState, screen]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!playerName.trim()) return;
    setLoading(true);
    setLoadingMsg("Creating game...");
    setError("");
    try {
      const countBefore = await readGameCount();
      const ok = await writeContract("create_game", [playerName.trim()]);
      if (!ok) throw new Error("Transaction failed");
      const newId = countBefore + 1;
      setGameId(newId);
      prevHistoryLen.current = 0;
      setScreen("lobby");
    } catch {
      setError("Failed to create game.");
    }
    setLoading(false);
  }

  async function handleCreateSolo() {
    if (!playerName.trim()) return;
    setLoading(true);
    setLoadingMsg("Creating solo game...");
    setError("");
    try {
      const countBefore = await readGameCount();
      const ok = await writeContract("create_solo_game", [playerName.trim()]);
      if (!ok) throw new Error("Transaction failed");
      const newId = countBefore + 1;
      setGameId(newId);
      prevHistoryLen.current = 0;
      // Now call start_solo to generate first project
      setLoadingMsg("AI Oracle generating your first project...");
      const ok2 = await writeContract("start_solo", [newId]);
      if (!ok2) throw new Error("Failed to start solo game");
      const state = await readContract(newId);
      if (state) setGameState(state);
      setScreen("game");
    } catch {
      setError("Failed to create solo game.");
    }
    setLoading(false);
  }

  async function handleJoin() {
    const id = parseInt(joinId);
    if (!playerName.trim() || isNaN(id)) return;
    setLoading(true);
    setLoadingMsg("Joining game...");
    setError("");
    try {
      const state = await readContract(id);
      if (!state) throw new Error("Game not found");
      if (state.status !== "waiting") throw new Error("Game already started");
      const ok = await writeContract("join_game", [id, playerName.trim()]);
      if (!ok) throw new Error("Transaction failed");
      setGameId(id);
      prevHistoryLen.current = 0;
      const newState = await readContract(id);
      if (newState) setGameState(newState);
      setScreen("game");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join");
    }
    setLoading(false);
  }

  async function handleSubmitPick() {
    if (!pick || !argument.trim() || !gameId || !gameState) return;
    setLoading(true);
    setLoadingMsg("Locking in your pick...");
    setError("");
    try {
      const ok = await writeContract("submit_pick", [
        gameId,
        playerName.trim(),
        pick,
        argument.trim(),
      ]);
      if (!ok) throw new Error("Transaction failed");
      setSubmitted(true);
      setLoadingMsg("Waiting for opponent & AI Oracle...");
    } catch {
      setError("Failed to submit. Try again.");
    }
    setLoading(false);
  }

  function reset() {
    setScreen("home");
    setPlayerName("");
    setJoinId("");
    setGameId(null);
    setGameState(null);
    setPick(null);
    setArgument("");
    setLoading(false);
    setSubmitted(false);
    setShowResult(false);
    setLastResult(null);
    prevHistoryLen.current = 0;
    resultDismissed.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
  }

  const mySubmitted = gameState?.player1_name === playerName
    ? gameState?.player1_submitted
    : gameState?.player2_submitted;

  const opponentSubmitted = gameState?.player1_name === playerName
    ? gameState?.player2_submitted
    : gameState?.player1_submitted;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #05050f; color: white; }

        @keyframes blob {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,-50px) scale(1.1); }
          66% { transform: translate(-20px,20px) scale(0.9); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }

        .screen { animation: fadeUp 0.4s ease both; }
        .blob { animation: blob 7s infinite; }
        .float { animation: float 3s ease-in-out infinite; }
        .delay-2 { animation-delay: 2s; }
        .delay-4 { animation-delay: 4s; }
        .spin { animation: spin 0.8s linear infinite; }
        .shimmer { background-size: 200% 200%; animation: shimmer 3s linear infinite; }
        .scale-in { animation: scaleIn 0.3s ease both; }

        .loader { display:inline-block; width:20px; height:20px; border:3px solid rgba(227,125,247,0.2); border-top-color:#E37DF7; border-radius:50%; animation:spin 0.8s linear infinite; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#05050f", color: "white", position: "relative", overflow: "hidden", fontFamily: "Switzer, sans-serif" }}>

        {/* Background blobs */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div className="blob" style={{ position:"absolute", top:"-20%", right:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(227,125,247,0.2), rgba(155,106,246,0.15), rgba(17,15,255,0.1))", filter:"blur(80px)" }} />
          <div className="blob delay-2" style={{ position:"absolute", bottom:"-20%", left:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(17,15,255,0.2), rgba(155,106,246,0.15), rgba(227,125,247,0.1))", filter:"blur(80px)" }} />
        </div>

        {/* Floating triangles */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", opacity:0.15 }}>
          <div className="float" style={{ position:"absolute", top:80, left:"10%", width:32, height:32, border:"2px solid #E37DF7", transform:"rotate(45deg)" }} />
          <div className="float delay-2" style={{ position:"absolute", top:"40%", right:"15%", width:48, height:48, border:"2px solid #9B6AF6", transform:"rotate(12deg)" }} />
          <div className="float delay-4" style={{ position:"absolute", bottom:128, left:"20%", width:40, height:40, border:"2px solid #110FFF", transform:"rotate(30deg)" }} />
        </div>

        <div style={{ position:"relative", zIndex:1, maxWidth:960, margin:"0 auto", padding:"2rem 1.5rem" }}>

          {/* Header */}
          <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"3rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none"><path d="M50 10 L90 90 L10 90 Z" fill="white" /></svg>
              <div>
                <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.25rem" }}>GenLayer</div>
                <div style={{ fontSize:"0.75rem", color:"#9ca3af" }}>Playverse Challenge</div>
              </div>
            </div>
            <div style={{ fontSize:"0.75rem", color:"#9ca3af" }}>Powered by AI Oracle</div>
          </header>

          {/* ── HOME ──────────────────────────────────────── */}
          {screen === "home" && (
            <div className="screen" style={{ textAlign:"center" }}>
              <div style={{ marginBottom:"4rem", position:"relative" }}>
                {/* Mascot */}
                <div className="float" style={{ position:"absolute", right:"-2rem", top:"50%", transform:"translateY(-50%)", opacity:0.85 }}>
                  <img src="/images/mochi-main.png" alt="Mochi" style={{ width:180, height:"auto", filter:"drop-shadow(0 0 30px rgba(227,125,247,0.4))" }} onError={(e)=>{(e.target as HTMLImageElement).parentElement!.style.display="none"}} />
                </div>
                <h1 className="shimmer" style={{ fontFamily:"Outfit", fontWeight:900, fontSize:"clamp(2.5rem,8vw,7rem)", background:"linear-gradient(to right, #E37DF7, #9B6AF6, #110FFF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"1rem", whiteSpace:"nowrap" }}>
                  RUG OR MOON
                </h1>
                <p style={{ fontSize:"1.25rem", color:"#d1d5db", marginBottom:"0.5rem" }}>The Ultimate Web3 Degen Party Game</p>
                <p style={{ fontSize:"0.875rem", color:"#6b7280", fontFamily:"DM Mono" }}>AI generates fake crypto projects. You call it. First to 3 wins. 🎯</p>
              </div>

              <div style={{ maxWidth:440, margin:"0 auto", background:"rgba(255,255,255,0.05)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:24, padding:"2rem" }}>
                <h2 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.5rem", marginBottom:"1.5rem" }}>Start Playing</h2>

                <input
                  placeholder="Your name..."
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  style={{ width:"100%", padding:"0.85rem 1rem", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.15)", borderRadius:12, color:"white", fontSize:"1rem", fontFamily:"Switzer", outline:"none", marginBottom:"1rem" }}
                />

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1rem" }}>
                  <button
                    onClick={handleCreate}
                    disabled={loading || !playerName.trim()}
                    style={{ padding:"0.85rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6)", border:"none", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity: loading || !playerName.trim() ? 0.5 : 1 }}
                  >
                    {loading && loadingMsg.includes("Creating game") ? <><span className="loader" /> Creating...</> : "👥 Play with Friend"}
                  </button>
                  <button
                    onClick={handleCreateSolo}
                    disabled={loading || !playerName.trim()}
                    style={{ padding:"0.85rem", background:"linear-gradient(to right, #110FFF, #9B6AF6)", border:"none", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity: loading || !playerName.trim() ? 0.5 : 1 }}
                  >
                    {loading && loadingMsg.includes("solo") ? <><span className="loader" /> Creating...</> : "🤖 Play vs AI"}
                  </button>
                </div>

                <p style={{ fontSize:"0.75rem", color:"#6b7280", marginBottom:"1.5rem" }}>Challenge a friend or battle AI Degen!</p>

                <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", margin:"1rem 0" }} />
                <p style={{ fontSize:"0.75rem", color:"#6b7280", marginBottom:"0.75rem" }}>OR JOIN A FRIEND'S GAME</p>

                <input
                  placeholder="Game ID to join..."
                  value={joinId}
                  onChange={e => setJoinId(e.target.value)}
                  style={{ width:"100%", padding:"0.85rem 1rem", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.15)", borderRadius:12, color:"white", fontSize:"1rem", fontFamily:"Switzer", outline:"none", marginBottom:"0.75rem" }}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || !playerName.trim() || !joinId.trim()}
                  style={{ width:"100%", padding:"0.85rem", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, cursor:"pointer", opacity: loading || !playerName.trim() || !joinId.trim() ? 0.5 : 1 }}
                >
                  {loading && loadingMsg.includes("Joining") ? <><span className="loader" /> Joining...</> : "Join Friend's Game"}
                </button>

                {error && <div style={{ marginTop:"1rem", padding:"0.75rem", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:10, color:"#fca5a5", fontSize:"0.875rem" }}>{error}</div>}
              </div>
            </div>
          )}

          {/* ── LOADING (solo game being set up) ─────────── */}
          {screen === "game" && gameState && !gameState.current_project && (
            <div className="screen" style={{ textAlign:"center", maxWidth:560, margin:"0 auto", paddingTop:"4rem" }}>
              <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:24, padding:"3rem 2rem" }}>
                <div className="spin" style={{ display:"inline-block", width:56, height:56, border:"4px solid rgba(155,106,246,0.3)", borderTopColor:"#9B6AF6", borderRadius:"50%", marginBottom:"2rem" }} />
                <h2 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"2rem", marginBottom:"0.75rem" }}>AI Oracle Cooking...</h2>
                <p style={{ color:"#9ca3af", marginBottom:"0.5rem" }}>Generating your first crypto project on-chain.</p>
                <p style={{ color:"#6b7280", fontSize:"0.8rem", fontFamily:"DM Mono" }}>This takes 30–60 seconds. Hang tight 🔥</p>
              </div>
            </div>
          )}

          {/* ── LOBBY (waiting for friend) ─────────────────── */}
          {screen === "lobby" && gameId && (
            <div className="screen" style={{ textAlign:"center", maxWidth:560, margin:"0 auto" }}>
              <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:24, padding:"3rem 2rem" }}>
                <div className="spin" style={{ display:"inline-block", width:56, height:56, border:"4px solid rgba(155,106,246,0.3)", borderTopColor:"#9B6AF6", borderRadius:"50%", marginBottom:"2rem" }} />
                <h2 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"2rem", marginBottom:"0.75rem" }}>Waiting for Opponent...</h2>
                <p style={{ color:"#9ca3af", marginBottom:"2rem" }}>Share this Game ID with your friend:</p>
                <div style={{ display:"inline-block", padding:"1rem 2.5rem", background:"rgba(227,125,247,0.1)", border:"2px solid #9B6AF6", borderRadius:16, marginBottom:"1rem" }}>
                  <span style={{ fontFamily:"DM Mono", fontSize:"3rem", fontWeight:700, letterSpacing:"0.1em" }}>{gameId}</span>
                </div>
                <p style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:"1rem" }}>Checking for opponent every 4 seconds...</p>
              </div>
            </div>
          )}

          {/* ── GAME ──────────────────────────────────────── */}
          {screen === "game" && gameState && gameState.current_project && (
            <div className="screen" style={{ maxWidth:800, margin:"0 auto" }}>

              {/* Scores */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:"2rem" }}>
                {[
                  { name: gameState.player1_name, score: gameState.player1_score, label: gameState.mode === "solo" ? "You" : "Player 1" },
                  { name: gameState.player2_name || "AI Degen", score: gameState.player2_score, label: gameState.mode === "solo" ? "🤖 AI Degen" : "Player 2" },
                ].map((p, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"1.25rem" }}>
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af", marginBottom:"0.25rem" }}>{p.label}</div>
                    <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.25rem", marginBottom:"0.25rem" }}>{p.name}</div>
                    <div style={{ fontFamily:"DM Mono", fontWeight:700, fontSize:"2rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{p.score || 0}</div>
                  </div>
                ))}
              </div>

              {/* Project card */}
              <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:20, padding:"2rem", marginBottom:"2rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem", flexWrap:"wrap", gap:"1rem" }}>
                  <div>
                    <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:"2.5rem", marginBottom:"0.5rem" }}>{gameState.current_project.name}</h2>
                    <div style={{ display:"inline-block", padding:"0.25rem 1rem", background:"rgba(155,106,246,0.2)", border:"1px solid #9B6AF6", borderRadius:999 }}>
                      <span style={{ fontFamily:"DM Mono", color:"#9B6AF6", fontWeight:700 }}>${gameState.current_project.ticker}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af" }}>Round</div>
                    <div style={{ fontFamily:"DM Mono", fontWeight:700, fontSize:"2rem" }}>{gameState.current_round}</div>
                  </div>
                </div>

                <p style={{ color:"#d1d5db", fontSize:"1.1rem", fontStyle:"italic", marginBottom:"1.5rem" }}>"{gameState.current_project.tagline}"</p>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1.5rem" }}>
                  {gameState.current_project.flags.map((flag, i) => (
                    <div key={i} style={{ padding:"0.75rem 1rem", borderRadius:10, background: flag.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${flag.startsWith("✅") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, fontSize:"0.875rem" }}>
                      {flag}
                    </div>
                  ))}
                </div>

                <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"1rem", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize:"0.7rem", color:"#6b7280", fontFamily:"DM Mono", textTransform:"uppercase", marginBottom:"0.5rem" }}>From the Whitepaper</div>
                  <p style={{ color:"#d1d5db", fontStyle:"italic" }}>"{gameState.current_project.whitepaper_quote}"</p>
                </div>
              </div>

              {/* Pick / waiting */}
              {!mySubmitted ? (
                <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"2rem" }}>
                  <h3 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.5rem", textAlign:"center", marginBottom:"1.5rem" }}>Make Your Call</h3>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:"1.5rem" }}>
                    {(["RUG", "MOON"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPick(p)}
                        style={{
                          padding:"1.5rem", borderRadius:12, fontFamily:"Outfit", fontWeight:700, fontSize:"1.5rem", cursor:"pointer", transition:"all 0.2s",
                          background: pick === p ? (p === "RUG" ? "#ef4444" : "#eab308") : (p === "RUG" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)"),
                          border: pick === p ? `2px solid ${p === "RUG" ? "#fca5a5" : "#fde047"}` : `2px solid ${p === "RUG" ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.4)"}`,
                          color: "white",
                          boxShadow: pick === p ? `0 0 20px ${p === "RUG" ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.4)"}` : "none",
                        }}
                      >
                        {p === "RUG" ? "🪤 RUG" : "🚀 MOON"}
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Why? Give your best 1-2 sentence argument..."
                    value={argument}
                    onChange={e => setArgument(e.target.value)}
                    maxLength={200}
                    rows={3}
                    style={{ width:"100%", padding:"1rem", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.15)", borderRadius:12, color:"white", fontFamily:"DM Mono", fontSize:"0.9rem", resize:"none", outline:"none", marginBottom:"1rem" }}
                  />

                  <button
                    onClick={handleSubmitPick}
                    disabled={!pick || !argument.trim() || loading}
                    style={{ width:"100%", padding:"1rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6)", border:"none", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"1.1rem", cursor:"pointer", opacity: !pick || !argument.trim() || loading ? 0.5 : 1 }}
                  >
                    {loading ? <><span className="loader" /> {loadingMsg}</> : "🔒 Lock It In"}
                  </button>

                  {error && <div style={{ marginTop:"1rem", padding:"0.75rem", background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:10, color:"#fca5a5", fontSize:"0.875rem" }}>{error}</div>}
                </div>
              ) : (
                <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"3rem", textAlign:"center" }}>
                  <div className="spin" style={{ display:"inline-block", width:56, height:56, border:"4px solid rgba(155,106,246,0.3)", borderTopColor:"#9B6AF6", borderRadius:"50%", marginBottom:"1.5rem" }} />
                  <h3 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.5rem", marginBottom:"0.5rem" }}>
                    {opponentSubmitted ? "AI Oracle Judging..." : "Waiting for opponent..."}
                  </h3>
                  <p style={{ color:"#9ca3af" }}>
                    {opponentSubmitted ? "The verdict is being prepared on-chain..." : "Your pick is locked. Waiting for the other player."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── GAME OVER ──────────────────────────────────── */}
          {screen === "gameOver" && gameState && (
            <div className="screen" style={{ textAlign:"center", maxWidth:600, margin:"0 auto" }}>
              <div style={{ background:"rgba(255,255,255,0.07)", border:"2px solid rgba(155,106,246,0.4)", borderRadius:24, padding:"3rem 2rem", position:"relative", overflow:"hidden" }}>
                {/* Winner mascot */}
                <div style={{ position:"absolute", top:16, right:16, opacity:0.6 }}>
                  <img src="/images/mochi-stonks-up.png" alt="Mochi" style={{ width:80, height:80 }} onError={(e)=>{(e.target as HTMLImageElement).style.display="none"}} />
                </div>

                <div style={{ fontSize:"4rem", marginBottom:"0.5rem" }}>
                  {gameState.game_winner === playerName ? "🏆" : "💀"}
                </div>

                <h2 className="shimmer" style={{ fontFamily:"Outfit", fontWeight:900, fontSize:"3rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6, #110FFF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"0.5rem" }}>
                  {gameState.game_winner === playerName ? "YOU WIN!" : "GAME OVER"}
                </h2>

                <p style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.5rem", marginBottom:"0.5rem", color:"#d1d5db" }}>
                  {gameState.game_winner} takes the crown 👑
                </p>
                <p style={{ fontSize:"0.875rem", color:"#6b7280", marginBottom:"2rem" }}>
                  {gameState.game_winner === playerName ? "The Oracle has spoken in your favour. Degen instincts on point." : "The Oracle has spoken. The degen gods were not with you today."}
                </p>

                {/* Final scores */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:"2rem" }}>
                  {[
                    { name: gameState.player1_name, score: gameState.player1_score },
                    { name: gameState.player2_name, score: gameState.player2_score },
                  ].map((p, i) => (
                    <div key={i} style={{ background: p.name === gameState.game_winner ? "rgba(155,106,246,0.15)" : "rgba(255,255,255,0.04)", border: p.name === gameState.game_winner ? "1px solid rgba(155,106,246,0.5)" : "1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"1.25rem" }}>
                      <div style={{ fontSize:"0.8rem", color:"#9ca3af", marginBottom:"0.25rem" }}>{p.name}</div>
                      <div style={{ fontFamily:"DM Mono", fontWeight:700, fontSize:"3rem", color: p.name === gameState.game_winner ? "#9B6AF6" : "#6b7280" }}>{p.score}</div>
                      {p.name === gameState.game_winner && <div style={{ fontSize:"0.75rem", color:"#9B6AF6", marginTop:"0.25rem" }}>👑 Winner</div>}
                    </div>
                  ))}
                </div>

                {/* Round history */}
                {gameState.history.length > 0 && (
                  <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"1rem", marginBottom:"2rem", textAlign:"left", maxHeight:160, overflowY:"auto" }}>
                    <div style={{ fontSize:"0.7rem", color:"#6b7280", fontFamily:"DM Mono", textTransform:"uppercase", marginBottom:"0.75rem" }}>Match History</div>
                    {gameState.history.map((h, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.4rem", fontSize:"0.8rem" }}>
                        <span style={{ color:"#6b7280", fontFamily:"DM Mono", minWidth:60 }}>Round {i+1}</span>
                        <span style={{ color: h.outcome === "MOON" ? "#eab308" : "#ef4444" }}>{h.outcome === "MOON" ? "🚀" : "🪤"}</span>
                        <span style={{ color:"#9B6AF6", fontWeight:700 }}>{h.winner} won</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <button
                    onClick={reset}
                    style={{ padding:"1rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6)", border:"none", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"1rem", cursor:"pointer" }}
                  >
                    🎮 Play Again
                  </button>
                  <button
                    onClick={() => { window.location.href = "/"; }}
                    style={{ padding:"1rem", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"1rem", cursor:"pointer" }}
                  >
                    🏠 Home
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── ROUND RESULT OVERLAY ───────────────────────── */}
        {showResult && lastResult && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }} onClick={() => { resultDismissed.current = prevHistoryLen.current; setShowResult(false); }}>
            <div className="scale-in" style={{ background:"rgba(20,10,40,0.95)", border:"2px solid rgba(155,106,246,0.5)", borderRadius:24, padding:"2.5rem", maxWidth:560, width:"100%", textAlign:"center", position:"relative" }} onClick={e => e.stopPropagation()}>
              {/* X close button */}
              <button onClick={() => { resultDismissed.current = prevHistoryLen.current; setShowResult(false); }} style={{ position:"absolute", top:16, left:16, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"white", width:32, height:32, cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              <div style={{ position:"absolute", top:16, right:16 }}>
                <img
                  src={lastResult.outcome === "MOON" ? "/images/mochi-stonks-up.png" : "/images/mochi-stonks-down.png"}
                  alt="Mochi"
                  style={{ width:72, height:72 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:"2rem", marginBottom:"0.75rem" }}>Round Result</h2>

              <div style={{ fontFamily:"Outfit", fontWeight:900, fontSize:"3rem", marginBottom:"1rem", color: lastResult.outcome === "MOON" ? "#eab308" : "#ef4444" }}>
                {lastResult.outcome === "MOON" ? "🚀 TO THE MOON!" : "🪤 IT'S A RUG!"}
              </div>

              <div style={{ background:"rgba(0,0,0,0.4)", borderRadius:12, padding:"1rem", marginBottom:"1rem" }}>
                <p style={{ color:"#d1d5db", fontSize:"0.9rem", lineHeight:1.6 }}>{lastResult.explanation}</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1rem" }}>
                {[
                  { name: gameState?.player1_name, pick: lastResult.player1_pick, arg: lastResult.player1_arg },
                  { name: gameState?.player2_name, pick: lastResult.player2_pick, arg: lastResult.player2_arg },
                ].map((p, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"1rem", textAlign:"left" }}>
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af", marginBottom:"0.25rem" }}>{p.name}</div>
                    <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.25rem", marginBottom:"0.25rem", color: p.pick === "MOON" ? "#eab308" : "#ef4444" }}>
                      {p.pick === "MOON" ? "🚀 MOON" : "🪤 RUG"}
                    </div>
                    <div style={{ fontSize:"0.75rem", color:"#9ca3af", fontStyle:"italic" }}>"{p.arg}"</div>
                  </div>
                ))}
              </div>

              <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:"1.1rem", marginBottom:"0.5rem" }}>
                Round Winner: <span style={{ color:"#9B6AF6" }}>{lastResult.winner}</span>
              </div>
              <div style={{ fontSize:"0.85rem", color:"#9ca3af", fontStyle:"italic", marginBottom:"1.5rem" }}>{lastResult.reasoning}</div>

              <button
                onClick={() => { resultDismissed.current = prevHistoryLen.current; setShowResult(false); }}
                style={{ width:"100%", padding:"1rem", background:"linear-gradient(to right, #E37DF7, #9B6AF6)", border:"none", borderRadius:12, color:"white", fontFamily:"Outfit", fontWeight:700, fontSize:"1.1rem", cursor:"pointer" }}
              >
                {gameState?.status === "finished" ? "See Final Results →" : "Next Round →"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ position:"relative", zIndex:1, textAlign:"center", paddingBottom:"2rem", marginTop:"4rem" }}>
          <p style={{ fontSize:"0.75rem", color:"#4b5563", fontFamily:"DM Mono" }}>
            Built with AI Consensus · GenLayer Playverse Challenge
          </p>
        </footer>

      </div>
    </>
  );
}
