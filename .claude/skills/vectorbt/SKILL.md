---
name: vectorbt
description: Backtest, optimize and analyze trading strategies with vectorbt (polakowo/vectorbt) — vectorized, Numba/Rust-accelerated Python backtesting. Use when the user asks to backtest a strategy, test thousands of parameter combinations, compute Sharpe/drawdown/win-rate, build indicator-based entry/exit signals, add stop-loss/take-profit, or compare strategies against buy & hold. Triggers on "backtest", "vectorbt", "vbt", "strateji testi", "geriye dönük test", "parametre optimizasyonu", "MA crossover", "RSI stratejisi", "portföy simülasyonu", "Sharpe oranı", "maksimum düşüş".
---

# vectorbt — Vectorized Backtesting

Source: https://github.com/polakowo/vectorbt (v1.2.x, Apache 2.0 + Commons Clause).
vectorbt represents every strategy as pandas/NumPy arrays and runs the simulation
in compiled Numba (or optional Rust) code, so testing one strategy or 10,000
parameter combinations costs roughly the same effort.

## When to use

- Backtest an indicator/signal strategy on stocks, ETFs, BIST, crypto, FX.
- Grid-search parameters (e.g. all fast/slow MA windows) and pick robust zones, not single peaks.
- Portfolio metrics: total return, CAGR, Sharpe, Sortino, Calmar, max drawdown, win rate, profit factor.
- Stops: stop-loss, trailing stop, take-profit.
- Multi-asset portfolios with shared cash.

## Setup

```bash
pip install -U vectorbt            # core (Python >=3.11)
pip install -U "vectorbt[full]"    # + yfinance, TA-Lib, ccxt, etc.
pip install -U "vectorbt[rust]"    # optional Rust engine
```

Check first: `python -c "import vectorbt as vbt; print(vbt.__version__)"`.
If no network access to Yahoo, use `vbt.GBMData` (synthetic) or a user-provided CSV.

## Core workflow (always follow these 5 steps)

1. **Data** — `close = vbt.YFData.download("AAPL", start="2018-01-01").get("Close")`
   (BIST: `"THYAO.IS"`; crypto: `vbt.BinanceData` / `vbt.CCXTData`; CSV: `pd.read_csv(..., index_col=0, parse_dates=True)`).
2. **Indicators** — `vbt.MA.run(close, [10, 20])`, `vbt.RSI.run(close, 14)`, `vbt.BBANDS`, `vbt.MACD`, `vbt.ATR`, `vbt.STOCH`, `vbt.OBV`, `vbt.MSTD`.
3. **Signals** — boolean DataFrames: `fast.ma_crossed_above(slow)`, `rsi.rsi_crossed_below(30)`, `ind.<output>_above(x)`.
4. **Simulate** — `pf = vbt.Portfolio.from_signals(close, entries, exits, init_cash=..., fees=..., slippage=..., freq="1D")`.
5. **Analyze** — `pf.stats()`, `pf.total_return()`, `pf.sharpe_ratio()`, `pf.max_drawdown()`, `pf.trades.records_readable`, `pf.plot().show()`.

Minimal example:

```python
import vectorbt as vbt

close = vbt.YFData.download("AAPL", start="2018-01-01").get("Close")
fast = vbt.MA.run(close, 10)
slow = vbt.MA.run(close, 50)
entries = fast.ma_crossed_above(slow)
exits = fast.ma_crossed_below(slow)

pf = vbt.Portfolio.from_signals(close, entries, exits, init_cash=10_000,
                                fees=0.001, slippage=0.0005, freq="1D")
print(pf.stats())
print(vbt.Portfolio.from_holding(close, init_cash=10_000, freq="1D").stats())  # benchmark
```

Parameter grid (one call, all combinations):

```python
import numpy as np
windows = np.arange(5, 101, 5)
fast, slow = vbt.MA.run_combs(close, window=windows, r=2, short_names=["fast", "slow"])
pf = vbt.Portfolio.from_signals(close, fast.ma_crossed_above(slow),
                                fast.ma_crossed_below(slow), fees=0.001, freq="1D")
sharpe = pf.sharpe_ratio()
print(sharpe.sort_values(ascending=False).head(10))
sharpe.vbt.heatmap(x_level="fast_window", y_level="slow_window", symmetric=True).show()
```

A ready-to-run script with CLI options lives at `scripts/backtest.py`
(`python .claude/skills/vectorbt/scripts/backtest.py --help`). Use it for quick
answers; write custom code for anything beyond MA/RSI/BBANDS strategies.

## Portfolio constructors

| Method | Use for |
|---|---|
| `Portfolio.from_signals(close, entries, exits, ...)` | Most strategies (long/short, stops) |
| `Portfolio.from_orders(close, size, size_type=...)` | Target weights, rebalancing, DCA |
| `Portfolio.from_holding(close)` | Buy & hold benchmark |
| `Portfolio.from_random_signals(close, n=...)` | Null hypothesis / luck test |
| `Portfolio.from_order_func(close, order_func_nb, ...)` | Fully custom Numba logic (advanced) |

Key `from_signals` arguments: `size`, `size_type` (`"amount"`, `"value"`, `"percent"`, `"targetpercent"`),
`direction` (`"longonly"`, `"shortonly"`, `"both"`), `short_entries`/`short_exits`, `fees`, `fixed_fees`,
`slippage`, `init_cash`, `sl_stop`, `sl_trail=True` (trailing), `tp_stop`, `accumulate`,
`cash_sharing=True` + `group_by=True` (multi-asset single portfolio), `open/high/low` (for intrabar stops), `freq`, `engine`.

See `references/api_cheatsheet.md` for indicators, custom indicators (`IndicatorFactory`),
metrics, record access and plotting.

## Rules for credible results (non-negotiable)

1. **No look-ahead.** Signals at bar *t* execute at `close[t]`. If the signal uses `close[t]`,
   that is optimistic; for realism shift signals one bar: `entries.shift(1, fill_value=False)`
   (keep bool dtype — an object dtype breaks Numba). State which convention you used.
2. **Always include costs.** Default to `fees=0.001` (0.1%) and `slippage=0.0005` unless the user gives broker costs (BIST commission + BSMV, crypto maker/taker).
3. **Always compare to buy & hold** on the same period and costs.
4. **Out-of-sample.** For any optimization, split in-sample/out-of-sample (e.g. 70/30) or use
   walk-forward (`close.vbt.rolling_split(...)` / `close.vbt.range_split(...)`). Report OOS metrics.
5. **Prefer robust plateaus** over the single best cell of a heatmap; report the neighbourhood.
6. **Set `freq`** (`"1D"`, `"1h"`) so annualized metrics are correct.
7. Report: period, universe, costs, # trades, total return, CAGR, Sharpe, max drawdown, win rate,
   and the benchmark — and say that past performance does not guarantee future results.

## Output format for the user

- Short summary table (strategy vs buy & hold).
- Best/robust parameter region with OOS confirmation.
- Risk view: max drawdown, longest drawdown duration, worst trade — the user values
  stability/continuity, so emphasize drawdown and consistency, not just return.
- Plots saved to file (`fig.write_html("out.html")` or `fig.write_image(...)` if kaleido is installed) when in a headless session.
- Respond in the user's language (Turkish if asked in Turkish).

## Troubleshooting

- First call is slow → Numba JIT compiling; subsequent calls are fast.
- `freq` warnings / NaN Sharpe → pass `freq=`.
- Yahoo download fails/empty → check ticker suffix (`.IS` for BIST) and network; fall back to CSV.
- Memory blow-up on huge grids → reduce grid, use `chunked` runs, or `group_by`.
- Numba `TypingError ... pyobject` → signals/params have object or mixed int/float dtype; cast to `bool`/`float`.
- `vectorbt-rust` version mismatch warning → falls back to Numba automatically; harmless.
