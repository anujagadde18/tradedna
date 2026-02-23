# CUSTOM SOURCES FEATURE - MARKETING COPY

## 🎯 HEADLINE OPTIONS:

### Option 1: Power User Focused
"PlayPicks: The Only Prediction Tool That Uses YOUR Sources"

### Option 2: Transparency Focused
"Don't Trust Our Data? Add Your Own."

### Option 3: Customization Focused
"Your Sources. Your Weights. Your Predictions."

### Option 4: Problem/Solution
"Tired of Black-Box AI? Build Your Own Analysis Engine."

---

## 📱 SOCIAL MEDIA POSTS:

### Twitter/X Post:
```
🆕 PlayPicks now lets you add YOUR data sources!

Trust @balajis more than generic news?
Follow specific RSS feeds?
Have insider Telegram channels?

Add them. Set custom weights. Get personalized analysis.

First prediction tool that's truly YOURS.

Try it: https://tradedna.vercel.app/sources

#Polymarket #PredictionMarkets #Web3
```

### Reddit Post (r/Polymarket):
```
Title: PlayPicks now supports custom data sources (BETA)

Hey everyone! Quick update on PlayPicks.

We just launched "Custom Sources" - you can now add:
• RSS feeds from your favorite analysts
• Specific Twitter accounts you trust
• Subreddits or Discord channels
• Custom APIs (coming soon)

Set a weight for each source, and we'll analyze everything together.

Example: If you only trust Bloomberg + @elonmusk + r/Polymarket, you can configure that and ignore generic news.

Your sources are saved for all future predictions.

Try it: https://tradedna.vercel.app/sources

Still in beta, but would love feedback!

Built this because traders kept asking "can I use my own data sources?"

Now you can.
```

### Telegram Message:
```
🆕 New feature just dropped!

PlayPicks now supports Custom Data Sources 🔥

Add:
• Your favorite RSS feeds
• Twitter accounts you trust
• Subreddits you follow
• Custom APIs

Set custom weights for each source.

Try it: https://tradedna.vercel.app/sources

First tool that lets YOU control the data!
```

---

## 🎨 HOMEPAGE SECTION TO ADD:

Add this section to your homepage (after "How It Works"):

```typescript
{/* Custom Sources Feature Highlight */}
<div style={{ maxWidth: 1200, margin: "80px auto", padding: "0 24px" }}>
  <div style={{ 
    padding: "48px 40px", 
    borderRadius: 20, 
    background: "linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(168,85,247,0.15) 100%)",
    border: "1px solid rgba(147,51,234,0.3)"
  }}>
    <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
      <div style={{ 
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 20,
        background: "rgba(147,51,234,0.2)",
        border: "1px solid rgba(147,51,234,0.4)",
        fontSize: 12,
        fontWeight: 700,
        color: "#a78bfa",
        marginBottom: 20,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        🆕 New Feature
      </div>
      
      <h2 style={{ 
        fontSize: 36, 
        fontWeight: 900, 
        margin: "0 0 16px 0",
        lineHeight: 1.2
      }}>
        Use <span style={{ color: "#a78bfa" }}>Your</span> Data Sources
      </h2>
      
      <p style={{ 
        fontSize: 17, 
        color: "#d4d4d8", 
        lineHeight: 1.7,
        marginBottom: 28
      }}>
        Don't trust our default sources? Add your own RSS feeds, Twitter accounts, and more. 
        Set custom weights. Get personalized predictions.
      </p>

      <div style={{ 
        display: "flex", 
        gap: 20, 
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: 32
      }}>
        <FeaturePill icon="📰" text="Custom RSS Feeds" />
        <FeaturePill icon="🐦" text="Twitter Accounts" />
        <FeaturePill icon="💬" text="Subreddits" />
        <FeaturePill icon="📊" text="Custom APIs" />
      </div>

      <a
        href="/sources"
        style={{
          display: "inline-block",
          padding: "14px 32px",
          borderRadius: 10,
          background: "#9333ea",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 4px 14px rgba(147,51,234,0.4)"
        }}
      >
        Configure Your Sources →
      </a>
    </div>
  </div>
</div>

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      borderRadius: 20,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      fontSize: 14,
      fontWeight: 600,
      color: "#e4e4e7"
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {text}
    </div>
  );
}
```

---

## 🎯 VALUE PROPOSITIONS:

### For Different User Types:

**Power Traders:**
"Configure your sources once. Use them forever. No more copying data between tools."

**Skeptical Users:**
"Don't trust our AI? Good. Add your own sources and verify everything yourself."

**Community Leaders:**
"Share your group's source configuration. Let members use your curated sources."

**Analysts:**
"Already following 50 sources manually? Automate it. We'll aggregate everything."

---

## 📊 COMPETITIVE POSITIONING:

**vs Other Prediction Tools:**
"They force you to use their data. We let you add yours."

**vs Manual Research:**
"You already read Bloomberg + follow @elonmusk + check r/Polymarket. We just automate it."

**vs Black-Box AI:**
"Not 'trust our AI.' It's 'use YOUR sources + our analysis.'"

---

## 🚀 LAUNCH SEQUENCE:

### Day 1 (Today):
- Deploy custom sources feature
- Add homepage section
- Test with 2-3 users

### Day 2:
- Post on Reddit (r/Polymarket)
- Post on Twitter/X
- Share in Telegram groups

### Day 3:
- Follow up with PolyData: "We added custom sources - users can now integrate your portfolio data"
- Reach out to 5 power users directly

### Day 4-7:
- Collect feedback
- Fix bugs
- Add most-requested integrations

---

## 💬 FOLLOW-UP MESSAGE TO POLYDATA:

```
Hey! Quick update since we last chatted.

We just launched "Custom Sources" - lets users add their own data feeds (RSS, Twitter, APIs, etc).

Got me thinking: What if users could integrate their PolyData portfolio as a signal source?

Example flow:
1. User connects PolyData portfolio
2. "Your portfolio is up 30% this week"
3. PlayPicks shows the news/social context behind those moves

Creates a powerful feedback loop between platforms.

Would love to explore if there's mutual benefit here.

Still interested in chatting?
```

---

## 📈 GROWTH PROJECTIONS:

**Current: 16 users**

**With Custom Sources:**
- Week 1: 40 users (power users love customization)
- Week 2: 80 users (word spreads about flexibility)
- Week 3: 150 users (first tool with this feature)
- Month 2: 500 users (competitive moat established)

**Why this accelerates growth:**
- Solves real pain (people have favorite sources)
- Creates lock-in (time invested configuring)
- Word-of-mouth ("you can add your own sources!")
- Unique differentiator (no competitor has this)

---

## 🎯 KEY METRICS TO TRACK:

- % of users who add custom sources
- Average # of sources per user
- Most popular source types (news/social/technical)
- Retention of users who customize vs don't

---

DEPLOY THIS TODAY! 🚀
