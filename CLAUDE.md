# Proje talimatları

## Context Engineering skill'leri: önce uyar, sonra devreye al

`.claude/skills/` altında "Agent Skills for Context Engineering" koleksiyonu kurulu
(kaynak: https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering,
commit `9ff0c99`, MIT lisansı). Giriş noktası: `context-engineering-collection`.

**Kural:** Kullanıcının isteği aşağıdaki konulardan birine girdiğinde, skill'i
sessizce kullanma. Önce tek satırla haber ver ve onay iste, örneğin:

> 💡 Bu iş için **`<skill-adı>`** skill'i uygun (<neden, kısa>). Devreye alayım mı?

Kullanıcı "evet / olur / devam" derse skill'i Skill aracıyla çağır. "Hayır" derse
skill'siz devam et ve aynı konuşmada aynı skill için tekrar sorma. Kullanıcı
skill'i adıyla isterse sormadan doğrudan çağır.

| Konu (kullanıcının dili: Türkçe veya İngilizce) | Skill |
| --- | --- |
| Context / bağlam penceresi nedir, temel kavramlar | `context-fundamentals` |
| Uzun konuşmada kalitenin düşmesi, "ortada kaybolma", çelişen bağlam | `context-degradation` |
| Uzun oturumu özetleme, devir-teslim (handoff) notu, sıkıştırma | `context-compression` |
| Token / maliyet azaltma, cache, bağlam bütçesi | `context-optimization` |
| Dosya tabanlı not defteri, ajanlar arası dosyayla aktarım | `filesystem-context` |
| Oturumlar arası kalıcı hafıza, bilgi grafiği, vektör arama | `memory-systems` |
| Birden çok ajan / alt ajan mimarisi, orkestrasyon | `multi-agent-patterns` |
| Uzun süre çalışacak otonom ajan için başlangıç prompt'u | `long-horizon-prompting` |
| Ajan araç (tool) / MCP sunucusu tasarımı | `tool-design` |
| LLM'li bir proje / pipeline kurgusu, maliyet tahmini | `project-development` |
| Ajan değerlendirme, test seti, kalite kapısı | `evaluation` |
| LLM-as-judge, rubrik, ikili karşılaştırma | `advanced-evaluation` |
| Otonom araştırma döngüsü / harness tasarımı | `harness-engineering` |
| Kendini geliştiren döngüler, harness'in kendisini optimize etme | `self-improvement-loops` |
| Modelin kendi bağlamını düzenlemesi | `self-managed-context` |
| Barındırılan / arka plan ajan altyapısı, sandbox | `hosted-agents` |
| Ajanlar arası KV-cache ile bellek paylaşımı | `latent-briefing` |
| BDI (inanç-arzu-niyet) ile ajan modelleme | `bdi-mental-states` |

Bu skill'ler yapay zekâ ajanı / prompt / bağlam tasarımı içindir. Finans, hisse
analizi veya inşaat mühendisliği soruları için önerme. O konular için hesapta
ayrı skill'ler var.
