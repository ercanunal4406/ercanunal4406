# vectorbt API cheatsheet (v1.2.x)

## Data

```python
vbt.YFData.download(["AAPL", "MSFT"], start="2015-01-01", end="2025-01-01").get("Close")
vbt.YFData.download("THYAO.IS", period="5y").get()          # full OHLCV DataFrame
vbt.BinanceData.download("BTCUSDT", start="2 years ago", interval="1d").get("Close")
vbt.CCXTData.download("BTC/USDT", exchange="binance", timeframe="1h")
vbt.GBMData.download("SYN", start="2020-01-01", end="2024-01-01").get()  # offline synthetic, returns a Series
data.update()                                                # append new bars
```

## Built-in indicators

| Class | Params | Outputs / helpers |
|---|---|---|
| `vbt.MA.run(close, window, ewm=False)` | window | `.ma`, `.ma_crossed_above(other)`, `.ma_above(x)` |
| `vbt.MSTD.run(close, window)` | window | `.mstd` |
| `vbt.BBANDS.run(close, window=20, alpha=2)` | window, alpha | `.upper .middle .lower .percent_b .bandwidth` |
| `vbt.RSI.run(close, window=14)` | window | `.rsi`, `.rsi_crossed_below(30)` |
| `vbt.STOCH.run(high, low, close, k_window, d_window)` | | `.percent_k .percent_d` |
| `vbt.MACD.run(close, fast_window, slow_window, signal_window)` | | `.macd .signal .hist` |
| `vbt.ATR.run(high, low, close, window)` | | `.tr .atr` |
| `vbt.OBV.run(close, volume)` | | `.obv` |

Every indicator accepts lists of params → one column per combination.
`param_product=True` takes the Cartesian product of several param lists.
`Indicator.run_combs(..., r=2)` generates combinations of one param (e.g. fast/slow windows).

Generic helpers on any output: `<name>_above(x)`, `<name>_below(x)`, `<name>_crossed_above(x)`,
`<name>_crossed_below(x)`, `<name>_equal(x)`.

### Third-party indicators

```python
vbt.IndicatorFactory.from_talib("SMA").run(close, timeperiod=[10, 20])
vbt.IndicatorFactory.from_pandas_ta("supertrend")
vbt.IndicatorFactory.from_ta("RSIIndicator")
```

### Custom indicator

```python
import numpy as np

def momentum(close, window):
    return close / np.roll(close, window, axis=0) - 1   # must be array -> array

MOM = vbt.IndicatorFactory(
    class_name="MOM", input_names=["close"], param_names=["window"], output_names=["mom"]
).from_apply_func(momentum, window=20)

mom = MOM.run(close, window=[10, 20, 60])
entries = mom.mom_crossed_above(0)
```

## Signals utilities (`df.vbt.signals.*`)

```python
entries.vbt.signals.first()                 # first True in each run
entries.vbt.signals.clean(exits)            # remove redundant signals (returns entries, exits)
entries.shift(1, fill_value=False)          # shift one bar (avoid look-ahead), keeps bool dtype
entries.vbt.signals.total()                 # count signals
vbt.Portfolio.from_random_signals(close, n=20, seed=42)
```

## Portfolio — sizing examples

```python
# 50% of equity per entry
vbt.Portfolio.from_signals(close, e, x, size=0.5, size_type="percent")
# Fixed target weights, monthly rebalance (multi-asset)
w = pd.DataFrame(np.nan, index=close.index, columns=close.columns)
w.iloc[::21] = 1 / close.shape[1]
vbt.Portfolio.from_orders(close, size=w, size_type="targetpercent",
                          group_by=True, cash_sharing=True, call_seq="auto", freq="1D")
# Monthly DCA of 1000 units of cash
dca = pd.Series(np.nan, index=close.index); dca.iloc[::21] = 1000
vbt.Portfolio.from_orders(close, size=dca, size_type="value", init_cash=0, freq="1D")  # use init_cash large enough or cash deposits
# Stops (fractions): 8% stop-loss, trailing, 20% take-profit
vbt.Portfolio.from_signals(close, e, x, sl_stop=0.08, sl_trail=True, tp_stop=0.20,
                           open=o, high=h, low=l)
# Long & short
vbt.Portfolio.from_signals(close, entries=le, exits=lx, short_entries=se, short_exits=sx)
```

## Portfolio — metrics & records

```python
pf.stats()                       # full table; pf.stats(column="...") for one column
pf.returns_stats()               # returns-based stats (Sortino, Omega, tail ratio, ...)
pf.total_return(); pf.annualized_return(); pf.sharpe_ratio(); pf.sortino_ratio()
pf.calmar_ratio(); pf.max_drawdown(); pf.value(); pf.returns(); pf.cash(); pf.assets()
pf.trades.records_readable       # every trade as a DataFrame
pf.trades.win_rate(); pf.trades.profit_factor(); pf.trades.expectancy()
pf.positions.records_readable; pf.orders.records_readable
pf.drawdowns.records_readable; pf.drawdowns.max_duration()
pf.returns().vbt.returns(freq="1D").stats()   # returns accessor
pf.qs.html_report()              # needs quantstats
```

## Plotting

```python
pf.plot().show()                                     # orders, trade PnL, cumulative returns
pf.plot(subplots=["value", "drawdowns", "underwater"])
pf.trades.plot(); pf.drawdowns.plot()
metric.vbt.heatmap(x_level="fast_window", y_level="slow_window")
metric.vbt.volume(x_level=..., y_level=..., z_level=...)   # 3D
fig.write_html("report.html")
```

## Splitting for out-of-sample / walk-forward

```python
(in_close, in_idx), (out_close, out_idx) = close.vbt.rolling_split(
    n=5, window_len=500, set_lens=(150,), left_to_right=False)
# in_close / out_close are DataFrames: one column per split window.
# Optimize on in_close, pick best params per split, evaluate on out_close.
```

## Settings

```python
vbt.settings.portfolio["init_cash"] = 10_000
vbt.settings.portfolio["fees"] = 0.001
vbt.settings.array_wrapper["freq"] = "1D"
vbt.settings["engine"] = "auto"   # 'auto' | 'numba' | 'rust'
```
