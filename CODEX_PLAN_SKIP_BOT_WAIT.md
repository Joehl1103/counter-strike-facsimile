# Skip bot-round wait

1. Add one tested eligibility rule: a local bot round may be skipped only while the round is active, freeze time has ended, and the player is dead.
2. Expose a `Skip to next round` button and `N` shortcut. The request fast-forwards the existing bot/objective simulation in small fixed steps until its normal round-ending rule fires.
3. Bypass only the post-result review delay for a requested skip, then enter the ordinary next-round freeze. Keep the existing score, money settlement, receipt, and match-ending paths.
4. Verify eligibility, result/economy ordering, next-freeze preparation, reset behavior, keyboard/mouse controls, and run the full test, lint, and build checks.
