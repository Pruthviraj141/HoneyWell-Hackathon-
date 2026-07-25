# pyrefly: ignore [missing-import]
import pandas as pd
import ast


def engineer_row_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardizes feature engineering for row-level access events.
    Safe to use on both batch DataFrames and single-row dictionaries (converted to df).
    Does NOT use the 'label' column.
    """
    df = df.copy()

    # 1. Parse timestamps
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"] = df["timestamp"].dt.hour
    df["dayofweek"] = df["timestamp"].dt.dayofweek
    df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)

    # 2. Parse command_sequence (handling stringified lists from CSV)
    def parse_sequence(seq):
        if isinstance(seq, str):
            try:
                # Safely evaluate string representation of a list
                seq = ast.literal_eval(seq)
            except (ValueError, SyntaxError):
                seq = []
        if isinstance(seq, list):
            return len(seq)
        return 0

    if "command_sequence" in df.columns:
        df["command_len"] = df["command_sequence"].apply(parse_sequence)
    else:
        df["command_len"] = 0

    # 3. Simple risk scores based on resources and auth methods
    high_risk_resources = [
        "Production Server",
        "Database Export",
        "Admin Panel",
        "Server Console",
    ]
    df["resource_risk_score"] = df["resource_accessed"].apply(
        lambda x: 1.0 if x in high_risk_resources else 0.0
    )

    # We map auth methods to some arbitrary risk value where password is high, cert/biometric is lower
    auth_risk_map = {
        "password": 0.8,
        "token": 0.5,
        "certificate": 0.2,
        "biometric": 0.1,
    }
    if "auth_method" in df.columns:
        df["auth_risk_score"] = df["auth_method"].map(auth_risk_map).fillna(0.5)
    else:
        df["auth_risk_score"] = 0.5

    return df
