import type { InflectionRow } from './paliData';

export type ParadigmType =
  | 'a-masc'
  | 'a-nt'
  | 'a-adj'
  | 'aa-fem'
  | 'i-fem'
  | 'ii-fem'
  | 'u-masc'
  | 'manas'
  | 'pron-ta'
  | 'pron-aham'
  | 'pron-sabba'
  | 'verb-ti'
  | 'verb-oti'
  | 'verb-aor'
  | 'ind';

export function getParadigmTitle(paradigm: ParadigmType, lemma: string): string {
  switch (paradigm) {
    case 'a-masc':
      return `a 词干阳性名词 (${lemma})`;
    case 'a-nt':
      return `a 词干中性名词 (${lemma})`;
    case 'a-adj':
      return `a 词干三性形容词 (${lemma} · 阳性/中性变格)`;
    case 'aa-fem':
      return `ā 词干阴性名词 (${lemma})`;
    case 'i-fem':
      return `i 词干阴性名词 (${lemma})`;
    case 'ii-fem':
      return `ī 词干阴性名词/形容词 (${lemma})`;
    case 'u-masc':
      return `u 词干阳性名词 (${lemma})`;
    case 'manas':
      return `manas 词群特殊辅音词干 (${lemma})`;
    case 'pron-ta':
      return `指示/人称代词变格 (${lemma})`;
    case 'pron-aham':
      return `第一人称代词变格 (ahaṃ 我 / mayaṃ 我们)`;
    case 'pron-sabba':
      return `代词性形容词变格 (${lemma} 一切/全部)`;
    case 'verb-ti':
      return `现在时主动语态动词变位 (${lemma})`;
    case 'verb-oti':
      return `现在时 -o- 词干动词变位 (${lemma})`;
    case 'verb-aor':
      return `不定过去时 (Aorist - Ajjatanī) 动词变位 (${lemma})`;
    case 'ind':
      return `不变化词 / 小品词 (Nipāta / Indeclinable)`;
  }
}

export function buildInflectionTable(lemma: string, paradigm: ParadigmType): InflectionRow[] {
  if (paradigm === 'ind') {
    return [
      {
        caseName: '不变化词 (Ind.)',
        casePali: 'Nipāta / Avyaya',
        singular: `${lemma} (无词尾格位变化)`,
        plural: '—',
      },
    ];
  }

  if (paradigm === 'manas') {
    const base = lemma.replace(/as$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${base}o / ${base}aṃ`, plural: `${base}ā / ${base}āni` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${base}o / ${base}aṃ`, plural: `${base}e / ${base}āni` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${base}asā / ${base}ena`, plural: `${base}ehi` },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: `${base}aso / ${base}assa`, plural: `${base}ānaṃ` },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: `${base}asā / ${base}asmā`, plural: `${base}ehi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${base}aso / ${base}assa`, plural: `${base}ānaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${base}asi / ${base}e`, plural: `${base}esu` },
    ];
  }

  if (paradigm === 'pron-ta') {
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'so / esa (阳) · taṃ / etaṃ (中)', plural: 'te / ete (阳) · tāni (中)' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'taṃ / naṃ / etaṃ', plural: 'te / ne / tāni' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'tena / nena', plural: 'tehi' },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: 'tassa / assa', plural: 'tesaṃ / tesaānaṃ' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'tasmā / tamhā / tato', plural: 'tehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'tassa / assa', plural: 'tesaṃ' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'tasmiṃ / tamhi', plural: 'tesu' },
    ];
  }

  if (paradigm === 'pron-aham') {
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: 'ahaṃ', plural: 'mayaṃ / amhe' },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: 'maṃ / mamaṃ', plural: 'amhe / no' },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: 'mayā / me', plural: 'amhehi / no' },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: 'mama / mayhaṃ / me', plural: 'amhākaṃ / no' },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: 'mayā', plural: 'amhehi' },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: 'mama / mayhaṃ / me', plural: 'amhākaṃ / no' },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: 'mayi', plural: 'amhesu' },
    ];
  }

  if (paradigm === 'pron-sabba') {
    const stem = lemma.replace(/a$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}o (阳) / ${stem}aṃ (中)`, plural: `${stem}e (阳) / ${stem}āni (中)` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}aṃ`, plural: `${stem}e / ${stem}āni` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}ena`, plural: `${stem}ehi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}assa`, plural: `${stem}esaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}asmiṃ / ${stem}amhi`, plural: `${stem}esu` },
    ];
  }

  if (paradigm === 'verb-ti') {
    const stem = lemma.replace(/ti$/, '');
    const longStem = stem.replace(/a$/, 'ā');
    return [
      { caseName: '第三人称 (他/他们)', casePali: 'Paṭhamapurisa', singular: `${stem}ti`, plural: `${stem}nti` },
      { caseName: '第二人称 (你/你们)', casePali: 'Majjhimapurisa', singular: `${stem}si`, plural: `${stem}tha` },
      { caseName: '第一人称 (我/我们)', casePali: 'Uttamapurisa', singular: `${longStem}mi`, plural: `${longStem}ma` },
      { caseName: '愿求式 (Optative)', casePali: 'Sattamī', singular: `${stem.replace(/a$/, '')}eyya / ${stem.replace(/a$/, '')}e`, plural: `${stem.replace(/a$/, '')}eyyuṃ` },
    ];
  }

  if (paradigm === 'verb-oti') {
    const stem = lemma.replace(/ti$/, '');
    const rootBase = stem.replace(/o$/, '');
    return [
      { caseName: '第三人称 (他/他们)', casePali: 'Paṭhamapurisa', singular: `${stem}ti`, plural: `${rootBase}onti` },
      { caseName: '第二人称 (你/你们)', casePali: 'Majjhimapurisa', singular: `${stem}si`, plural: `${stem}tha` },
      { caseName: '第一人称 (我/我们)', casePali: 'Uttamapurisa', singular: `${stem}mi`, plural: `${stem}ma` },
      { caseName: '愿求式 (Optative)', casePali: 'Sattamī', singular: `${rootBase}eyya / kayirā`, plural: `${rootBase}eyyuṃ` },
    ];
  }

  if (paradigm === 'verb-aor') {
    const base = lemma.replace(/i$/, '');
    return [
      { caseName: '第三人称 (过去时)', casePali: 'Paṭhamapurisa', singular: `${base}i`, plural: `${base}iṃsu / ${base}uṃ` },
      { caseName: '第二人称 (过去时)', casePali: 'Majjhimapurisa', singular: `${base}o / ${base}i`, plural: `${base}ittha` },
      { caseName: '第一人称 (过去时)', casePali: 'Uttamapurisa', singular: `${base}iṃ`, plural: `${base}imha` },
    ];
  }

  if (paradigm === 'aa-fem') {
    const stem = lemma.replace(/ā$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}ā`, plural: `${stem}ā / ${stem}āyo` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}aṃ`, plural: `${stem}ā / ${stem}āyo` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}āya`, plural: `${stem}āhi` },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: `${stem}āya`, plural: `${stem}ānaṃ` },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: `${stem}āya`, plural: `${stem}āhi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}āya`, plural: `${stem}ānaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}āya / ${stem}āyaṃ`, plural: `${stem}āsu` },
      { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: `${stem}e`, plural: `${stem}ā / ${stem}āyo` },
    ];
  }

  if (paradigm === 'i-fem') {
    const stem = lemma.replace(/i$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}i`, plural: `${stem}ī / ${stem}iyo` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}iṃ`, plural: `${stem}ī / ${stem}iyo` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}iyā`, plural: `${stem}īhi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}iyā`, plural: `${stem}īnaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}iyā / ${stem}iyaṃ`, plural: `${stem}īsu` },
    ];
  }

  if (paradigm === 'ii-fem') {
    const stem = lemma.replace(/ī$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}ī`, plural: `${stem}ī / ${stem}iyo` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}iṃ`, plural: `${stem}ī / ${stem}iyo` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}iyā`, plural: `${stem}īhi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}iyā`, plural: `${stem}īnaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}iyā / ${stem}iyaṃ`, plural: `${stem}īsu` },
    ];
  }

  if (paradigm === 'u-masc') {
    const stem = lemma.replace(/u$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}u`, plural: `${stem}ū / ${stem}avo` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}uṃ`, plural: `${stem}ū / ${stem}avo` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}unā`, plural: `${stem}ūhi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}uno / ${stem}ussa`, plural: `${stem}ūnaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}usmiṃ / ${stem}umhi`, plural: `${stem}ūsu` },
      { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: `${stem}u`, plural: `${stem}ave / ${stem}avo` },
    ];
  }

  if (paradigm === 'a-nt') {
    const stem = lemma.replace(/a$/, '');
    return [
      { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}aṃ`, plural: `${stem}āni / ${stem}ā` },
      { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}aṃ`, plural: `${stem}āni / ${stem}e` },
      { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}ena`, plural: `${stem}ehi` },
      { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: `${stem}assa / ${stem}āya`, plural: `${stem}ānaṃ` },
      { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: `${stem}ā / ${stem}asmā`, plural: `${stem}ehi` },
      { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}assa`, plural: `${stem}ānaṃ` },
      { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}e / ${stem}asmiṃ`, plural: `${stem}esu` },
      { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: `${stem}a`, plural: `${stem}āni` },
    ];
  }

  // Default: a-masc / a-adj
  const stem = lemma.replace(/a$/, '');
  return [
    { caseName: '主格 (Nom.)', casePali: 'Paṭhamā', singular: `${stem}o`, plural: `${stem}ā` },
    { caseName: '业格 (Acc.)', casePali: 'Dutiyā', singular: `${stem}aṃ`, plural: `${stem}e` },
    { caseName: '具格 (Ins.)', casePali: 'Tatiyā', singular: `${stem}ena`, plural: `${stem}ehi` },
    { caseName: '为格 (Dat.)', casePali: 'Catutthī', singular: `${stem}assa / ${stem}āya`, plural: `${stem}ānaṃ` },
    { caseName: '从格 (Abl.)', casePali: 'Pañcamī', singular: `${stem}ā / ${stem}asmā`, plural: `${stem}ehi` },
    { caseName: '属格 (Gen.)', casePali: 'Chaṭṭhī', singular: `${stem}assa`, plural: `${stem}ānaṃ` },
    { caseName: '处格 (Loc.)', casePali: 'Sattamī', singular: `${stem}e / ${stem}asmiṃ`, plural: `${stem}esu` },
    { caseName: '呼格 (Voc.)', casePali: 'Ālapana', singular: `${stem}a`, plural: `${stem}ā` },
  ];
}
