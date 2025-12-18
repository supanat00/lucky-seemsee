const TOPIC_STYLE_HINTS = {
  health: "vitality, healing energy, balance, calm protection",
  love: "romantic harmony, warmth, gentle affection, connection",
  career: "success, confidence, leadership, achievement",
  money: "abundance, prosperity, wealth flow, good fortune",
};

const ZODIAC_EN = {
  rat: "Rat",
  ox: "Ox",
  tiger: "Tiger",
  rabbit: "Rabbit",
  dragon: "Dragon",
  snake: "Snake",
  horse: "Horse",
  goat: "Goat",
  monkey: "Monkey",
  rooster: "Rooster",
  dog: "Dog",
  pig: "Pig",
};

/**
 * Build an image-generation prompt for Lucky Seemsee wallpaper.
 * Requirement: absolutely NO text in the image.
 */
export function buildAiWallpaperPrompt({
  topicValue,
  topicLabel,
  zodiacValue,
  zodiacLabel,
}) {
  const topicHint = TOPIC_STYLE_HINTS[topicValue] || "auspicious good fortune";
  const zodiacEn = ZODIAC_EN[zodiacValue] || zodiacValue || "";

  return [
    "Create a vertical 9:16 high-resolution Thai auspicious wallpaper.",
    `Theme focus: ${topicLabel || topicValue} (${topicHint}).`,
    `Chinese zodiac: ${zodiacEn}${zodiacLabel ? ` (${zodiacLabel})` : ""}.`,
    "Visual style: elegant Thai sacred aesthetics, golden kanok motifs, lotus, soft glowing aura, sacred geometry, celestial energy, modern minimal composition.",
    "Lighting: cinematic soft light, warm gold accents, clean negative space, ultra-detailed, high quality.",
    "IMPORTANT: Absolutely no text, no letters, no numbers, no typography, no watermark, no logo, no signature, no calligraphy, and no symbols that resemble writing in any language.",
  ].join("\n");
}
