/**
 * Demo data seeder — fills the database with realistic sample data so the
 * dashboard, lists, reports and receipts can be previewed.
 *
 *   npm run db:seed:demo            (from repo root or server/)
 *
 * - Goes through the real services (FirmService, MemberService, ReceiptService)
 *   so codes, 18+ counts, eligibility rules and audit logs are all genuine.
 * - Deterministic (seeded RNG): the same data every run on an empty DB.
 * - Demo families use Family IDs starting with "DEMO-" and is skipped if they exist.
 * - Refuses to run when NODE_ENV=production.
 */
import { prisma } from '../src/db/prisma.js';
import { FirmService } from '../src/services/firm.service.js';
import { MemberService } from '../src/services/member.service.js';
import { ReceiptService } from '../src/services/receipt.service.js';
import { AgeCalculator } from '../src/utils/ageCalculator.js';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to seed demo data in production.');
  process.exit(1);
}

// ── deterministic RNG ───────────────────────────────────────────────────────
let seed = 20261117;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
function weighted<T>(items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    if ((r -= w) <= 0) return v;
  }
  return items[items.length - 1][0];
}

// ── reference data ──────────────────────────────────────────────────────────
const EXTRA_AREAS = ['Karamsad', 'Vidyanagar', 'Mogri', 'Lambhvel', 'Ganesh Chowkdi', 'Jitodia'];
const EXTRA_SURNAMES = ['Bhatt', 'Parikh', 'Thakkar', 'Choksi', 'Dalal', 'Vyas'];
// Relative weight of each area (more firms in some areas makes the area chart interesting)
const AREA_WEIGHTS: Record<string, number> = {
  'Amul Dairy Road': 9, 'V.V. Nagar': 8, 'Station Road': 7, Vidyanagar: 6, Karamsad: 6, Bakrol: 5,
  'Gamdi Vad': 4, GIDC: 4, 'Ganesh Chowkdi': 3, Mogri: 3, Lambhvel: 2, Jitodia: 2,
};
const SURNAME_WEIGHTS: Record<string, number> = {
  Patel: 30, Amin: 10, Desai: 8, Shah: 7, Mehta: 6, Bhatt: 5, Parikh: 5, Thakkar: 4, Choksi: 3, Dalal: 3, Vyas: 3,
};

const MALE = ['Ramesh', 'Mahesh', 'Kirit', 'Jayesh', 'Hitesh', 'Bhavesh', 'Nilesh', 'Rajesh', 'Dipak', 'Ketan',
  'Harsh', 'Jay', 'Dhruv', 'Parth', 'Yash', 'Om', 'Vivek', 'Chirag', 'Mihir', 'Nirav', 'Kalpesh', 'Pankaj',
  'Sanjay', 'Ashok', 'Mukesh', 'Prakash', 'Hardik', 'Kunal', 'Tushar', 'Aarav', 'Vihaan', 'Dev', 'Krish', 'Manan'];
const FEMALE = ['Meena', 'Geeta', 'Hema', 'Nita', 'Kokila', 'Daksha', 'Jagruti', 'Hetal', 'Pooja', 'Riya',
  'Krupa', 'Dhara', 'Nisha', 'Komal', 'Bhumi', 'Janvi', 'Khushi', 'Isha', 'Asha', 'Sonal', 'Varsha', 'Rekha',
  'Shilpa', 'Payal', 'Mansi', 'Dhvani', 'Aanya', 'Diya', 'Kavya', 'Prisha'];
const FIRM_PREFIX = ['Shree Umiya', 'Jay Ambe', 'Patidar', 'Shiv Shakti', 'Anand', 'Sardar', 'Navkar', 'Krishna',
  'Om Sai', 'Gokul', 'Shreeji', 'Mahalaxmi', 'Charotar', 'Amrut', 'Vraj', 'Siddhi Vinayak', 'Ganesh', 'Radhe'];
const FIRM_SUFFIX = ['Traders', 'Agro Industries', 'Dairy Products', 'Textiles', 'Enterprise', 'Builders',
  'Hardware', 'Pharma', 'Electricals', 'Jewellers', 'Motors', 'Seeds & Fertilizers', 'Foods', 'Plastics',
  'Engineering Works', 'Tobacco Co.', 'Steel Corporation', 'Kirana Stores'];
const STREETS = ['Nr. Bus Stand', 'Opp. Town Hall', 'Behind Amul Dairy', 'Nr. Railway Station', 'Mota Bazaar',
  'Lakshmi Cinema Road', 'Grid Chowkdi', 'Nr. Shastri Maidan', 'Bhalej Road', 'Borsad Chowkdi'];
const SOCIETIES = ['Sardar Park Society', 'Umiya Nagar', 'Shanti Kunj', 'Gopal Park', 'Ravi Kiran Society',
  'Sahjanand Society', 'Patidar Colony', 'Ambika Nagar', 'Gayatri Park', 'Vallabh Nagar'];

const BLOOD: ReadonlyArray<readonly [string, number]> = [
  ['B_POSITIVE', 32], ['O_POSITIVE', 29], ['A_POSITIVE', 21], ['AB_POSITIVE', 7],
  ['B_NEGATIVE', 2], ['O_NEGATIVE', 2], ['A_NEGATIVE', 1.5], ['AB_NEGATIVE', 0.5], ['UNKNOWN', 5],
];

const today = new Date();
const dobForAge = (age: number) => {
  const d = new Date(Date.UTC(today.getUTCFullYear() - age, int(0, 11), int(1, 28)));
  // Keep the exact age: if the birthday hasn't happened yet this year, shift a year earlier.
  if (AgeCalculator.calculateAge(d) !== age) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().split('T')[0];
};
let mobileCounter = 0;
const mobile = () => `98${String(25000000 + int(0, 49999999) + mobileCounter++).padStart(8, '0').slice(-8)}`;

interface MemberSpec {
  name: string;
  dob: string;
  gender: 'MALE' | 'FEMALE';
  mobile: string;
  bloodGroup: any;
  maritalStatus: 'MARRIED' | 'UNMARRIED';
  parentalSurnameId: string | null;
  allowDuplicate: boolean;
}

async function upsertMaster() {
  for (const name of EXTRA_AREAS) {
    await prisma.area.upsert({
      where: { nameNormalized: name.toLowerCase() },
      update: {},
      create: { nameNormalized: name.toLowerCase(), displayName: name },
    });
  }
  for (const name of EXTRA_SURNAMES) {
    await prisma.surname.upsert({
      where: { nameNormalized: name.toLowerCase() },
      update: {},
      create: { nameNormalized: name.toLowerCase(), displayName: name },
    });
  }
  const areas = await prisma.area.findMany({ include: { subAreas: true } });
  const surnames = await prisma.surname.findMany();
  return { areas, surnames };
}

async function main() {
  const existing = await prisma.memberRecord.count({ where: { familyId: { startsWith: 'DEMO-' } } });
  if (existing > 0) {
    console.log(`ℹ️  Demo data already present (${existing} DEMO- families). Nothing to do.`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!admin) throw new Error('Admin user not found — run `npm run db:seed` first.');

  console.log('🌱 Seeding demo data…');
  const { areas, surnames } = await upsertMaster();
  const areaPool = areas.map((a) => [a, AREA_WEIGHTS[a.displayName] ?? 2] as const);
  const surnamePool = surnames.map((s) => [s, SURNAME_WEIGHTS[s.displayName] ?? 2] as const);

  // ── firms ────────────────────────────────────────────────────────────────
  const FIRM_COUNT = 64;
  const usedNames = new Set<string>();
  const firms: Array<{ id: string; firmType: 'PERMANENT' | 'NOMINAL'; areaName: string }> = [];
  for (let i = 0; i < FIRM_COUNT; i++) {
    let firmName = '';
    do firmName = `${pick(FIRM_PREFIX)} ${pick(FIRM_SUFFIX)}`;
    while (usedNames.has(firmName));
    usedNames.add(firmName);
    const area = weighted(areaPool);
    const sub = area.subAreas.length && chance(0.6) ? pick(area.subAreas) : null;
    const firmType = chance(0.82) ? 'PERMANENT' : 'NOMINAL';
    const headSurname = weighted(surnamePool).displayName;
    const firm = await FirmService.create(
      {
        firmName,
        firmType,
        familyHeadName: `${headSurname} ${pick(MALE)}bhai`,
        areaId: area.id,
        subAreaId: sub?.id ?? null,
        pincode: pick(['388001', '388120', '388121', '388325']),
        address: `${int(1, 250)}, ${pick(STREETS)}, ${area.displayName}, Anand`,
      },
      admin.id
    );
    firms.push({ id: firm.id, firmType, areaName: area.displayName });
  }
  console.log(`  ✓ ${firms.length} firms`);

  // ── families ─────────────────────────────────────────────────────────────
  let familyCount = 0;
  let memberCount = 0;
  let familySeq = 1;
  for (const firm of firms) {
    const familiesInFirm = weighted([[1, 3], [2, 4], [3, 3], [4, 1]] as const);
    for (let f = 0; f < familiesInFirm; f++) {
      const surname = weighted(surnamePool);
      const otherSurname = () => {
        let s = weighted(surnamePool);
        for (let k = 0; k < 5 && s.id === surname.id; k++) s = weighted(surnamePool);
        return s;
      };
      const members: MemberSpec[] = [];
      const add = (first: string, father: string | null, age: number, gender: 'MALE' | 'FEMALE', married: boolean, maiden?: string) =>
        members.push({
          name: father ? `${surname.displayName} ${first} ${father}bhai` : `${surname.displayName} ${first}`,
          dob: dobForAge(age),
          gender,
          mobile: mobile(),
          bloodGroup: weighted(BLOOD),
          maritalStatus: married ? 'MARRIED' : 'UNMARRIED',
          parentalSurnameId: gender === 'FEMALE' && married ? (maiden ?? null) : null,
          allowDuplicate: true,
        });

      const headFirst = pick(MALE);
      const headAge = int(38, 74);
      add(headFirst, null, headAge, 'MALE', true);
      add(pick(FEMALE), null, Math.max(30, headAge - int(2, 6)), 'FEMALE', true, otherSurname().id);

      // Grandparent in some households
      if (headAge < 55 && chance(0.25)) add(pick(FEMALE), null, headAge + int(24, 30), 'FEMALE', true, otherSurname().id);

      // Children
      const kids = weighted([[1, 2], [2, 5], [3, 3]] as const);
      for (let k = 0; k < kids; k++) {
        const kidAge = Math.max(1, headAge - int(22, 34) - k * int(2, 4));
        const isSon = chance(0.52);
        const married = kidAge >= 24 && chance(Math.min(0.85, (kidAge - 22) / 10));
        if (isSon) {
          add(pick(MALE), headFirst, kidAge, 'MALE', married);
          if (married) {
            // Daughter-in-law joins the family
            add(pick(FEMALE), null, Math.max(21, kidAge - int(1, 4)), 'FEMALE', true, otherSurname().id);
            if (chance(0.5)) add(pick(chance(0.5) ? MALE : FEMALE), null, int(1, 8), chance(0.5) ? 'MALE' : 'FEMALE', false);
          }
        } else if (!married) {
          // Married daughters move to their husband's family, so only unmarried daughters remain
          add(pick(FEMALE), headFirst, kidAge, 'FEMALE', false);
        }
      }

      const soc = pick(SOCIETIES);
      await MemberService.createFamily(
        {
          familyId: `DEMO-${String(familySeq++).padStart(4, '0')}`,
          familyHeadName: members[0].name,
          surnameId: surname.id,
          firmId: firm.id,
          homeAddress: `${int(1, 120)}, ${soc}, ${firm.areaName}, Anand`,
          members,
        } as any,
        admin.id
      );
      familyCount++;
      memberCount += members.length;
    }
  }
  console.log(`  ✓ ${familyCount} families, ${memberCount} members`);

  // ── receipts across the last 12 months ──────────────────────────────────
  const types = await prisma.receiptType.findMany();
  const samaj = types.find((t) => t.name === 'Samaj');
  const yuvak = types.find((t) => t.name === 'Yuvak Mandal');
  const config = await ReceiptService.getConfig();
  const males = await prisma.individualMember.findMany({
    where: { gender: 'MALE', familyRecord: { familyId: { startsWith: 'DEMO-' } } },
    select: { id: true, dob: true },
  });
  const adults = males.filter((m) => AgeCalculator.calculateAge(m.dob) >= 18);

  let receiptCount = 0;
  const issue = async (memberId: string, typeId: string, periodType: 'MONTHLY' | 'YEARLY', date: Date) => {
    try {
      await ReceiptService.generateReceipt(
        {
          individualMemberId: memberId,
          receiptTypeId: typeId,
          periodType,
          periodYear: date.getFullYear(),
          periodMonth: periodType === 'MONTHLY' ? date.getMonth() + 1 : null,
          customDate: date.toISOString(),
        },
        admin.id
      );
      receiptCount++;
    } catch {
      // ineligible / duplicate period — skip, exactly as the UI would
    }
  };

  // Month offsets 11 (oldest) → 0 (current month); participation grows over the year.
  for (const m of adults) {
    const age = AgeCalculator.calculateAge(m.dob);
    const yearly = chance(0.3);
    const types: Array<{ id: string; p: number }> = [];
    if (samaj) types.push({ id: samaj.id, p: 0.62 });
    if (yuvak && age <= config.yuvakMandalUpperAge) types.push({ id: yuvak.id, p: 0.45 });
    for (const t of types) {
      if (!chance(t.p + 0.25)) continue; // some members never pay
      if (yearly) {
        const monthsAgo = int(0, Math.min(10, today.getMonth()));
        const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, int(1, 25), int(10, 18));
        if (d <= today) await issue(m.id, t.id, 'YEARLY', d);
        continue;
      }
      for (let ago = 11; ago >= 0; ago--) {
        const growth = 0.35 + (11 - ago) * 0.045; // ~35% → ~85%
        if (!chance(growth * t.p * 1.4)) continue;
        const d = new Date(today.getFullYear(), today.getMonth() - ago, int(1, 27), int(10, 18), int(0, 59));
        if (d > today) continue;
        await issue(m.id, t.id, 'MONTHLY', d);
      }
    }
  }
  console.log(`  ✓ ${receiptCount} receipts`);
  console.log('🎉 Demo data ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
