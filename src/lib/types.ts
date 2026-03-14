export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  ramadan_amount: string | null;
  suggested_amount: string | null;
  accepted_amount: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  created_at: string;
}

export interface ShawwalFast {
  id: string;
  user_id: string;
  date: string;
  completed: boolean;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  last_grace_date: string | null;
  total_completions: number;
  updated_at: string;
}

export interface Halaqa {
  id: string;
  name: string;
  created_by: string | null;
  invite_code: string;
  gender: "Brother" | "Sister";
  is_public: boolean;
  max_members: number;
  created_at: string;
}

export interface HalaqaMember {
  halaqa_id: string;
  user_id: string;
  joined_at: string;
}

export interface HalaqaReaction {
  id: string;
  halaqa_id: string;
  sender_id: string;
  receiver_id: string;
  emoji: string;
  date: string;
  created_at: string;
}

// Preset habits for onboarding selection
export interface PresetHabit {
  name: string;
  icon: string;
  defaultRamadanAmount: string;
  category: "worship" | "quran" | "charity" | "lifestyle";
}

export const PRESET_HABITS: PresetHabit[] = [
  {
    name: "Quran Reading",
    icon: "📖",
    defaultRamadanAmount: "1 Juz per day",
    category: "quran",
  },
  {
    name: "Tahajjud Prayer",
    icon: "🌙",
    defaultRamadanAmount: "Every night",
    category: "worship",
  },
  {
    name: "Duha Prayer",
    icon: "☀️",
    defaultRamadanAmount: "Every day",
    category: "worship",
  },
  {
    name: "Praying in the Masjid",
    icon: "🕌",
    defaultRamadanAmount: "5 times daily",
    category: "worship",
  },
  {
    name: "Morning & Evening Adhkar",
    icon: "📿",
    defaultRamadanAmount: "Every day",
    category: "worship",
  },
  {
    name: "Dhikr",
    icon: "🤲",
    defaultRamadanAmount: "After every prayer",
    category: "worship",
  },
  {
    name: "Charity / Sadaqah",
    icon: "💰",
    defaultRamadanAmount: "Daily",
    category: "charity",
  },
  {
    name: "Sunnah Fasting",
    icon: "🍽️",
    defaultRamadanAmount: "Daily in Ramadan",
    category: "lifestyle",
  },
  {
    name: "Dua before Iftar",
    icon: "🕐",
    defaultRamadanAmount: "Every day",
    category: "worship",
  },
  {
    name: "Islamic Study / Lectures",
    icon: "🎓",
    defaultRamadanAmount: "Daily",
    category: "quran",
  },
];

// Prophetic quotes for daily motivation
export const PROPHETIC_QUOTES = [
  {
    text: "The most beloved of deeds to Allah are those that are most consistent, even if it is small.",
    source: "Sahih al-Bukhari 6464",
  },
  {
    text: "Take up good deeds only as much as you are able, for the best deeds are those done regularly even if they are few.",
    source: "Sunan Ibn Majah 4240",
  },
  {
    text: "Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the entire year.",
    source: "Sahih Muslim 1164",
  },
  {
    text: "When the son of Adam dies, his deeds cease except for three: ongoing charity, beneficial knowledge, or a righteous child who prays for him.",
    source: "Sahih Muslim 1631",
  },
  {
    text: "Allah is pleased with a servant who praises Him when he eats and praises Him when he drinks.",
    source: "Sahih Muslim 2734",
  },
  {
    text: "The best of people are those who are most beneficial to people.",
    source: "Silsilah Sahihah 426",
  },
  {
    text: "Whoever recites Ayat al-Kursi after every obligatory prayer, nothing prevents him from entering Paradise except death.",
    source: "Sunan An-Nasa'i 9928",
  },
  {
    text: "Make things easy and do not make them difficult, cheer the people up by conveying glad tidings and do not repulse them.",
    source: "Sahih al-Bukhari 69",
  },
  {
    text: "The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.",
    source: "Sahih Muslim 2664",
  },
  {
    text: "Verily, with hardship comes ease.",
    source: "Quran 94:6",
  },
  {
    text: "Whoever treads a path seeking knowledge, Allah will make easy for him the path to Paradise.",
    source: "Sahih Muslim 2699",
  },
  {
    text: "Do not belittle any good deed, even meeting your brother with a cheerful face.",
    source: "Sahih Muslim 2626",
  },
  {
    text: "The best dhikr is La ilaha illallah and the best supplication is Alhamdulillah.",
    source: "Sunan at-Tirmidhi 3383",
  },
  {
    text: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.",
    source: "Sahih al-Bukhari 574",
  },
  {
    text: "Be in this world as if you were a stranger or a traveler.",
    source: "Sahih al-Bukhari 6416",
  },
  {
    text: "Allah does not look at your forms or your wealth, but He looks at your hearts and your deeds.",
    source: "Sahih Muslim 2564",
  },
  {
    text: "No one will enter Paradise by his deeds alone. They said, not even you? He said, not even me, unless Allah bestows His mercy upon me.",
    source: "Sahih al-Bukhari 6467",
  },
  {
    text: "The supplication between the Adhan and Iqamah is not rejected.",
    source: "Sunan Abu Dawud 521",
  },
  {
    text: "When you ask, ask Allah. When you seek help, seek help from Allah.",
    source: "Sunan at-Tirmidhi 2516",
  },
  {
    text: "Whoever says SubhanAllah wa bihamdihi 100 times a day, his sins will be forgiven even if they are like the foam of the sea.",
    source: "Sahih al-Bukhari 6405",
  },
  {
    text: "The one who recites the Quran and learns it by heart, will be with the noble righteous scribes.",
    source: "Sahih al-Bukhari 4937",
  },
  {
    text: "Every act of kindness is charity.",
    source: "Sahih al-Bukhari 6021",
  },
  {
    text: "The best prayer after the obligatory prayers is the night prayer.",
    source: "Sahih Muslim 1163",
  },
  {
    text: "Convey from me even if it is just one verse.",
    source: "Sahih al-Bukhari 3461",
  },
  {
    text: "Allah will shade seven types of people under His shade on the Day when there will be no shade except His.",
    source: "Sahih al-Bukhari 660",
  },
  {
    text: "Fasting is a shield, so let one of you not behave in a sinful manner.",
    source: "Sahih al-Bukhari 1894",
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari 13",
  },
  {
    text: "Whoever builds a mosque for Allah, Allah will build for him a house in Paradise.",
    source: "Sahih al-Bukhari 450",
  },
  {
    text: "The believer is not stung from the same hole twice.",
    source: "Sahih al-Bukhari 6133",
  },
  {
    text: "Verily, Allah is beautiful and He loves beauty.",
    source: "Sahih Muslim 91",
  },
];
