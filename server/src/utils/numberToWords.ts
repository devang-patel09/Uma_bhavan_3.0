export class NumberToWords {
  private static ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  private static tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  private static convertLessThanOneThousand(num: number): string {
    let current = '';

    if (num % 100 < 20) {
      current = this.ones[num % 100];
      num = Math.floor(num / 100);
    } else {
      current = this.ones[num % 10];
      num = Math.floor(num / 10);

      current = this.tens[num % 10] + (current ? ' ' + current : '');
      num = Math.floor(num / 10);
    }

    if (num === 0) return current;
    return this.ones[num] + ' Hundred' + (current ? ' ' + current : '');
  }

  /**
   * Converts numeric rupees (e.g. 1500) into Indian English currency words
   * (e.g. "Rupees One Thousand Five Hundred Only").
   */
  public static toIndianRupees(amount: number): string {
    if (amount === 0) return 'Rupees Zero Only';

    const [rupeesPart, paisePart] = amount.toFixed(2).split('.').map((p) => parseInt(p, 10));

    let num = rupeesPart;
    let result = '';

    // Crores
    const crores = Math.floor(num / 10000000);
    num %= 10000000;
    if (crores > 0) {
      result += this.convertLessThanOneThousand(crores) + ' Crore ';
    }

    // Lakhs
    const lakhs = Math.floor(num / 100000);
    num %= 100000;
    if (lakhs > 0) {
      result += this.convertLessThanOneThousand(lakhs) + ' Lakh ';
    }

    // Thousands
    const thousands = Math.floor(num / 1000);
    num %= 1000;
    if (thousands > 0) {
      result += this.convertLessThanOneThousand(thousands) + ' Thousand ';
    }

    // Remaining hundreds / tens / units
    if (num > 0) {
      result += this.convertLessThanOneThousand(num);
    }

    result = result.trim();
    let finalStr = `Rupees ${result}`;

    if (paisePart > 0) {
      finalStr += ` and ${this.convertLessThanOneThousand(paisePart)} Paise`;
    }

    finalStr += ' Only';
    return finalStr;
  }
}
