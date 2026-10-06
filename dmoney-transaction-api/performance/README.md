# Performance tests (k6)

Local/dev only. These scripts write real ledger rows and use the dev OTP bypass.

## sendmoney-concurrency.k6.js

Customers send money to each other under a staged load. The profile uses k6 `stages`, not `scenarios`:

| Time | Users | What happens |
|---|---|---|
| 0–30 s | 0 → 3 | The first 3 users start sending |
| 30–50 s | 3 → 10 | 7 more users join, and all keep sending |
| 50–60 s | 10 → 0 | All users leave |

```bash
# from dmoney-transaction-api/, with the API running
k6 run performance/sendmoney-concurrency.k6.js
BASE_URL=https://<staging-host> k6 run performance/sendmoney-concurrency.k6.js   # other environment
```

**Which customers are used.** No users are created. Setup lists all users through the API and keeps the customers that meet all of these:
- role Customer and status active;
- a balance of at least `MIN_BALANCE`;
- daily or monthly limit left (worked out from their statement, BRD §8.1);
- they can log in with `PASSWORD`.

**How sends are spread.**
- Sends rotate round-robin across those customers, and each one always pays the next customer in the list.
- No customer is used more often than its remaining daily or monthly limit, or more than its balance allows.
- Each user waits `THINK_TIME` seconds between sends.

**Pass criteria.** All of these must hold:
- every send returns 201 "Send money successful";
- no send request fails;
- no send takes 60 s or longer;
- no send is skipped because the customers ran out of limit or balance (`sendmoney_skipped == 0`).

No latency target is defined in the requirements. Read `p(95)` from the summary as information only.

| Env var | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://localhost:5000` | API under test |
| `MIN_BALANCE` | `1000` | Minimum balance for a customer to be reused |
| `THINK_TIME` | `3` | Seconds each user waits between sends. About 75 sends per run at 3 s |
| `AMOUNT` / `FEE` | `10` / `5` | Amount per send, and the flat fee used for capacity planning |
| `PASSWORD` | `1234` | Password of the reused customers. Customers that can't log in are skipped |
| `SECRET_KEY`, `ADMIN_EMAIL` | seeded values | Partner key and the admin used to list users |

**Capacity.** Each customer may send at most 10 times per UTC day. Setup prints the available send capacity and the estimated number of sends. If capacity is below the estimate, raise `THINK_TIME` or lower `MIN_BALANCE` to bring in more customers.
