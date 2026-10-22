"""Quick vectorbt backtest: one strategy or a parameter grid vs buy & hold.

Examples:
    python backtest.py --symbol AAPL --strategy ma --fast 10 --slow 50
    python backtest.py --symbol THYAO.IS --strategy rsi --grid
    python backtest.py --synthetic --strategy bbands
    python backtest.py --csv prices.csv --strategy ma --grid --oos 0.3
"""

import argparse

import numpy as np
import pandas as pd
import vectorbt as vbt


def load_close(args):
    if args.csv:
        df = pd.read_csv(args.csv, index_col=0, parse_dates=True)
        col = next((c for c in df.columns if c.lower() in ("close", "adj close")), df.columns[0])
        return df[col].astype(float).rename(args.symbol)
    if args.synthetic:
        # GBMData yields a single price series, not OHLCV
        return vbt.GBMData.download(args.symbol, start=args.start, end=args.end, seed=42).get()
    return vbt.YFData.download(args.symbol, start=args.start, end=args.end).get("Close")


def build_signals(close, args):
    if args.strategy == "ma":
        if args.grid:
            fast, slow = vbt.MA.run_combs(close, window=np.arange(5, 101, 5), r=2,
                                          short_names=["fast", "slow"])
        else:
            fast = vbt.MA.run(close, args.fast, short_name="fast")
            slow = vbt.MA.run(close, args.slow, short_name="slow")
        return fast.ma_crossed_above(slow), fast.ma_crossed_below(slow)
    if args.strategy == "rsi":
        windows = np.arange(7, 29, 7) if args.grid else args.window
        lows = [20, 25, 30, 35] if args.grid else args.lower
        highs = [65, 70, 75, 80] if args.grid else args.upper
        rsi = vbt.RSI.run(close, window=windows)
        # Same (lower, upper) keys on both sides so entry/exit columns line up
        pairs = [(lo, hi) for lo in np.atleast_1d(lows) for hi in np.atleast_1d(highs)]
        entries = pd.concat({(lo, hi): rsi.rsi_crossed_below(lo) for lo, hi in pairs},
                            axis=1, names=["lower", "upper"])
        exits = pd.concat({(lo, hi): rsi.rsi_crossed_above(hi) for lo, hi in pairs},
                          axis=1, names=["lower", "upper"])
        return entries, exits
    if args.strategy == "bbands":
        bb = vbt.BBANDS.run(close, window=args.window if not args.grid else [10, 20, 30],
                            alpha=2.0 if not args.grid else [1.5, 2.0, 2.5], param_product=args.grid)
        return bb.close_crossed_below(bb.lower), bb.close_crossed_above(bb.middle)
    raise ValueError(args.strategy)


def run(close, args):
    entries, exits = build_signals(close, args)
    if args.next_bar:
        entries, exits = entries.shift(1, fill_value=False), exits.shift(1, fill_value=False)
    return vbt.Portfolio.from_signals(close, entries, exits, init_cash=args.cash,
                                      fees=args.fees, slippage=args.slippage,
                                      sl_stop=args.sl, tp_stop=args.tp, freq=args.freq)


def summarize(pf):
    return pd.Series({
        "Total Return %": pf.total_return() * 100,
        "Sharpe": pf.sharpe_ratio(),
        "Max Drawdown %": pf.max_drawdown() * 100,
        "Trades": pf.trades.count(),
        "Win Rate %": pf.trades.win_rate() * 100,
    })


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--symbol", default="AAPL")
    p.add_argument("--csv")
    p.add_argument("--synthetic", action="store_true", help="use offline GBM data")
    p.add_argument("--start", default="2018-01-01")
    p.add_argument("--end", default=None)
    p.add_argument("--strategy", choices=["ma", "rsi", "bbands"], default="ma")
    p.add_argument("--fast", type=int, default=10)
    p.add_argument("--slow", type=int, default=50)
    p.add_argument("--window", type=int, default=14)
    p.add_argument("--lower", type=float, default=30)
    p.add_argument("--upper", type=float, default=70)
    p.add_argument("--grid", action="store_true", help="test a parameter grid")
    p.add_argument("--oos", type=float, default=0.0, help="out-of-sample fraction, e.g. 0.3")
    p.add_argument("--next-bar", action="store_true", help="execute signals on the next bar")
    p.add_argument("--cash", type=float, default=10_000)
    p.add_argument("--fees", type=float, default=0.001)
    p.add_argument("--slippage", type=float, default=0.0005)
    p.add_argument("--sl", type=float, default=None, help="stop-loss fraction, e.g. 0.08")
    p.add_argument("--tp", type=float, default=None, help="take-profit fraction, e.g. 0.2")
    p.add_argument("--freq", default="1D")
    p.add_argument("--top", type=int, default=10)
    p.add_argument("--html", help="save the best portfolio plot to this HTML file")
    args = p.parse_args()
    if args.end is None and args.synthetic:
        args.end = pd.Timestamp.today().normalize()

    close = load_close(args).dropna()
    split = int(len(close) * (1 - args.oos)) if args.oos else len(close)
    in_close, out_close = close.iloc[:split], close.iloc[split:]

    pf = run(in_close, args)
    bh = vbt.Portfolio.from_holding(in_close, init_cash=args.cash, fees=args.fees, freq=args.freq)
    print(f"In-sample: {in_close.index[0].date()} -> {in_close.index[-1].date()} ({len(in_close)} bars)")

    if pf.wrapper.ndim > 1 and pf.wrapper.shape_2d[1] > 1:
        table = pd.DataFrame({
            "Sharpe": pf.sharpe_ratio(),
            "Total Return %": pf.total_return() * 100,
            "Max Drawdown %": pf.max_drawdown() * 100,
            "Trades": pf.trades.count(),
        }).sort_values("Sharpe", ascending=False)
        print(f"\nTop {args.top} of {len(table)} combinations by Sharpe:")
        print(table.head(args.top).round(3).to_string())
        best = table.index[0]
        best_pf = pf[best]
    elif pf.wrapper.ndim > 1:
        best = pf.wrapper.columns[0]
        best_pf = pf[best]
    else:
        best = None
        best_pf = pf

    print("\nStrategy vs Buy & Hold (in-sample):")
    print(pd.DataFrame({"Strategy": summarize(best_pf), "Buy&Hold": summarize(bh)}).round(3).to_string())

    if len(out_close) > 1:
        out_pf = run(out_close, args)
        out_best = out_pf[best] if best is not None else out_pf
        out_bh = vbt.Portfolio.from_holding(out_close, init_cash=args.cash, fees=args.fees, freq=args.freq)
        print(f"\nOut-of-sample: {out_close.index[0].date()} -> {out_close.index[-1].date()}")
        print(pd.DataFrame({"Strategy": summarize(out_best), "Buy&Hold": summarize(out_bh)}).round(3).to_string())

    if args.html:
        best_pf.plot().write_html(args.html)
        print(f"\nPlot saved: {args.html}")
    print("\nNote: past performance does not guarantee future results.")


if __name__ == "__main__":
    main()
