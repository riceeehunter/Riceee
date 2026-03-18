# 🎮 Speed Stacker Online - Real-Time Multiplayer Testing Guide

## ✅ What's Been Created

### 1. **Pusher Multiplayer Wrapper** (`components/pusher-multiplayer-wrapper.jsx`)
- Real-time communication using Pusher
- Player selection screen
- Waiting room with shareable link
- Cross-device support

### 2. **Speed Stacker Online** (`app/(main)/games/speed-stacker-online/page.jsx`)
- Full multiplayer version with Pusher
- Real-time game state sync
- Split-screen view for both players
- Winner detection with proper score display

### 3. **Games Hub Updated**
- New "Speed Stacker Online 🔥" card with "NEW" badge
- Original "Speed Stacker (Local)" kept for localhost testing
- Green WiFi icon to indicate online play

---

## 🧪 How to Test Real-Time Multiplayer

### Option 1: Two Devices (Recommended)
1. **Device 1 (Your Phone):**
   - Open browser, go to your deployed app URL
   - Navigate to Games → Speed Stacker Online
   - Select "Hunter 🦁"
   - Copy the URL shown on waiting screen

2. **Device 2 (Partner's Phone/Computer):**
   - Open the same URL
   - Select "Riceee 💗"
   - Both players should see "Connected via Pusher" ✅

3. **Play Together:**
   - Each player presses SPACE or taps "Drop Block"
   - See each other's stacks grow in real-time!
   - Both see the same final scores and winner

### Option 2: Two Browsers (Same Computer)
1. **Browser 1 (Chrome):** Select Hunter
2. **Browser 2 (Firefox/Edge):** Open same URL, select Riceee
3. Position windows side by side
4. Play simultaneously!

### Option 3: One Device, Two Tabs
⚠️ **Note:** This uses the same localStorage session, so it's more for UI testing
- Tab 1: Select Hunter
- Tab 2: Select Riceee
- Works, but real-time sync is better across devices

---

## 🔧 Environment Variables Required

Make sure these are in your `.env.local`:
```env
PUSHER_APP_ID=2071832
NEXT_PUBLIC_PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
```

---

## 📊 What's Different: Local vs Online

| Feature | Speed Stacker (Local) | Speed Stacker Online |
|---------|----------------------|---------------------|
| **Technology** | localStorage polling | Pusher WebSockets |
| **Devices** | Same device only | Any device, anywhere |
| **Latency** | 100ms polling | ~50ms real-time |
| **Connection** | Same browser session | Unique game session |
| **URL Sharing** | Not needed | Copy & share link |
| **Best For** | Quick local testing | Real gameplay |

---

## 🎯 Expected Behavior

### Connection Phase:
1. Player 1 selects character → sees "Waiting for partner..."
2. Player 2 opens link → selects character
3. Both see "💚 Connected via Pusher (Real-time)"
4. Game starts immediately

### During Game:
- Each block placement syncs within ~50ms
- Remote player's stack updates in real-time
- Scores update live on both screens
- Moving block only shows on your side

### Game End:
- When both players finish, wait 500ms for score sync
- Both players see identical winner screen
- Both scores displayed side-by-side
- Winner gets golden ring + 🏆 trophy

---

## 🐛 Troubleshooting

### "Waiting for partner..." stuck?
- Check Pusher credentials in `.env.local`
- Verify both players are on same URL
- Check browser console for errors

### Scores don't match?
- Each player's score is correct on their screen
- Final screen always shows both scores after sync

### Connection lost during game?
- Pusher broadcasts every 2 seconds
- Temporary network issues auto-recover

---

## 🚀 Deployment Notes

1. **Deploy to Vercel/Netlify:**
   - Add Pusher environment variables
   - Push code to GitHub
   - Deploy automatically

2. **Share URL with Partner:**
   - She opens URL on her device
   - You open URL on yours
   - Select different players
   - Play together from anywhere! 🌍

3. **For Production Use:**
   - Keep "Speed Stacker Online" as main version
   - Can hide "Speed Stacker (Local)" in production

---

## 💡 Next Steps

- Test with Hunter on her device!
- If it works, we can add multiplayer to other games:
  - Word Duel Arena (competitive word game)
  - Quick Draw Battle (drawing challenge)
  - This or That (compare choices)

---

## 🎮 Quick Test Commands

```bash
# Local development
npm run dev

# Open in browser
http://localhost:3000/games/speed-stacker-online

# Deploy
vercel --prod
# or
git push origin main  # (if auto-deploy is set up)
```

---

Ready to test? Open the game and let Hunter join from her phone! 🚀✨
