# Data Generation Notes

## Parameters Used
- **num_entities**: 100
- **days**: 30
- **events_per_day_per_entity**: 6
- **attack_rate**: 0.05

## Class Distribution
- **normal**: 17071 (94.84%)
- **brute_force**: 146 (0.81%)
- **insider_drift**: 143 (0.79%)
- **impossible_travel**: 139 (0.77%)
- **low_and_slow_exfiltration**: 136 (0.76%)
- **credential_stuffing**: 132 (0.73%)
- **device_spoofing**: 119 (0.66%)
- **lateral_movement**: 114 (0.63%)

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
