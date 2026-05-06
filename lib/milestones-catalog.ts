export interface MilestoneCatalogItem {
  kind: string;
  label: string;
  hint?: string;
}

export interface MilestoneMonth {
  month: number;
  title: string;
  items: MilestoneCatalogItem[];
}

export const MILESTONE_KIND_PREFIX = "month_";

export const MILESTONE_CHECKLIST: MilestoneMonth[] = [
  {
    month: 1,
    title: "1 month",
    items: [
      { kind: "month_1_lifts_head", label: "Lifts head briefly during tummy time" },
      { kind: "month_1_eye_contact", label: "Makes eye contact" },
      { kind: "month_1_calms_to_voice", label: "Calms when soothed or spoken to" },
      { kind: "month_1_follows_objects", label: "Follows objects with eyes" },
    ],
  },
  {
    month: 2,
    title: "2 months",
    items: [
      { kind: "month_2_social_smile", label: "First social smile" },
      { kind: "month_2_holds_head_up", label: "Holds head up on tummy" },
      { kind: "month_2_coos", label: "Coos and makes vowel sounds" },
      { kind: "month_2_tracks_toys", label: "Tracks toys side to side" },
    ],
  },
  {
    month: 3,
    title: "3 months",
    items: [
      { kind: "month_3_head_steady", label: "Holds head steady when upright" },
      { kind: "month_3_hands_to_mouth", label: "Brings hands to mouth" },
      { kind: "month_3_pushes_up", label: "Pushes up on arms during tummy time" },
      { kind: "month_3_recognizes_faces", label: "Recognizes familiar faces" },
    ],
  },
  {
    month: 4,
    title: "4 months",
    items: [
      { kind: "month_4_rolls_tummy_to_back", label: "Rolls from tummy to back" },
      { kind: "month_4_reaches_for_toys", label: "Reaches for and grabs toys" },
      { kind: "month_4_laughs", label: "Laughs out loud" },
      { kind: "month_4_babbles", label: "Babbles with expression" },
    ],
  },
  {
    month: 5,
    title: "5 months",
    items: [
      { kind: "month_5_rolls_back_to_tummy", label: "Rolls from back to tummy" },
      { kind: "month_5_sits_with_support", label: "Sits with support" },
      { kind: "month_5_responds_to_name", label: "Responds to own name" },
      { kind: "month_5_blows_raspberries", label: "Blows raspberries" },
    ],
  },
  {
    month: 6,
    title: "6 months",
    items: [
      { kind: "month_6_sits_unsupported", label: "Sits without support" },
      { kind: "month_6_first_solids", label: "First taste of solid food" },
      { kind: "month_6_transfers_objects", label: "Transfers objects between hands" },
      { kind: "month_6_mirror_play", label: "Recognizes self in the mirror" },
    ],
  },
  {
    month: 7,
    title: "7 months",
    items: [
      { kind: "month_7_starts_crawling", label: "Begins to crawl or scoot" },
      { kind: "month_7_consonant_sounds", label: "Says consonant sounds (ba, da, ga)" },
      { kind: "month_7_object_permanence", label: "Looks for hidden objects" },
      { kind: "month_7_holds_bottle", label: "Holds own bottle or cup" },
    ],
  },
  {
    month: 8,
    title: "8 months",
    items: [
      { kind: "month_8_pulls_to_stand", label: "Pulls up to stand" },
      { kind: "month_8_pincer_grasp", label: "Pincer grasp emerging" },
      { kind: "month_8_finger_food", label: "Eats finger foods" },
      { kind: "month_8_stranger_anxiety", label: "Shows stranger anxiety" },
    ],
  },
  {
    month: 9,
    title: "9 months",
    items: [
      { kind: "month_9_cruises", label: "Cruises along furniture" },
      { kind: "month_9_says_mama_dada", label: "Says “mama” or “dada”" },
      { kind: "month_9_waves", label: "Waves bye-bye" },
      { kind: "month_9_two_finger_pickup", label: "Picks up small things with finger and thumb" },
    ],
  },
  {
    month: 10,
    title: "10 months",
    items: [
      { kind: "month_10_stands_briefly", label: "Stands alone briefly" },
      { kind: "month_10_peekaboo", label: "Plays peekaboo" },
      { kind: "month_10_claps", label: "Claps hands" },
      { kind: "month_10_understands_no", label: "Understands “no”" },
    ],
  },
  {
    month: 11,
    title: "11 months",
    items: [
      { kind: "month_11_first_steps", label: "Takes first steps with help" },
      { kind: "month_11_points", label: "Points at objects of interest" },
      { kind: "month_11_first_word", label: "First clear word" },
      { kind: "month_11_drinks_from_cup", label: "Drinks from an open cup" },
    ],
  },
  {
    month: 12,
    title: "12 months",
    items: [
      { kind: "month_12_walks", label: "Walks independently" },
      { kind: "month_12_uses_words", label: "Uses a few familiar words" },
      { kind: "month_12_follows_directions", label: "Follows simple directions" },
      { kind: "month_12_first_birthday", label: "First birthday 🎂" },
    ],
  },
];

const KIND_TO_ITEM: Map<string, MilestoneCatalogItem> = new Map();
for (const m of MILESTONE_CHECKLIST) {
  for (const item of m.items) KIND_TO_ITEM.set(item.kind, item);
}

export function getMilestoneItem(kind: string): MilestoneCatalogItem | undefined {
  return KIND_TO_ITEM.get(kind);
}

export function isChecklistKind(kind: string): boolean {
  return kind.startsWith(MILESTONE_KIND_PREFIX);
}
