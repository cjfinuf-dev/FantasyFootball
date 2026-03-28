"""Scoring calculation engine.

Calculates fantasy points from raw stat JSONB based on league scoring rules.
"""

# Default scoring weights per format
SCORING_PRESETS: dict[str, dict[str, float]] = {
    "ppr": {
        "pass_yd": 0.04, "pass_td": 4, "pass_int": -2,
        "rush_yd": 0.1, "rush_td": 6,
        "rec": 1, "rec_yd": 0.1, "rec_td": 6,
        "fum_lost": -2,
    },
    "half_ppr": {
        "pass_yd": 0.04, "pass_td": 4, "pass_int": -2,
        "rush_yd": 0.1, "rush_td": 6,
        "rec": 0.5, "rec_yd": 0.1, "rec_td": 6,
        "fum_lost": -2,
    },
    "standard": {
        "pass_yd": 0.04, "pass_td": 4, "pass_int": -2,
        "rush_yd": 0.1, "rush_td": 6,
        "rec": 0, "rec_yd": 0.1, "rec_td": 6,
        "fum_lost": -2,
    },
}


def calculate_points(stats: dict, scoring_type: str, custom_weights: dict | None = None) -> float:
    weights = custom_weights or SCORING_PRESETS.get(scoring_type, SCORING_PRESETS["ppr"])
    return sum(stats.get(stat, 0) * weight for stat, weight in weights.items())
