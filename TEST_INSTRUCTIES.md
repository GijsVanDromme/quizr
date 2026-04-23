# 🎯 QUIZ 2026 - VOLLEDIGE TEST INSTRUCTIES

## ✅ STAP 1: SERVERS CONTROLEREN

### Server Status Checken:
```bash
# In terminal, controleer of server draait:
lsof -i:3001
# Moet output tonen met "node" process

# Controleer of client dev server draait:
lsof -i:5173
# Moet output tonen met "node" process
```

Als een van beide NIET draait:
```bash
# Start server (in /server folder):
cd /Users/gijsmeteor/Desktop/Quiz\ 2026/server
npm start

# Start client (in /client folder, NIEUWE terminal):
cd /Users/gijsmeteor/Desktop/Quiz\ 2026/client
npm run dev
```

---

## ✅ STAP 2: BROWSER CACHE VOLLEDIG WISSEN

### Chrome/Brave:
1. Open DevTools (F12 of Cmd+Option+I)
2. Ga naar **Application** tab
3. Links onder **Storage** → klik **"Clear site data"**
4. Vink ALLES aan:
   - ✅ Cookies
   - ✅ Local storage
   - ✅ Session storage
   - ✅ Cache storage
   - ✅ Service workers
5. Klik **"Clear site data"**
6. Sluit ALLE localhost tabs
7. Sluit browser VOLLEDIG
8. Open browser opnieuw

### Safari:
1. Safari → Preferences → Advanced → ✅ Show Develop menu
2. Develop → Empty Caches
3. Sluit ALLE localhost tabs
4. Sluit browser VOLLEDIG
5. Open browser opnieuw

---

## ✅ STAP 3: CORRECTE URLs GEBRUIKEN

### 🖥️ DESKTOP (Host):
```
http://localhost:5173
```
- Dit is voor de quiz host (jij op je laptop)
- Hier maak je de quiz sessie aan
- Hier zie je het grote scherm met vragen

### 📱 MOBILE (Speler):
```
http://192.168.0.169:5173/play?pin=XXXXXX
```
- Vervang `XXXXXX` met de 6-cijferige PIN van de quiz
- Dit is voor spelers op hun telefoon
- Gebruik het NETWERK IP (192.168.0.169), NIET localhost

**BELANGRIJK:** Als je test op dezelfde computer (2 browser tabs):
- Tab 1 (Host): `http://localhost:5173`
- Tab 2 (Speler): `http://192.168.0.169:5173/play?pin=XXXXXX`

---

## ✅ STAP 4: VOLLEDIGE TEST FLOW

### A. VOORBEREIDING:
1. Open 2 browser tabs (of 1 desktop + 1 mobiel)
2. In BEIDE tabs: Open Console (F12 → Console tab)
3. Zorg dat console ZICHTBAAR blijft tijdens testen

### B. HOST SETUP (Tab 1):
1. Ga naar: `http://localhost:5173`
2. Klik **"Nieuwe Quiz"**
3. Selecteer quiz: **"Meteor quiz 2026"**
4. Klik **"Start Sessie"**
5. **NOTEER DE 6-CIJFERIGE PIN** (bijv. 123456)
6. Je ziet nu lobby scherm met QR code

### C. SPELER JOIN (Tab 2):
1. Ga naar: `http://192.168.0.169:5173/play?pin=123456`
   (vervang 123456 met jouw PIN)
2. Vul naam in: **"TestSpeler"**
3. Kies emoji (optioneel)
4. Klik **"Join Game"**
5. Je ziet: **"Wachten tot de quiz begint..."**
6. **CHECK CONSOLE:** Moet zien:
   ```
   [DEBUG Player] 🔌 Registering socket event handlers
   [DEBUG Player] ✓ All event handlers registered
   ```

### D. HOST: START QUIZ (Tab 1):
1. Zie je "TestSpeler" in de speler lijst?
   - ✅ JA → Ga verder
   - ❌ NEE → Speler is niet verbonden, check console errors
2. Klik **"Start Quiz"**
3. Eerste vraag verschijnt

### E. SPELER: BEANTWOORD VRAAG (Tab 2):
1. Zie je de vraag?
   - ✅ JA → Ga verder
   - ❌ NEE → Check console, moet zien: `[DEBUG Player] ✅ game:question`
2. Klik een antwoord (bijv. optie 1)
3. Je ziet feedback: "Correct!" of "Helaas!"
4. **CHECK DEBUG BALK ONDERAAN:**
   ```
   state:question  evt:Q1  #1  sock:XXXX
   ```

### F. HOST: TOON RESULTATEN (Tab 1):
1. Klik **"Toon resultaten"**
2. **CHECK CONSOLE HOST:**
   ```
   [DEBUG Host] showResults called
   [DEBUG Host] Emitting host:show-results
   [DEBUG Host] Received results response: {...}
   ```
3. **CHECK SERVER TERMINAL:**
   ```
   [DEBUG] host:show-results received
   [DEBUG] Emitting game:question-results to room game:123456
   ```

### G. SPELER: ZIE RESULTATEN (Tab 2):
1. **CHECK CONSOLE SPELER:**
   ```
   [DEBUG Player] ✅ game:question-results [vraag] X/Y
   ```
2. **CHECK DEBUG BALK:**
   ```
   state:results  evt:results  #2  sock:XXXX
   ```
3. **CHECK SCHERM:** Moet zien:
   - Vraag titel
   - "X / Y correct"
   - Lijst met alle spelers
   - Groene vinkjes bij correcte antwoorden
   - Rode kruisjes bij foute antwoorden
   - Jouw naam gehighlight met blauwe ring

### H. HOST: VOLGENDE VRAAG (Tab 1):
1. Klik **"Volgende"** (onderaan resultaten scherm)
2. Tussenstand verschijnt (leaderboard)
3. **CHECK CONSOLE HOST:**
   ```
   [DEBUG Host] nextQuestion called
   ```
4. **CHECK SERVER TERMINAL:**
   ```
   [DEBUG] host:next received
   [DEBUG] Emitting game:leaderboard
   ```

### I. SPELER: ZIE TUSSENSTAND (Tab 2):
1. **CHECK CONSOLE SPELER:**
   ```
   [DEBUG Player] ✅ game:leaderboard X players
   ```
2. **CHECK DEBUG BALK:**
   ```
   state:leaderboard  evt:leaderboard  #3  sock:XXXX
   ```
3. **CHECK SCHERM:** Moet zien:
   - Trofee icoon
   - "Tussenstand"
   - Jouw positie (#1, #2, etc.)
   - Jouw score
   - Top 5 spelers

### J. HOST: VOLGENDE VRAAG (Tab 1):
1. Klik **"Volgende vraag"**
2. Vraag 2 verschijnt
3. **CHECK SERVER TERMINAL:**
   ```
   [DEBUG] host:next received
   [DEBUG] Emitting game:question to room game:123456
   [DEBUG] Question: [vraag 2 tekst]
   ```

### K. SPELER: ZIE VRAAG 2 (Tab 2):
1. **CHECK CONSOLE SPELER:**
   ```
   [DEBUG Player] ✅ game:question [vraag 2] #2
   ```
2. **CHECK DEBUG BALK:**
   ```
   state:question  evt:Q2  #4  sock:XXXX
   ```
3. **CHECK SCHERM:** Nieuwe vraag verschijnt automatisch

---

## ✅ STAP 5: PROBLEMEN OPLOSSEN

### ❌ Speler ziet geen vraag:
**Check:**
1. Console speler → Zie je `[DEBUG Player] ✅ game:question`?
   - NEE → Socket event komt niet aan
   - Check: Is speler in de room? (server logs)
2. Debug balk → Staat `evt:` nog op oude waarde?
   - JA → Event handler werkt niet
   - Hard refresh (Cmd+Shift+R)

### ❌ Speler ziet geen resultaten:
**Check:**
1. Console host → Zie je `[DEBUG Host] Emitting host:show-results`?
   - NEE → Button werkt niet, check browser errors
2. Server terminal → Zie je `[DEBUG] host:show-results received`?
   - NEE → Socket emit komt niet aan op server
3. Server terminal → Zie je `[DEBUG] Emitting game:question-results`?
   - NEE → Server emit functie werkt niet
4. Console speler → Zie je `[DEBUG Player] ✅ game:question-results`?
   - NEE → Speler zit niet in room of handler niet geregistreerd

### ❌ Speler gaat niet mee naar volgende vraag:
**Check:**
1. Console host → Zie je `[DEBUG Host] nextQuestion called`?
2. Server terminal → Zie je `[DEBUG] Emitting game:question`?
3. Console speler → Zie je `[DEBUG Player] ✅ game:question`?
4. Debug balk → Verandert `evt:` naar `Q2`, `Q3`, etc?
5. Debug balk → Gaat `#` omhoog (event counter)?

### ❌ Debug balk niet zichtbaar:
- Oude code in cache
- Hard refresh: Cmd+Shift+R
- Clear site data (zie Stap 2)
- Herstart browser volledig

### ❌ "Site not reachable" op mobiel:
1. Check: Zit telefoon op ZELFDE WiFi als laptop?
2. Check: Is `192.168.0.169` het juiste IP?
   ```bash
   # Check je IP:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. Check: Firewall blokkeert poort 5173?
4. Test: Kan je `http://192.168.0.169:5173` openen op laptop?

---

## ✅ STAP 6: VERWACHTE CONSOLE OUTPUT

### 📊 SPELER CONSOLE (Normale Flow):
```
[DEBUG Player] 🔌 Registering socket event handlers, socket ID: abc123
[DEBUG Player] ✓ All event handlers registered
[DEBUG Player] ✅ game:question Vraag 1 #1
[DEBUG Player] ✅ game:question-results Vraag 1 1/1
[DEBUG Player] ✅ game:leaderboard 1 players
[DEBUG Player] ✅ game:question Vraag 2 #2
[DEBUG Player] ✅ game:question-results Vraag 2 1/1
[DEBUG Player] ✅ game:leaderboard 1 players
[DEBUG Player] ✅ game:finished
```

### 📊 HOST CONSOLE (Normale Flow):
```
[DEBUG Host] showResults called, question type: multiple_choice
[DEBUG Host] Emitting host:show-results
[DEBUG Host] Received results response: {...}
[DEBUG Host] nextQuestion called
```

### 📊 SERVER TERMINAL (Normale Flow):
```
[Socket] Connected: abc123
[Game] Created session 123456 for quiz "Meteor quiz 2026"
[DEBUG] player:join attempt - pin: 123456, name: TestSpeler
[DEBUG] Socket abc123 joined room game:123456
[Game] TestSpeler (😀) joined game 123456 (fresh join)
[DEBUG] host:next received
[DEBUG] Emitting game:question to room game:123456
[DEBUG] Question: Vraag 1
[DEBUG] host:show-results received
[DEBUG] Emitting game:question-results to room game:123456
[DEBUG] Results: Vraag 1 correct: 1
[DEBUG] host:next received
[DEBUG] Emitting game:leaderboard to room game:123456
[DEBUG] host:next received
[DEBUG] Emitting game:question to room game:123456
[DEBUG] Question: Vraag 2
```

---

## ✅ STAP 7: SUCCESS CRITERIA

### ✅ Test is GESLAAGD als:
1. ✅ Speler ziet alle vragen direct na host "Volgende"
2. ✅ Speler ziet resultaten scherm met wie wat gaf
3. ✅ Speler ziet tussenstand (leaderboard)
4. ✅ Debug balk toont correcte state transitions
5. ✅ Event counter (#) gaat omhoog bij elk event
6. ✅ Geen errors in console (host, speler, server)
7. ✅ Page refresh → speler rejoint automatisch
8. ✅ Muziek speelt af (host)

### ❌ Test is GEFAALD als:
1. ❌ Speler blijft hangen op oude scherm
2. ❌ Debug balk toont niet "results" na "Toon resultaten"
3. ❌ Event counter (#) blijft op zelfde nummer
4. ❌ Console errors zichtbaar
5. ❌ Server logs tonen geen "Emitting game:question-results"

---

## 📞 RAPPORTEER RESULTATEN

Als test FAALT, deel:
1. **Screenshot van ALLE 3 consoles** (host, speler, server)
2. **Screenshot van debug balk** (onderaan speler scherm)
3. **Bij welke stap** het mis ging (F, G, H, I, J, K?)
4. **Welke check** faalde in "Problemen Oplossen"

Met deze info kan ik exact zien waar het probleem zit!

---

## 🎉 KLAAR!

Als alle stappen ✅ zijn: **QUIZ WERKT PERFECT!**

Veel succes met testen! 🚀
