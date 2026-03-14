# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import genlayer.gl as gl
from genlayer import TreeMap, u256
import json

WINS_NEEDED = 3


class RugOrMoon(gl.Contract):

    game_count: u256
    games: TreeMap[u256, str]

    def __init__(self):
        self.game_count = u256(0)

    @gl.public.write
    def create_game(self, player_name: str) -> None:
        game_id = int(self.game_count) + 1
        self.game_count = u256(game_id)

        def generate_project():
            return gl.nondet.exec_prompt(
                "You are the Oracle of Degen Finance — the most unhinged crypto analyst in the multiverse. "
                "Generate a fake crypto project for a party game called RUG OR MOON. "
                "Return ONLY this exact JSON and nothing else: "
                '{"name": "ProjectName", "ticker": "TICK", "tagline": "one sentence tagline", '
                '"flags": ["✅ green flag 1", "🚩 red flag 1", "✅ green flag 2", "🚩 red flag 2"], '
                '"whitepaper_quote": "one sentence from fake whitepaper"} '
                "Make it absurd and funny. Mix exactly 2 green flags (✅) and 2 red flags (🚩). "
                "Make it genuinely hard to tell if it is a rug or moon. No extra text outside the JSON."
            ).replace("```json", "").replace("```", "").strip()

        project_str = gl.eq_principle.prompt_non_comparative(
            generate_project,
            task="Generate a fake absurd crypto project for the game",
            criteria="Valid JSON with name, ticker, tagline, 4 flags (2 green 2 red), and whitepaper_quote"
        )

        try:
            project_data = json.loads(project_str)
        except Exception:
            project_data = {
                "name": "MoonDoge Inu Classic",
                "ticker": "MDIC",
                "tagline": "The last dog-themed coin you will ever need, probably",
                "flags": ["✅ Anonymous team with vibes", "🚩 Whitepaper is just a JPEG", "✅ Elon once liked a tweet about dogs", "🚩 Liquidity locked for 24 hours"],
                "whitepaper_quote": "We envision a world where every transaction is blessed by the spirit of Doge"
            }

        state = {
            "game_id": game_id,
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
            "current_project": project_data,
            "last_round_result": None,
            "game_winner": None,
            "history": []
        }
        self.games[u256(game_id)] = json.dumps(state)

    @gl.public.write
    def join_game(self, game_id: int, player_name: str) -> None:
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

        state["player2_name"] = player_name
        state["status"] = "in_progress"
        self.games[key] = json.dumps(state)

    @gl.public.write
    def submit_pick(self, game_id: int, player_name: str, pick: str, argument: str) -> None:
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

        if state["player1_submitted"] and state["player2_submitted"]:
            p1 = state["player1_name"]
            p2 = state["player2_name"]
            p1_pick = state["player1_pick"]
            p2_pick = state["player2_pick"]
            p1_arg = state["player1_arg"]
            p2_arg = state["player2_arg"]
            project = state["current_project"]
            project_name = project["name"]

            def generate_outcome():
                return gl.nondet.exec_prompt(
                    f"You are the Oracle of Degen Finance. Decide the fate of crypto project '{project_name}'. "
                    f"Is it a RUG (scam, crashes to zero) or a MOON (pumps massively)? "
                    f"Be dramatic. Return ONLY this exact JSON and nothing else: "
                    f'{{\"outcome\": \"RUG or MOON\", \"explanation\": \"2-3 dramatic sentences explaining why\"}}'
                ).replace("```json", "").replace("```", "").strip()

            outcome_str = gl.eq_principle.prompt_non_comparative(
                generate_outcome,
                task="Determine if the crypto project is a RUG or MOON",
                criteria="JSON with outcome being exactly RUG or MOON and a dramatic explanation"
            )

            try:
                outcome_data = json.loads(outcome_str)
                outcome = outcome_data.get("outcome", "RUG")
                explanation = outcome_data.get("explanation", "The Oracle has spoken.")
                if outcome not in ["RUG", "MOON"]:
                    outcome = "RUG"
            except Exception:
                outcome = "RUG"
                explanation = "The Oracle's crystal ball shattered. It was definitely a rug."

            def judge_round():
                return gl.nondet.exec_prompt(
                    f"Two players debated if crypto project '{project_name}' was a RUG or MOON. "
                    f"The actual outcome was: {outcome}. "
                    f"{p1} picked {p1_pick} and argued: {p1_arg} "
                    f"{p2} picked {p2_pick} and argued: {p2_arg} "
                    f"Award the point to whoever got the outcome correct AND had the more convincing argument. "
                    f"If both correct or both wrong, pick the better argument. "
                    f"Return ONLY this exact JSON and nothing else: "
                    f'{{\"winner\": \"NAME\", \"reasoning\": \"1-2 sentences explaining why they won\"}} '
                    f"Replace NAME with exactly {p1} or exactly {p2}. No other text outside the JSON."
                ).replace("```json", "").replace("```", "").strip()

            judgment_str = gl.eq_principle.prompt_non_comparative(
                judge_round,
                task="Judge which player wins the round based on correct pick and argument quality",
                criteria=f"JSON with winner being exactly '{p1}' or '{p2}' and reasoning under 50 words"
            )

            try:
                judgment = json.loads(judgment_str)
                winner = str(judgment.get("winner", "")).strip()
                reasoning = str(judgment.get("reasoning", "The Oracle has decided."))
                if winner not in [p1, p2]:
                    if p1.lower() in winner.lower():
                        winner = p1
                    elif p2.lower() in winner.lower():
                        winner = p2
                    else:
                        winner = p1
            except Exception:
                winner = p1
                reasoning = "The Oracle malfunctioned. Point awarded by cosmic coin flip."

            state["last_round_result"] = {
                "outcome": outcome,
                "explanation": explanation,
                "winner": winner,
                "reasoning": reasoning,
                "player1_pick": p1_pick,
                "player2_pick": p2_pick
            }

            state["history"].append(state["last_round_result"])

            if winner == p1:
                state["player1_score"] += 1
            else:
                state["player2_score"] += 1

            if state["player1_score"] >= WINS_NEEDED or state["player2_score"] >= WINS_NEEDED:
                state["status"] = "finished"
                state["game_winner"] = (
                    p1 if state["player1_score"] >= WINS_NEEDED else p2
                )
            else:
                next_round = state["current_round"] + 1

                def generate_next_project():
                    return gl.nondet.exec_prompt(
                        f"Generate a NEW fake crypto project for round {next_round} of RUG OR MOON. "
                        f"The previous project was {project_name}. Make this one completely different and even more absurd. "
                        f"Return ONLY this exact JSON and nothing else: "
                        f'{{\"name\": \"ProjectName\", \"ticker\": \"TICK\", \"tagline\": \"one sentence tagline\", '
                        f'\"flags\": [\"✅ green flag 1\", \"🚩 red flag 1\", \"✅ green flag 2\", \"🚩 red flag 2\"], '
                        f'\"whitepaper_quote\": \"one sentence from fake whitepaper\"}} '
                        f"No extra text outside the JSON."
                    ).replace("```json", "").replace("```", "").strip()

                next_project_str = gl.eq_principle.prompt_non_comparative(
                    generate_next_project,
                    task="Generate a new fake crypto project different from the previous one",
                    criteria="Valid JSON with name, ticker, tagline, 4 flags (2 green 2 red), and whitepaper_quote"
                )

                try:
                    state["current_project"] = json.loads(next_project_str)
                except Exception:
                    state["current_project"] = {
                        "name": "SafeRocket Finance",
                        "ticker": "SRKT",
                        "tagline": "100% safe, 1000% rocket, 0% explanation",
                        "flags": ["✅ Team fully doxxed (first names only)", "🚩 Contract has a special admin function", "✅ Listed on 4 exchanges (all unnamed)", "🚩 Telegram has 50k members, all joined today"],
                        "whitepaper_quote": "Safety is our rocket fuel and rockets are our safety net"
                    }

                state["current_round"] = next_round
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
