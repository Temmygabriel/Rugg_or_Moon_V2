"use client";

import { useState, useEffect } from "react";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ⚡ PASTE YOUR CONTRACT ADDRESS HERE ⚡
const CONTRACT_ADDRESS = "0xfe3adceD769e7c5B79AE42cF3185895b4fee441B";

const client = createClient({
  chain: studionet,
  endpoint: "https://studio.genlayer.com/api",
});

const account = createAccount();

interface GameState {
  game_id?: number;
  mode?: string;
  status: string;
  player1_name?: string;
  player2_name?: string;
  player1_score?: number;
  player2_score?: number;
  player1_submitted?: boolean;
  player2_submitted?: boolean;
  current_round?: number;
  current_project?: {
    name: string;
    ticker: string;
    tagline: string;
    flags: string[];
    whitepaper_quote: string;
  };
  last_round_result?: {
    outcome: string;
    explanation: string;
    winner: string;
    reasoning: string;
    player1_pick: string;
    player2_pick: string;
    player1_arg: string;
    player2_arg: string;
  };
  game_winner?: string;
}

export default function RugOrMoon() {
  const [gameId, setGameId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pick, setPick] = useState<"RUG" | "MOON" | null>(null);
  const [argument, setArgument] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [lastSeenRound, setLastSeenRound] = useState(0);

  const fetchGame = async (id: string) => {
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_game",
        args: [parseInt(id)],
        account,
      });
      const parsed = JSON.parse(result as string);
      setGameState(parsed);
      if (
        parsed.last_round_result &&
        parsed.current_round > lastSeenRound
      ) {
        setShowResult(true);
        setLastSeenRound(parsed.current_round);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNewGameId = async (): Promise<string> => {
    const count = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_game_count",
      args: [],
      account,
    });
    return (count ?? 0).toString();
  };

  const createGame = async () => {
    if (!playerName.trim()) { setError("Enter your name first!"); return; }
    setLoading(true);
    setError("");
    try {
      await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "create_game",
        args: [playerName.trim()],
        account,
        value: 0n,
      });
      const newId = await getNewGameId();
      setGameId(newId);
      await fetchGame(newId);
    } catch (err: any) {
      setError(err.message || "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  const createSoloGame = async () => {
    if (!playerName.trim()) { setError("Enter your name first!"); return; }
    setLoading(true);
    setError("");
    try {
      await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "create_solo_game",
        args: [playerName.trim()],
        account,
        value: 0n,
      });
      const newId = await getNewGameId();
      setGameId(newId);
      await fetchGame(newId);
    } catch (err: any) {
      setError(err.message || "Failed to create solo game");
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !gameId.trim()) {
      setError("Enter your name and game ID!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "join_game",
        args: [parseInt(gameId), playerName.trim()],
        account,
        value: 0n,
      });
      await fetchGame(gameId);
    } catch (err: any) {
      setError(err.message || "Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const submitPick = async () => {
    if (!pick || !argument.trim()) {
      setError("Make your pick and write your argument!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "submit_pick",
        args: [parseInt(gameId), playerName, pick, argument.trim()],
        account,
        value: 0n,
      });
      setPick(null);
      setArgument("");
      await fetchGame(gameId);
    } catch (err: any) {
      setError(err.message || "Failed to submit pick");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId && gameState?.status === "in_progress") {
      const interval = setInterval(() => fetchGame(gameId), 4000);
      return () => clearInterval(interval);
    }
  }, [gameId, gameState?.status]);

  const mySubmitted =
    gameState?.player1_name === playerName
      ? gameState?.player1_submitted
      : gameState?.player2_submitted;

  const opponentSubmitted =
    gameState?.player1_name === playerName
      ? gameState?.player2_submitted
      : gameState?.player1_submitted;

  return (
    <div className="min-h-screen bg-[#05050f] text-white relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#E37DF7]/20 via-[#9B6AF6]/15 to-[#110FFF]/10 blur-3xl animate-blob" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#110FFF]/20 via-[#9B6AF6]/15 to-[#E37DF7]/10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-[#9B6AF6]/10 to-[#E37DF7]/5 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Floating triangles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-[10%] animate-float">
          <div className="w-8 h-8 border-2 border-[#E37DF7] rotate-45" />
        </div>
        <div className="absolute top-[40%] right-[15%] animate-float animation-delay-2000">
          <div className="w-12 h-12 border-2 border-[#9B6AF6] rotate-12" />
        </div>
        <div className="absolute bottom-32 left-[20%] animate-float animation-delay-4000">
          <div className="w-10 h-10 border-2 border-[#110FFF] rotate-[30deg]" />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
              <path d="M50 10 L90 90 L10 90 Z" fill="white" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold font-['Outfit']">GenLayer</h1>
              <p className="text-sm text-gray-400 font-['Switzer']">Playverse Challenge</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 font-['Switzer']">Powered by AI Oracle</p>
        </header>

        {/* Hero */}
        <div className="text-center mb-16 relative">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-80 animate-float hidden lg:block">
            <img src="/images/mochi-main.png" alt="Mochi" className="w-48 h-auto drop-shadow-2xl" />
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-4 font-['Outfit'] bg-gradient-to-r from-[#E37DF7] via-[#9B6AF6] to-[#110FFF] bg-clip-text text-transparent animate-shimmer">
            RUG OR MOON
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2 font-['Switzer']">
            The Ultimate Web3 Degen Party Game
          </p>
          <p className="text-gray-400 font-['DM_Mono'] text-sm">
            AI generates fake crypto projects. You call it. First to 3 wins. 🎯
          </p>
        </div>

        {/* Setup screen */}
        {!gameState && (
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 font-['Outfit'] text-center">Start Playing</h2>

            <input
              type="text"
              placeholder="Your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl mb-4 font-['Switzer'] focus:outline-none focus:border-[#9B6AF6] transition-colors"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={createGame}
                disabled={loading}
                className="py-3 px-4 bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] rounded-xl font-bold font-['Outfit'] hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
              >
                {loading ? "Creating..." : "👥 Play with Friend"}
              </button>
              <button
                onClick={createSoloGame}
                disabled={loading}
                className="py-3 px-4 bg-gradient-to-r from-[#110FFF] to-[#9B6AF6] rounded-xl font-bold font-['Outfit'] hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
              >
                {loading ? "Creating..." : "🤖 Play vs AI"}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mb-6 font-['Switzer']">
              Challenge a friend or battle AI Degen solo!
            </p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#05050f] text-gray-400 font-['Switzer']">OR JOIN</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Game ID to join..."
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl mb-4 font-['Switzer'] focus:outline-none focus:border-[#9B6AF6] transition-colors"
            />

            <button
              onClick={joinGame}
              disabled={loading}
              className="w-full py-3 px-6 bg-white/10 border border-white/20 rounded-xl font-bold font-['Outfit'] hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Friend's Game"}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-['Switzer']">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Waiting for opponent */}
        {gameState?.status === "waiting" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 shadow-2xl">
              <div className="mb-8">
                <div className="inline-block w-16 h-16 border-4 border-[#9B6AF6] border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-3xl font-bold mb-4 font-['Outfit']">Waiting for Opponent...</h2>
              <p className="text-gray-400 mb-8 font-['Switzer']">Share this Game ID with a friend:</p>
              <div className="inline-block px-8 py-4 bg-gradient-to-r from-[#E37DF7]/20 to-[#9B6AF6]/20 border-2 border-[#9B6AF6] rounded-xl">
                <span className="text-4xl font-bold font-['DM_Mono'] tracking-wider">{gameId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Active game */}
        {gameState?.status === "in_progress" && gameState.current_project && (
          <div className="max-w-4xl mx-auto">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-1 font-['Switzer']">
                  {gameState.mode === "solo" ? "You" : "Player 1"}
                </div>
                <div className="text-2xl font-bold font-['Outfit'] mb-1">{gameState.player1_name}</div>
                <div className="text-3xl font-bold font-['DM_Mono'] bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] bg-clip-text text-transparent">
                  {gameState.player1_score || 0}
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 relative">
                {gameState.mode === "solo" && (
                  <div className="absolute top-3 right-3">
                    <img src="/images/mochi-main.png" alt="AI Degen" className="w-10 h-10 drop-shadow-lg" />
                  </div>
                )}
                <div className="text-sm text-gray-400 mb-1 font-['Switzer']">
                  {gameState.mode === "solo" ? "AI Degen 🤖" : "Player 2"}
                </div>
                <div className="text-2xl font-bold font-['Outfit'] mb-1">{gameState.player2_name}</div>
                <div className="text-3xl font-bold font-['DM_Mono'] bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] bg-clip-text text-transparent">
                  {gameState.player2_score || 0}
                </div>
              </div>
            </div>

            {/* Project card */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-4xl font-bold mb-2 font-['Outfit']">
                    {gameState.current_project.name}
                  </h2>
                  <div className="inline-block px-4 py-1 bg-[#9B6AF6]/20 border border-[#9B6AF6] rounded-full">
                    <span className="text-[#9B6AF6] font-bold font-['DM_Mono']">
                      ${gameState.current_project.ticker}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 font-['Switzer']">Round</div>
                  <div className="text-3xl font-bold font-['DM_Mono']">{gameState.current_round}</div>
                </div>
              </div>

              <p className="text-xl text-gray-300 mb-6 font-['Switzer'] italic">
                "{gameState.current_project.tagline}"
              </p>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-400 mb-3 font-['Outfit'] uppercase tracking-wider">
                  Intelligence Brief
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameState.current_project.flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-3 rounded-lg border ${
                        flag.startsWith("✅")
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <span className="text-sm font-['Switzer']">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="text-xs text-gray-500 mb-2 font-['DM_Mono'] uppercase">From the Whitepaper</div>
                <p className="text-gray-300 font-['Switzer'] italic">
                  "{gameState.current_project.whitepaper_quote}"
                </p>
              </div>
            </div>

            {/* Pick action */}
            {!mySubmitted ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6 font-['Outfit'] text-center">Make Your Call</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPick("RUG")}
                    className={`py-6 rounded-xl font-bold text-2xl font-['Outfit'] transition-all ${
                      pick === "RUG"
                        ? "bg-red-500 border-2 border-red-300 shadow-lg shadow-red-500/50"
                        : "bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30"
                    }`}
                  >
                    🪤 RUG
                  </button>
                  <button
                    onClick={() => setPick("MOON")}
                    className={`py-6 rounded-xl font-bold text-2xl font-['Outfit'] transition-all ${
                      pick === "MOON"
                        ? "bg-yellow-500 border-2 border-yellow-300 shadow-lg shadow-yellow-500/50"
                        : "bg-yellow-500/20 border-2 border-yellow-500/50 hover:bg-yellow-500/30"
                    }`}
                  >
                    🚀 MOON
                  </button>
                </div>

                <textarea
                  placeholder="Why? (1-2 sentences)"
                  value={argument}
                  onChange={(e) => setArgument(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl mb-4 font-['Switzer'] resize-none focus:outline-none focus:border-[#9B6AF6] transition-colors"
                  rows={3}
                  maxLength={200}
                />

                <button
                  onClick={submitPick}
                  disabled={!pick || !argument.trim() || loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] rounded-xl font-bold text-xl font-['Outfit'] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting..." : "Lock It In 🔒"}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-['Switzer']">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
                <div className="mb-6">
                  <div className="inline-block w-16 h-16 border-4 border-[#9B6AF6] border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-2xl font-bold mb-2 font-['Outfit']">
                  {opponentSubmitted ? "AI Oracle Judging..." : "Waiting for opponent..."}
                </h3>
                <p className="text-gray-400 font-['Switzer']">
                  {opponentSubmitted
                    ? "The verdict is being prepared on-chain..."
                    : "Your pick is locked. Waiting for the other player."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {gameState?.status === "finished" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-12 shadow-2xl">
              <h2 className="text-5xl font-bold mb-4 font-['Outfit'] bg-gradient-to-r from-[#E37DF7] via-[#9B6AF6] to-[#110FFF] bg-clip-text text-transparent">
                🎉 GAME OVER 🎉
              </h2>
              <p className="text-3xl font-bold mb-8 font-['Outfit']">{gameState.game_winner} Wins!</p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <div className="text-gray-400 mb-2 font-['Switzer']">{gameState.player1_name}</div>
                  <div className="text-5xl font-bold font-['DM_Mono']">{gameState.player1_score}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-2 font-['Switzer']">{gameState.player2_name}</div>
                  <div className="text-5xl font-bold font-['DM_Mono']">{gameState.player2_score}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setGameState(null);
                  setGameId("");
                  setPlayerName("");
                  setLastSeenRound(0);
                }}
                className="px-8 py-4 bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] rounded-xl font-bold text-xl font-['Outfit'] hover:opacity-90 transition-opacity"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Round result overlay */}
      {showResult && gameState?.last_round_result && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-scale-in relative overflow-hidden">
            <div className="absolute top-4 right-4 animate-float">
              <img
                src={gameState.last_round_result.outcome === "MOON"
                  ? "/images/mochi-stonks-up.png"
                  : "/images/mochi-stonks-down.png"}
                alt="Mochi reaction"
                className="w-20 h-20 drop-shadow-2xl"
              />
            </div>

            <h2 className="text-4xl font-bold mb-4 font-['Outfit']">Round Result</h2>

            <div className={`text-5xl font-bold mb-4 font-['Outfit'] ${
              gameState.last_round_result.outcome === "MOON" ? "text-yellow-400" : "text-red-400"
            }`}>
              {gameState.last_round_result.outcome === "MOON" ? "🚀 TO THE MOON!" : "🪤 IT'S A RUG!"}
            </div>

            <div className="bg-black/40 rounded-xl p-4 mb-4">
              <p className="text-gray-300 font-['Switzer'] leading-relaxed text-sm">
                {gameState.last_round_result.explanation}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1 font-['Switzer']">{gameState.player1_name}</div>
                <div className={`text-xl font-bold font-['Outfit'] mb-1 ${
                  gameState.last_round_result.player1_pick === "MOON" ? "text-yellow-400" : "text-red-400"
                }`}>
                  {gameState.last_round_result.player1_pick === "MOON" ? "🚀 MOON" : "🪤 RUG"}
                </div>
                <div className="text-xs text-gray-400 font-['Switzer'] italic">
                  "{gameState.last_round_result.player1_arg}"
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1 font-['Switzer']">{gameState.player2_name}</div>
                <div className={`text-xl font-bold font-['Outfit'] mb-1 ${
                  gameState.last_round_result.player2_pick === "MOON" ? "text-yellow-400" : "text-red-400"
                }`}>
                  {gameState.last_round_result.player2_pick === "MOON" ? "🚀 MOON" : "🪤 RUG"}
                </div>
                <div className="text-xs text-gray-400 font-['Switzer'] italic">
                  "{gameState.last_round_result.player2_arg}"
                </div>
              </div>
            </div>

            <div className="text-lg font-bold mb-2 font-['Outfit']">
              Round Winner: <span className="text-[#9B6AF6]">{gameState.last_round_result.winner}</span>
            </div>
            <div className="text-sm text-gray-400 font-['Switzer'] mb-6 italic">
              {gameState.last_round_result.reasoning}
            </div>

            <button
              onClick={() => setShowResult(false)}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#E37DF7] to-[#9B6AF6] rounded-xl font-bold text-xl font-['Outfit'] hover:opacity-90 transition-opacity"
            >
              Next Round →
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 mt-20 pb-8 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-gray-400 text-sm font-['Switzer']">Mascot by kellyboom888 •</span>
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer"
              className="text-[#9B6AF6] hover:text-[#E37DF7] transition-colors text-sm font-['Switzer']">
              GenLayer Playverse Challenge
            </a>
          </div>
          <p className="text-gray-500 text-xs font-['DM_Mono']">
            Built with AI Consensus • Trust Infrastructure for The AI Age
          </p>
        </div>
      </footer>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shimmer { background-size: 200% 200%; animation: shimmer 3s linear infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
