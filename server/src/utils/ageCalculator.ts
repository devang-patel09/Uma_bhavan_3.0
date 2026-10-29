export class AgeCalculator {
  /**
   * Calculates exact age in years from Date of Birth relative to current date (or reference date).
   */
  public static calculateAge(dob: Date | string, referenceDate: Date = new Date()): number {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }

    return Math.max(0, age);
  }

  /**
   * Checks if an individual qualifies as an 18+ adult male.
   */
  public static is18PlusMale(gender: string, dob: Date | string, referenceDate: Date = new Date()): boolean {
    if (gender.toUpperCase() !== 'MALE') return false;
    const age = this.calculateAge(dob, referenceDate);
    return age >= 18;
  }

  /**
   * Evaluates receipt eligibility based on age boundaries:
   * Age 18 up to yuvakUpperAge (inclusive): Yuvak Mandal and Samaj
   * Above yuvakUpperAge: Samaj only
   */
  public static getEligibleReceiptTypes(
    gender: string,
    dob: Date | string,
    referenceDate: Date = new Date(),
    yuvakUpperAge: number = 45
  ): string[] {
    if (gender.toUpperCase() !== 'MALE') return [];
    const age = this.calculateAge(dob, referenceDate);

    if (age < 18) {
      return [];
    }

    if (age <= yuvakUpperAge) {
      return ['Yuvak Mandal', 'Samaj'];
    }

    return ['Samaj'];
  }

  public static isEligible(
    receiptTypeName: string,
    gender: string,
    dob: Date | string,
    referenceDate: Date = new Date(),
    yuvakUpperAge: number = 45
  ): boolean {
    const eligibleTypes = this.getEligibleReceiptTypes(gender, dob, referenceDate, yuvakUpperAge);
    return eligibleTypes.includes(receiptTypeName);
  }
}

