#!/usr/bin/env python3
"""vectorbt backtest runner with grid search and out-of-sample validation.

Examples:
    python backtest.py --symbol THYAO.IS --strategy ma
    python backtest.py --symbol THYAO.IS --strategy ma --grid --oos 0.3
    python backtest.py --symbol THYAO.IS --strategy rsi --grid --oos 0.3
    python backtest.py --csv prices.csv --strategy ma --grid --oos 0.3

Workflow with --grid:
    1. Split the history in time: first (1 - oos) is in-sample (IS), last oos is out-of-sample (OOS).
    2. Search every parameter combination on IS only and rank by Sharpe ratio.
    3. Re-run the IS winner, untouched, on OOS and compare against buy & hold.
"""
import argparse
import itertools
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import vectorbt as vbt

DEFAULTS = {
    "ma": {"fast": 20, "slow": 50},
    "rsi": {"window": 14, "lower": 30, "upper": 70},
}
GRIDS = {
    "ma": {"fast": range(5, 55, 5), "slow": range(20, 210, 10)},
    "rsi": {"window": [7, 10, 14, 21, 28], "lower": [20, 25, 30, 35], "upper": [65, 70, 75, 80]},
}


def parse_args():
    p = argparse.ArgumentParser(description="vectorbt backtest with grid search and OOS validation")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--symbol", help="Yahoo Finance ticker, e.g. THYAO.IS")
    src.add_argument("--csv", help="CSV with a date column and a Close (or Adj Close) column")
    p.add_argument("--strategy", choices=sorted(DEFAULTS), default="ma")
    p.add_argument("--start", default="2015-01-01")
    p.add_argument("--end", default=None)
    p.add_argument("--grid", action="store_true", help="search the parameter grid on in-sample data")
    p.add_argument("--oos", type=float, default=0.0, help="out-of-sample fraction (0 < oos < 1)")
    p.add_argument("--metric", choices=["sharpe", "sortino", "calmar", "return"], default="sharpe")
    p.add_argument("--min-trades", type=int, default=5, help="ignore IS combos with fewer trades")
    p.add_argument("--fees", type=float, default=0.002, help="per-side fee (0.002 = 0.2%%)")
    p.add_argument("--slippage", type=float, default=0.001)
    p.add_argument("--init-cash", type=float, default=100_000)
    p.add_argument("--top", type=int, default=10, help="rows of the IS leaderboard to print")
    p.add_argument("--out", default="backtest_output", help="directory for CSV/HTML results")
    args = p.parse_args()
    if not 0 <= args.oos < 1:
        p.error("--oos must be in [0, 1)")
    return args


def load_close(args) -> pd.Series:
    if args.csv:
        df = pd.read_csv(args.csv, index_col=0, parse_dates=True)
        col = next((c for c in ("Adj Close", "Close", "close", "adj_close") if c in df.columns), None)
        if col is None:
            sys.exit(f"CSV needs a Close column; found {list(df.columns)}")
        close = df[col]
        name = Path(args.csv).stem
    else:
        try:
            data = vbt.YFData.download(args.symbol, start=args.start, end=args.end, missing_index="drop")
            close = data.get("Close")
        except Exception as exc:
            sys.exit(f"Yahoo Finance download failed for {args.symbol}: {exc}\n"
                     "Check network access, or export prices and pass --csv instead.")
        name = args.symbol
    close = close.astype(float).dropna().sort_index()
    if close.index.tz is not None:
        close.index = close.index.tz_localize(None)
    close = close.loc[args.start:args.end] if args.csv else close
    if len(close) < 250:
        sys.exit(f"Only {len(close)} bars for {name}; need at least 250. "
                 "If Yahoo is unreachable, pass --csv instead.")
    close.name = name
    return close


def signals(close: pd.Series, strategy: str, combos: list[dict]):
    """Return (entries, exits) DataFrames with one column per parameter combo."""
    ent, ext, keys = [], [], []
    if strategy == "ma":
        windows = sorted({c[k] for c in combos for k in ("fast", "slow")})
        ma = {w: vbt.MA.run(close, w).ma for w in windows}
        for c in combos:
            f, s = ma[c["fast"]], ma[c["slow"]]
            ent.append((f > s) & (f.shift(1) <= s.shift(1)))
            ext.append((f < s) & (f.shift(1) >= s.shift(1)))
            keys.append((c["fast"], c["slow"]))
        names = ["fast", "slow"]
    else:
        rsi = {w: vbt.RSI.run(close, w).rsi for w in {c["window"] for c in combos}}
        for c in combos:
            r = rsi[c["window"]]
            ent.append((r < c["lower"]) & (r.shift(1) >= c["lower"]))
            ext.append((r > c["upper"]) & (r.shift(1) <= c["upper"]))
            keys.append((c["window"], c["lower"], c["upper"]))
        names = ["window", "lower", "upper"]
    cols = pd.MultiIndex.from_tuples(keys, names=names)
    return _frame(ent, cols), _frame(ext, cols)


def _frame(series_list, cols):
    df = pd.concat(series_list, axis=1)
    df.columns = cols
    return df.fillna(False).astype(bool)


def combos_for(strategy: str, grid: bool) -> list[dict]:
    if not grid:
        return [DEFAULTS[strategy]]
    g = GRIDS[strategy]
    out = [dict(zip(g, v)) for v in itertools.product(*g.values())]
    if strategy == "ma":
        out = [c for c in out if c["fast"] < c["slow"]]
    else:
        out = [c for c in out if c["lower"] < c["upper"]]
    return out


def run(close, entries, exits, args):
    return vbt.Portfolio.from_signals(
        close, entries, exits, fees=args.fees, slippage=args.slippage,
        init_cash=args.init_cash, freq="1D",
    )


def score(pf, metric):
    return {
        "sharpe": pf.sharpe_ratio,
        "sortino": pf.sortino_ratio,
        "calmar": pf.calmar_ratio,
        "return": pf.total_return,
    }[metric]()


def summary(pf) -> dict:
    trades = pf.trades
    n = int(trades.count()) if np.ndim(trades.count()) == 0 else int(trades.count().iloc[0])
    return {
        "Total return %": 100 * float(pf.total_return()),
        "CAGR %": 100 * float(pf.annualized_return()),
        "Sharpe": float(pf.sharpe_ratio()),
        "Sortino": float(pf.sortino_ratio()),
        "Max DD %": 100 * float(pf.max_drawdown()),
        "Trades": n,
        "Win rate %": 100 * float(trades.win_rate()) if n else np.nan,
    }


def evaluate(close, strategy, params, args):
    e, x = signals(close, strategy, [params])
    pf = run(close, e.iloc[:, 0], x.iloc[:, 0], args)
    bh = vbt.Portfolio.from_holding(close, fees=args.fees, slippage=args.slippage,
                                    init_cash=args.init_cash, freq="1D")
    return pf, pd.DataFrame({"Strategy": summary(pf), "Buy & hold": summary(bh)})


def main():
    args = parse_args()
    close = load_close(args)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    tag = f"{close.name}_{args.strategy}".replace("/", "_")

    split = int(len(close) * (1 - args.oos)) if args.oos else len(close)
    is_close, oos_close = close.iloc[:split], close.iloc[split:]
    print(f"\n{close.name} | {args.strategy.upper()} | fees {args.fees:.2%} + slippage {args.slippage:.2%}")
    print(f"In-sample : {is_close.index[0]:%Y-%m-%d} → {is_close.index[-1]:%Y-%m-%d} ({len(is_close)} bars)")
    if args.oos:
        print(f"Out-sample: {oos_close.index[0]:%Y-%m-%d} → {oos_close.index[-1]:%Y-%m-%d} ({len(oos_close)} bars)")

    combos = combos_for(args.strategy, args.grid)
    entries, exits = signals(is_close, args.strategy, combos)
    pf = run(is_close, entries, exits, args)

    if args.grid:
        table = pd.DataFrame({
            args.metric: score(pf, args.metric),
            "return %": 100 * pf.total_return(),
            "max_dd %": 100 * pf.max_drawdown(),
            "trades": pf.trades.count(),
        })
        table.to_csv(out / f"{tag}_grid_is.csv")
        ranked = table[table["trades"] >= args.min_trades].replace([np.inf, -np.inf], np.nan)
        ranked = ranked.dropna(subset=[args.metric]).sort_values(args.metric, ascending=False)
        if ranked.empty:
            sys.exit(f"No combination produced >= {args.min_trades} trades in-sample.")
        print(f"\nGrid: {len(combos)} combos, {len(ranked)} with >= {args.min_trades} trades. "
              f"Top {args.top} by IS {args.metric}:")
        print(ranked.head(args.top).round(2).to_string())
        best = dict(zip(ranked.index.names, ranked.index[0]))
        # Robustness hint: a lone peak surrounded by poor neighbours is likely overfit.
        q = ranked[args.metric]
        print(f"\nIS {args.metric} spread: best {q.iloc[0]:.2f} | median {q.median():.2f} | "
              f"share of combos > 0: {(q > 0).mean():.0%}")
    else:
        best = combos[0]

    best = {k: int(v) for k, v in best.items()}
    print(f"\nSelected params: {best}")

    _, is_stats = evaluate(is_close, args.strategy, best, args)
    print("\nIn-sample:")
    print(is_stats.round(2).to_string())

    final_pf = None
    if args.oos:
        final_pf, oos_stats = evaluate(oos_close, args.strategy, best, args)
        print("\nOut-of-sample (params frozen from IS):")
        print(oos_stats.round(2).to_string())
        is_s, oos_s = is_stats.loc["Sharpe", "Strategy"], oos_stats.loc["Sharpe", "Strategy"]
        ratio = oos_s / is_s if is_s > 0 else np.nan
        print(f"\nOOS/IS Sharpe ratio: {ratio:.2f}  (≳0.5 holds up; ≲0 means the edge did not survive)")
        oos_stats.to_csv(out / f"{tag}_oos.csv")
    else:
        final_pf, _ = evaluate(is_close, args.strategy, best, args)
    is_stats.to_csv(out / f"{tag}_is.csv")

    try:
        final_pf.plot().write_html(str(out / f"{tag}_equity.html"))
    except Exception as exc:  # plotting is optional; numbers above are the result
        print(f"(plot skipped: {exc})")
    print(f"\nFiles written to {out.resolve()}/")


if __name__ == "__main__":
    main()
