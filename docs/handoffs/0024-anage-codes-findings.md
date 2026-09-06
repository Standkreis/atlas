# 🧬 [0024] Findings — AnAge cells as codes

| 🗓️ Done | 🌿 Branch | ✅ Check |
| --- | --- | --- |
| 2026-09-07 | `main` | `npm run check` green, 58 tests |

## 🔁 Decisions

| # | Decision | Why |
| --- | --- | --- |
| A1 | Codes, not a JSON object | `Fact.value` is a string everywhere (schema comment, `factWords`, tests); a second shape for two keys buys nothing |
| A2 | `wild` in German reads **"frei lebend"**, `captivity` **"in Obhut"**; `clutch` → "Gelege {n} Eier", `litter` → "Wurf {n} Junge", `perYear` → "{n}× im Jahr", `maturity` → "reif mit {n} Tagen" | "21 Jahre (wild)" is not German |
| A3 | `recode` is a separate command, not part of `facts` | `facts` leaves the AnAge keys alone by design (0021 D3); the fix must reach taxa whose `factsAt` is set |

## ✅ Checks

| # | Check | Evidence |
| --- | --- | --- |
| C1 | `parseAnAge` → `{ lifespan: '21.8 wild', reproduction: 'clutch 4.5 · perYear 2 · maturity 365' }`; `recodeAnAge` on the old English and on codes | `taxon.test.ts` "AnAge (E8)", 2 cases · 58 tests pass |
| C2 | Dev DB: `recode` rewrote **145 of 851** taxa with facts; the second run **0** | CLI output |
| C3 | Eisvogel (2475532) on `next start` in the Simulator: **Alter 21 Jahre (frei lebend) · Nachwuchs reif mit 365 Tagen** | [`0024-shots/eisvogel-de.png`](0024-shots/eisvogel-de.png) |
| C4 | Neon | ⏳ owner, after the deploy: `npm run etl -- recode` with the unpooled URL ([ETL README §🚀](../../app/etl/README.md)) |

## 🤔 Doubts

| # | Doubt |
| --- | --- |
| D1 | Until C4 runs, the deployed page prints the old English values unchanged (the client passes unknown shapes through). Harmless, but the order is deploy → recode, not the reverse: the old client would print the codes raw |
| D2 | AnAge's "Maximum longevity" is a maximum; the cell says "21 Jahre" as if typical. Same family as the GIFT height doubt in 0021: "bis 21 Jahre" would be honest, one word in the message |
| D3 | `perYear` reads "2× im Jahr" without saying what: "2 Gelege im Jahr" would need the clutch/litter word carried over. Left as is |

## 🔀 For the merge

Straight on `main`, no shared files with an open track. After the deploy the owner runs `recode` against Neon (C4).
