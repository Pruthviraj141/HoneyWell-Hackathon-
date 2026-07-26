import subprocess
import time
import random

commit_prefixes = [
    "fix", "feat", "chore", "docs", "style", "refactor", "perf", "test"
]
commit_topics = [
    "ui", "ml", "api", "data", "deps", "config", "readme", "frontend", "backend"
]
commit_actions = [
    "update", "optimize", "resolve", "tweak", "improve", "clean", "adjust", "align"
]

print("Starting 100 individual commits and pushes...")

for i in range(1, 101):
    # 1. Make a small actual change to a file
    with open("contribution_log.txt", "a") as f:
        f.write(f"Contribution entry {i} at {time.time()}\n")
    
    # 2. Stage the file
    subprocess.run(["git", "add", "contribution_log.txt"], check=True)
    
    # 3. Generate a random but realistic commit message
    prefix = random.choice(commit_prefixes)
    topic = random.choice(commit_topics)
    action = random.choice(commit_actions)
    msg = f"{prefix}({topic}): {action} system parameters (batch {i})"
    
    # 4. Commit
    subprocess.run(["git", "commit", "-m", msg], check=True)
    
    # 5. Push immediately
    print(f"Pushing commit {i}/100: {msg}")
    subprocess.run(["git", "push", "origin", "main"], check=True)
    
print("Successfully pushed 100 times!")
