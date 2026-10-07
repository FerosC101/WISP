"""Structured safety-question text in English, Mandarin, Malay and Tamil.

Every safety-critical question is asked with fixed answer buttons whose VALUES
are language-independent ("yes" / "no" / "unsure" ...). The rules engine only
ever sees those values, so emergency screening never depends on understanding
free text in another language.

STATUS: the zh / ms / ta strings are drafts and MUST be reviewed by native
speakers (ideally with clinical input) before use with patients. See
docs/clinical_review.md.
"""

from __future__ import annotations

LANGUAGES = {"en": "English", "zh": "中文", "ms": "Bahasa Melayu", "ta": "தமிழ்"}

T: dict[str, dict[str, str]] = {
    # ---------------------------------------------------------------- answers
    "yes": {"en": "Yes", "zh": "是", "ms": "Ya", "ta": "ஆம்"},
    "no": {"en": "No", "zh": "不是", "ms": "Tidak", "ta": "இல்லை"},
    "unsure": {"en": "Not sure", "zh": "不确定", "ms": "Tidak pasti", "ta": "உறுதியாக தெரியவில்லை"},
    "sudden": {"en": "Suddenly", "zh": "突然", "ms": "Secara tiba-tiba", "ta": "திடீரென"},
    "gradual": {"en": "Gradually", "zh": "慢慢地", "ms": "Secara beransur-ansur", "ta": "படிப்படியாக"},
    "d_today": {"en": "Since today", "zh": "从今天开始", "ms": "Sejak hari ini", "ta": "இன்றிலிருந்து"},
    "d_yesterday": {"en": "Since yesterday", "zh": "从昨天开始", "ms": "Sejak semalam", "ta": "நேற்றிலிருந்து"},
    "d_days": {"en": "2–3 days", "zh": "两三天", "ms": "2–3 hari", "ta": "2–3 நாட்கள்"},
    "d_week": {"en": "About a week", "zh": "大约一个星期", "ms": "Kira-kira seminggu", "ta": "சுமார் ஒரு வாரம்"},
    "d_longer": {"en": "Longer", "zh": "更久", "ms": "Lebih lama", "ta": "அதற்கும் மேல்"},
    "do_check": {"en": "Do the check", "zh": "开始检查", "ms": "Buat semakan", "ta": "சோதனையைச் செய்யவும்"},
    "skip": {"en": "Skip", "zh": "跳过", "ms": "Langkau", "ta": "தவிர்க்கவும்"},
    "ready": {"en": "Yes, I'm ready", "zh": "是的，我准备好了", "ms": "Ya, saya bersedia", "ta": "ஆம், நான் தயார்"},
    "alone": {"en": "No, I'm alone", "zh": "没有，只有我一个人", "ms": "Tidak, saya seorang diri", "ta": "இல்லை, நான் தனியாக இருக்கிறேன்"},
    "someone": {"en": "Yes, someone is here", "zh": "有，还有别人", "ms": "Ya, ada orang lain", "ta": "ஆம், வேறு ஒருவர் இருக்கிறார்"},
    "clear": {"en": "It's clear now", "zh": "现在没人走动了", "ms": "Sekarang sudah tiada orang", "ta": "இப்போது யாரும் நகரவில்லை"},
    "confirm": {"en": "That's right", "zh": "没错", "ms": "Betul", "ta": "சரி"},
    "share_yes": {"en": "Yes, share it", "zh": "好，分享", "ms": "Ya, kongsi", "ta": "ஆம், பகிரவும்"},
    "share_no": {"en": "No, thank you", "zh": "不用了，谢谢", "ms": "Tidak, terima kasih", "ta": "வேண்டாம், நன்றி"},
    # ---------------------------------------------------------------- conversation
    "warning_intro": {
        "en": "I need to check for a few warning signs first.",
        "zh": "我需要先确认几个危险信号。",
        "ms": "Saya perlu semak beberapa tanda amaran dahulu.",
        "ta": "முதலில் சில எச்சரிக்கை அறிகுறிகளைச் சரிபார்க்க வேண்டும்.",
    },
    "q_onset": {
        "en": "Did it start suddenly, or gradually?",
        "zh": "是突然开始的，还是慢慢开始的？",
        "ms": "Adakah ia bermula secara tiba-tiba atau beransur-ansur?",
        "ta": "இது திடீரென தொடங்கியதா, அல்லது படிப்படியாகவா?",
    },
    "q_duration": {
        "en": "How long have you felt like this?",
        "zh": "你这样感觉多久了？",
        "ms": "Sudah berapa lama anda rasa begini?",
        "ta": "எவ்வளவு நாளாக இப்படி உணர்கிறீர்கள்?",
    },
    "q_chest_pain": {
        "en": "Any chest pain or tightness?",
        "zh": "有没有胸痛或胸口发紧？",
        "ms": "Ada sakit dada atau dada rasa ketat?",
        "ta": "நெஞ்சு வலி அல்லது நெஞ்சு இறுக்கம் உள்ளதா?",
    },
    "q_severe_breathlessness": {
        "en": "Are you so short of breath that it's hard to talk or walk?",
        "zh": "你是不是喘得很厉害，连说话或走路都困难？",
        "ms": "Adakah anda sangat sesak nafas sehingga susah bercakap atau berjalan?",
        "ta": "பேசவோ நடக்கவோ கடினமாக இருக்கும் அளவுக்கு மூச்சுத் திணறல் உள்ளதா?",
    },
    "q_one_sided_weakness": {
        "en": "Any weakness, numbness or clumsiness on one side of your body or face?",
        "zh": "身体或脸的一侧有没有无力、麻木或不灵活？",
        "ms": "Ada rasa lemah, kebas atau kekok pada sebelah badan atau muka?",
        "ta": "உடலின் அல்லது முகத்தின் ஒரு பக்கத்தில் பலவீனம், மரத்துப்போதல் அல்லது தடுமாற்றம் உள்ளதா?",
    },
    "q_speech_difficulty": {
        "en": "Is your speech slurred, or is it hard to find your words?",
        "zh": "说话有没有含糊不清，或者想不起要说的词？",
        "ms": "Adakah percakapan anda pelat, atau susah mencari perkataan?",
        "ta": "பேச்சு குழறுகிறதா, அல்லது வார்த்தைகள் கிடைக்காமல் சிரமப்படுகிறீர்களா?",
    },
    "q_confusion": {
        "en": "Do you feel confused or unusually drowsy? Has anyone said you seem confused?",
        "zh": "你有没有感到糊涂或特别想睡？有没有人说你看起来糊涂？",
        "ms": "Adakah anda rasa keliru atau luar biasa mengantuk? Ada sesiapa kata anda nampak keliru?",
        "ta": "குழப்பமாகவோ வழக்கத்திற்கு மாறாக தூக்கக் கலக்கமாகவோ உணர்கிறீர்களா? நீங்கள் குழப்பமாக இருப்பதாக யாராவது சொன்னார்களா?",
    },
    "q_loss_of_consciousness": {
        "en": "Have you fainted or blacked out?",
        "zh": "你有没有晕倒或失去知觉？",
        "ms": "Adakah anda pernah pengsan atau pitam?",
        "ta": "நீங்கள் மயங்கி விழுந்தீர்களா அல்லது நினைவு இழந்தீர்களா?",
    },
    "q_sudden_vision_change": {
        "en": "Any sudden change in your eyesight?",
        "zh": "视力有没有突然变化？",
        "ms": "Ada perubahan penglihatan secara tiba-tiba?",
        "ta": "பார்வையில் திடீர் மாற்றம் உள்ளதா?",
    },
    "q_fall": {
        "en": "Have you had a fall today or yesterday?",
        "zh": "你今天或昨天有没有跌倒？",
        "ms": "Adakah anda terjatuh hari ini atau semalam?",
        "ta": "இன்று அல்லது நேற்று நீங்கள் கீழே விழுந்தீர்களா?",
    },
    "q_fall_injury": {
        "en": "Were you hurt, or did you hit your head?",
        "zh": "你有没有受伤，或者撞到头？",
        "ms": "Adakah anda cedera, atau terhantuk kepala?",
        "ta": "உங்களுக்கு காயம் ஏற்பட்டதா, அல்லது தலையில் அடிபட்டதா?",
    },
    "q_eating": {
        "en": "Have you been eating and drinking as usual?",
        "zh": "你的饮食跟平常一样吗？",
        "ms": "Adakah anda makan dan minum seperti biasa?",
        "ta": "வழக்கம்போல் சாப்பிட்டு, குடித்து வருகிறீர்களா?",
    },
    "q_fluids": {
        "en": "Can you drink water and keep it down?",
        "zh": "你喝水后能不能不吐出来？",
        "ms": "Bolehkah anda minum air tanpa muntah?",
        "ta": "தண்ணீர் குடித்தால் வாந்தி இல்லாமல் இருக்க முடிகிறதா?",
    },
    "emergency_now": {
        "en": "This needs help now. Call 995, or go to the nearest A&E.",
        "zh": "这需要马上求助。请拨打995，或去最近的急诊部。",
        "ms": "Ini perlukan bantuan segera. Hubungi 995, atau pergi ke Jabatan Kecemasan (A&E) terdekat.",
        "ta": "இதற்கு உடனடி உதவி தேவை. 995 ஐ அழைக்கவும், அல்லது அருகிலுள்ள அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும்.",
    },
    "offer_1": {
        "en": "I've checked for the emergency warning signs, and you didn't report any.",
        "zh": "我已经确认过危险信号，你没有提到任何一个。",
        "ms": "Saya telah menyemak tanda amaran kecemasan, dan anda tidak melaporkan sebarang tanda.",
        "ta": "அவசர எச்சரிக்கை அறிகுறிகளைச் சரிபார்த்தேன்; நீங்கள் எதையும் குறிப்பிடவில்லை.",
    },
    "offer_2": {
        "en": "But I'm still not sure whether your movement has changed from your usual.",
        "zh": "但我还不确定你的活动能力有没有比平常差。",
        "ms": "Tetapi saya masih tidak pasti sama ada pergerakan anda berbeza daripada biasa.",
        "ta": "ஆனால் உங்கள் அசைவுத் திறன் வழக்கத்திலிருந்து மாறியுள்ளதா என்பது இன்னும் உறுதியாகத் தெரியவில்லை.",
    },
    "offer_3": {
        "en": "A short movement check could help. It takes about 30 seconds.",
        "zh": "一个简短的活动检查会有帮助，大约需要30秒。",
        "ms": "Semakan pergerakan yang ringkas boleh membantu. Ia mengambil masa kira-kira 30 saat.",
        "ta": "ஒரு சிறிய அசைவுச் சோதனை உதவக்கூடும். இதற்கு சுமார் 30 வினாடிகள் ஆகும்.",
    },
    "instructions": {
        "en": "Use a sturdy chair without wheels, placed against a wall. Stop if you feel dizzy, breathless, or in pain.",
        "zh": "请使用一张没有轮子的稳固椅子，靠墙摆放。如果感到头晕、喘不过气或疼痛，请立刻停止。",
        "ms": "Gunakan kerusi yang kukuh tanpa roda, diletakkan rapat ke dinding. Berhenti jika anda rasa pening, sesak nafas atau sakit.",
        "ta": "சக்கரம் இல்லாத உறுதியான நாற்காலியை சுவரோடு ஒட்டி வைத்துப் பயன்படுத்தவும். தலைச்சுற்றல், மூச்சுத் திணறல் அல்லது வலி இருந்தால் உடனே நிறுத்தவும்.",
    },
    "q_steady": {
        "en": "Do you feel steady enough to try?",
        "zh": "你觉得自己够稳，可以试一试吗？",
        "ms": "Adakah anda rasa cukup stabil untuk mencuba?",
        "ta": "முயற்சி செய்யும் அளவுக்கு நிலையாக உணர்கிறீர்களா?",
    },
    "q_others": {
        "en": "Is anyone else moving around in the room?",
        "zh": "房间里有没有其他人在走动？",
        "ms": "Adakah orang lain sedang bergerak di dalam bilik?",
        "ta": "அறையில் வேறு யாராவது நடமாடிக்கொண்டிருக்கிறார்களா?",
    },
    "others_wait": {
        "en": "Please wait until the area around your chair is clear.",
        "zh": "请等到椅子周围没有人走动再开始。",
        "ms": "Sila tunggu sehingga kawasan sekitar kerusi anda lapang.",
        "ta": "உங்கள் நாற்காலியைச் சுற்றியுள்ள இடத்தில் யாரும் இல்லாத வரை காத்திருக்கவும்.",
    },
    "unsteady_ok": {
        "en": "Thank you for telling me. Please don't try it. Not feeling steady today is useful information.",
        "zh": "谢谢你告诉我。请不要尝试。今天站不稳本身就是很重要的信息。",
        "ms": "Terima kasih kerana memberitahu saya. Jangan cuba. Rasa tidak stabil hari ini juga maklumat yang penting.",
        "ta": "சொன்னதற்கு நன்றி. தயவுசெய்து முயற்சிக்க வேண்டாம். இன்று நிலையாக உணராததே முக்கியமான தகவல்.",
    },
    "declined_ok": {
        "en": "That's fine. I'll base my advice on what you've told me.",
        "zh": "没关系。我会根据你告诉我的情况给你建议。",
        "ms": "Tidak mengapa. Saya akan beri nasihat berdasarkan apa yang anda beritahu.",
        "ta": "பரவாயில்லை. நீங்கள் சொன்னதை வைத்து ஆலோசனை தருகிறேன்.",
    },
    "check_screen": {
        "en": "Your screen will now show the movement check.",
        "zh": "你的屏幕现在会显示活动检查。",
        "ms": "Skrin anda kini akan menunjukkan semakan pergerakan.",
        "ta": "இப்போது உங்கள் திரையில் அசைவுச் சோதனை காட்டப்படும்.",
    },
    "check_complete": {
        "en": "Check complete. Please sit and rest.",
        "zh": "检查完成。请坐下休息。",
        "ms": "Semakan selesai. Sila duduk dan berehat.",
        "ta": "சோதனை முடிந்தது. உட்கார்ந்து ஓய்வெடுக்கவும்.",
    },
    "q_arms": {
        "en": "Did you need to push up with your arms to stand?",
        "zh": "你站起来的时候需要用手撑吗？",
        "ms": "Adakah anda perlu menolak dengan tangan untuk berdiri?",
        "ta": "எழுந்து நிற்க கைகளால் ஊன்ற வேண்டியிருந்ததா?",
    },
    "unreliable": {
        "en": "I couldn't get a reliable reading, so I won't use that result.",
        "zh": "我没能得到可靠的读数，所以不会使用这个结果。",
        "ms": "Saya tidak dapat bacaan yang boleh dipercayai, jadi saya tidak akan menggunakan keputusan itu.",
        "ta": "நம்பகமான அளவீடு கிடைக்கவில்லை, எனவே அந்த முடிவை நான் பயன்படுத்த மாட்டேன்.",
    },
    "q_stop_reason": {
        "en": "You stopped the check. Did you stop because you felt unwell?",
        "zh": "你停止了检查。是因为不舒服才停下来的吗？",
        "ms": "Anda telah menghentikan semakan. Adakah kerana anda rasa tidak sihat?",
        "ta": "சோதனையை நிறுத்தினீர்கள். உடல்நலம் சரியில்லாததால் நிறுத்தினீர்களா?",
    },
    "q_stop_chest": {"en": "Do you have chest pain right now?", "zh": "你现在胸口痛吗？", "ms": "Adakah anda sakit dada sekarang?", "ta": "இப்போது நெஞ்சு வலி உள்ளதா?"},
    "q_stop_breath": {
        "en": "Are you very short of breath right now?",
        "zh": "你现在是不是喘得很厉害？",
        "ms": "Adakah anda sangat sesak nafas sekarang?",
        "ta": "இப்போது கடுமையான மூச்சுத் திணறல் உள்ளதா?",
    },
    "q_share": {
        "en": "Would you like to share a short summary with {name}?",
        "zh": "你想把简短的总结分享给{name}吗？",
        "ms": "Adakah anda mahu berkongsi ringkasan pendek dengan {name}?",
        "ta": "{name} உடன் ஒரு சிறிய சுருக்கத்தைப் பகிர விரும்புகிறீர்களா?",
    },
    "q_confirm": {
        "en": "Here's what I understood. Is that right?",
        "zh": "这是我理解的情况。对吗？",
        "ms": "Ini yang saya faham. Betul?",
        "ta": "நான் புரிந்துகொண்டது இதுதான். சரியா?",
    },
    "reask": {
        "en": "Sorry, I didn't quite catch that. Please tap one of the answers.",
        "zh": "抱歉，我没听清楚。请点选一个答案。",
        "ms": "Maaf, saya kurang faham. Sila pilih satu jawapan.",
        "ta": "மன்னிக்கவும், சரியாகப் புரியவில்லை. ஒரு பதிலைத் தட்டவும்.",
    },
}


def t(key: str, lang: str = "en", **kw: str) -> str:
    entry = T[key]
    text = entry.get(lang) or entry["en"]
    return text.format(**kw) if kw else text


def reply(value: str, lang: str = "en", key: str | None = None) -> dict:
    """A quick-reply button: translated label, language-independent value."""
    return {"label": t(key or value, lang), "value": value}
