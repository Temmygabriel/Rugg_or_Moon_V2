import genlayer.gl as gl
from genlayer import TreeMap, u256
import json
import random


class RugOrMoon:
    game_count: u256
    games: TreeMap[u256, str]

    def __init__(self):
        self.game_count = u256(0)
        self.games = TreeMap[u256, str]()

    def _generate_project(self) -> str:
        """Generate a fake crypto project with AI"""
        def generate():
            prompt = """Generate a fake crypto project as JSON with this EXACT structure (no extra text):
{
  "name": "ProjectName",
  "ticker": "TICK",
  "tagline": "One sentence tagline",
  "flags": ["✅ green flag 1", "🚩 red flag 1", "✅ green flag 2", "🚩 red flag 2"],
  "whitepaper_quote": "One sentence from fake whitepaper"
}

Make it absurd and funny. Mix 2 green flags (✅) with 2 red flags (🚩). Make it hard to tell if it's a rug or moon."""
            return gl.nondet.exec_prompt(prompt)
        
        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="generate fake crypto project",
            criteria="must be valid JSON"
        )
        return result

    def _generate_outcome(self, project_name: str) -> str:
        """Determine if project is RUG or MOON"""
        def generate():
            prompt = f"""For the crypto project "{project_name}", decide if it's a RUG or MOON.
Return JSON (no extra text):
{{
  "outcome": "RUG or MOON",
  "explanation": "2-3 sentences explaining why"
}}"""
            return gl.nondet.exec_prompt(prompt)
        
        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="determine outcome",
            criteria="must be valid JSON"
        )
        return result

    def _generate_ai_pick(self, project_data: dict) -> dict:
        """Generate AI opponent's pick and argument"""
        def generate():
            prompt = f"""You're playing a game where you guess if crypto projects are rugs or moons.

Project: {project_data['name']} (${project_data['ticker']})
Tagline: {project_data['tagline']}
Flags: {', '.join(project_data['flags'])}
Whitepaper: {project_data['whitepaper_quote']}

Make your pick. Return JSON (no extra text):
{{
  "pick": "RUG or MOON",
  "argument": "1-2 sentences explaining your reasoning"
}}"""
            return gl.nondet.exec_prompt(prompt)
        
        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="generate AI pick",
            criteria="must be valid JSON"
        )
        return json.loads(result)

    def _judge_round(
        self,
        project_name: str,
        outcome: str,
        player1_pick: str,
        player1_arg: str,
        player2_pick: str,
        player2_arg: str,
        player1_name: str,
        player2_name: str
    ) -> str:
        """Judge which player wins based on correctness and argument quality"""
        def generate():
            prompt = f"""Two players are debating if crypto project "{project_name}" is a RUG or MOON.

ACTUAL OUTCOME: {outcome}

{player1_name}'s pick: {player1_pick}
{player1_name}'s argument: {player1_arg}

{player2_name}'s pick: {player2_pick}
{player2_name}'s argument: {player2_arg}

Award the point to whoever:
1. Got the outcome correct (RUG or MOON)
2. Had the most convincing argument

If both correct or both wrong, pick the better argument. Return JSON (no extra text):
{{
  "winner": "{player1_name} or {player2_name}",
  "reasoning": "1-2 sentences explaining why they won"
}}"""
            return gl.nondet.exec_prompt(prompt)
        
        result = gl.eq_principle.prompt_non_comparative(
            generate,
            task="judge round winner",
            criteria="must be valid JSON"
        )
        return result

    def create_game(self, player_name: str, single_player: bool = False) -> str:
        """Create a new game. If single_player=True, AI opponent auto-joins."""
        self.game_count = u256(int(self.game_count) + 1)
        game_id = self.game_count

        project_json = self._generate_project()
        project_data = json.loads(project_json)

        game_state = {
            "status": "waiting" if not single_player else "in_progress",
            "single_player": single_player,
            "player1_name": player_name,
            "player1_score": 0,
            "player1_pick": None,
            "player1_arg": None,
            "player1_submitted": False,
            "player2_name": "AI Degen" if single_player else None,
            "player2_score": 0,
            "player2_pick": None,
            "player2_arg": None,
            "player2_submitted": False,
            "current_round": 1 if single_player else 0,
            "current_project": project_data if single_player else None,
            "last_round_result": None,
            "winner": None
        }

        self.games[game_id] = json.dumps(game_state)
        return json.dumps({"game_id": int(game_id), "status": "created"})

    def join_game(self, game_id: int, player_name: str) -> None:
        """Join an existing game as player 2"""
        if u256(game_id) not in self.games:
            raise Exception("Game not found")

        game_state = json.loads(self.games[u256(game_id)])

        if game_state["status"] != "waiting":
            raise Exception("Game not available")

        if game_state.get("single_player"):
            raise Exception("Cannot join single player game")

        project_json = self._generate_project()
        project_data = json.loads(project_json)

        game_state["player2_name"] = player_name
        game_state["status"] = "in_progress"
        game_state["current_round"] = 1
        game_state["current_project"] = project_data

        self.games[u256(game_id)] = json.dumps(game_state)

    def submit_pick(self, game_id: int, player_name: str, pick: str, argument: str) -> None:
        """Submit your RUG or MOON pick with reasoning"""
        if u256(game_id) not in self.games:
            raise Exception("Game not found")

        if pick not in ["RUG", "MOON"]:
            raise Exception("Pick must be 'RUG' or 'MOON'")

        game_state = json.loads(self.games[u256(game_id)])

        if game_state["status"] != "in_progress":
            raise Exception("Game not in progress")

        is_player1 = game_state["player1_name"] == player_name
        is_player2 = game_state["player2_name"] == player_name

        if not is_player1 and not is_player2:
            raise Exception("You're not in this game")

        # Store player's pick
        if is_player1:
            game_state["player1_pick"] = pick
            game_state["player1_arg"] = argument
            game_state["player1_submitted"] = True
        else:
            game_state["player2_pick"] = pick
            game_state["player2_arg"] = argument
            game_state["player2_submitted"] = True

        # If single player, auto-generate AI opponent's pick
        if game_state.get("single_player") and is_player1 and not game_state["player2_submitted"]:
            ai_response = self._generate_ai_pick(game_state["current_project"])
            game_state["player2_pick"] = ai_response["pick"]
            game_state["player2_arg"] = ai_response["argument"]
            game_state["player2_submitted"] = True

        # If both submitted, judge the round
        if game_state["player1_submitted"] and game_state["player2_submitted"]:
            # Get the actual outcome
            outcome_json = self._generate_outcome(game_state["current_project"]["name"])
            outcome_data = json.loads(outcome_json)

            # Judge who wins
            judge_json = self._judge_round(
                game_state["current_project"]["name"],
                outcome_data["outcome"],
                game_state["player1_pick"],
                game_state["player1_arg"],
                game_state["player2_pick"],
                game_state["player2_arg"],
                game_state["player1_name"],
                game_state["player2_name"]
            )
            judge_data = json.loads(judge_json)

            # Award point
            if judge_data["winner"] == game_state["player1_name"]:
                game_state["player1_score"] += 1
            else:
                game_state["player2_score"] += 1

            # Store round result
            game_state["last_round_result"] = {
                "outcome": outcome_data["outcome"],
                "explanation": outcome_data["explanation"],
                "winner": judge_data["winner"],
                "reasoning": judge_data["reasoning"],
                "player1_pick": game_state["player1_pick"],
                "player2_pick": game_state["player2_pick"]
            }

            # Check if game over
            if game_state["player1_score"] >= 3 or game_state["player2_score"] >= 3:
                game_state["status"] = "finished"
                game_state["winner"] = (
                    game_state["player1_name"]
                    if game_state["player1_score"] >= 3
                    else game_state["player2_name"]
                )
            else:
                # Next round
                game_state["current_round"] += 1
                project_json = self._generate_project()
                game_state["current_project"] = json.loads(project_json)
                game_state["player1_submitted"] = False
                game_state["player2_submitted"] = False
                game_state["player1_pick"] = None
                game_state["player1_arg"] = None
                game_state["player2_pick"] = None
                game_state["player2_arg"] = None

        self.games[u256(game_id)] = json.dumps(game_state)

    def get_game(self, game_id: int) -> str:
        """Get current game state"""
        if u256(game_id) not in self.games:
            raise Exception("Game not found")
        return self.games[u256(game_id)]

    def get_game_count(self) -> int:
        """Get total number of games created"""
        return int(self.game_count)
