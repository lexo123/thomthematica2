# thomthematica2 — Project State

_ბოლო განახლება: Wave X (PIN-based Parent/Child Identity Gate) სრულად დასრულებული და დამოუკიდებლად დადასტურებული (commit f45434f-მდე); გასწორებულია განმეორებითი არასწორი პასუხის double-counting ბაგი ყველა თამაშში; დანერგილია Supabase auto-pause mitigation (GH Actions `keep-supabase-alive.yml`)_

## Repo
https://github.com/lexo123/thomthematica2

## პროექტის მოკლე აღწერა
React/TypeScript საგანმანათლებლო მათემატიკის აპლიკაცია ბავშვებისთვის, თავდაპირველად აშენებული ერთი ბავშვისთვის (thomthematica), ახლა გადადის multi-user/Parent→Child მოდელზე Supabase-ის (Auth + Postgres + RLS) გამოყენებით. კოდი იწერება Google AI Studio-ს (Gemini) მიერ vibe-coding მიდგომით; Claude და ChatGPT ცალ-ცალკე აკეთებენ code review-ს ყოველ commit-ზე, სანამ შემდეგი ეტაპი დაიწყება. Lexo — project manager/reviewer, არა კოდის ავტორი. **პროექტი ახლოვდება production launch-ს — თავდაპირველად ~10 ახლობელი ბავშვისთვის.**

## დასრულებული ფაზები

### Phase 1: Authentication ✅
- Supabase Auth (email/password), AuthContext.tsx, AuthModal.tsx
- Password recovery flow (PASSWORD_RECOVERY event handling, UpdatePasswordModal.tsx)
- supabase/schema.sql — 5 table: profiles, children, game_sessions, wishes, child_reward_images
- RLS policies ყველა ცხრილზე, WITH CHECK კლაუზებით (არა მხოლოდ USING)
- updated_at auto-update trigger (BEFORE UPDATE) — საჭირო abandoned-session დეტექციისთვის
- handle_new_user() trigger — ავტომატური profiles row auth.users insert-ზე
- lib/ensureProfile.ts — client-side self-healing fallback (ON CONFLICT DO NOTHING, legacy ანგარიშებისთვის)
- profiles-ს არ აქვს client-side DELETE policy (განზრახ — account deletion მხოლოდ Edge Function-ით)

### Phase 2.1: Child Profiles & Selector ✅ (Wave X-ით შეცვლილი — იხ. ქვემოთ)
- ChildContext.tsx — activeChildId-ის ერთადერთი წყარო, localStorage persistence
- Self-healing validation — თუ activeChildId აღარ არსებობს childrenList-ში, სუფთავდება
- **ChildSelector.tsx-ის "ვინ თამაშობს?" სია Wave X-ში მთლიანად მოშლილია** — Wave X-ის სექციაში დეტალურადაა აღწერილი, რატომ

### Phase 2.2: Sync Service ✅
- services/supabaseSyncService.ts — schema-ს ველების ზუსტი მთხვევა
- .upsert() idempotent, id-ზე დაფუძნებული

### Phase 2.3: Session Lifecycle ✅
hooks/useGameSession.ts-ში:
- sessionId lifecycle: იქმნება ერთხელ, თანმიმდევრულად გადაეცემა auto-save-სა და completion sync-ს
- Sequential FIFO sync queue (enqueueSync) — race condition-ის გამორიცხვა
- Page Visibility API-ზე დაფუძნებული active play duration
- Guest ↔ Authenticated გარდამავალი მდგომარეობების წესები
- ნაპოვნი და გასწორებული ბაგი: ცალკეული [gameMode] და [childId] ეფექტები აორმაგებდნენ flush-ს → გაერთიანდა ერთ ატომურ [gameMode, childId] ეფექტში

### Phase 2.4a/2.4b: activeChildId → ყველა Game Mode ✅
- sessionChildId = user ? activeChildId : null
- ოთხივე რეჟიმი (Thomthematica, ThomravlebisTabula, Gethometria, Kveshmicera) დაკავშირებულია
- 63/63 ტესტი, 0 TypeScript შეცდომა

### Phase 2.5: Migration Gate Closure — Guest Mode-ის სრული მოცილება (Variant A) ✅
- Guest Mode მთლიანად გაუქმებულია — ყველა მომხმარებელი authenticated flow-ით
- services/statsService.ts (Google Apps Script sync) ფიზიკურად წაშლილია thomthematica2-დან
- Google Apps Script public-write endpoint განზრახ რჩება აქტიური — მხოლოდ ცალკე, scope-გარე legacy `thomthematica` (ერთ-ბავშვიანი) აპისთვის; thomthematica2 აღარ არის მასზე დამოკიდებული
- App.tsx-ის "Phase 2.5" isGameScreenBlocked/isChildSelectionRequired chain **Wave X-ის შემდეგ პრაქტიკულად dead code გახდა parent-mode-ისთვის** (parent-ს აღარ აქვს UI გზა setGameMode()-ის გამოსაძახებლად) — კოდი განზრახ არ წაშლილა, დამცავი fallback-ის სახით რჩება
- 59/59 ტესტი

### Phase 3 — Commit #1 (Parent Dashboard: Data/Read/Derivation Layer) ✅
- **Core rule**: Dashboard — read-only derived-data layer, ახალი statistics data model/schema არ ემატება
- fetchChildSessionsForAggregate, fetchChildSessionsRecent (bounded `.limit(20)`), deriveDashboardStats (pure, division-by-zero-დაცული)
- **ChatGPT-მ აღმოაჩინა race condition**: stale-response guard მხოლოდ childId-ს ამოწმებდა — ვერ იცავდა A→B→A double-switch-ისგან. **Claude-მ დამოუკიდებლად დაადასტურა** — red→green ციკლით. გასწორდა `requestIdRef` generation-counter-ით — **ეს არის ის pattern, რომელიც მოგვიანებით Wave 2-ში (Commit #10), Wave 3 Part 2-ში (reward-images fetcher) და Wave X-ში (ChildContext-ის fetch guard-ები) ხელახლა იქნა გამოყენებული**
- 78/78 ტესტი

### Phase 3 — Commit #2 (Parent Dashboard UI) ✅
- `showDashboard` state ლოკალურად MainMenu.tsx-ში, body-level conditional (არა overlay)
- explicit rendering priority chain, useChildDashboard(childId) ყოველთვის უპირობოდ გამოძახებული (Rules of Hooks)
- 88/88 ტესტი

### Phase 3 — Commit #3 (gameModeLabels.ts Shared Util Refactor) ✅
- `utils/gameModeLabels.ts` — `GAME_MODE_LABELS` + `getGameModeLabel()`
- 91/91 ტესტი

### Phase 3 — Commit #4 (Game-mode Breakdown Dashboard-ში) ✅
- `useChildDashboard.ts` აბრუნებს `gameModeBreakdown`, `ParentDashboard.tsx`-ში რენდერდება

### Phase 3 — Commit #5 (Session-close Persistence + Rolling-window Persistence + Kveshmicera Enter-fix) ✅
- `persistCurrentSession()` vs `flushCompletedSession()` გამიჯვნა
- `services/gameProgressStorage.ts` (localStorage, 48სთ TTL), `{transport: 'keepalive'}`
- 125/125 ტესტი

### Phase 3 — Commit #5A (Kveshmicera Wish-block: 40 → 20) ✅
- `utils/wishBlockSize.ts`, `CHECK (correct_count IN (19,20,39,40))`
- 141/141 ტესტი

### Phase 3 — Commit #5B (Production DB Migration) ✅
- `ALTER TABLE wishes DROP/ADD CONSTRAINT` — BEGIN/COMMIT-ში

### Phase 3 — Kveshmicera Corrections #1–#4 (Post-5B ბაგები) ✅
- Correction #3-ში დაინერგა "Repeated Submission Guard" (`hasKveshFailedThisQuestion`) — **მხოლოდ Kveshmicera-სთვის**. ეს scope-ის შეზღუდვა მოგვიანებით (Post-Wave-X) აღმოჩნდა ხარვეზად დანარჩენი სამი თამაშისთვის — იხ. "Post-Wave-X Fix" სექცია
- 150/150 ტესტი

### Phase 3 — Commit #6A (ბავშვის სქესის ველი: schema + registration) ✅
- Migration pattern: `ADD COLUMN (nullable) → backfill by id → verify → SET NOT NULL → CHECK` — **ეს pattern Wave X-ში pin_hash-ისთვისაც გამოყენებული იყო ნაწილობრივ (იხ. ქვემოთ, ღია დარჩენილი საკითხი)**
- 155/155 ტესტი

### Phase 3 — Commit #6B (Personalization: {name} + {gender}) ✅
- `utils/personalizeMessage.ts` — ცენტრალიზებული `personalize(phrase, child)`
- 160/160 ტესტი

### Wave 2 — Child-Context-ის საძირკვლის გამაგრება (Commit #7–#10) ✅
- Commit #7: Child Selector "first mode" race — `hasFetchedOnce`-ით გასწორდა
- Commit #8: "No-repeat-until-exhausted" pool სისტემა — `utils/poolSelector.ts` (`selectFromPool<T>`)
- Commit #9: `addChild`-ის type-safety
- Commit #10: Multi-account login-switch race — `fetchedForUserId` + `requestIdRef`
- 168/168 ტესტი

### Wave 3 — Part 1: vocativeName + Phrase Personalization (Commit #11–#16) ✅
- `utils/vocativeNames.ts`, `utils/childNameValidator.ts`, `personalizeMessage.ts`-ში `{vocative}`
- **საბოლოო მდგომარეობა: 25/25 test file, 203/203 ტესტი, 0 TS შეცდომა**

### Wave 3 — Part 2: Per-Child Reward Images ✅ (დასრულებული, დადასტურებული commit bbb26ab)
- **Schema:** `child_reward_images` table (`child_id`, `category` CHECK IN winner/loser/super_winner, `storage_path`, `caption`, `sort_order`) — SELECT-only RLS client-ისთვის, INSERT/UPDATE/DELETE მხოლოდ Lexo-ს service-role-ით dashboard-იდან
- **Storage:** private `child-reward-images` bucket, `{child_id}/{category}/{filename}` კონვენცია, storage RLS policy path-ის child_id-სეგმენტს **text-ად** ადარებს (არა `::uuid` cast)
- **Signed URLs:** `createSignedUrls()` batch call, 2 საათის (7200წმ) expiry, `Map<storage_path, signedUrl>`-ით დაკავშირებული
- **All-or-nothing personalization:** სამივე კატეგორია (winner/loser/super_winner) ≥1 row, თორემ სრულად fallback
- **Prefetch lifecycle:** `hooks/useChildRewardImagesFetcher.ts` (requestIdRef guard), `childRewardImages` ემატება `ChildContextType`-ს
- **ResultOverlay.tsx:** `utils/poolSelector.ts`-ით, pool-key `${activeChildId ?? 'global'}:${category}:${sourceType}`
- **ვერიფიკაცია:** fresh clone, tsc 0 შეცდომა, vitest 28/28 file, 217/217 ტესტი, production build სუფთა

### Post-Wave-3 Fixes ✅
- **Incorrect-phrase personalization ბაგი (commit ca9d72d):** `App.tsx`-ის incorrect-answer branch-ში `personalize()` არასდროს იძახებოდა — Fix: `personalize(template, activeChild).replace("[]", actualUserAnswer)`
- **`data/rewards.ts`-ის ჩანაცვლება (commit 80fb0bc):** ძველი, პირადი ფოტო/გიფ-ლინკები ჩანაცვლდა ზოგადი სურათებით/caption-ებით
- **`migrated_prompt_history/` წაშლილია (commit 41a4d8d, "remove legacy prompt history containing child's personal data")** — ✅ დასრულებულია. Public repo-დან AI Studio-ს პირვანდელი, თომას პირადი მონაცემების შემცველი chat-ისტორია მოცილებულია
- **`metadata.json`-ის description ჯერ კვლავ ახსენებს თომას სახელს** ("სახალისო მათემატიკური თამაში თომასთვის") — ეს ჯერ არ გასწორებულა, დარჩენილი, დაბალპრიორიტეტული item

---

### Wave X — PIN-based Parent/Child Identity Gate ✅ (სრულად დასრულებული და დამოუკიდებლად დადასტურებული)

**მიზანი:** ბავშვმა ვერ შეძლოს Parent Dashboard-ში შესვლა იმავე authenticated (email/password) session-ში, და ორ ან მეტ ბავშვს შორის ვერცერთმა ვერ შეძლოს ერთმანეთის ნაცვლად შესვლა.

**შეგნებულად მიღებული შეზღუდვა (უცვლელი, თავდაპირველი architecture-იდან):** ეს არის **client-side UI identity-gate, არა DB-level access-control**. RLS მთელ ოჯახზე (`parent_id = auth.uid()`) კვლავ ღიაა. ტექნიკურად ცნობიერი ბავშვი (DevTools) შემოვლადია — შეგნებული, მისაღები trade-off ოჯახური/ახლობელი-context-ისთვის (~10 ბავშვი).

#### საბოლოო, დანერგილი Flow (თავდაპირველი დიზაინისგან განსხვავებული — იხ. "დიზაინის ევოლუცია" ქვემოთ)

```
email/password login
   ↓
PinGate — Stage 1: "ვინ შედის?" (Identity List)
   fetch-ავს მხოლოდ identity metadata-ს (profiles.full_name,
   children.id/name/avatar_id) — არა pin_hash-ებს ამ ეტაპზე
   რენდერდება: მშობლის item + თითო ბავშვის item
   ↓ (item-ზე დაჭერა)
PinGate — Stage 2: PIN Entry (scoped ერთ კონკრეტულ identity-ზე)
   fetch-ავს pin_hash-ს **მხოლოდ** არჩეული identity-სთვის
   (profiles.pin_hash ან ერთი კონკრეტული children.pin_hash row)
   ├── Parent match → sessionMode='parent'
   └── Child match  → activeChildId + sessionMode='child' ატომურად,
                       იმავე synchronous event-handler-იდან
   "← უკან" → Stage 1-ზე დაბრუნება
   ↓
sessionMode === 'parent':
   MainMenu-ში ჩანს მხოლოდ "📊 დაშბორდი" + "➕ ბავშვის დამატება"
   (თამაშის ღილაკები საერთოდ არ რენდერდება — parent-ს არც სჭირდება
   და არც შეუძლია პირდაპირ თამაშის დაწყება)
sessionMode === 'child':
   პირდაპირ თამაშის მენიუ, Dashboard-ღილაკი DOM-ში საერთოდ არ არსებობს
"🔒 გასვლა identity-დან" (ორივე sessionMode-ში ხილული) →
   resetSessionMode() + activeChildId=null → უკან PinGate Stage 1-ზე
Logout → sessionMode + activeChildId სრული reset
```

**PIN-ის გარეშე identity-switch საერთოდ აღარ არსებობს** — არც "🔄 შვილის შეცვლა" ღილაკი (მოშლილია), არც "ვინ თამაშობს?" auto-popup (მოშლილია). ეს იყო თავდაპირველი დიზაინის ცვლილების მთავარი მიზეზი (იხ. ქვემოთ).

#### Schema (Commit #6A-ს pattern-ით)

```sql
ALTER TABLE profiles ADD COLUMN pin_hash text;  -- nullable, ხელით production-ში გაშვებული
ALTER TABLE children ADD COLUMN pin_hash text;  -- nullable, ხელით production-ში გაშვებული
```

**⚠️ ღია, დაუხურავი საკითხი:** `SET NOT NULL` + `CHECK` migration (Commit #6A-ს pattern-ის ბოლო ორი ნაბიჯი) **არასდროს შესრულებულა**. `pin_hash` ორივე table-ზე ჯერ კიდევ **nullable**-ია production-ში. ასევე, ორიგინალურად დაგეგმილი **Commit #18 (structured backfill UI არსებული ანგარიშებისთვის) არასდროს განხორციელებულა** — ამის ნაცვლად, Lexo-ს ერთადერთი არსებული Wave-X-მდელი ოჯახისთვის (თავად + ერთი ბავშვი) PIN ხელით, პირდაპირი SQL-ით დაყენდა (`UPDATE profiles/children SET pin_hash = encode(digest(...), 'hex')`). ეს საკმარისი იყო დაბლოკვის მოსახსნელად, მაგრამ **structured backfill UI და NOT NULL/CHECK constraint კვლავ დარჩენილია მომავალი Wave-ისთვის**, თუ production launch-ის დროს აღმოჩნდება სხვა Wave-X-მდელი ანგარიშები.

#### დიზაინის ევოლუცია ამ conversation-ში (მნიშვნელოვანია მომავალი კონტექსტისთვის)

1. **პირველადი, დამტკიცებული architecture** ("ბრმა" PIN): user ტიპავდა 4 ციფრს ყოველგვარი წინასწარი identity-არჩევანის გარეშე, სისტემა ცდილობდა hash-ის დამთხვევას მთელი family-ის (parent + ყველა child) pin_hash-ებთან.
2. **Commit #17-ის პირველი ვერსია** (commit 0b1c88f) დანერგა schema + pinHash.ts + pinUniqueness.ts + SessionModeContext + "ბრმა" PinGate + App.tsx root-wiring + registration PIN. Claude-ის fresh-clone review-მ აღმოაჩინა **6 პრობლემა**: (1) addChild-ს PIN საერთოდ არ ჰქონდა, (2) signup-ის PIN-UPDATE error არ მოწმდებოდა, (3) `pin_hash` ჟონავდა საერთო `childrenList` state-ში (`select('*')`-ის გამო), (4) ძველი child-switch ღილაკი ჩუმად repurposed იყო PIN-ის მოთხოვნის გარეშე, (5) fail-open fallback `useSessionMode()`-ში, (6) PIN hash დუბლირებულად ინახებოდა Supabase auth `user_metadata`-ში.
3. **FIX 1-6** (commit 9aa1ab1) ყველა ეს საკითხი გაასწორა. Verified: 34/34, 250/250.
4. **რეალურ გამოყენებაში** Lexo-მ აღმოაჩინა, რომ თავდაპირველი "ბრმა PIN + child-switch button" დიზაინი **პრაქტიკულად ტოვებდა ზუსტად იმ bypass-ს**, რომლის აღკვეთაც Wave X-ის მიზანი იყო: (ა) parent-ის PIN-ის შეყვანის შემდეგ "ვინ თამაშობს?" auto-popup საშუალებას აძლევდა ნებისმიერს, PIN-ის გარეშე აერჩია ნებისმიერი ბავშვის სახელი, Dashboard-ხილვადობის დაკარგვის გარეშე (რადგან `sessionMode` რჩებოდა `'parent'`-ზე); (ბ) ორი ბავშვის ოჯახში ეს ნიშნავდა, რომ ბავშვებს შეეძლოთ ერთმანეთის ნაცვლად "შესვლა".
5. **სრული refactor** (commit 7d06e73) — ზემოთ აღწერილი, საბოლოო, დანერგილი identity-first ორსტადიანი flow. ამის პარალელურად გასწორდა ტერმინოლოგია ("შვილი" → "ბავშვი" ყველგან, რადგან ბავშვს შეიძლება არ ჰყავდეს კონკრეტულად "მშობელი" ამ სიტყვის ვიწრო გაგებით — ბებია/სხვა მეურვეც შეიძლება იყოს დარეგისტრირებული) და დაემატა Dashboard-ის შიდა child-switcher (`selectedChildId` fallback: `childId ?? childrenList[0]?.id ?? null`).

#### Verification (commit 7d06e73)
fresh clone: tsc 0 შეცდომა, vitest 34/34 file, 251/251 ტესტი, production build სუფთა. თითოეული ფაილი (App.tsx, MainMenu.tsx, ChildSelector.tsx, PinGate.tsx, ChildContext.tsx, ParentDashboard.tsx, AuthModal.tsx) კოდის დონეზე დამოუკიდებლად გადამოწმებული.

#### ⚠️ ცნობილი, განმეორებადი პროცესის ხარვეზი — PROJECT_STATE.md sync

Commit-ებმა 7d06e73-მ და f45434f-მ ორივემ **ჩუმად overwrite** გაუკეთეს `PROJECT_STATE.md`-ს ძველი, Wave-X-მდელი ვერსიით — AI Studio-ს ლოკალურ project-ში, როგორც ჩანს, სტალი ასლი ჰქონდა შენახული, და მისმა ZIP export-მა ეს ძველი ვერსია დააწერა repo-ს განახლებულზე (იგივე "ZIP revert risk" pattern, რაც ადრე `schema.sql`-საც შეემთხვა). **ეს ფაილი (ეს ვერსია) ხელით უნდა აიტვირთოს AI Studio-ს project-შიც**, თორემ შემდეგი commit-იც იგივეს გაიმეორებს.

---

### Post-Wave-X Fix — განმეორებითი არასწორი პასუხის Double-Counting ბაგი ✅ (commit f45434f)

**პრობლემა:** ერთსა და იმავე კითხვაზე განმეორებითი (retry) არასწორი პასუხის მიცემისას, ყოველი ცდა ცალკე incorrect-ად ითვლებოდა სტატისტიკაში (`totalQuestions`/`totalCorrect`, Dashboard-ის რიცხვები) — Kveshmicera-ს გარდა, სადაც `hasKveshFailedThisQuestion` guard (Phase 3 Correction #3-დან) სწორად მუშაობდა, მაგრამ **არასდროს ყოფილა გავრცელებული** დანარჩენ სამ თამაშზე (Thomthematica, ThomravlebisTabula, Gethometria).

**Root cause:** `App.tsx`-ის `handleNext`-ის Incorrect-branch (retry) ახალ `problem`-ს არ აგენერირებდა — იგივე კითხვა რჩებოდა, მაგრამ `processAnswerResult`-ის `shouldRecord` პირობა Kveshmicera-ს გარეთ ყოველთვის `true` იყო.

**Fix:**
- ახალი, მოდელ-აგნოსტიკური state `hasFailedCurrentQuestion` (App.tsx), reset ყველა წერტილში სადაც ახალი problem/სესია იწყება
- `processAnswerResult`-ის `shouldRecord` გენერალიზდა: Kveshmicera → `hasKveshFailedThisQuestion` (უცვლელი), დანარჩენი სამი → `hasFailedCurrentQuestion`
- `handleTimeOut`-საც (ThomravlebisTabula-ს დროის ამოწურვა) დაემატა იგივე guard
- **დამატებით აღმოჩენილი და გასწორებული stale-closure ბაგი** `hooks/useTimer.ts`-ში: `handleTimeOut`-ის dependency-ში `hasFailedCurrentQuestion`-ის დამატებამ გამოავლინა, რომ `useTimer` `onTimeOut`-ს პირდაპირ (არა `useRef`-ით) იყენებდა `setInterval`-ის closure-ში — `startTimer()`-ის სინქრონული ხელახალი გამოძახება ახალ კითხვაზე (handleNext-ის შიგნით, re-render-მდე) stale `onTimeOut`-ს ამაგრებდა. გასწორდა `onTimeOutRef`-ით (`useRef` + `useEffect` sync), `startTimer`-ის deps შემცირდა `[timeLimit, stopTimer]`-მდე

**ტესტები:** ახალი `tests/NonKveshmiceraRetryFlow.test.tsx` — სამივე non-Kveshmicera რეჟიმისთვის repeat-incorrect scenario + სპეციალურად ThomravlebisTabula-ს "timeout → retry → timeout იმავე კითხვაზე → correct → timeout ახალ კითხვაზე" (stale-closure რეგრესიის ტესტი).

**Verification:** fresh clone, tsc 0 შეცდომა, vitest 35/35 file, 255/255 ტესტი, production build სუფთა.

---

## საკვანძო არქიტექტურული გადაწყვეტილებები (არ შეიცვალოს განხილვის გარეშე)

- DB schema: 5 table (`profiles`, `children`, `game_sessions`, `wishes`, `child_reward_images`) + `pin_hash` column ორივე `profiles`/`children`-ზე (ჯერ nullable — იხ. Wave X-ის ღია საკითხი)
- useGameSession(gameMode, childId) — mode-აგნოსტიკური
- Guest Mode არ არსებობს
- 40-question rolling window — ხელუხლებელი
- Race-condition-ების დამტკიცებული idiom: `requestIdRef` generation-counter — გამოყენებულია Commit #1, Commit #10, Wave 3 Part 2 reward-images fetcher-ში
- Stale-closure-ის დამტკიცებული idiom: callback-ს, რომელიც `setInterval`/`setTimeout`-ის შიგნით გამოიძახება და თავად დამოკიდებულია ცვლად state-ზე, სჭირდება `useRef` + `useEffect` sync pattern (Wave X-ის Post-fix, `useTimer.ts`) — არა პირდაპირი `useCallback` dependency, თუ callback-ი timer-ის `setInterval`-შია registration-ული
- Per-name static content (Record<string,string>) vs. per-child DB storage — კრიტერიუმი: სახელის/ცნების თვისება → static repo-ფაილი; კონკრეტული ბავშვის ინდივიდუალური მონაცემი → DB table
- Schema-migration-ის დამტკიცებული pattern: `ADD COLUMN (nullable) → backfill → verify count=0 → SET NOT NULL → CHECK` (Commit #6A-ში დამტკიცებული; Wave X-ში ნაწილობრივ გამოყენებული — SET NOT NULL/CHECK ჯერ არ შესრულებულა)
- Production migration (DB/Storage/RLS SQL) — ყოველთვის Lexo-ს ხელით, Supabase Dashboard/SQL editor-იდან; AI Studio-ს არასდროს გადაეცემა ეს პასუხისმგებლობა
- **PIN gate — client-side UI identity-gate, არა DB-level access-control.** RLS ოჯახის მასშტაბით ღიაა. PIN uniqueness — application-level, non-atomic, best-effort (არა DB UNIQUE constraint ორ table-ს შორის)
- **PIN-ის გარეშე identity-switch აკრძალულია architecture-ის დონეზე** — ყოველი session (parent-იც, თითო ბავშვიც) საკუთარი PIN-ით უნდა დადასტურდეს, ცალკე, ყოველგვარი "მოსახერხებელი" shortcut-ის გარეშე. ეს Wave X-ის refactor-ის მთავარი, გამოცდილებით ნასწავლი პრინციპია
- **AI Studio ZIP revert risk** — ვრცელდება ნებისმიერ ფაილზე, რომელიც git-ში/GitHub-ზე იცვლება AI Studio-ს ZIP workflow-ის გარეთ (schema.sql-ს ადრე შეემთხვა, PROJECT_STATE.md-ს ახლა). **ყოველი ასეთი out-of-band ცვლილების შემდეგ, განახლებული ფაილი ხელით უნდა აიტვირთოს AI Studio-ს project-შიც**
- Auto-pause mitigation: GitHub Actions scheduled workflow (`.github/workflows/keep-supabase-alive.yml`) — ✅ **დანერგილია და push-ილია**. კვირაში ერთხელ (`cron: '0 0 * * 0'`) მსუბუქ request-ს უგზავნის Supabase REST API-ს (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` secrets-ით), რომ Supabase-ის free-tier-ის 7-დღიანი auto-pause არ ამოქმედდეს. `workflow_dispatch`-ითაც ხელით გაშვებადია. Manual test-run-ის შედეგი ჯერ დასადასტურებელია (Actions ტაბიდან).

## დაგეგმილი მომდევნო Wave-ები (პრიორიტეტის მიხედვით)

### Wave X-შემდგომი — pin_hash Backfill UI + NOT NULL/CHECK 🔵 (ახალი, ღია)
Wave X-ის თავდაპირველად დაგეგმილი Commit #18 არასდროს განხორციელებულა. საჭიროა structured backfill UI ან პროცესი Wave-X-მდელი ანგარიშებისთვის (ამჟამად მხოლოდ Lexo-ს ერთი ოჯახი ხელით არის გასწორებული SQL-ით), შემდეგ `SET NOT NULL` + `CHECK` production migration ორივე `pin_hash` column-ზე.

### Wave Y — Wish Approval Workflow 🔵 (მონახაზი დახატული, Architecture Review არ დაწყებულა)
**მიზანი:** 20/40-კითხვიან block-ის ბოლოს ბავშვის მიერ ჩაწერილი სურვილი (wish) ჯერ მშობელს მიუვიდეს დასადასტურებლად, არა პირდაპირ.
```sql
ALTER TABLE wishes ADD COLUMN status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));
```
**Workflow-მონახაზი:** ბავშვის submission → `status='pending'` → Parent Dashboard-ში pending wishes + approve/reject → status-ცვლილება. რეალური სურათის დამატება (`child_reward_images`) კვლავ ხელით რჩება Lexo-ს მხრიდან.
**სტატუსი:** Architecture Review ჯერ არ დაწყებულა.

### Wave "grade-range" (კლასის მიხედვით რიცხვითი დიაპაზონი) — PIN-Wave-ისა და Wish-Approval-ის შემდეგ, ყველაზე სენსიტიური (problemGenerator.ts-ის ცენტრალურ ლოგიკას ეხება)

### Wave "word problems" — grade-range-ის შემდეგ

### ახალი საგნები + hint/explanation-ფუნქციები — Phase 3-ის მთლიანად დასრულების შემდეგ

## ცნობილი, განზრახ გადადებული საკითხები

- `SUPER_WINNER_GIFS`-ის დუბლირებული caption — გადაწყვეტილი, აღარ აქტუალური
- `game_sessions`-ის ერთი stuck `'active'`-row — საჭიროებს ხელახალ ტესტირებას production launch-მდე
- `metadata.json`-ის description-ის განახლება (თომას სახელი) — ჯერ არ გასწორებულა
- Backup-სტრატეგია — ინფორმირებული, კონკრეტული გეგმა ჯერ არ არის; launch-მდე რეკომენდებული
- კომერციალიზაცია (Georgia-first) — მომავალი ეტაპი, ჯერ არ აქტუალური 10-ბავშვიანი launch-ისთვის
- **PROJECT_STATE.md-ის AI Studio sync** — ახალი, განმეორებადი პრობლემა (იხ. Wave X-ის სექცია); ყოველი Wave X-შემდგომი commit-ის შემდეგ საჭიროა ხელით შემოწმება, ხომ არ დაბრუნდა ძველ ვერსიაზე

## Production Launch-ის მდგომარეობა (~10 ახლობელი ბავშვი)

**რეალურად ბლოკავს:**
1. pin_hash backfill/NOT NULL-CHECK — თუ production launch-ისას აღმოჩნდება Wave-X-მდელი ანგარიშები (ამჟამად, ახალი ~10 ოჯახისთვის ეს პრობლემა არ იარსებებს, რადგან PIN უკვე signup-ზევე სავალდებულოა)

**აღარ ბლოკავს (Wave X-ით და ამ conversation-ის ფარგლებში დასრულებული):**
- ~~Wave X (PIN gate)~~ ✅ დასრულებულია
- ~~`migrated_prompt_history/` წაშლა~~ ✅ დასრულებულია
- ~~Auto-pause mitigation (GH Actions workflow)~~ ✅ დანერგილია (`keep-supabase-alive.yml`, push-ილია; manual test-run დასადასტურებელია)

**არ ბლოკავს, მაგრამ რეკომენდებულია launch-მდე ან პარალელურად:**
- Backup-სტრატეგია
- `game_sessions` stuck-row-ის ხელახალი ტესტირება
- `metadata.json`-ის description-ის განახლება

**Webintoapp.com (native app wrapper) გამოყენების გეგმა:** ტექნიკურად პასიური ცვლილება, ღირს ხელით ტესტირება ერთი ბავშვით სრულ flow-ზე (PIN gate-ის ჩათვლით), სანამ ყველას დაურიგდება.

## Workflow (როგორ ვმუშაობთ)

1. AI Studio (Gemini) წერს კოდს პატარა, ინკრემენტულ commit-ებად, ZIP export/import-ით
2. Claude ამოწმებს დამოუკიდებლად, fresh-clone-ით (tsc, vitest, build) — არასდროს ენდობა AI Studio-ს თვითმოხსენებას
3. ChatGPT აკეთებს დამოუკიდებელ cross-review-ს
4. ორივეს შენიშვნები ერთიანდება საბოლოო implementation prompt-ში
5. Lexo იღებს საბოლოო გადაწყვეტილებას; DB/Storage/RLS migrations — ყოველთვის ხელით, SQL editor-იდან; client-კოდის ცვლილებები — AI Studio-დან, ლოკალურად (edit → git add → commit → push)
6. ყოველი Wave-ის/მნიშვნელოვანი commit-ის დასრულებისას ეს დოკუმენტი განახლდება
7. **ახალი (Wave X-ის გამოცდილებით):** ამ ფაილის ყოველი ხელით/git-ით (AI Studio-ს ZIP workflow-ის გარეთ) განახლების შემდეგ, განახლებული ვერსია ხელით აიტვირთება AI Studio-ს project-შიც, რომ შემდეგმა ZIP export-მა არ დააბრუნოს ძველი ვერსია

**Lexo-ს სამუშაო კონტექსტი:** არ იცნობს SQL-ს ან Supabase-ის dashboard-ს — ყოველი ტექნიკური ნაბიჯი დეტალურად, ეტაპ-ეტაპად აღსაწერია.

## შემდეგი ნაბიჯი

Wave X (PIN-based Parent/Child Identity Gate) სრულად დასრულებულია და დამოუკიდებლად დადასტურებული — identity-first ორსტადიანი flow, ტერმინოლოგიის sweep, Dashboard child-switcher. დამატებით გასწორდა განმეორებითი-არასწორი-პასუხის double-counting ბაგი ყველა თამაშში (Kveshmicera-ს გარდა, რომელიც უკვე სწორად მუშაობდა).

GH Actions auto-pause mitigation workflow (`keep-supabase-alive.yml`) დანერგილია და push-ილია — manual test-run-ის დადასტურება (Actions ტაბიდან) ჯერ ღიაა.

რეკომენდებული თანმიმდევრობა დარჩენილი ნაბიჯებისთვის: (1) auto-pause workflow-ის manual test-run-ის დადასტურება; (2) pin_hash backfill/NOT NULL-CHECK გადაწყვეტილება (საჭიროა თუ არა production launch-მდე, Wave-X-მდელი ანგარიშების რაოდენობის მიხედვით); (3) Wave Y (wish approval) architecture review.

[ახალი chat-სესიისთვის: ეს ფაილი აიტვირთოს Claude-ის და ChatGPT-ის Project-ებში, **და** AI Studio-ს project-ში (Wave X-ის დროს გამოვლენილი sync-რისკის გამო). ნამდვილად ატვირთეთ ეს ფაილი repo-შიც (`git add PROJECT_STATE.md && git commit && git push`).]
