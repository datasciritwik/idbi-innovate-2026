<div align="center">

# Vitta — Your Bank's AI Wealth Concierge

**IDBI Innovate 2026 · Track 01: Digital Wealth Management**

🔴 **Live App:** [vitta-app.pages.dev](https://vitta-app.pages.dev)

</div>

---

## What is this?

Vitta is a voice-and-chat assistant that lives inside a bank's mobile app and gives every
customer their own personal wealth advisor — the kind of one-on-one financial guidance that
today only exists for premium/wealthy clients.

Talk to it (or type to it) about your money, and it answers using **your own actual
transactions and profile** — not generic advice copy-pasted for everyone.

Open the live app and try asking things like:
- "How is my portfolio doing?"
- "Can I afford to buy a bike?"
- "Why did my savings drop this month?"

## Why this matters

Banks already have all the data needed to give great financial advice — years of transaction
history, income patterns, spending habits. That data mostly just sits unused. Vitta turns it
into a simple conversation, right inside the app the customer already opens every day.

## What makes this build stand out

- 🧠 **We host our own AI model — we don't call OpenAI/Gemini/any third-party AI API.**
  Every customer's transactions and financial details are sensitive. Sending that data to an
  outside AI company is a real privacy and compliance risk for a bank. So instead, we deployed
  and run our own language model, our own speech-to-text, and our own text-to-speech — all on
  our own infrastructure. Nothing about a user's finances ever leaves our servers.
- 🗣️ **It talks — and listens.** This isn't just a text chatbot. You can literally speak to it
  and hear it reply back, like a phone call with your advisor.
- 🌐 **Multilingual — 11 Indian languages.** English, Hindi, Bengali, Gujarati, Kannada,
  Malayalam, Marathi, Odia, Tamil, Telugu, and Urdu. A customer in a small town shouldn't need
  to know English to get good financial advice.
- 🎯 **Answers are grounded in real data, not made up.** The AI is only allowed to reason over
  the actual numbers pulled from a user's profile and transactions — it can't invent a balance
  or a return figure that isn't true.
- 📱 **Feels like a real banking app.** Beyond the chat, there's a proper app-style layout —
  Home, Accounts, Investments, and Goals tabs — showing balances, recent transactions,
  holdings, and a personalized investment recommendation, the way a real bank app would.
- ⚡ **Reacts to life events in real time.** Get a salary bump, a big medical bill, or lose your
  job — the assistant notices the change in your finances and proactively reacts to it, live,
  in the same conversation.

## How it works (in plain terms)

```
Your data (transactions, profile, goals)
        ↓
A personalization engine works out your spending habits,
savings surplus, and risk profile
        ↓
Our own AI model turns that into a conversation —
in your language, by voice or text
        ↓
Shown to you inside a bank-app-style mobile screen
```

No customer data is real — this is a hackathon demo, so everything runs on realistic,
synthetically generated user profiles and transactions (not real bank customers).

## Project layout

| Folder | What's in it |
|---|---|
| [`frontend/`](frontend) | The mobile-app UI — chat, voice, and the banking tabs |
| [`backend/`](backend) | The personalization engine + the API the AI conversation runs through |
| [`data/`](data) | The synthetic (fake but realistic) users, transactions, and investment data used for the demo |
| [`docs/`](docs) | Supporting design notes |

## Try it yourself

Just open **[vitta-app.pages.dev](https://vitta-app.pages.dev)** — no login needed, pick any
demo user from the switcher and start talking or typing.

## Contact

Built by **Ritwik Singh** — [officialritwik098@gmail.com](mailto:officialritwik098@gmail.com)

---

© 2026 Ritwik Singh. All rights reserved.
