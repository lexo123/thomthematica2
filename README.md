# Thomthematica (თომთემატიკა) 🧮

**Thomthematica** არის ინტერაქტიული, საგანმანათლებლო მათემატიკური აპლიკაცია დაწყებითი და საბაზო საფეხურის მოსწავლეებისთვის. აპლიკაცია ეხმარება ბავშვებს მათემატიკური და გეომეტრიული უნარების განვითარებაში მხიარული თამაშისა და ჯილდოების სისტემის მეშვეობით.

---

## 🌟 ძირითადი ფუნქციები (Features)

- ➕ **თომთემატიკა (არითმეტიკა):** მიმატება, გამოკლება, გამრავლება, გაყოფა და განტოლებები.
- ✖️ **თომრავლების ტაბულა:** გამრავლების ტაბულის სავარჯიშოები დროის ლიმიტით (10 წამი თითო კითხვაზე).
- 📐 **გეთომეტრია:** გეომეტრიული ფიგურების (კვადრატი, მართკუთხედი, სამკუთხედი, მრავალკუთხედები) პერიმეტრის, ფართობის, გვერდებისა და კუთხეების დათვლა.
- 📝 **ქვეშმიწერით გამრავლება:** 2-ნიშნა რიცხვების ეტაპობრივი, ინტერაქტიული გამრავლება ქვეშმიწერის წესების დაცვით.
- 🏆 **ჯილდოები და მოტივაცია:** ყოველ 3 სწორ პასუხზე მოსწავლე იღებს მხიარულ ტიტულებსა და სურათებს. 40 კითხვის წარმატებით ამოხსნისას ეხსნება სურვილის ჩასაწერი ფანჯარა.
- 📊 **სტატისტიკა:** მონაცემების ავტომატური სინქრონიზაცია Google Sheets-თან.

---

## 🛠️ ტექნოლოგიური სტეკი (Tech Stack)

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Testing:** Vitest
- **Backend / Storage Integration:** Google Apps Script & Google Sheets API
- **Deployment:** GitHub Pages / GitHub Actions

---

## 🏗️ არქიტექტურა (Architecture)

```
├── components/          # UI კომპონენტები (Header, MainMenu, MathQuiz, GeometryQuiz, ColumnMultiplication, etc.)
├── hooks/               # Custom React Hooks (useTimer, useColumnMultiplication, useGameSession)
├── data/                # სტატიკური მონაცემები (rewards)
├── services/            # გარე სერვისები (problemGenerator, statsService)
├── utils/               # მათემატიკური გამოთვლები და დამხმარე ფუნქციები (mathUtils, columnMultiplication)
├── types.ts             # TypeScript ტიპები და ინტერფეისები
├── App.tsx              # აპლიკაციის ძირითადი ორკესტრაცია
└── index.tsx            # საწყისი წერტილი ErrorBoundary-ით
```

---

## 🚀 ინსტალაცია და გაშვება (Setup & Installation)

```bash
# 1. რეპოზიტორიის კლონირება
git clone https://github.com/lexo123/thomthematica.git

# 2. საქაღალდეში გადასვლა
cd thomthematica

# 3. დამოკიდებულებების დაინსტალირება
npm install

# 4. დეველოპმენტ სერვერის გაშვება
npm run dev
```

---

## 🧪 ტესტირება და შემოწმება (Testing & Checks)

```bash
# Typecheck (TypeScript შემოწმება)
npm run typecheck

# Unit ტესტების გაშვება Vitest-ით
npm run test

# Production Build აწყობა
npm run build
```

---

## 📜 ლიცენზია

პროექტი შექმნილია სასწავლო და საგანმანათლებლო მიზნებისთვის.
