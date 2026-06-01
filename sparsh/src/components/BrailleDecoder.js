export const BRAILLE_MAP = {
  '000000': ' ',
  '000001': 'CAP',
  '000010': ',',
  '000011': ';',
  '000100': "'",
  '000101': '.',
  '000110': '!',
  '000111': '?',
  '001000': '-',
  '001001': '<',
  '001010': ':',
  '001011': '*',
  '001100': '"',
  '001101': ')',
  '001110': '_',
  '001111': 'NUM',
  '010000': '$',
  '010001': 'u',
  '010010': '"',
  '010011': 'ed',
  '010100': 'i',
  '010101': 'z',
  '010110': 'j',
  '010111': 'w',
  '011000': '=',
  '011001': '&',
  '011010': 'th',
  '011011': '/',
  '011100': 's',
  '011101': '-',
  '011110': 't',
  '011111': '#',
  '100000': 'a',
  '100001': 'k',
  '100010': 'e',
  '100011': 'ch',
  '100100': 'c',
  '100101': 'x',
  '100110': 'd',
  '100111': 'gh',
  '101000': 'k',
  '101001': 'u',
  '101010': 'o',
  '101011': 'z',
  '101100': 'm',
  '101101': 'x',
  '101110': 'n',
  '101111': 'y',
  '110000': 'b',
  '110001': 'f',
  '110010': 'h',
  '110011': 'in',
  '110100': 'f',
  '110101': 'v',
  '110110': 'g',
  '110111': 'of',
  '111000': 'l',
  '111001': 'v',
  '111010': 'r',
  '111011': 'st',
  '111100': 'p',
  '111101': 'and',
  '111110': 'q',
  '111111': 'for',
};

const NUMBER_DIGIT_MAP = {
  a: '1',
  b: '2',
  c: '3',
  d: '4',
  e: '5',
  f: '6',
  g: '7',
  h: '8',
  i: '9',
  j: '0',
};

export function decode(binaryString) {
  if (!Object.prototype.hasOwnProperty.call(BRAILLE_MAP, binaryString)) {
    return '?';
  }
  return BRAILLE_MAP[binaryString];
}

export function decodeSequence(cells) {
  const safeCells = Array.isArray(cells) ? cells : [];
  const confidence = [];
  const decoded = [];
  let numberMode = false;
  let capitalizeNext = false;

  for (const cell of safeCells) {
    const symbol = decode(cell);
    if (symbol === '?') {
      confidence.push(0);
      decoded.push('?');
      numberMode = false;
      capitalizeNext = false;
      continue;
    }

    if (symbol === 'NUM') {
      confidence.push(1);
      numberMode = true;
      continue;
    }

    if (symbol === 'CAP') {
      confidence.push(1);
      capitalizeNext = true;
      continue;
    }

    let out = symbol;
    if (numberMode) {
      const digit = NUMBER_DIGIT_MAP[symbol];
      if (digit) {
        out = digit;
      } else {
        numberMode = false;
      }
    }

    if (capitalizeNext && out.length === 1) {
      out = out.toUpperCase();
      capitalizeNext = false;
    } else {
      capitalizeNext = false;
    }

    confidence.push(1);
    decoded.push(out);
  }

  return {
    text: decoded.join(''),
    confidence,
  };
}
