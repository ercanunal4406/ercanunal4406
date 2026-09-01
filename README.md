# Trade Journal

Kişisel kullanım için gerçek verilere dayalı bir trading dashboard'u: canlı
piyasa fiyatı + elle girilen işlem günlüğü + o işlemlerden gerçekten
hesaplanan performans metrikleri. Sahte "doğrulanmış" rozetler, kurgusal
getiri veya global sıralama iddiaları içermez — panel yalnızca kendi
girdiğiniz trade verilerini gösterir.

## Özellikler

- **Canlı fiyat**: BTC/USDT, ETH/USDT, SOL/USDT için Binance'in herkese açık
  WebSocket ticker akışından gerçek zamanlı fiyat ve 24s değişim.
- **Mum grafiği**: Seçilen sembol/zaman dilimi için Binance REST + WebSocket
  kline akışından canlı güncellenen candlestick grafik (lightweight-charts).
- **İşlem günlüğü**: Sembol, yön, miktar, giriş/çıkış fiyatı, stop-loss ve
  not ile elle işlem ekleme; tarayıcının `localStorage`'ında saklanır.
- **Gerçek istatistikler**: Toplam PnL, win rate, ortalama R-multiple,
  trade başına Sharpe oranı, en iyi/en kötü işlem — hepsi girilen işlemlerden
  hesaplanır, hiçbiri sabit/kurgusal değildir.
- **Equity eğrisi**: Kapanan işlemlerden kümülatif PnL grafiği.

## Geliştirme

```bash
npm install
npm run dev
```

`npm run build` üretim derlemesi, `npm run lint` Oxlint kontrolü çalıştırır.

## Not

Binance API'sine erişim, uygulamanın çalıştığı tarayıcıdan doğrudan yapılır
(API anahtarı gerekmez). Kısıtlı ağ ortamlarında (ör. bazı korumalı
sandbox/CI ortamları) bu istekler engellenebilir; böyle durumlarda arayüz
hatayı açıkça gösterir ve çökmez.
