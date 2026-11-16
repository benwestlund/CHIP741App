// content.js
// All the text content lives here so anyone on the team can edit it
// without touching app logic. Facts should be checked against CDC/NIH
// before the final presentation.

const CONTENT = {
  // Education cards. "tracks" controls who sees each card:
  // "prep" = people using PrEP, "art" = people living with HIV on ART.
  learn: [
    {
      id: "prep-basics",
      tracks: ["prep"],
      tag: "PrEP",
      title: "How well does PrEP work?",
      body: [
        "Taken as prescribed, PrEP lowers the chance of getting HIV from sex by about 99% and from injection drug use by at least 74% (CDC).",
        "Daily pills need time to build up: about 7 days for receptive anal sex, and about 21 days for receptive vaginal sex and injection drug use.",
        "PrEP does not protect against other STIs. Condoms and regular STI testing still matter."
      ],
      source: { label: "CDC: PrEP", url: "https://www.cdc.gov/hivprep" }
    },
    {
      id: "uu",
      tracks: ["art", "prep"],
      tag: "Treatment",
      title: "Undetectable = Untransmittable",
      body: [
        "People with HIV who take their medicine as prescribed and reach and keep an undetectable viral load do not transmit HIV through sex.",
        "Daily adherence is what keeps the viral load undetectable. That is the whole point of this app."
      ],
      source: { label: "HIV.gov", url: "https://www.hiv.gov/" }
    },
    {
      id: "alcohol",
      tracks: ["prep", "art"],
      tag: "Harm reduction",
      title: "Drinking and your daily dose",
      body: [
        "Alcohol is one of the most common reasons doses get missed: late nights, changed routines, forgetting.",
        "A common myth is that you should skip your pill if you have been drinking. For most HIV medicines that is not true, and skipping does more harm. Ask your provider about your specific medicine.",
        "Practical moves: take your dose before you go out, keep a spare dose in your bag, set your reminder earlier on weekends."
      ],
      source: { label: "NIH HIVinfo", url: "https://hivinfo.nih.gov/" }
    },
    {
      id: "missed",
      tracks: ["prep", "art"],
      tag: "Adherence",
      title: "If you miss a dose",
      body: [
        "In general: take it when you remember, unless it is almost time for the next one. Do not double up.",
        "One missed dose is not a failure. Patterns of missed doses are what to talk to your provider about.",
        "Your provider or pharmacist can tell you the exact rule for your medicine."
      ],
      source: { label: "NIH HIVinfo", url: "https://hivinfo.nih.gov/" }
    },
    {
      id: "stigma",
      tracks: ["prep", "art"],
      tag: "Privacy",
      title: "Keeping it private",
      body: [
        "Worry about others finding out is a real reason people skip doses. That is why this app never says \"HIV\" in its name or reminders.",
        "You choose your reminder wording. Something like \"Daily routine\" reads like anything else on your phone.",
        "The Quick hide button (top right) covers the screen instantly."
      ]
    },
    {
      id: "prep-start",
      tracks: ["prep"],
      tag: "PrEP",
      title: "Getting and staying on PrEP",
      body: [
        "PrEP requires an HIV test before starting and regular check-ins (usually every 3 months) for testing and refills.",
        "Most people pay little or nothing for PrEP through insurance or assistance programs.",
        "Injectable PrEP is an option for people who find daily pills hard. Ask your provider."
      ],
      source: { label: "PrEP Locator", url: "https://preplocator.org/" }
    },
    {
      id: "art-routine",
      tracks: ["art"],
      tag: "Treatment",
      title: "Building the routine",
      body: [
        "Tie your dose to something you already do every day: brushing teeth, morning coffee, the evening news.",
        "Keep your medicine where you will see it, but somewhere that feels private to you.",
        "Refill before you run out. Gaps in refills are one of the biggest causes of missed doses."
      ]
    }
  ],

  resources: [
    { label: "Find a PrEP provider", url: "https://preplocator.org/", tracks: ["prep"] },
    { label: "HIV services locator (testing, care, housing)", url: "https://locator.hiv.gov/", tracks: ["prep", "art"] },
    { label: "CDC: PrEP basics", url: "https://www.cdc.gov/hivprep", tracks: ["prep"] },
    { label: "NIH HIVinfo fact sheets", url: "https://hivinfo.nih.gov/", tracks: ["prep", "art"] },
    { label: "SAMHSA Helpline (substance use), 1-800-662-4357", url: "https://www.samhsa.gov/find-help/helplines/national-helpline", tracks: ["prep", "art"] },
    { label: "988 Suicide and Crisis Lifeline (call or text 988)", url: "https://988lifeline.org/", tracks: ["prep", "art"] }
  ],

  // Daily tip shown on the Today screen (rotates by day of year).
  tips: [
    "Pair your dose with something you already do every day.",
    "Going out tonight? Take your dose before you leave.",
    "Keep a spare dose in your bag or car.",
    "Running low? Request your refill this week, not the day you run out.",
    "Missed one? Take it when you remember unless the next dose is close. Don't double up.",
    "Weekends break routines. Try an earlier reminder on Fridays and Saturdays.",
    "Your provider wants to hear about side effects. They can often help."
  ],

  // Demo coach replies. Used when no AI server is configured (see app.js CONFIG).
  // Each rule: if any keyword appears in the message, reply with the text.
  coachRules: [
    { keys: ["miss", "forgot", "forget", "skipped"], reply: "That happens to almost everyone. In general, take it when you remember unless it's nearly time for your next dose, and don't double up. Your pharmacist can confirm the rule for your specific medicine. Want to move your reminder to a time that fits your day better? You can change it on the Profile tab." },
    { keys: ["drink", "alcohol", "beer", "wine", "party", "drunk"], reply: "Good question to ask. For most HIV medicines, skipping your dose because you've been drinking does more harm than taking it. A few things that help: take your dose before you go out, keep a spare with you, and set an earlier reminder on nights out. Check with your provider about your exact medicine." },
    { keys: ["side effect", "nausea", "sick", "headache", "stomach", "tired"], reply: "Thanks for telling me. Some side effects are common early on and often ease up, but your provider should know about them. You can log it in today's check-in so it shows up in your summary. If anything feels severe, contact your provider or seek care right away." },
    { keys: ["tell", "disclose", "family", "friend", "partner", "stigma", "ashamed", "embarrass", "find out"], reply: "Who you tell, and when, is your call. Many people find it helps to start with one trusted person. This app is built to stay private: neutral name, your own reminder wording, and Quick hide in the corner. Would it help to talk through how a conversation might go?" },
    { keys: ["undetectable", "u=u", "viral load", "transmit"], reply: "When someone with HIV takes their medicine as prescribed and keeps an undetectable viral load, they don't transmit HIV through sex. Staying on your daily routine is what keeps it that way." },
    { keys: ["how long", "start working", "protected", "days"], reply: "For daily PrEP pills, CDC says protection peaks after about 7 days for receptive anal sex and about 21 days for receptive vaginal sex and injection drug use. Your provider can tell you what applies to you." },
    { keys: ["cost", "pay", "insurance", "afford", "price"], reply: "Most people pay little or nothing for PrEP and HIV treatment through insurance or assistance programs. A local clinic or the HIV.gov locator (see Resources on the Learn tab) can connect you with help." },
    { keys: ["refill", "run out", "pharmacy"], reply: "Try requesting refills when you have about a week left. Running out is one of the most common reasons people miss doses." },
    { keys: ["hi", "hello", "hey"], reply: "Hi! I'm your Steady coach. Ask me about missed doses, side effects, drinking, privacy, or anything about staying on track." }
  ],
  coachFallback: "I'm a demo coach with a limited set of answers right now. Try asking about missed doses, side effects, alcohol, privacy, or cost. For anything about your own health, your provider is the best source."
};
