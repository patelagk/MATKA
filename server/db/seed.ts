import bcrypt from 'bcryptjs';
import { db } from './mongo';
import { MarketDoc, UserDoc, WalletTransactionDoc, AuditLogDoc } from './models';

export async function seedDatabase() {
  const userCount = await db.users.countDocuments();
  if (userCount > 0) {
    return; // Already initialized
  }

  console.log('🌱 Seeding initial demo database...');

  const passwordHashUser = await bcrypt.hash('DemoUser123!', 10);
  const passwordHashAdmin = await bcrypt.hash('AdminPass123!', 10);

  // Create standard Demo User
  const demoUser = await db.users.insertOne({
    name: 'Demo Predictor',
    email: 'demo@matkavibe.test',
    passwordHash: passwordHashUser,
    role: 'user',
    virtualBalance: 10000,
    lockedBalance: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  });

  // Create initial wallet transaction for Demo User
  await db.walletTransactions.insertOne({
    userId: demoUser._id,
    type: 'INITIAL_GRANT',
    amount: 10000,
    balanceBefore: 0,
    balanceAfter: 10000,
    referenceId: 'SYSTEM_BOOTSTRAP',
    description: 'Welcome virtual credits grant (Non-real-money demo credits)',
    createdAt: new Date().toISOString()
  });

  // Create Admin User
  const adminUser = await db.users.insertOne({
    name: 'Chief Admin',
    email: 'admin@matkavibe.test',
    passwordHash: passwordHashAdmin,
    role: 'admin',
    virtualBalance: 50000,
    lockedBalance: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  });

  await db.walletTransactions.insertOne({
    userId: adminUser._id,
    type: 'INITIAL_GRANT',
    amount: 50000,
    balanceBefore: 0,
    balanceAfter: 50000,
    referenceId: 'SYSTEM_BOOTSTRAP',
    description: 'Admin virtual credits initialization',
    createdAt: new Date().toISOString()
  });

  // Default demo multipliers
  const defaultMultipliers = {
    SINGLE_ANK: 9.5,
    JODI: 95,
    SINGLE_PATTI: 145,
    DOUBLE_PATTI: 290,
    TRIPLE_PATTI: 650
  };

  // Seed standard demo markets
  const initialMarkets: Array<Omit<MarketDoc, '_id'>> = [
    {
      name: 'Kalyan Day',
      code: 'KALYAN_DAY',
      category: 'Regular',
      status: 'OPEN',
      openTime: '15:45',
      closeTime: '17:45',
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Milan Day',
      code: 'MILAN_DAY',
      category: 'Regular',
      status: 'OPEN',
      openTime: '15:00',
      closeTime: '17:00',
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Time Bazar',
      code: 'TIME_BAZAR',
      category: 'Starline',
      status: 'OPEN',
      openTime: '13:00',
      closeTime: '14:00',
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Rajdhani Day',
      code: 'RAJDHANI_DAY',
      category: 'Regular',
      status: 'OPEN',
      openTime: '15:15',
      closeTime: '17:15',
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Main Bazar',
      code: 'MAIN_BAZAR',
      category: 'Regular',
      status: 'OPEN',
      openTime: '21:35',
      closeTime: '00:05',
      result: '***-**-***',
      resultStatus: 'PENDING',
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      name: 'Madhur Night',
      code: 'MADHUR_NIGHT',
      category: 'King',
      status: 'SETTLED',
      openTime: '20:30',
      closeTime: '22:30',
      result: '238-34-149',
      resultStatus: 'SETTLED',
      normalizedResult: {
        openPana: '238',
        openDigit: '3',
        closeDigit: '4',
        closePana: '149',
        jodi: '34'
      },
      payoutMultipliers: defaultMultipliers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const m of initialMarkets) {
    const createdMarket = await db.markets.insertOne(m);

    // If it was already settled, add a result entry
    if (m.status === 'SETTLED' && m.normalizedResult) {
      await db.results.insertOne({
        marketId: createdMarket._id,
        marketName: createdMarket.name,
        externalResultId: `EXT_${createdMarket.code}_PREV`,
        normalizedResult: {
          openPana: m.normalizedResult.openPana!,
          openDigit: m.normalizedResult.openDigit!,
          closeDigit: m.normalizedResult.closeDigit!,
          closePana: m.normalizedResult.closePana!,
          jodi: m.normalizedResult.jodi!,
          display: m.result
        },
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        rawResponse: {
          source: 'Simulated Demo API Provider',
          marketCode: m.code,
          status: 'SUCCESS',
          openPana: m.normalizedResult.openPana,
          closePana: m.normalizedResult.closePana
        },
        createdAt: new Date().toISOString()
      });
    }
  }

  // Audit log bootstrap
  await db.auditLogs.insertOne({
    actorId: 'SYSTEM',
    actorEmail: 'system@matkavibe.local',
    action: 'SYSTEM_BOOTSTRAP_COMPLETE',
    entityType: 'System',
    entityId: 'SYSTEM',
    metadata: {
      seededUsers: 2,
      seededMarkets: initialMarkets.length,
      mode: 'VIRTUAL_DEMO_SIMULATOR'
    },
    createdAt: new Date().toISOString()
  });

  console.log('✅ Demo database seeded successfully with test credentials.');
}
