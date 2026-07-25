# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from faker import Faker
import random
import datetime

np.random.seed(42)
random.seed(42)
fake = Faker()
Faker.seed(42)

RESOURCES_BY_DEPT = {
    "hr": ["Email", "HR Portal", "Payroll"],
    "finance": ["Email", "ERP", "Payroll", "Reports"],
    "engineering": ["Git", "Jenkins", "Repo", "Production Server"],
    "sales": ["CRM", "Email", "Dashboard"],
    "it": ["Admin Panel", "Logs", "VPN", "Server Console"],
}

DEVICE_BROWSER_PAIRS = [
    ("Windows", "Chrome"),
    ("Windows", "Edge"),
    ("Ubuntu", "Chrome"),
    ("MacOS", "Safari"),
    ("Linux", "Firefox"),
]

CITIES = [
    "Pune",
    "Mumbai",
    "Delhi",
    "Bengaluru",
    "Chennai",
    "Hyderabad",
    "Kolkata",
    "Ahmedabad",
]


def generate_mac():
    return fake.mac_address()[:8]


def get_city_index(city):
    if city in CITIES:
        return CITIES.index(city)
    return 0


def geo_distance(city_a, city_b):
    if city_a == city_b:
        return 0.0
    idx_a = get_city_index(city_a)
    idx_b = get_city_index(city_b)
    return float(abs(idx_a - idx_b) * 520 + random.randint(30, 180))


def _make_entity_profiles(num_entities):
    profiles = []

    # Pre-generate some IPs and MACs to share
    departments = ["hr", "finance", "engineering", "sales", "it"]
    dept_shared_ips = {d: [fake.ipv4() for _ in range(5)] for d in departments}
    dept_shared_macs = {d: [generate_mac() for _ in range(5)] for d in departments}

    entities_by_dept = {d: [] for d in departments}

    for i in range(1, num_entities + 1):
        entity_id = f"user_{i:03d}"

        type_rand = random.random()
        if type_rand < 0.78:
            entity_type = "user"
        elif type_rand < 0.90:
            entity_type = "service_account"
        else:
            entity_type = "edge_device"

        dept = random.choice(departments)
        city = random.choice(CITIES)
        os, browser = random.choice(DEVICE_BROWSER_PAIRS)

        resources_pool = RESOURCES_BY_DEPT[dept]
        if len(resources_pool) <= 3:
            common_resources = resources_pool.copy()
        else:
            common_resources = random.sample(resources_pool, 3)

        profile = {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "department": dept,
            "home_city": city,
            "home_country": "India",
            "preferred_device_os": os,
            "preferred_browser": browser,
            "login_hour_mean": random.randint(8, 11),
            "login_hour_std": random.choice([1, 1, 2]),
            "common_resources": common_resources,
            "auth_method": random.choice(
                ["password", "token", "certificate", "biometric"]
            ),
            "shared_ip": None,
            "shared_device": None,  # Use MAC prefix
            "own_ip": fake.ipv4(),
            "own_mac": generate_mac(),
        }
        profiles.append(profile)
        entities_by_dept[dept].append(profile)

    # Inject shared infrastructure (approx 5% of pairs within dept)
    for dept, ents in entities_by_dept.items():
        if len(ents) >= 2:
            num_pairs = max(1, int(len(ents) * 0.05))
            for _ in range(num_pairs):
                # Pick two distinct entities
                e1, e2 = random.sample(ents, 2)
                # Share IP or MAC
                if random.random() < 0.5:
                    shared_val = random.choice(dept_shared_ips[dept])
                    e1["shared_ip"] = shared_val
                    e2["shared_ip"] = shared_val
                else:
                    shared_val = random.choice(dept_shared_macs[dept])
                    e1["shared_device"] = shared_val
                    e2["shared_device"] = shared_val

    return profiles


def generate_normal_event(profile, timestamp):
    # Determine IP and MAC (with 40% chance of using shared infra if present)
    use_shared_ip = profile["shared_ip"] is not None and random.random() < 0.4
    source_ip = profile["shared_ip"] if use_shared_ip else profile["own_ip"]

    use_shared_mac = profile["shared_device"] is not None and random.random() < 0.4
    mac_prefix = profile["shared_device"] if use_shared_mac else profile["own_mac"]

    event = {
        "entity_id": profile["entity_id"],
        "entity_type": profile["entity_type"],
        "department": profile["department"],
        "timestamp": timestamp.isoformat() + "Z",
        "source_ip": source_ip,
        "geo_location": profile["home_city"],
        "country": profile["home_country"],
        "resource_accessed": random.choice(profile["common_resources"]),
        "auth_method": profile["auth_method"],
        "session_duration": random.uniform(5, 120),
        "command_sequence": (
            ["login", "read", "logout"]
            if profile["entity_type"] == "user"
            else ["auth", "fetch"]
        ),
        "device_os": profile["preferred_device_os"],
        "browser": profile["preferred_browser"],
        "mac_prefix": mac_prefix,
        "failed_attempts_10m": random.choice([0, 0, 0, 1]),
        "geo_distance_km": 0.0,
        "is_new_device": 0,
        "is_new_country": 0,
        "is_night_hour": 1 if timestamp.hour >= 18 or timestamp.hour < 6 else 0,
        "unique_resource_count_24h": random.randint(1, 3),
        "label": "normal",
    }
    return event


def inject_attack(normal_event, profile, attack_type):
    event = normal_event.copy()
    event["label"] = attack_type

    if attack_type == "brute_force":
        event["failed_attempts_10m"] = random.randint(8, 30)
        event["session_duration"] = random.uniform(0.2, 1.0)
        event["resource_accessed"] = random.choice(
            ["Login Portal", "VPN", "Admin Panel"]
        )
        event["command_sequence"] = ["login", "fail", "fail", "fail"]

    elif attack_type == "credential_stuffing":
        event["failed_attempts_10m"] = random.randint(3, 10)
        event["source_ip"] = fake.ipv4()
        event["resource_accessed"] = random.choice(["Login Portal", "Email", "CRM"])
        event["is_new_country"] = 1

    elif attack_type == "impossible_travel":
        city_b = random.choice([c for c in CITIES if c != profile["home_city"]])
        event["geo_location"] = city_b
        # Assuming country doesn't actually change if both are in CITIES which are all in India,
        # but requirements say set country accordingly and is_new_country=1
        event["country"] = "Unknown"
        event["geo_distance_km"] = geo_distance(profile["home_city"], city_b)
        event["is_new_country"] = 1
        event["is_new_device"] = 1
        new_os, new_browser = random.choice(
            [
                p
                for p in DEVICE_BROWSER_PAIRS
                if p != (profile["preferred_device_os"], profile["preferred_browser"])
            ]
        )
        event["device_os"] = new_os
        event["browser"] = new_browser

        # shift timestamp slightly for realistic effect? Keep it as is but recompute night hour
        dt = datetime.datetime.fromisoformat(event["timestamp"].replace("Z", ""))
        event["is_night_hour"] = 1 if dt.hour >= 18 or dt.hour < 6 else 0

    elif attack_type == "device_spoofing":
        new_os, new_browser = random.choice(
            [
                p
                for p in DEVICE_BROWSER_PAIRS
                if p != (profile["preferred_device_os"], profile["preferred_browser"])
            ]
        )
        event["device_os"] = new_os
        event["browser"] = new_browser
        event["mac_prefix"] = generate_mac()
        event["is_new_device"] = 1

    elif attack_type == "lateral_movement":
        # Prefer resources outside entity's normal dept
        other_resources = []
        for dept, res_list in RESOURCES_BY_DEPT.items():
            if dept != profile["department"]:
                other_resources.extend(res_list)

        target_res = [
            r
            for r in ["Admin Panel", "Server Console", "Production Server", "Logs"]
            if r in other_resources
        ]
        if not target_res:
            target_res = ["Admin Panel", "Server Console", "Production Server", "Logs"]

        event["resource_accessed"] = random.choice(target_res)
        event["unique_resource_count_24h"] = random.randint(5, 12)
        event["command_sequence"] = [
            "login",
            "open_admin",
            "scan_hosts",
            "open_server",
            "open_logs",
        ]
        event["session_duration"] = random.uniform(20, 45)

    elif attack_type == "low_and_slow_exfiltration":
        event["resource_accessed"] = random.choice(
            ["Reports", "Repo", "Database Export", "Files"]
        )
        event["session_duration"] = random.uniform(25, 70)
        event["failed_attempts_10m"] = random.randint(0, 2)
        event["unique_resource_count_24h"] = random.randint(2, 5)

    elif attack_type == "insider_drift":
        pool = profile["common_resources"] + ["Reports", "Admin Panel"]
        event["resource_accessed"] = random.choice(pool)
        event["session_duration"] = random.uniform(14, 28)
        event["unique_resource_count_24h"] = random.randint(2, 4)

    return event


def generate_synthetic_dataset(
    num_entities: int = 100,
    days: int = 30,
    events_per_day_per_entity: int = 6,
    attack_rate: float = 0.05,
) -> pd.DataFrame:

    profiles = _make_entity_profiles(num_entities)

    start_date = datetime.datetime.now() - datetime.timedelta(days=days)
    events = []

    attack_types = [
        "brute_force",
        "credential_stuffing",
        "impossible_travel",
        "device_spoofing",
        "lateral_movement",
        "low_and_slow_exfiltration",
        "insider_drift",
    ]

    for profile in profiles:
        for day in range(days):
            current_date = start_date + datetime.timedelta(days=day)

            for _ in range(events_per_day_per_entity):
                # Sample time around login_hour_mean
                hour = int(
                    np.random.normal(
                        profile["login_hour_mean"], profile["login_hour_std"]
                    )
                )
                hour = max(0, min(23, hour))
                minute = random.randint(0, 59)
                second = random.randint(0, 59)

                event_time = current_date.replace(
                    hour=hour, minute=minute, second=second, microsecond=0
                )

                # Generate normal event
                event = generate_normal_event(profile, event_time)

                # Possibly inject attack
                if random.random() < attack_rate:
                    atk_type = random.choice(attack_types)
                    event = inject_attack(event, profile, atk_type)

                events.append(event)

    df = pd.DataFrame(events)
    # Shuffle dataframe
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df


def write_notes(df, num_entities, days, events_per_day, attack_rate):
    label_counts = df["label"].value_counts().to_dict()

    notes_content = f"""# Data Generation Notes

## Parameters Used
- **num_entities**: {num_entities}
- **days**: {days}
- **events_per_day_per_entity**: {events_per_day}
- **attack_rate**: {attack_rate}

## Class Distribution
"""
    for label, count in label_counts.items():
        notes_content += f"- **{label}**: {count} ({count/len(df)*100:.2f}%)\n"

    notes_content += """
## Behavioral Assumptions
| Pattern | Simulation Approach | Signal Type |
|---|---|---|
| Normal baseline | Per-entity habitual pattern: regular login hours, consistent geo, typical resource set, sampled with noise | Benign |
| Brute force | Rapid repeated failed-auth attempts from one source in a short window | Anomaly |
| Impossible travel | Same entity_id logging in from geographically distant locations within an implausible time gap | Anomaly |
| Credential stuffing | Many entity_ids, few source_ips, high failure rate | Anomaly |
| Lateral movement | A compromised entity accessing an unusual sequence or breadth of resources it never touched before | Anomaly |
| Device spoofing | A device_id reappearing with a mismatched fingerprint (different OS/MAC than history) | Anomaly |
| Low-and-slow exfiltration | Gradual, small, off-hours resource access building up over days or weeks | Anomaly |
| Insider drift | Legitimate entity slowly expanding privilege or resource footprint – ambiguous, used for false-positive tuning | Edge case |

## Shared Infrastructure
To provide a relational signal for the graph model, approximately 5% of entity pairs within the same department share either a `source_ip` or a `device_fingerprint` (MAC address). These shared values are used on roughly 40% of their events. This simulates shared workstations, VPN egress nodes, or jump boxes, allowing the graph model to learn structural relationships between entities.
"""
    with open("data/data_generation_notes.md", "w") as f:
        f.write(notes_content)


if __name__ == "__main__":
    df = generate_synthetic_dataset()
    df.to_csv("data/synthetic_access_logs.csv", index=False)
    write_notes(df, 100, 30, 6, 0.05)
    print(f"Generated {len(df)} events. Saved to data/synthetic_access_logs.csv")
