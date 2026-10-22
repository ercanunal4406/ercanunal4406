---
name: vectorbt
description: Backtest MA-crossover or RSI strategies on any Yahoo Finance ticker (e.g. BIST stocks like THYAO.IS) with vectorbt, including parameter grid search on in-sample data and frozen-parameter out-of-sample validation against buy & hold. Use when asked to backtest, optimise, or validate a trading strategy.
---

# vectorbt backtest

## Setup

```bash
pip install -U "vectorbt[full]"
```

On Debian/Ubuntu's system Python the `ta` extra may fail to build (`install_layout` error). Use a venv:

```bash
python3 -m venv .venv && .venv/bin/pip install -U pip setuptools wheel "vectorbt[full]"
```

## Run

```bash
python .claude/skills/vectorbt/scripts/backtest.py --symbol THYAO.IS --strategy ma --grid --oos 0.3
python .claude/skills/vectorbt/scripts/backtest.py --symbol THYAO.IS --strategy rsi --grid --oos 0.3
python .claude/skills/vectorbt/scripts/backtest.py --csv prices.csv --strategy ma   # offline data
```

| Flag | Default | Meaning |
|---|---|---|
| `--strategy` | `ma` | `ma` (fast/slow SMA crossover) or `rsi` (buy cross below lower, sell cross above upper) |
| `--grid` | off | search the parameter grid on in-sample data only |
| `--oos` | `0` | last fraction of history held out, e.g. `0.3` = 30% |
| `--metric` | `sharpe` | IS ranking metric: `sharpe`, `sortino`, `calmar`, `return` |
| `--min-trades` | `5` | discard combos with too few IS trades |
| `--fees` / `--slippage` | `0.002` / `0.001` | per side |
| `--start` / `--end` | `2015-01-01` / today | date range |
| `--out` | `backtest_output` | grid CSV, IS/OOS stats CSV, equity HTML |

## Reading the result

- The OOS block is the honest number; the IS leaderboard is optimistic by construction.
- `OOS/IS Sharpe ratio` ≳ 0.5 suggests the edge holds up; ≤ 0 means it did not survive.
- A lone IS peak with a low median / low share of positive combos is a sign of overfitting.
  Prefer parameters in a broad, stable region of the grid.
- Always compare against the buy & hold column over the same window.
