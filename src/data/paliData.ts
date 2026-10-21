export interface InflectionRow {
  caseName: string;
  casePali: string;
  singular: string;
  plural: string;
}

export interface DpdWordEntry {
  lemma: string;
  pos: string;
  posEn: string;
  grammarNote?: string;
  root: string;
  construction: string;
  components: { form: string; gloss: string }[];
  meaningZh: string;
  meaningEn: string;
  frequencyRank: number;
  suttaOccurrences: number;
  example: {
    ref: string;
    pali: string;
    highlight: string;
    zh: string;
  };
  inflectionTitle: string;
  inflectionTable: InflectionRow[];
}

export interface SuttaToken {
  surface: string;
  punctuationAfter?: string;
  lineBreakAfter?: boolean;
  lemma: string;
  contextGrammar: string; // e.g., "形容词 · 此处为阳性主格复数"
  highlightDefault?: boolean;
  dottedUnderline?: boolean;
}

export interface SuttaSentence {
  id: string;
  verseRef: string;
  sentenceIndex: number;
  totalInVerse: number;
  paliText: string;
  zhTranslation: string;
  enTranslation: string;
  audioDurationSec: number;
  tokens: SuttaToken[];
}

export interface SuttaItem {
  id: string;
  code: string;
  titleZh: string;
  titlePali: string;
  chapterZh: string;
  collection: string;
  sourceLicense: string;
  audioReciter: string;
  audioSource: string;
  estimatedMinutes: number;
  sentences: SuttaSentence[];
}

export interface GrammarQuestion {
  id: string;
  prompt: string;
  paliFocus: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedLemma?: string;
}

export interface GrammarTopic {
  id: string;
  number: string;
  titleZh: string;
  titlePali: string;
  summary: string;
  readingMinutes: number;
  sections: {
    heading: string;
    body: string;
    table?: {
      headers: string[];
      rows: string[][];
    };
  }[];
  exercises: GrammarQuestion[];
}

export const DPD_DICTIONARY: Record<string, DpdWordEntry> = {
  manopubbaṅgama: {
    lemma: 'manopubbaṅgama',
    pos: '形容词',
    posEn: 'adj.',
    root: '√man (思、意) + √gam (行、去)',
    construction: 'mana + o + pubba + ṃ + gama',
    components: [
      { form: 'mano', gloss: '心' },
      { form: 'pubbaṅgama', gloss: '先导者' },
    ],
    meaningZh: '以心为先导的',
    meaningEn: 'led by the mind; having mind as forerunner',
    frequencyRank: 1,
    suttaOccurrences: 28,
    example: {
      ref: 'Dhp 1',
      pali: 'Manopubbaṅgamā dhammā',
      highlight: 'Manopubbaṅgamā',
      zh: '诸法以心为先导',
    },
    inflectionTitle: 'a 词干形容词（阳性变化修饰 dhammā）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'manopubbaṅgamo', plural: 'manopubbaṅgamā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'manopubbaṅgamaṃ', plural: 'manopubbaṅgame' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'manopubbaṅgamena', plural: 'manopubbaṅgamehi' },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: 'manopubbaṅgamassa', plural: 'manopubbaṅgamānaṃ' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'manopubbaṅgamasmā', plural: 'manopubbaṅgamehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'manopubbaṅgamassa', plural: 'manopubbaṅgamānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'manopubbaṅgamasmiṃ', plural: 'manopubbaṅgamesu' },
      { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: 'manopubbaṅgama', plural: 'manopubbaṅgamā' },
    ],
  },
  dhamma: {
    lemma: 'dhamma',
    pos: '阳性名词',
    posEn: 'masc.',
    root: '√dhar (持、保持) + *ma',
    construction: 'dhar + ma → dhamma',
    components: [
      { form: '√dhar', gloss: '持、轨持' },
      { form: '-ma', gloss: '名词后缀' },
    ],
    meaningZh: '法、心理现象、教法、真理',
    meaningEn: 'mental phenomenon; state; teaching; truth; nature',
    frequencyRank: 2,
    suttaOccurrences: 14820,
    example: {
      ref: 'Dhp 1',
      pali: 'Manopubbaṅgamā dhammā',
      highlight: 'dhammā',
      zh: '诸法以心为先导',
    },
    inflectionTitle: 'a 词干阳性名词 (dhamma)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'dhammo', plural: 'dhammā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'dhammaṃ', plural: 'dhamme' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'dhammena', plural: 'dhammehi' },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: 'dhammassa', plural: 'dhammānaṃ' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'dhammā / dhammasmā', plural: 'dhammehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'dhammassa', plural: 'dhammānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'dhamme / dhammasmiṃ', plural: 'dhammesu' },
      { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: 'dhamma', plural: 'dhammā' },
    ],
  },
  manoseṭṭha: {
    lemma: 'manoseṭṭha',
    pos: '形容词',
    posEn: 'adj.',
    root: '√man (思) + seṭṭha (最胜、主)',
    construction: 'mana + o + seṭṭha',
    components: [
      { form: 'mano', gloss: '心' },
      { form: 'seṭṭha', gloss: '最上、首领、主' },
    ],
    meaningZh: '以心为主的、由心统摄的',
    meaningEn: 'having mind as chief; ruled by mind; mind-governed',
    frequencyRank: 3,
    suttaOccurrences: 18,
    example: {
      ref: 'Dhp 1',
      pali: 'manoseṭṭhā manomayā',
      highlight: 'manoseṭṭhā',
      zh: '以心为主，由心所造',
    },
    inflectionTitle: 'a 词干形容词（阳性变化）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'manoseṭṭho', plural: 'manoseṭṭhā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'manoseṭṭhaṃ', plural: 'manoseṭṭhe' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'manoseṭṭhena', plural: 'manoseṭṭhehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'manoseṭṭhassa', plural: 'manoseṭṭhānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'manoseṭṭhe', plural: 'manoseṭṭhesu' },
    ],
  },
  manomaya: {
    lemma: 'manomaya',
    pos: '形容词',
    posEn: 'adj.',
    root: '√man (思) + maya (所造、构成)',
    construction: 'mana + o + maya',
    components: [
      { form: 'mano', gloss: '心' },
      { form: 'maya', gloss: '由……所造' },
    ],
    meaningZh: '由心所造的、意成的',
    meaningEn: 'mind-made; fabricated by the mind',
    frequencyRank: 4,
    suttaOccurrences: 64,
    example: {
      ref: 'Dhp 1',
      pali: 'manoseṭṭhā manomayā',
      highlight: 'manomayā',
      zh: '以心为主，由心所造',
    },
    inflectionTitle: 'a 词干形容词（阳性变化）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'manomayo', plural: 'manomayā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'manomayaṃ', plural: 'manomaye' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'manomayena', plural: 'manomayehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'manomayassa', plural: 'manomayānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'manomaye', plural: 'manomayesu' },
    ],
  },
  manas: {
    lemma: 'manas',
    pos: '中性/阳性名词',
    posEn: 'nt./masc. (mano-group)',
    root: '√man (思量、认知)',
    construction: '√man + as → mano / manas',
    components: [
      { form: '√man', gloss: '思考、认知' },
      { form: '-as', gloss: 'manas 特殊词干后缀' },
    ],
    meaningZh: '心、意、思虑',
    meaningEn: 'mind; mental faculty; intention',
    frequencyRank: 5,
    suttaOccurrences: 3420,
    example: {
      ref: 'Dhp 1',
      pali: 'Manasā ce paduṭṭhena',
      highlight: 'Manasā',
      zh: '若以染污之心',
    },
    inflectionTitle: 'manas 特殊辅音词干变格表',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'mano / manaṃ', plural: 'manā / manāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'mano / manaṃ', plural: 'mane / manāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'manasā / manena', plural: 'manehi' },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: 'manaso / manassa', plural: 'manānaṃ' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'manasā / manasmā', plural: 'manehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'manaso / manassa', plural: 'manānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'manasi / mane', plural: 'manesu' },
    ],
  },
  ce: {
    lemma: 'ce',
    pos: '不变化词',
    posEn: 'ind. (cond.)',
    root: 'ca + i → ce',
    construction: '条件小品词（不可置于句首）',
    components: [{ form: 'ce', gloss: '如果、假使' }],
    meaningZh: '如果、若、假使',
    meaningEn: 'if; in case',
    frequencyRank: 12,
    suttaOccurrences: 2890,
    example: {
      ref: 'Dhp 1',
      pali: 'Manasā ce paduṭṭhena',
      highlight: 'ce',
      zh: '若以染污之心',
    },
    inflectionTitle: '不变化词 (Indeclinable)',
    inflectionTable: [
      { caseName: '不变化词', casePali: 'Nipāta', singular: 'ce (无词形变化)', plural: '—' },
    ],
  },
  paduṭṭha: {
    lemma: 'paduṭṭha',
    pos: '过去分词 / 形容词',
    posEn: 'pp. of padussati',
    root: 'pa + √dus (败坏、嗔怒) + ta',
    construction: 'pa + dus + ta → paduṭṭha',
    components: [
      { form: 'pa-', gloss: '加强前缀' },
      { form: '√dus', gloss: '染污、败坏' },
      { form: '-ta', gloss: '过去分词后缀' },
    ],
    meaningZh: '染污的、败坏的、怀有恶意的',
    meaningEn: 'corrupted; polluted; wicked; malevolent',
    frequencyRank: 6,
    suttaOccurrences: 145,
    example: {
      ref: 'Dhp 1',
      pali: 'Manasā ce paduṭṭhena bhāsati',
      highlight: 'paduṭṭhena',
      zh: '若以染污之心言说',
    },
    inflectionTitle: 'a 词干分词（具格单数修饰 manasā）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'paduṭṭho', plural: 'paduṭṭhā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'paduṭṭhaṃ', plural: 'paduṭṭhe' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'paduṭṭhena', plural: 'paduṭṭhehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'paduṭṭhassa', plural: 'paduṭṭhānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'paduṭṭhe', plural: 'paduṭṭhesu' },
    ],
  },
  pasanna: {
    lemma: 'pasanna',
    pos: '过去分词 / 形容词',
    posEn: 'pp. of pasīdati',
    root: 'pa + √sad (澄净、安住) + na',
    construction: 'pa + sad + na → pasanna',
    components: [
      { form: 'pa-', gloss: '向前、完全' },
      { form: '√sad', gloss: '沉淀、明净' },
      { form: '-na', gloss: '过去分词后缀' },
    ],
    meaningZh: '清净的、澄明的、怀有净信的',
    meaningEn: 'clear; serene; bright; confident; purified',
    frequencyRank: 7,
    suttaOccurrences: 860,
    example: {
      ref: 'Dhp 2',
      pali: 'Manasā ce pasannena bhāsati',
      highlight: 'pasannena',
      zh: '若以清净之心言说',
    },
    inflectionTitle: 'a 词干分词（具格单数修饰 manasā）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'pasanno', plural: 'pasannā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'pasannaṃ', plural: 'pasanne' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'pasannena', plural: 'pasannehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'pasannassa', plural: 'pasannānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'pasanne', plural: 'pasannesu' },
    ],
  },
  bhāsati: {
    lemma: 'bhāsati',
    pos: '动词',
    posEn: 'pr. 3rd sg.',
    root: '√bhās (言说、照耀) + a + ti',
    construction: 'bhāsa + ti',
    components: [
      { form: '√bhās', gloss: '说话、宣说' },
      { form: '-a-', gloss: '第一类动词词干' },
      { form: '-ti', gloss: '第三人称单数现在时' },
    ],
    meaningZh: '言说、讲述、宣说',
    meaningEn: 'speaks; says; utters',
    frequencyRank: 8,
    suttaOccurrences: 2150,
    example: {
      ref: 'Dhp 1',
      pali: 'bhāsati vā karoti vā',
      highlight: 'bhāsati',
      zh: '或言说或造作',
    },
    inflectionTitle: '现在时主动语态变位 (Present Tense - Vattamānā)',
    inflectionTable: [
      { caseName: '第三人称 (他/她)', casePali: 'Paṭhamapurisa', singular: 'bhāsati', plural: 'bhāsanti' },
      { caseName: '第二人称 (你)', casePali: 'Majjhimapurisa', singular: 'bhāsasi', plural: 'bhāsatha' },
      { caseName: '第一人称 (我)', casePali: 'Uttamapurisa', singular: 'bhāsāmi', plural: 'bhāsāma' },
    ],
  },
  karoti: {
    lemma: 'karoti',
    pos: '动词',
    posEn: 'pr. 3rd sg.',
    root: '√kar (做、造作) + o + ti',
    construction: 'kar + o + ti → karoti',
    components: [
      { form: '√kar', gloss: '作、造、行动' },
      { form: '-o-', gloss: '第八类动词词干后缀' },
      { form: '-ti', gloss: '第三人称单数现在时' },
    ],
    meaningZh: '做、造作、行动、履行',
    meaningEn: 'does; acts; makes; performs',
    frequencyRank: 9,
    suttaOccurrences: 8940,
    example: {
      ref: 'Dhp 1',
      pali: 'bhāsati vā karoti vā',
      highlight: 'karoti',
      zh: '或言说或造作',
    },
    inflectionTitle: '现在时主动语态变位 (√kar + o)',
    inflectionTable: [
      { caseName: '第三人称 (他/她)', casePali: 'Paṭhamapurisa', singular: 'karoti', plural: 'karonti' },
      { caseName: '第二人称 (你)', casePali: 'Majjhimapurisa', singular: 'karosi', plural: 'karotha' },
      { caseName: '第一人称 (我)', casePali: 'Uttamapurisa', singular: 'karomi', plural: 'karoma' },
    ],
  },
  vā: {
    lemma: 'vā',
    pos: '不变化词',
    posEn: 'ind. (conj.)',
    root: 'vā (选择连词)',
    construction: '后置连词：A vā B vā（或A或B）',
    components: [{ form: 'vā', gloss: '或者、抑或' }],
    meaningZh: '或、或者',
    meaningEn: 'or; either ... or',
    frequencyRank: 15,
    suttaOccurrences: 11200,
    example: {
      ref: 'Dhp 1',
      pali: 'bhāsati vā karoti vā',
      highlight: 'vā',
      zh: '或言说或造作',
    },
    inflectionTitle: '不变化词 (Indeclinable)',
    inflectionTable: [
      { caseName: '不变化词', casePali: 'Nipāta', singular: 'vā (无词形变化)', plural: '—' },
    ],
  },
  dukkha: {
    lemma: 'dukkha',
    pos: '中性名词',
    posEn: 'nt. / adj.',
    root: 'du (恶、难) + √kha (空、车轴孔)',
    construction: 'du + kha → dukkha',
    components: [
      { form: 'du-', gloss: '不良、艰难' },
      { form: 'kha', gloss: '轴孔、空间、感受' },
    ],
    meaningZh: '苦、痛苦、逼迫、不圆满',
    meaningEn: 'suffering; pain; stress; unsatisfactoriness',
    frequencyRank: 10,
    suttaOccurrences: 9850,
    example: {
      ref: 'Dhp 1',
      pali: 'Tato naṃ dukkhamanveti',
      highlight: 'dukkham',
      zh: '由彼苦随于他',
    },
    inflectionTitle: 'a 词干中性名词 (dukkha)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'dukkhaṃ', plural: 'dukkhāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'dukkhaṃ', plural: 'dukkhāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'dukkhena', plural: 'dukkhehi' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'dukkhā / dukkhasmā', plural: 'dukkhehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'dukkhassa', plural: 'dukkhānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'dukkhe / dukkhasmiṃ', plural: 'dukkhesu' },
    ],
  },
  sukha: {
    lemma: 'sukha',
    pos: '中性名词',
    posEn: 'nt. / adj.',
    root: 'su (善、顺畅) + √kha (车轴孔)',
    construction: 'su + kha → sukha',
    components: [
      { form: 'su-', gloss: '善好、顺畅' },
      { form: 'kha', gloss: '轴孔、安适状态' },
    ],
    meaningZh: '乐、安乐、幸福、顺适',
    meaningEn: 'happiness; ease; pleasure; well-being',
    frequencyRank: 11,
    suttaOccurrences: 7420,
    example: {
      ref: 'Dhp 2',
      pali: 'Tato naṃ sukhamanveti',
      highlight: 'sukham',
      zh: '由彼乐随于他',
    },
    inflectionTitle: 'a 词干中性名词 (sukha)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'sukhaṃ', plural: 'sukhāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'sukhaṃ', plural: 'sukhāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'sukhena', plural: 'sukhehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'sukhassa', plural: 'sukhānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'sukhe', plural: 'sukhesu' },
    ],
  },
  anveti: {
    lemma: 'anveti',
    pos: '动词',
    posEn: 'pr. 3rd sg.',
    root: 'anu (随) + √i (去、行) + ti',
    construction: 'anu + eti → anveti (连声规则 u + e → ve)',
    components: [
      { form: 'anu-', gloss: '跟随、顺着' },
      { form: 'eti (√i)', gloss: '行走、前往' },
    ],
    meaningZh: '跟随、追随、伴随',
    meaningEn: 'follows; goes after; pursues',
    frequencyRank: 13,
    suttaOccurrences: 112,
    example: {
      ref: 'Dhp 1',
      pali: 'Tato naṃ dukkhamanveti',
      highlight: 'anveti',
      zh: '由彼苦随于他',
    },
    inflectionTitle: '现在时变位 (anu + √i)',
    inflectionTable: [
      { caseName: '第三人称', casePali: 'Paṭhamapurisa', singular: 'anveti', plural: 'anventi' },
      { caseName: '第二人称', casePali: 'Majjhimapurisa', singular: 'anvesi', plural: 'anvetha' },
      { caseName: '第一人称', casePali: 'Uttamapurisa', singular: 'anvemi', plural: 'anvema' },
    ],
  },
  tato: {
    lemma: 'tato',
    pos: '不变化词 / 从格副词',
    posEn: 'ind. (abl.)',
    root: 'ta (彼) + to (从格后缀)',
    construction: 'ta + to → tato',
    components: [
      { form: 'ta-', gloss: '那、彼' },
      { form: '-to', gloss: '由、从……之后' },
    ],
    meaningZh: '由此、从彼、因此',
    meaningEn: 'from that; therefore; thereupon',
    frequencyRank: 16,
    suttaOccurrences: 3180,
    example: {
      ref: 'Dhp 1',
      pali: 'Tato naṃ dukkhamanveti',
      highlight: 'Tato',
      zh: '由彼苦随于他',
    },
    inflectionTitle: '从格副词 (Ablative Adverb)',
    inflectionTable: [
      { caseName: '从格副词', casePali: 'Pañcamī-nipāta', singular: 'tato', plural: '—' },
    ],
  },
  naṃ: {
    lemma: 'naṃ',
    pos: '人称/指示代词',
    posEn: 'pron. 3rd sg. acc.',
    root: 'ta / ena (他、彼)',
    construction: '第三人称单数业格附着形式',
    components: [{ form: 'naṃ', gloss: '他、彼（宾语）' }],
    meaningZh: '他、彼（业格单数）',
    meaningEn: 'him; her; it; that one (accusative)',
    frequencyRank: 17,
    suttaOccurrences: 6500,
    example: {
      ref: 'Dhp 1',
      pali: 'Tato naṃ dukkhamanveti',
      highlight: 'naṃ',
      zh: '由彼苦随于他',
    },
    inflectionTitle: '第三人称代词 ta / na（阳性）',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'so', plural: 'te' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'taṃ / naṃ', plural: 'te / ne' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'tena / nena', plural: 'tehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'tassa / nassa', plural: 'tesaṃ' },
    ],
  },
  cakka: {
    lemma: 'cakka',
    pos: '中性名词',
    posEn: 'nt.',
    root: '√car / √cak (转动)',
    construction: 'cakka (+ va 如同)',
    components: [
      { form: 'cakka', gloss: '车轮、法轮' },
      { form: 'va (iva)', gloss: '如同、就像' },
    ],
    meaningZh: '车轮、轮',
    meaningEn: 'wheel; disc; cycle',
    frequencyRank: 18,
    suttaOccurrences: 690,
    example: {
      ref: 'Dhp 1',
      pali: 'cakkaṃva vahato padaṃ',
      highlight: 'cakkaṃva',
      zh: '如轮随于挽车牛之足',
    },
    inflectionTitle: 'a 词干中性名词 (cakka)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'cakkaṃ', plural: 'cakkāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'cakkaṃ', plural: 'cakkāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'cakkena', plural: 'cakkehi' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'cakke', plural: 'cakkesu' },
    ],
  },
  vahato: {
    lemma: 'vahanta',
    pos: '现在分词',
    posEn: 'prp. masc. gen. sg. of vahati',
    root: '√vah (拉、负荷、牵引) + anta',
    construction: 'vah + at + o (属格单数)',
    components: [
      { form: '√vah', gloss: '拉车、负载' },
      { form: '-anta / -at', gloss: '现在分词后缀（挽车的牛）' },
    ],
    meaningZh: '挽车者的、拉车之牛的',
    meaningEn: 'of the carrying one; of the draught-ox pulling the cart',
    frequencyRank: 22,
    suttaOccurrences: 48,
    example: {
      ref: 'Dhp 1',
      pali: 'cakkaṃva vahato padaṃ',
      highlight: 'vahato',
      zh: '如轮随于挽车牛之足',
    },
    inflectionTitle: '现在分词 -ant/-at 词干 (vahanta)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'vahaṃ / vahanto', plural: 'vahantā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'vahantaṃ', plural: 'vahante' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'vahatā / vahantena', plural: 'vahantehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'vahato / vahantassa', plural: 'vahataṃ' },
    ],
  },
  pada: {
    lemma: 'pada',
    pos: '中性名词',
    posEn: 'nt.',
    root: '√pad (踏、行、步)',
    construction: '√pad + a → pada',
    components: [
      { form: '√pad', gloss: '跨步、立足' },
      { form: '-a', gloss: '名词后缀' },
    ],
    meaningZh: '足、脚印、道路、境界、句偈',
    meaningEn: 'foot; footprint; path; state; verse line',
    frequencyRank: 14,
    suttaOccurrences: 2340,
    example: {
      ref: 'Dhp 1',
      pali: 'cakkaṃva vahato padaṃ',
      highlight: 'padaṃ',
      zh: '如轮随于挽车牛之足',
    },
    inflectionTitle: 'a 词干中性名词 (pada)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'padaṃ', plural: 'padāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'padaṃ', plural: 'padāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'padena', plural: 'padehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'padassa', plural: 'padānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'pade', plural: 'padesu' },
    ],
  },
  chāyā: {
    lemma: 'chāyā',
    pos: '阴性名词',
    posEn: 'fem.',
    root: '√chā (遮蔽、投影)',
    construction: 'chāyā + va (iva 如同)',
    components: [
      { form: 'chāyā', gloss: '影子、树荫' },
      { form: 'va (iva)', gloss: '如同' },
    ],
    meaningZh: '影子、身影、荫凉',
    meaningEn: 'shadow; shade',
    frequencyRank: 19,
    suttaOccurrences: 210,
    example: {
      ref: 'Dhp 2',
      pali: 'chāyāva anapāyinī',
      highlight: 'chāyāva',
      zh: '如影随形而不离',
    },
    inflectionTitle: 'ā 词干阴性名词 (chāyā)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'chāyā', plural: 'chāyā / chāyāyo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'chāyaṃ', plural: 'chāyā / chāyāyo' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'chāyāya', plural: 'chāyāhi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'chāyāya', plural: 'chāyānaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'chāyāya / chāyāyaṃ', plural: 'chāyāsu' },
    ],
  },
  anapāyinī: {
    lemma: 'anapāyinī',
    pos: '形容词（阴性）',
    posEn: 'adj. fem.',
    root: 'na (不) + apa (离) + √i (去) + in + ī',
    construction: 'an + apāyin + ī',
    components: [
      { form: 'an-', gloss: '否定前缀（不）' },
      { form: 'apāyinī', gloss: '离开的、散去的（阴性）' },
    ],
    meaningZh: '不离的、寸步相随的',
    meaningEn: 'never departing; accompanying; unleaving',
    frequencyRank: 20,
    suttaOccurrences: 14,
    example: {
      ref: 'Dhp 2',
      pali: 'chāyāva anapāyinī',
      highlight: 'anapāyinī',
      zh: '如影随形而不离',
    },
    inflectionTitle: 'ī 词干阴性形容词 (anapāyinī)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'anapāyinī', plural: 'anapāyinī / anapāyiniyo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'anapāyiniṃ', plural: 'anapāyiniyo' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'anapāyiniyā', plural: 'anapāyinīhi' },
    ],
  },
  vera: {
    lemma: 'vera',
    pos: '中性名词',
    posEn: 'nt.',
    root: 'vīra → vera (怨恨、敌意)',
    construction: 'vera + ena (具格) / āni (复数)',
    components: [{ form: 'vera', gloss: '怨恨、仇恨、敌意' }],
    meaningZh: '怨恨、仇恨、敌意',
    meaningEn: 'hatred; hostility; ill-will; enmity',
    frequencyRank: 21,
    suttaOccurrences: 340,
    example: {
      ref: 'Dhp 5',
      pali: 'Na hi verena verāni, sammantīdha kudācanaṃ',
      highlight: 'verena',
      zh: '于此世界中，从非以怨止怨',
    },
    inflectionTitle: 'a 词干中性名词 (vera)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'veraṃ', plural: 'verāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'veraṃ', plural: 'verāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'verena', plural: 'verehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'verassa', plural: 'verānaṃ' },
    ],
  },
  avera: {
    lemma: 'avera',
    pos: '中性名词 / 形容词',
    posEn: 'nt. / adj.',
    root: 'na (无) + vera (怨恨)',
    construction: 'a + vera → avera',
    components: [
      { form: 'a-', gloss: '无、非' },
      { form: 'vera', gloss: '怨恨、敌意' },
    ],
    meaningZh: '无怨、慈忍、友善',
    meaningEn: 'non-hatred; friendliness; kindness; peace',
    frequencyRank: 23,
    suttaOccurrences: 92,
    example: {
      ref: 'Dhp 5',
      pali: 'Averena ca sammanti, esa dhammo sanantano',
      highlight: 'Averena',
      zh: '唯以无怨方止息，此乃亘古常恒法',
    },
    inflectionTitle: 'a 词干中性名词 (avera)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'averaṃ', plural: 'averāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'averena', plural: 'averehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'averassa', plural: 'averānaṃ' },
    ],
  },
  sammati: {
    lemma: 'sammati',
    pos: '动词',
    posEn: 'pr. 3rd sg.',
    root: '√sam (平息、寂静) + ya + ti',
    construction: 'sam + ya + ti → sammati',
    components: [
      { form: '√sam', gloss: '平息、止息、安宁' },
      { form: '-ya-', gloss: '第三类动词后缀 (s + y → mm)' },
    ],
    meaningZh: '止息、平息、归于寂静',
    meaningEn: 'is appeased; ceases; calms down; subsides',
    frequencyRank: 24,
    suttaOccurrences: 185,
    example: {
      ref: 'Dhp 5',
      pali: 'Averena ca sammanti',
      highlight: 'sammanti',
      zh: '唯以无怨方止息',
    },
    inflectionTitle: '现在时变位 (sammati)',
    inflectionTable: [
      { caseName: '第三人称', casePali: 'Paṭhamapurisa', singular: 'sammati', plural: 'sammanti' },
      { caseName: '第二人称', casePali: 'Majjhimapurisa', singular: 'sammasi', plural: 'sammatha' },
      { caseName: '第一人称', casePali: 'Uttamapurisa', singular: 'sammāmi', plural: 'sammāma' },
    ],
  },
  sanantana: {
    lemma: 'sanantana',
    pos: '形容词',
    posEn: 'adj.',
    root: 'sanaṃ (恒常、自古) + tana',
    construction: 'sanaṃ + tana → sanantana',
    components: [
      { form: 'sanaṃ', gloss: '自古、永远' },
      { form: '-tana', gloss: '时间形容词后缀' },
    ],
    meaningZh: '亘古的、永恒的、古已有之的',
    meaningEn: 'ancient; eternal; primeval; perennial',
    frequencyRank: 25,
    suttaOccurrences: 22,
    example: {
      ref: 'Dhp 5',
      pali: 'esa dhammo sanantano',
      highlight: 'sanantano',
      zh: '此乃亘古常恒法',
    },
    inflectionTitle: 'a 词干形容词 (sanantana)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'sanantano', plural: 'sanantanā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'sanantanaṃ', plural: 'sanantane' },
    ],
  },
  appamāda: {
    lemma: 'appamāda',
    pos: '阳性名词',
    posEn: 'masc.',
    root: 'na (不) + pa + √mad (放逸、沉醉)',
    construction: 'a + pamāda → appamāda',
    components: [
      { form: 'a- (ap-)', gloss: '否定前缀（不）' },
      { form: 'pamāda', gloss: '放逸、懈怠' },
    ],
    meaningZh: '不放逸、警觉、精进正念',
    meaningEn: 'heedfulness; diligence; mindfulness; non-negligence',
    frequencyRank: 26,
    suttaOccurrences: 1120,
    example: {
      ref: 'Dhp 21',
      pali: 'Appamādo amatapadaṃ',
      highlight: 'Appamādo',
      zh: '不放逸为不死道',
    },
    inflectionTitle: 'a 词干阳性名词 (appamāda)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'appamādo', plural: 'appamādā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'appamādaṃ', plural: 'appamāde' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'appamādena', plural: 'appamādehi' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'appamāde', plural: 'appamādesu' },
    ],
  },
  amatapada: {
    lemma: 'amatapada',
    pos: '中性名词',
    posEn: 'nt. comp.',
    root: 'a + √mar (死) + ta + √pad (步、境界)',
    construction: 'amata (不死) + pada (道、境界)',
    components: [
      { form: 'amata', gloss: '不死（涅槃）' },
      { form: 'pada', gloss: '道路、足迹、境界' },
    ],
    meaningZh: '不死之道、涅槃境界',
    meaningEn: 'the path to the Deathless; state of immortality (Nibbāna)',
    frequencyRank: 27,
    suttaOccurrences: 46,
    example: {
      ref: 'Dhp 21',
      pali: 'Appamādo amatapadaṃ',
      highlight: 'amatapadaṃ',
      zh: '不放逸为不死道',
    },
    inflectionTitle: 'a 词干中性复合词 (amatapada)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'amatapadaṃ', plural: 'amatapadāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'amatapadaṃ', plural: 'amatapadāni' },
    ],
  },
  pamāda: {
    lemma: 'pamāda',
    pos: '阳性名词',
    posEn: 'masc.',
    root: 'pa + √mad (沉迷、疏忽)',
    construction: 'pa + mād + a → pamāda',
    components: [
      { form: 'pa-', gloss: '过度、放任' },
      { form: '√mad', gloss: '沉醉、昏昧' },
    ],
    meaningZh: '放逸、懈怠、疏忽',
    meaningEn: 'heedlessness; negligence; carelessness',
    frequencyRank: 28,
    suttaOccurrences: 580,
    example: {
      ref: 'Dhp 21',
      pali: 'pamādo maccuno padaṃ',
      highlight: 'pamādo',
      zh: '放逸为死王之径',
    },
    inflectionTitle: 'a 词干阳性名词 (pamāda)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'pamādo', plural: 'pamādā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'pamādaṃ', plural: 'pamāde' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'pamādena', plural: 'pamādehi' },
    ],
  },
  maccu: {
    lemma: 'maccu',
    pos: '阳性名词',
    posEn: 'masc.',
    root: '√mar (死亡) + tyu',
    construction: 'mar + tyu → maccu',
    components: [{ form: 'maccu', gloss: '死亡、死王' }],
    meaningZh: '死亡、死神、死王',
    meaningEn: 'death; King of Death (Māra)',
    frequencyRank: 29,
    suttaOccurrences: 310,
    example: {
      ref: 'Dhp 21',
      pali: 'pamādo maccuno padaṃ',
      highlight: 'maccuno',
      zh: '放逸为死王之径',
    },
    inflectionTitle: 'u 词干阳性名词 (maccu)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'maccu', plural: 'maccū / maccavo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'maccuṃ', plural: 'maccū' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'maccuno / maccussa', plural: 'maccūnaṃ' },
    ],
  },
  mettā: {
    lemma: 'mettā',
    pos: '阴性名词',
    posEn: 'fem.',
    root: '√mid (友爱、柔润) → mitta + yā',
    construction: 'mitta (友) + yā → mettā',
    components: [
      { form: 'mitta', gloss: '朋友、善友' },
      { form: '-yā', gloss: '抽象阴性名词后缀' },
    ],
    meaningZh: '慈、慈爱、善意友爱',
    meaningEn: 'loving-kindness; goodwill; friendliness; benevolence',
    frequencyRank: 30,
    suttaOccurrences: 940,
    example: {
      ref: 'Sn 1.8',
      pali: 'Mettāñca sabbalokasmiṃ, mānasaṃ bhāvaye aparimāṇaṃ',
      highlight: 'Mettāñca',
      zh: '对一切世间修习无量慈心',
    },
    inflectionTitle: 'ā 词干阴性名词 (mettā)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'mettā', plural: 'mettāyo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'mettaṃ', plural: 'mettāyo' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'mettāya', plural: 'mettāhi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'mettāya', plural: 'mettānaṃ' },
    ],
  },
  sati: {
    lemma: 'sati',
    pos: '阴性名词',
    posEn: 'fem.',
    root: '√sar (忆念、觉知) + ti',
    construction: 'sar + ti → sati',
    components: [
      { form: '√sar', gloss: '忆念、保持觉知' },
      { form: '-ti', gloss: '行为抽象名词后缀' },
    ],
    meaningZh: '念、正念、觉察、忆念',
    meaningEn: 'mindfulness; awareness; recollection',
    frequencyRank: 31,
    suttaOccurrences: 4120,
    example: {
      ref: 'DN 22',
      pali: 'Atāpī sampajāno satimā',
      highlight: 'satimā',
      zh: '热忱、正知、具念',
    },
    inflectionTitle: 'i 词干阴性名词 (sati)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'sati', plural: 'satī / satiyo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'satiṃ', plural: 'satiyo' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'satiyā', plural: 'satīhi' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'satiyā / satiyaṃ', plural: 'satīsu' },
    ],
  },
  paññā: {
    lemma: 'paññā',
    pos: '阴性名词',
    posEn: 'fem.',
    root: 'pa + √ñā (知、如实了知)',
    construction: 'pa + ñā + ā → paññā',
    components: [
      { form: 'pa-', gloss: '普遍、透彻' },
      { form: '√ñā', gloss: '知晓、洞察' },
    ],
    meaningZh: '慧、般若、洞察智',
    meaningEn: 'wisdom; discernment; insight; understanding',
    frequencyRank: 32,
    suttaOccurrences: 3890,
    example: {
      ref: 'Dhp 28',
      pali: 'Paññāpāsādamāruyha',
      highlight: 'Paññā',
      zh: '登上智慧之高阁',
    },
    inflectionTitle: 'ā 词干阴性名词 (paññā)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'paññā', plural: 'paññāyo' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'paññaṃ', plural: 'paññāyo' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'paññāya', plural: 'paññāhi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'paññāya', plural: 'paññānaṃ' },
    ],
  },
  paṇḍita: {
    lemma: 'paṇḍita',
    pos: '阳性名词 / 形容词',
    posEn: 'masc. / adj.',
    root: 'paṇḍā (智慧) + ita',
    construction: 'paṇḍā + ita → paṇḍita',
    components: [
      { form: 'paṇḍā', gloss: '明智、睿智' },
      { form: '-ita', gloss: '具有……者' },
    ],
    meaningZh: '智者、贤者、明智的人',
    meaningEn: 'wise person; sage; intelligent',
    frequencyRank: 33,
    suttaOccurrences: 1260,
    example: {
      ref: 'Sn 2.4',
      pali: 'Asevanā ca bālānaṃ, paṇḍitānañca sevanā',
      highlight: 'paṇḍitānañca',
      zh: '不亲近愚人，应亲近智者',
    },
    inflectionTitle: 'a 词干阳性名词 (paṇḍita)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'paṇḍito', plural: 'paṇḍitā' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'paṇḍitaṃ', plural: 'paṇḍite' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'paṇḍitassa', plural: 'paṇḍitānaṃ' },
    ],
  },
  maṅgala: {
    lemma: 'maṅgala',
    pos: '中性名词 / 形容词',
    posEn: 'nt. / adj.',
    root: '√maṅg (福祉、吉祥) + ala',
    construction: 'maṅg + ala → maṅgala',
    components: [{ form: 'maṅgala', gloss: '吉祥、祝福、善瑞' }],
    meaningZh: '吉祥、福庆、福祉',
    meaningEn: 'blessing; auspiciousness; good omen; prosperity',
    frequencyRank: 34,
    suttaOccurrences: 315,
    example: {
      ref: 'Sn 2.4',
      pali: 'etaṃ maṅgalamuttamaṃ',
      highlight: 'maṅgalam',
      zh: '此为最上吉祥',
    },
    inflectionTitle: 'a 词干中性名词 (maṅgala)',
    inflectionTable: [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'maṅgalaṃ', plural: 'maṅgalāni' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'maṅgalaṃ', plural: 'maṅgalāni' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'maṅgale', plural: 'maṅgalesu' },
    ],
  },
};

export const SUTTAS: SuttaItem[] = [
  {
    id: 'dhp-1',
    code: 'Dhp 1',
    titleZh: '法句经 · 偈 1',
    titlePali: 'Dhammapada · Yamakavagga 1',
    chapterZh: '第 1 章 · 双品 · 第 1 偈',
    collection: 'Khuddakanikāya · SuttaCentral (bilara-data)',
    sourceLicense: 'CC0 1.0 Public Domain (SuttaCentral / Mahāsaṅgīti)',
    audioReciter: 'Bhikkhu Ānandajoti',
    audioSource: 'Ancient Buddhist Texts / Pali Audio (CC BY-SA 3.0)',
    estimatedMinutes: 5,
    sentences: [
      {
        id: 'dhp-1-1',
        verseRef: '偈 1',
        sentenceIndex: 1,
        totalInVerse: 2,
        paliText: 'Manopubbaṅgamā dhammā, manoseṭṭhā manomayā;',
        zhTranslation: '诸法以心为先导，以心为主，由心所造。',
        enTranslation: 'Things are led by mind, ruled by mind, made of mind.',
        audioDurationSec: 6,
        tokens: [
          {
            surface: 'Manopubbaṅgamā',
            lemma: 'manopubbaṅgama',
            contextGrammar: '形容词 · 此处为阳性主格复数',
            highlightDefault: true,
          },
          {
            surface: 'dhammā',
            punctuationAfter: ',',
            lineBreakAfter: true,
            lemma: 'dhamma',
            contextGrammar: '阳性名词 · 此处为阳性主格复数',
          },
          {
            surface: 'manoseṭṭhā',
            lemma: 'manoseṭṭha',
            contextGrammar: '形容词 · 此处为阳性主格复数',
            dottedUnderline: true,
          },
          {
            surface: 'manomayā',
            punctuationAfter: ';',
            lemma: 'manomaya',
            contextGrammar: '形容词 · 此处为阳性主格复数',
            dottedUnderline: true,
          },
        ],
      },
      {
        id: 'dhp-1-2',
        verseRef: '偈 1',
        sentenceIndex: 2,
        totalInVerse: 2,
        paliText: 'Manasā ce paduṭṭhena bhāsati vā karoti vā; Tato naṃ dukkhamanveti, cakkaṃva vahato padaṃ.',
        zhTranslation: '若以染污之心，或言说或造作，由彼苦随于他，如轮随于挽车牛之足。',
        enTranslation: 'If with a corrupted mind one speaks or acts, from that suffering follows him, as the wheel follows the hoof of the draught-ox.',
        audioDurationSec: 9,
        tokens: [
          {
            surface: 'Manasā',
            lemma: 'manas',
            contextGrammar: '中性名词 · 此处为具格单数（以心）',
          },
          {
            surface: 'ce',
            lemma: 'ce',
            contextGrammar: '条件不变化词 · 如果、假使',
          },
          {
            surface: 'paduṭṭhena',
             lineBreakAfter: true,
            lemma: 'paduṭṭha',
            contextGrammar: '过去分词 · 此处为具格单数（被染污的）',
            dottedUnderline: true,
          },
          {
            surface: 'bhāsati',
            lemma: 'bhāsati',
            contextGrammar: '动词 · 现在时第三人称单数（言说）',
          },
          {
            surface: 'vā',
            lemma: 'vā',
            contextGrammar: '选择连词 · 或者',
          },
          {
            surface: 'karoti',
            lemma: 'karoti',
            contextGrammar: '动词 · 现在时第三人称单数（造作）',
          },
          {
            surface: 'vā',
            punctuationAfter: ';',
            lineBreakAfter: true,
            lemma: 'vā',
            contextGrammar: '选择连词 · 或者',
          },
          {
            surface: 'Tato',
            lemma: 'tato',
            contextGrammar: '从格副词 · 由彼、因此',
          },
          {
            surface: 'naṃ',
            lemma: 'naṃ',
            contextGrammar: '第三人称代词 · 阳性业格单数（他）',
          },
          {
            surface: 'dukkhamanveti',
            punctuationAfter: ',',
            lemma: 'dukkha',
            contextGrammar: '连声复合：dukkhaṃ (主格) + anveti (跟随)',
            dottedUnderline: true,
          },
          {
            surface: 'cakkaṃva',
            lemma: 'cakka',
            contextGrammar: '连声：cakkaṃ (车轮，主格) + va (如同)',
            dottedUnderline: true,
          },
          {
            surface: 'vahato',
            lemma: 'vahato',
            contextGrammar: '现在分词 · 阳性属格单数（拉车牛的）',
            dottedUnderline: true,
          },
          {
            surface: 'padaṃ',
            punctuationAfter: '.',
            lemma: 'pada',
            contextGrammar: '中性名词 · 此处为业格单数（足迹）',
          },
        ],
      },
    ],
  },
  {
    id: 'dhp-2',
    code: 'Dhp 2',
    titleZh: '法句经 · 偈 2',
    titlePali: 'Dhammapada · Yamakavagga 2',
    chapterZh: '第 1 章 · 双品 · 第 2 偈',
    collection: 'Khuddakanikāya · SuttaCentral (bilara-data)',
    sourceLicense: 'CC0 1.0 Public Domain (SuttaCentral / Mahāsaṅgīti)',
    audioReciter: 'Bhikkhu Ānandajoti',
    audioSource: 'Pali Audio / Ancient Buddhist Texts (CC BY-SA 3.0)',
    estimatedMinutes: 6,
    sentences: [
      {
        id: 'dhp-2-1',
        verseRef: '偈 2',
        sentenceIndex: 1,
        totalInVerse: 2,
        paliText: 'Manopubbaṅgamā dhammā, manoseṭṭhā manomayā;',
        zhTranslation: '诸法以心为先导，以心为主，由心所造。',
        enTranslation: 'Things are led by mind, ruled by mind, made of mind.',
        audioDurationSec: 6,
        tokens: [
          {
            surface: 'Manopubbaṅgamā',
            lemma: 'manopubbaṅgama',
            contextGrammar: '形容词 · 此处为阳性主格复数',
          },
          {
            surface: 'dhammā',
            punctuationAfter: ',',
            lineBreakAfter: true,
            lemma: 'dhamma',
            contextGrammar: '阳性名词 · 此处为阳性主格复数',
          },
          {
            surface: 'manoseṭṭhā',
            lemma: 'manoseṭṭha',
            contextGrammar: '形容词 · 此处为阳性主格复数',
            dottedUnderline: true,
          },
          {
            surface: 'manomayā',
            punctuationAfter: ';',
            lemma: 'manomaya',
            contextGrammar: '形容词 · 此处为阳性主格复数',
            dottedUnderline: true,
          },
        ],
      },
      {
        id: 'dhp-2-2',
        verseRef: '偈 2',
        sentenceIndex: 2,
        totalInVerse: 2,
        paliText: 'Manasā ce pasannena bhāsati vā karoti vā; Tato naṃ sukhamanveti, chāyāva anapāyinī.',
        zhTranslation: '若以清净之心，或言说或造作，由彼乐随于他，如影随形而不离。',
        enTranslation: 'If with a serene mind one speaks or acts, from that happiness follows him, like a shadow that never departs.',
        audioDurationSec: 9,
        tokens: [
          {
            surface: 'Manasā',
            lemma: 'manas',
            contextGrammar: '中性名词 · 此处为具格单数（以心）',
          },
          {
            surface: 'ce',
            lemma: 'ce',
            contextGrammar: '条件不变化词 · 如果',
          },
          {
            surface: 'pasannena',
            lineBreakAfter: true,
            lemma: 'pasanna',
            contextGrammar: '过去分词 · 此处为具格单数（清净澄明的）',
            dottedUnderline: true,
          },
          {
            surface: 'bhāsati',
            lemma: 'bhāsati',
            contextGrammar: '动词 · 现在时第三人称单数（言说）',
          },
          {
            surface: 'vā',
            lemma: 'vā',
            contextGrammar: '选择连词 · 或者',
          },
          {
            surface: 'karoti',
            lemma: 'karoti',
            contextGrammar: '动词 · 现在时第三人称单数（造作）',
          },
          {
            surface: 'vā',
            punctuationAfter: ';',
            lineBreakAfter: true,
            lemma: 'vā',
            contextGrammar: '选择连词 · 或者',
          },
          {
            surface: 'Tato',
            lemma: 'tato',
            contextGrammar: '从格副词 · 由彼',
          },
          {
            surface: 'naṃ',
            lemma: 'naṃ',
            contextGrammar: '第三人称代词 · 业格单数（他）',
          },
          {
            surface: 'sukhamanveti',
            punctuationAfter: ',',
            lemma: 'sukha',
            contextGrammar: '连声复合：sukhaṃ (乐，主格) + anveti (跟随)',
            dottedUnderline: true,
          },
          {
            surface: 'chāyāva',
            lemma: 'chāyā',
            contextGrammar: '连声：chāyā (影子，阴性主格单数) + va (如同)',
            dottedUnderline: true,
          },
          {
            surface: 'anapāyinī',
            punctuationAfter: '.',
            lemma: 'anapāyinī',
            contextGrammar: '阴性形容词 · 主格单数（寸步不离的）',
            dottedUnderline: true,
          },
        ],
      },
    ],
  },
  {
    id: 'dhp-5',
    code: 'Dhp 5',
    titleZh: '法句经 · 偈 5',
    titlePali: 'Dhammapada · Yamakavagga 5',
    chapterZh: '第 1 章 · 双品 · 第 5 偈',
    collection: 'Khuddakanikāya · SuttaCentral (bilara-data)',
    sourceLicense: 'CC0 1.0 Public Domain (SuttaCentral / Mahāsaṅgīti)',
    audioReciter: 'Bhikkhu Ānandajoti',
    audioSource: 'Audio Tipitaka / Ancient Buddhist Texts (CC BY-SA 3.0)',
    estimatedMinutes: 5,
    sentences: [
      {
        id: 'dhp-5-1',
        verseRef: '偈 5',
        sentenceIndex: 1,
        totalInVerse: 2,
        paliText: 'Na hi verena verāni, sammantīdha kudācanaṃ;',
        zhTranslation: '于此世界中，从非以怨恨止息怨恨；',
        enTranslation: 'Never in this world are hatreds appeased by hatred;',
        audioDurationSec: 6,
        tokens: [
          {
            surface: 'Na',
            lemma: 'ce',
            contextGrammar: '否定不变化词 · 不、非',
          },
          {
            surface: 'hi',
            lemma: 'ce',
            contextGrammar: '强调小品词 · 诚然、确实',
          },
          {
            surface: 'verena',
            lemma: 'vera',
            contextGrammar: '中性名词 · 具格单数（借由怨恨）',
            dottedUnderline: true,
          },
          {
            surface: 'verāni',
            punctuationAfter: ',',
            lineBreakAfter: true,
            lemma: 'vera',
            contextGrammar: '中性名词 · 主格复数（诸怨恨）',
            dottedUnderline: true,
          },
          {
            surface: 'sammantīdha',
            lemma: 'sammati',
            contextGrammar: '连声：sammanti (止息，3rd pl.) + idha (于此世间)',
            dottedUnderline: true,
          },
          {
            surface: 'kudācanaṃ',
            punctuationAfter: ';',
            lemma: 'tato',
            contextGrammar: '时间副词 · 在任何时候、无论何时',
          },
        ],
      },
      {
        id: 'dhp-5-2',
        verseRef: '偈 5',
        sentenceIndex: 2,
        totalInVerse: 2,
        paliText: 'Averena ca sammanti, esa dhammo sanantano.',
        zhTranslation: '唯以无怨方能止息，此乃亘古常恒之法。',
        enTranslation: 'They are appeased only by non-hatred: this is an eternal law.',
        audioDurationSec: 6,
        tokens: [
          {
            surface: 'Averena',
            lemma: 'avera',
            contextGrammar: '中性名词 · 具格单数（借由无怨、慈忍）',
            dottedUnderline: true,
          },
          {
            surface: 'ca',
            lemma: 'vā',
            contextGrammar: '连接词 · 而、且',
          },
          {
            surface: 'sammanti',
            punctuationAfter: ',',
            lineBreakAfter: true,
            lemma: 'sammati',
            contextGrammar: '动词 · 现在时第三人称复数（得以平息）',
            dottedUnderline: true,
          },
          {
            surface: 'esa',
            lemma: 'naṃ',
            contextGrammar: '指示代词 · 阳性主格单数（这、此）',
          },
          {
            surface: 'dhammo',
            lemma: 'dhamma',
            contextGrammar: '阳性名词 · 主格单数（法则、规律）',
          },
          {
            surface: 'sanantano',
            punctuationAfter: '.',
            lemma: 'sanantana',
            contextGrammar: '形容词 · 阳性主格单数（亘古常恒的）',
            dottedUnderline: true,
          },
        ],
      },
    ],
  },
  {
    id: 'dhp-21',
    code: 'Dhp 21',
    titleZh: '法句经 · 偈 21',
    titlePali: 'Dhammapada · Appamādavagga 21',
    chapterZh: '第 2 章 · 不放逸品 · 第 1 偈',
    collection: 'Khuddakanikāya · SuttaCentral (bilara-data)',
    sourceLicense: 'CC0 1.0 Public Domain (SuttaCentral / Mahāsaṅgīti)',
    audioReciter: 'Bhikkhu Sujato / Ānandajoti',
    audioSource: 'SuttaCentral Voice / Pali Audio (CC0 / CC BY-SA)',
    estimatedMinutes: 5,
    sentences: [
      {
        id: 'dhp-21-1',
        verseRef: '偈 21',
        sentenceIndex: 1,
        totalInVerse: 1,
        paliText: 'Appamādo amatapadaṃ, pamādo maccuno padaṃ;',
        zhTranslation: '不放逸是不死之道，放逸是死王之径；',
        enTranslation: 'Heedfulness is the path to the Deathless; heedlessness is the path to death.',
        audioDurationSec: 7,
        tokens: [
          {
            surface: 'Appamādo',
            lemma: 'appamāda',
            contextGrammar: '阳性名词 · 主格单数（不放逸、正念警觉）',
            dottedUnderline: true,
          },
          {
            surface: 'amatapadaṃ',
            punctuationAfter: ',',
            lineBreakAfter: true,
            lemma: 'amatapada',
            contextGrammar: '中性复合词 · 主格单数（不死之境、涅槃之道）',
            dottedUnderline: true,
          },
          {
            surface: 'pamādo',
            lemma: 'pamāda',
            contextGrammar: '阳性名词 · 主格单数（放逸、疏忽）',
            dottedUnderline: true,
          },
          {
            surface: 'maccuno',
            lemma: 'maccu',
            contextGrammar: '阳性名词 · 属格单数（死亡的、死王的）',
            dottedUnderline: true,
          },
          {
            surface: 'padaṃ',
            punctuationAfter: ';',
            lemma: 'pada',
            contextGrammar: '中性名词 · 主格单数（道路、足迹）',
          },
        ],
      },
    ],
  },
];

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'noun-declension',
    number: '01',
    titleZh: '名词变格表与格位功能',
    titlePali: 'Nāma-vibhatti · a-词干与 manas 词群',
    summary: '掌握巴利语最核心的阳性/中性 -a 词干（dhamma, pada）与特殊辅音词干（manas），读懂经文主谓宾与工具状语。',
    readingMinutes: 8,
    sections: [
      {
        heading: '1. 巴利语的八格 (Aṭṭha Vibhattiyo)',
        body: '巴利语通过词尾变化（变格）来表示名词在句子中的语法角色，因此语序相对自由。阅读《法句经》时，最重要的是辨认主格（施事/主语）、业格（受事/宾语或方向）与具格（藉由什么工具或伴随状态）。',
        table: {
          headers: ['格位', '巴利名称', '核心语法功能', 'dhamma (阳) 单/复', 'dukkha (中) 单/复'],
          rows: [
            ['1. 主格 (Nom.)', 'Paṭhamā', '句子主语、表语', 'dhammo / dhammā', 'dukkhaṃ / dukkhāni'],
            ['2. 业格 (Acc.)', 'Dutiyā', '直接宾语、动作终点', 'dhammaṃ / dhamme', 'dukkhaṃ / dukkhāni'],
            ['3. 具格 (Ins.)', 'Tatiyā', '工具、方式（以……）', 'dhammena / dhammehi', 'dukkhena / dukkhehi'],
            ['4. 为格 (Dat.)', 'Catutthī', '间接宾语、目的', 'dhammassa / dhammānaṃ', 'dukkhassa / dukkhānaṃ'],
            ['5. 从格 (Abl.)', 'Pañcamī', '来源、原因（从……）', 'dhammā / dhammehi', 'dukkhā / dukkhehi'],
            ['6. 属格 (Gen.)', 'Chaṭṭhī', '所属关系（……的）', 'dhammassa / dhammānaṃ', 'dukkhassa / dukkhānaṃ'],
            ['7. 处格 (Loc.)', 'Sattamī', '时间、处所（在……中）', 'dhamme / dhammesu', 'dukkhe / dukkhesu'],
            ['8. 呼格 (Voc.)', 'Ālapana', '称呼、呼唤对象', 'dhamma / dhammā', 'dukkha / dukkhāni'],
          ],
        },
      },
      {
        heading: '2. manas（心/意）词群的特殊变格',
        body: '以 -as 结尾的古老词群（如 manas 心、vacas 语、tejas 光辉）在复合词首或主格单数常变为 -o（mano-），而在单数具格、属格、处格则保留辅音词干特征（manasā, manaso, manasi）。例如《法句经》第1偈：Manasā ce paduṭṭhena（若以染污之心），其中 manasā 与 paduṭṭhena 同为具格单数，形成一致修饰关系。',
      },
    ],
    exercises: [
      {
        id: 'nd-1',
        prompt: '在“Manopubbaṅgamā dhammā”中，dhammā 是什么格位与数？',
        paliFocus: 'dhammā',
        options: ['阳性 · 主格复数', '阳性 · 主格单数', '阳性 · 从格复数', '中性 · 业格单数'],
        correctIndex: 0,
        explanation: 'a 词干阳性名词 dhamma 的主格单数为 dhammo，主格复数为 dhammā（诸法）。',
        relatedLemma: 'dhamma',
      },
      {
        id: 'nd-2',
        prompt: '在“Manasā ce paduṭṭhena”中，paduṭṭhena 的词尾 -ena 表示什么格位？',
        paliFocus: 'paduṭṭhena',
        options: ['主格单数', '具格单数（以……）', '属格单数（……的）', '处格复数（在……之中）'],
        correctIndex: 1,
        explanation: '-ena 是 a 词干阳性与中性名词/形容词标准的具格单数词尾，修饰同样处于具格单数的 manasā（以染污的心）。',
        relatedLemma: 'paduṭṭha',
      },
      {
        id: 'nd-3',
        prompt: 'manas（心）的具格单数（表示“以心、用意识”）标准形式是什么？',
        paliFocus: 'manas → Ins. sg.',
        options: ['manasā', 'manassa', 'manasi', 'manānaṃ'],
        correctIndex: 0,
        explanation: 'manas 词群的具格单数为 manasā，属格单数为 manaso/manassa，处格单数为 manasi。',
        relatedLemma: 'manas',
      },
      {
        id: 'nd-4',
        prompt: '在“cakkaṃva vahato padaṃ”中，vahato（拉车牛的）属于什么格位？',
        paliFocus: 'vahato',
        options: ['主格单数', '业格单数', '属格单数（或为格单数）', '处格单数'],
        correctIndex: 2,
        explanation: '现在分词 vahant（拉车者）按辅音 -at 词干变化时，属格单数为 vahato（拉车牛的 [足迹]）。',
        relatedLemma: 'vahato',
      },
      {
        id: 'nd-5',
        prompt: '“Na hi verena verāni”中，verena 与 verāni 分别是什么格？',
        paliFocus: 'verena verāni',
        options: ['具格单数 与 主格复数', '主格单数 与 业格单数', '属格单数 与 处格复数', '从格复数 与 具格复数'],
        correctIndex: 0,
        explanation: 'verena 是具格单数（借由怨恨），verāni 是中性名词主格复数（诸怨恨）。全句意为“诸怨恨绝不借由怨恨而止息”。',
        relatedLemma: 'vera',
      },
      {
        id: 'nd-6',
        prompt: '在“pamādo maccuno padaṃ”中，maccuno（死王的）是什么词干的属格单数？',
        paliFocus: 'maccuno',
        options: ['u 词干阳性名词 (maccu)', 'a 词干阳性名词', 'i 词干阴性名词', 'ā 词干阴性名词'],
        correctIndex: 0,
        explanation: 'maccu（死亡、死王）是 u 词干阳性名词，其属格/为格单数形式为 maccuno 或 maccussa。',
        relatedLemma: 'maccu',
      },
    ],
  },
  {
    id: 'verb-conjugation',
    number: '02',
    titleZh: '动词变位表与时态系统',
    titlePali: 'Ākhyāta · 现在时、愿求式与连续体',
    summary: '理解巴利语七大类动词词干构造（bhāsati, karoti, anveti, sammati）以及人称词尾规律。',
    readingMinutes: 7,
    sections: [
      {
        heading: '1. 现在时主动语态词尾 (Vattamānā)',
        body: '巴利语现在时动词由“词根 (dhātu) + 词干中缀 (vikaraṇa) + 人称词尾 (vibhatti)”构成。经文中出现频率最高的是第三人称单数 (-ti) 与第三人称复数 (-nti)。',
        table: {
          headers: ['人称', '单数 (Ekavacana)', '复数 (Bahuvacana)', '例词：√bhās (说)', '例词：√kar (做)'],
          rows: [
            ['第三人称 (他/他们)', '-ti', '-nti', 'bhāsati / bhāsanti', 'karoti / karonti'],
            ['第二人称 (你/你们)', '-si', '-tha', 'bhāsasi / bhāsatha', 'karosi / karotha'],
            ['第一人称 (我/我们)', '-mi (词干元音拉长)', '-ma (词干元音拉长)', 'bhāsāmi / bhāsāma', 'karomi / karoma'],
          ],
        },
      },
      {
        heading: '2. 常见动词词干分类示例',
        body: '• 第一类 (-a- 词干)：√bhās + a + ti → bhāsati（言说）；anu + √i → anveti（跟随）。\n• 第三类 (-ya- 词干，常伴随辅音同化)：√sam + ya + ti → sammati（平息、止息）。\n• 第八类 (-o-/-u- 词干)：√kar + o + ti → karoti（造作、行动）。',
      },
    ],
    exercises: [
      {
        id: 'vc-1',
        prompt: '“bhāsati vā karoti vā”中的两个动词是什么人称和数？',
        paliFocus: 'bhāsati / karoti',
        options: ['第三人称单数 · 现在时', '第三人称复数 · 现在时', '第一人称单数 · 现在时', '第二人称单数 · 命令式'],
        correctIndex: 0,
        explanation: '词尾 -ti 标志现在时第三人称单数：“（他/某人）或言说，或造作”。',
        relatedLemma: 'bhāsati',
      },
      {
        id: 'vc-2',
        prompt: '动词 sammati（止息）在主语为复数名词 verāni（诸怨恨）时，应当变为：',
        paliFocus: 'verāni + sammati → ?',
        options: ['sammanti', 'sammasi', 'sammāmi', 'sammatha'],
        correctIndex: 0,
        explanation: '复数主语 verāni 搭配第三人称复数词尾 -nti，因此变为 sammanti（止息）。',
        relatedLemma: 'sammati',
      },
      {
        id: 'vc-3',
        prompt: 'anveti（跟随）是由哪个前缀与词根构成的？',
        paliFocus: 'anveti',
        options: ['anu (随) + √i (行、去)', 'ava (下) + √i (去)', 'ati (超越) + √vad (说)', 'apa (离) + √ya (去)'],
        correctIndex: 0,
        explanation: 'anu（跟随）+ eti（√i 去）在元音 e 前发生半元音化连声：u → v，故成 anveti。',
        relatedLemma: 'anveti',
      },
      {
        id: 'vc-4',
        prompt: '如果把 karoti（他做）改为第一人称单数“我做”，正确形式是：',
        paliFocus: '√kar + o + 1st sg.',
        options: ['karomi', 'karosi', 'karonti', 'karotha'],
        correctIndex: 0,
        explanation: '第一人称单数词尾为 -mi，故为 karomi。',
        relatedLemma: 'karoti',
      },
      {
        id: 'vc-5',
        prompt: '在“Manasā ce pasannena”中，pasanna 是动词 pasīdati（澄净）的什么形式？',
        paliFocus: 'pasanna',
        options: ['过去分词 (Past Participle)', '现在分词 (Present Participle)', '不定式 (Infinitive)', '连续体 (Absolutive)'],
        correctIndex: 0,
        explanation: 'pa + √sad + na 同化为 pasanna，是过去分词作形容词用，意为“已澄净的、清净的”。',
        relatedLemma: 'pasanna',
      },
    ],
  },
  {
    id: 'sandhi-rules',
    number: '03',
    titleZh: '连声规则与复合词拆解',
    titlePali: 'Sandhi & Samāsa · 经文断词核心法则',
    summary: '掌握元音连声、鼻音 (ṃ) 连声与有财释复合词 (Bahubbīhi)，一眼看穿连写长词的结构。',
    readingMinutes: 10,
    sections: [
      {
        heading: '1. 常见连声规则 (Sandhi)',
        body: '巴利语经文常将相邻词汇根据发音顺畅原则连写。阅读时通过 DPD 词典拆分即可还原词根：',
        table: {
          headers: ['连声类型', '经文原词', '拆分还原', '音变说明'],
          rows: [
            ['鼻音 ṃ 在元音前还原为 m', 'dukkhamanveti', 'dukkhaṃ + anveti', '词尾鼻音 ṃ 遇到元音 a 变为辅音 m'],
            ['元音省略与脱落', 'cakkaṃva / chāyāva', 'cakkaṃ + iva / chāyā + iva', 'iva（如同）省去句首元音 i 成为附着词 va'],
            ['元音长化融合', 'sammantīdha', 'sammanti + idha', '短元音 i + i 融合为长元音 ī'],
            ['ṃ 在颚音 c 前同化为 ñ', 'paṇḍitānañca', 'paṇḍitānaṃ + ca', '鼻音 ṃ 受颚音 c 影响同化为硬颚鼻音 ñ'],
            ['manas 词干 o 化', 'manopubbaṅgama', 'manas + pubbaṅgama', '-as 在浊音前变为 -o'],
          ],
        },
      },
      {
        heading: '2. 复合词：有财释 (Bahubbīhi) 与依主释 (Tappurisa)',
        body: '《法句经》首句的三个核心词均为修饰 dhammā（诸法）的复合形容词：\n• manopubbaṅgamā（以心为先导的）：mano（心）+ pubbaṅgama（走在前面的）→ 具有“心作为先导”这一属性的诸法（有财释 Bahubbīhi）。\n• manoseṭṭhā（以心为主的）：以心为最高统摄者的诸法。\n• manomayā（由心所造的）：mano（由心）+ maya（构成的）。',
      },
    ],
    exercises: [
      {
        id: 'sr-1',
        prompt: '经文中的连写词“dukkhamanveti”应当如何拆分为两个独立词？',
        paliFocus: 'dukkhamanveti',
        options: ['dukkhaṃ + anveti', 'dukkha + manveti', 'dukkhama + nveti', 'dukkhaṃ + veti'],
        correctIndex: 0,
        explanation: 'dukkhaṃ（苦，主格单数）遇到以元音开头的动词 anveti（跟随），词尾鼻音 ṃ 变为 m 连写为 dukkhamanveti。',
        relatedLemma: 'dukkha',
      },
      {
        id: 'sr-2',
        prompt: '“cakkaṃva”和“chāyāva”末尾的“-va”源自哪个词？',
        paliFocus: '-va',
        options: ['iva（如同、就像）', 'vā（或者）', 'eva（正是、唯）', 'vata（确实）'],
        correctIndex: 0,
        explanation: '比喻小品词 iva（如同）在词尾常省略元音 i 变成 va，附着在前词之后：cakkaṃva = cakkaṃ iva（如同车轮）。',
        relatedLemma: 'cakka',
      },
      {
        id: 'sr-3',
        prompt: '“sammantīdha”是由哪两个词通过元音连声合成的？',
        paliFocus: 'sammantīdha',
        options: ['sammanti + idha', 'samman + tīdha', 'sammantī + dha', 'sammaṃ + tidha'],
        correctIndex: 0,
        explanation: 'sammanti（止息）末尾的 i 与 idha（在此世间）词首的 i 同音合并为长元音 ī，形成 sammantīdha。',
        relatedLemma: 'sammati',
      },
      {
        id: 'sr-4',
        prompt: '在“manopubbaṅgama”中，pubbaṅgama 内部的鼻音 ṅ 是如何产生的？',
        paliFocus: 'pubba + ṃ + gama',
        options: ['鼻音 ṃ 在软腭音 g 前同化为软腭鼻音 ṅ', '词根原本自带 ṅ', '元音 u 触发辅音双写', '从格后缀脱落'],
        correctIndex: 0,
        explanation: 'pubbaṃ + gama 中，鼻音 ṃ (niggahīta) 紧邻软腭塞音 g，根据同部位鼻音同化规则变为软腭鼻音 ṅ。',
        relatedLemma: 'manopubbaṅgama',
      },
      {
        id: 'sr-5',
        prompt: '复合词“amatapadaṃ”（不死之道）中，amata 的字面构词是什么？',
        paliFocus: 'a + mata (√mar)',
        options: ['a- (不) + mata (死，√mar 的过去分词)', 'ama (母) + tapada', 'a- + √mat (思考)', 'amā (共同) + ta'],
        correctIndex: 0,
        explanation: '√mar（死）的过去分词为 mata（已死的）；加上否定前缀 a- 构成 amata（不死，常作涅槃的异名）。',
        relatedLemma: 'amatapada',
      },
    ],
  },
];

export const DATA_SOURCES_AND_LICENSES = [
  {
    name: 'Digital Pāli Dictionary (DPD)',
    role: '巴利语词根、复合词拆解与变格词形表',
    url: 'https://digitalpalidictionary.github.io/',
    license: 'Creative Commons BY-NC-SA 4.0 (Bodhirasa)',
  },
  {
    name: 'SuttaCentral (bilara-data)',
    role: '巴利三藏逐句切分经文 (Mahāsaṅgīti) 与多语译文对照',
    url: 'https://suttacentral.net/',
    license: 'CC0 1.0 Universal Public Domain Dedication',
  },
  {
    name: 'Ancient Buddhist Texts / Pali Audio',
    role: '经文韵律吟诵、分句发音规范与语音参考',
    url: 'https://www.ancient-buddhist-texts.net/',
    license: 'CC BY-SA 3.0 (Bhikkhu Ānandajoti) / Open Educational Use',
  },
  {
    name: 'Chaṭṭha Saṅgāyana Tipiṭaka (CST4)',
    role: '第六次结集巴利圣典校勘参考',
    url: 'https://tipitaka.org/',
    license: 'Vipassana Research Institute (Open Access)',
  },
];
