export type Role = 'SUPER_ADMIN' | 'OPERATOR';

export type MemberType = 'PERMANENT' | 'NOMINAL';

export type Gender = 'MALE' | 'FEMALE';

export type BloodGroup =
  | 'A_POSITIVE'
  | 'A_NEGATIVE'
  | 'B_POSITIVE'
  | 'B_NEGATIVE'
  | 'AB_POSITIVE'
  | 'AB_NEGATIVE'
  | 'O_POSITIVE'
  | 'O_NEGATIVE'
  | 'UNKNOWN';

export type MaritalStatus = 'MARRIED' | 'UNMARRIED';

export type ReceiptStatus = 'ACTIVE' | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface SubArea {
  id: string;
  areaId: string;
  nameNormalized: string;
  displayName: string;
  createdAt: string;
}

export interface Area {
  id: string;
  nameNormalized: string;
  displayName: string;
  createdAt: string;
  subAreas?: SubArea[];
}

export interface Surname {
  id: string;
  nameNormalized: string;
  displayName: string;
  createdAt: string;
}

export interface Firm {
  id: string;
  firmCode: string; // F001, F002...
  firmName: string;
  firmType: MemberType;
  familyHeadName?: string | null;
  areaId: string;
  area?: Area;
  subAreaId?: string | null;
  subArea?: SubArea | null;
  pincode: string;
  address: string;
  createdAt: string;
}

export interface IndividualMember {
  id: string;
  familyRecordId: string;
  name: string;
  dob: string;
  gender: Gender;
  mobile: string;
  bloodGroup: BloodGroup;
  maritalStatus: MaritalStatus;
  parentalSurnameId?: string | null;
  parentalSurname?: Surname | null;
}

export interface MemberRecord {
  id: string;
  memberCode: string; // M001... or N001...
  memberType: MemberType;
  familyId: string;
  familyHeadName: string;
  surnameId: string;
  surname?: Surname;
  homeAddress: string;
  firmId: string;
  firm?: Firm;
  male18PlusCount: number;
  members?: IndividualMember[];
  createdAt: string;
}

export interface ReceiptType {
  id: string;
  name: string;
  defaultAmount: number;
  active: boolean;
}

export type PeriodType = 'MONTHLY' | 'YEARLY';

export interface ReceiptConfig {
  id: string;
  samajMonthlyAmount: number;
  samajYearlyAmount: number;
  yuvakMonthlyAmount: number;
  yuvakYearlyAmount: number;
  yuvakUpperAge: number;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string; // R000001
  individualMemberId: string;
  individualMember?: IndividualMember;
  familyRecordId?: string | null;
  familyRecord?: MemberRecord | null;
  receiptTypeId: string;
  receiptType?: ReceiptType;
  periodType: PeriodType;
  periodYear: number;
  periodMonth?: number | null;
  amount: number;
  generatedAt: string;
  status: ReceiptStatus;
  createdById: string;
  verificationHash?: string;
}

export interface DashboardStats {
  totalFirms: number;
  totalFamilies: number;
  totalMembers: number;
  permanentMembers: number;
  nominalMembers: number;
  maleMembers: number;
  femaleMembers: number;
  male18PlusMembers: number;
  totalCollection: number;
}
