# v0.1.0
# { "Depends": "py-genlayer:test" }

import genlayer.gl as gl
from genlayer import TreeMap, u256
import json

WINS_NEEDED = 3


class RugOrMoon(gl.Contract):

    game_count: u256
    games: TreeMap[u256, str]

    def __init__(self):
        self.game_count = u256(0)

    def _gen_project(self, prev_name: str) -> dict:
        def generate():
            return gl.nondet.exec_prompt(
                "You are the Oracle of Degen Finance. Generate a fake crypto project for RUG OR MOON party game. "
                "Return ONLY this exact JSON and nothing else: "
                '{"name": "ProjectName", "ticker": "TICK", "tagline": "one sentence tagline", '
                '"flags": ["✅ green flag 1", "🚩 red flag 1", "✅ green flag 2", "🚩 red flag 2"], '
                '"whitepaper_quote": "one sentence from fake whitepaper"} '
                f"Previous project was: {prev_name}. Make this one different and more absurd. "
                "Mix exactly 2 green flags (✅) and 2 red flags (🚩). No extra text outside the JSON."
            ).replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="Generate fake crypto project",
            criteria="Valid JSON with name, ticker, tagline, 4 flags, whitepaper_quote"
        )
        try:
            return json.loads(result)
        except Exception:
            return {
                "name": "MoonDoge Inu Classic",
                "ticker": "MDIC",
                "tagline": "The last dog-themed coin you will ever need, probably",
                "flags": ["✅ Anonymous team with vibes", "🚩 Whitepaper is just a JPEG", "✅ Elon once liked a tweet about dogs", "🚩 Liquidity locked for 24 hours"],
                "whitepaper_quote": "We envision a world where every transaction is blessed by the spirit of Doge"
            }

    def _gen_ai_pick(self, project: dict) -> dict:
        def generate():
            return gl.nondet.exec_prompt(
                f"You are AI Degen, a degenerate crypto trader. Decide if this project is a RUG or MOON. "
                f"Project: {project['name']} (${project['ticker']}) — {project['tagline']} "
                f"Flags: {', '.join(project['flags'])} "
                f"Whitepaper: {project['whitepaper_quote']} "
                "Return ONLY this JSON: "
                '{"pick": "RUG or MOON", "argument": "1-2 sentence reasoning"} '
                "No extra text outside the JSON."
            ).replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="AI Degen makes pick",
            criteria="JSON with pick being RUG or MOON and a short argument"
        )
        try:
            data = json.loads(result)
            if data.get("pick") not in ["RUG", "MOON"]:
                data["pick"] = "RUG"
            return data
        except Exception:
            return {"pick": "RUG", "argument": "My gut says rug. Always trust the gut."}

    def _get_outcome(self, project_name: str) -> dict:
        def generate():
            return gl.nondet.exec_prompt(
                f"You are the Oracle of Degen Finance. Decide the fate of crypto project '{project_name}'. "
                f"Is it a RUG (scam, crashes to zero) or a MOON (pumps massively)? "
                f"Return ONLY this exact JSON: "
                f'{{\"outcome\": \"RUG or MOON\", \"explanation\": \"2-3 dramatic sentences explaining why\"}}'
            ).replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="Determine RUG or MOON outcome",
            criteria="JSON with outcome being exactly RUG or MOON and dramatic explanation"
        )
        try:
            data = json.loads(result)
            if data.get("outcome") not in ["RUG", "MOON"]:
                data["outcome"] = "RUG"
            return data
        except Exception:
            return {"outcome": "RUG", "explanation": "The Oracle's crystal ball shattered. Definitely a rug."}

    def _judge(self, project_name: str, outcome: str, p1: str, p1_pick: str, p1_arg: str, p2: str, p2_pick: str, p2_arg: str) -> dict:
        def generate():
            return gl.nondet.exec_prompt(
                f"Two players debated if crypto project '{project_name}' was a RUG or MOON. "
                f"The actual outcome was: {outcome}. "
                f"{p1} picked {p1_pick} and argued: {p1_arg} "
                f"{p2} picked {p2_pick} and argued: {p2_arg} "
                f"Award the point to whoever got the outcome correct AND had the more convincing argument. "
                f"If both correct or both wrong, pick the better argument. "
                f"Return ONLY this exact JSON: "
                f'{{\"winner\": \"{p1} or {p2}\", \"reasoning\": \"1-2 sentences explaining why\"}} '
                f"Replace with exactly {p1} or exactly {p2}. No other text."
            ).replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="Judge round winner",
            criteria=f"JSON with winner being exactly '{p1}' or '{p2}' and short reasoning"
        )
        try:
            data = json.loads(result)
            winner = str(data.get("winner", "")).strip()
            if winner not in [p1, p2]:
                if p1.lower() in winner.lower():
                    winner = p1
                elif p2.lower() in winner.lower():
                    winner = p2
                else:
                    winner = p1
            data["winner"] = winner
            return data
        except Exception:
            return {"winner": p1, "reasoning": "The Oracle malfunctioned. Point by cosmic coin flip."}

    @gl.public.write
    def create_game(self, player_name: str) -> None:
        """Create a multiplayer game — NO AI calls here, just saves state."""
        game_id = int(self.game_count) + 1
        self.game_count = u256(game_id)

        state = {
            "game_id": game_id,
            "mode": "multiplayer",
            "status": "waiting",
            "player1_name": player_name,
            "player1_score": 0,
            "player1_pick": None,
            "player1_arg": None,
            "player1_submitted": False,
            "player2_name": None,
            "player2_score": 0,
            "player2_pick": None,
            "player2_arg": None,
            "player2_submitted": False,
            "current_round": 1,
            "current_project": None,
            "last_round_result": None,
            "game_winner": None,
            "history": []
        }
        self.games[u256(game_id)] = json.dumps(state)

    @gl.public.write
    def create_solo_game(self, player_name: str) -> None:
        """Create a solo game vs AI Degen — NO AI calls here, just saves state."""
        game_id = int(self.game_count) + 1
        self.game_count = u256(game_id)

        state = {
            "game_id": game_id,
            "mode": "solo",
            "status": "waiting_project",
            "player1_name": player_name,
            "player1_score": 0,
            "player1_pick": None,
            "player1_arg": None,
            "player1_submitted": False,
            "player2_name": "AI Degen",
            "player2_score": 0,
            "player2_pick": None,
            "player2_arg": None,
            "player2_submitted": False,
            "current_round": 1,
            "current_project": None,
            "last_round_result": None,
            "game_winner": None,
            "history": []
        }
        self.games[u256(game_id)] = json.dumps(state)

    @gl.public.write
    def join_game(self, game_id: int, player_name: str) -> None:
        """Join multiplayer game — AI generates first project here."""
        key = u256(game_id)
        if key not in self.games:
            return
        state = json.loads(self.games[key])

        if state["status"] != "waiting":
            return
        if state["player2_name"] is not None:
            return
        if state["player1_name"] == player_name:
            return

        # AI generates first project when second player joins
        state["player2_name"] = player_name
        state["current_project"] = self._gen_project("none")
        state["status"] = "in_progress"
        self.games[key] = json.dumps(state)

    @gl.public.write
    def start_solo(self, game_id: int) -> None:
        """Start a solo game — AI generates first project here."""
        key = u256(game_id)
        if key not in self.games:
            return
        state = json.loads(self.games[key])

        if state["status"] != "waiting_project":
            return
        if state["mode"] != "solo":
            return

        state["current_project"] = self._gen_project("none")
        state["status"] = "in_progress"
        self.games[key] = json.dumps(state)

    @gl.public.write
    def submit_pick(self, game_id: int, player_name: str, pick: str, argument: str) -> None:
        """Submit RUG or MOON pick with argument."""
        key = u256(game_id)
        if key not in self.games:
            return
        state = json.loads(self.games[key])

        if state["status"] != "in_progress":
            return
        if pick not in ["RUG", "MOON"]:
            return

        is_player1 = state["player1_name"] == player_name
        is_player2 = state["player2_name"] == player_name

        if not is_player1 and not is_player2:
            return

        if is_player1 and not state["player1_submitted"]:
            state["player1_pick"] = pick
            state["player1_arg"] = argument
            state["player1_submitted"] = True

        if is_player2 and not state["player2_submitted"]:
            state["player2_pick"] = pick
            state["player2_arg"] = argument
            state["player2_submitted"] = True

        # Solo mode — auto generate AI Degen pick after player submits
        if state["mode"] == "solo" and is_player1 and not state["player2_submitted"]:
            ai = self._gen_ai_pick(state["current_project"])
            state["player2_pick"] = ai["pick"]
            state["player2_arg"] = ai["argument"]
            state["player2_submitted"] = True

        # Both submitted — judge the round
        if state["player1_submitted"] and state["player2_submitted"]:
            p1 = state["player1_name"]
            p2 = state["player2_name"]
            project_name = state["current_project"]["name"]

            outcome_data = self._get_outcome(project_name)
            outcome = outcome_data["outcome"]
            explanation = outcome_data["explanation"]

            judge_data = self._judge(
                project_name, outcome,
                p1, state["player1_pick"], state["player1_arg"],
                p2, state["player2_pick"], state["player2_arg"]
            )
            winner = judge_data["winner"]
            reasoning = judge_data["reasoning"]

            state["last_round_result"] = {
                "outcome": outcome,
                "explanation": explanation,
                "winner": winner,
                "reasoning": reasoning,
                "player1_pick": state["player1_pick"],
                "player2_pick": state["player2_pick"],
                "player1_arg": state["player1_arg"],
                "player2_arg": state["player2_arg"]
            }
            state["history"].append(state["last_round_result"])

            if winner == p1:
                state["player1_score"] += 1
            else:
                state["player2_score"] += 1

            if state["player1_score"] >= WINS_NEEDED or state["player2_score"] >= WINS_NEEDED:
                state["status"] = "finished"
                state["game_winner"] = p1 if state["player1_score"] >= WINS_NEEDED else p2
            else:
                state["current_round"] += 1
                state["current_project"] = self._gen_project(project_name)
                state["player1_submitted"] = False
                state["player2_submitted"] = False
                state["player1_pick"] = None
                state["player1_arg"] = None
                state["player2_pick"] = None
                state["player2_arg"] = None

        self.games[key] = json.dumps(state)

    @gl.public.view
    def get_game(self, game_id: int) -> str:
        key = u256(game_id)
        if key in self.games:
            return self.games[key]
        return ""

    @gl.public.view
    def get_game_count(self) -> int:
        return int(self.game_count)
