/**
 * Seed script — creates demo data so buyers can see the platform in action.
 *
 * Usage: npx ts-node prisma/seed.ts
 *
 * Creates:
 * - 3 subscription plans (Free, Creator, Organizer)
 * - 1 admin user (admin@filmstack.com / password from SEED_DEMO_PASSWORD or Admin123!)
 * - 1 demo creator with a channel and 5 videos
 * - 1 demo festival organizer with a tenant and 2 festivals
 * - Sample comments, ratings, and submissions
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FilmStack database...');

  // ─── Subscription Plans ──────────────────────────────────────────
  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { tier: 'free' },
      update: {},
      create: {
        name: 'Free',
        tier: 'free',
        priceMonthly: 0,
        priceYearly: 0,
        features: ['Watch unlimited films', 'Comment & rate', '1 upload per month', '1 festival submission per month'],
        limits: {
          maxUploadsPerMonth: 1,
          maxStorageGb: 1,
          maxFestivalSubmissionsPerMonth: 1,
          maxFestivals: 0,
          maxJudgesPerFestival: 0,
          videoQualityLevels: ['360p', '720p'],
          cdnEnabled: false,
          analyticsEnabled: false,
          customBranding: false,
        },
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { tier: 'creator' },
      update: {},
      create: {
        name: 'Creator',
        tier: 'creator',
        priceMonthly: 15,
        priceYearly: 144,
        features: [
          'Unlimited uploads',
          'Creator analytics dashboard',
          'Unlimited festival submissions',
          'HD video quality (1080p)',
          'CDN delivery',
          'Priority support',
        ],
        limits: {
          maxUploadsPerMonth: -1,
          maxStorageGb: 50,
          maxFestivalSubmissionsPerMonth: -1,
          maxFestivals: 0,
          maxJudgesPerFestival: 0,
          videoQualityLevels: ['360p', '480p', '720p', '1080p'],
          cdnEnabled: true,
          analyticsEnabled: true,
          customBranding: false,
        },
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { tier: 'organizer' },
      update: {},
      create: {
        name: 'Festival Organizer',
        tier: 'organizer',
        priceMonthly: 49,
        priceYearly: 468,
        features: [
          'Everything in Creator',
          'Run unlimited festivals',
          'Judge management & scoring',
          'Email templates & automation',
          'Video screening rooms',
          'API access',
          'Custom branding',
          'GDPR compliance tools',
        ],
        limits: {
          maxUploadsPerMonth: -1,
          maxStorageGb: 200,
          maxFestivalSubmissionsPerMonth: -1,
          maxFestivals: -1,
          maxJudgesPerFestival: 50,
          videoQualityLevels: ['360p', '480p', '720p', '1080p'],
          cdnEnabled: true,
          analyticsEnabled: true,
          customBranding: true,
        },
      },
    }),
  ]);

  const freePlan = plans[0];
  const creatorPlan = plans[1];
  const organizerPlan = plans[2];

  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // ─── Admin User ──────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@filmstack.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@filmstack.com',
      passwordHash,
      displayName: 'Platform Admin',
      role: 'admin',
      verified: true,
    },
  });

  // ─── Demo Creator ────────────────────────────────────────────────
  const creator = await prisma.user.upsert({
    where: { email: 'creator@filmstack.com' },
    update: {},
    create: {
      username: 'demo_creator',
      email: 'creator@filmstack.com',
      passwordHash,
      displayName: 'Maya Chen',
      bio: 'Independent filmmaker based in Toronto. Passionate about short documentary and experimental cinema.',
      role: 'creator',
      verified: true,
    },
  });

  await prisma.userSubscription.upsert({
    where: { userId: creator.id },
    update: {},
    create: {
      userId: creator.id,
      planId: creatorPlan.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const channel = await prisma.channel.upsert({
    where: { userId: creator.id },
    update: {},
    create: {
      userId: creator.id,
      name: 'Maya Chen Films',
      description: 'Short films exploring identity, memory, and the spaces between cultures.',
      subscriberCount: 342,
      totalViews: BigInt(18500),
    },
  });

  // Sample videos
  const videoData = [
    { title: 'Between Two Skies', description: 'A meditation on belonging and displacement.', duration: 720, genre: 'documentary', viewCount: BigInt(4200), likeCount: 187 },
    { title: 'The Last Letter', description: 'A daughter finds an unsent letter in her late mother\'s belongings.', duration: 540, genre: 'drama', viewCount: BigInt(6100), likeCount: 312 },
    { title: 'Neon Drift', description: 'Experimental short capturing nightlife through fractured perspectives.', duration: 360, genre: 'experimental', viewCount: BigInt(2800), likeCount: 94 },
    { title: 'Small Mercies', description: 'A chance encounter at a bus stop changes two strangers\' days.', duration: 480, genre: 'drama', viewCount: BigInt(3100), likeCount: 156 },
    { title: 'The Weight of Water', description: 'Documentary following coastal communities adapting to rising seas.', duration: 900, genre: 'documentary', viewCount: BigInt(2300), likeCount: 201 },
  ];

  const videos = [];
  for (const vd of videoData) {
    const video = await prisma.video.create({
      data: {
        channelId: channel.id,
        ...vd,
        status: 'published',
        publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      },
    });
    videos.push(video);
  }

  // ─── Demo Viewer ─────────────────────────────────────────────────
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@filmstack.com' },
    update: {},
    create: {
      username: 'film_fan',
      email: 'viewer@filmstack.com',
      passwordHash,
      displayName: 'Film Fan',
      role: 'viewer',
      verified: true,
    },
  });

  // Add some comments and ratings from the viewer
  for (const video of videos.slice(0, 3)) {
    await prisma.videoRating.create({
      data: {
        videoId: video.id,
        userId: viewer.id,
        score: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        review: 'Beautiful cinematography and powerful storytelling.',
      },
    });

    await prisma.comment.create({
      data: {
        videoId: video.id,
        userId: viewer.id,
        content: 'This is incredible work. The pacing and emotional depth really drew me in.',
      },
    });
  }

  // ─── Demo Festival Organizer ─────────────────────────────────────
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@filmstack.com' },
    update: {},
    create: {
      username: 'festival_org',
      email: 'organizer@filmstack.com',
      passwordHash,
      displayName: 'Sarah Mitchell',
      bio: 'Director of the Indie Shorts Festival. Championing independent voices in cinema.',
      role: 'organizer',
      verified: true,
    },
  });

  await prisma.userSubscription.upsert({
    where: { userId: organizer.id },
    update: {},
    create: {
      userId: organizer.id,
      planId: organizerPlan.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'indie-shorts' },
    update: {},
    create: {
      subdomain: 'indie-shorts',
      name: 'Indie Shorts Festival',
      email: 'organizer@filmstack.com',
      plan: 'organizer',
    },
  });

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: organizer.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: organizer.id,
      role: 'owner',
    },
  });

  // Create 2 festivals
  const festival1 = await prisma.festival.create({
    data: {
      tenantId: tenant.id,
      name: 'Indie Shorts Festival 2026',
      description: 'Celebrating the best in independent short filmmaking from around the world.',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-06-20'),
      location: 'Toronto, Canada',
      submissionDeadline: new Date('2026-05-01'),
      earlyBirdDeadline: new Date('2026-03-15'),
      entryFee: 25,
      earlyBirdFee: 15,
      currency: 'USD',
    },
  });

  const festival2 = await prisma.festival.create({
    data: {
      tenantId: tenant.id,
      name: 'Winter Shorts Showcase 2026',
      description: 'A curated evening of short films exploring themes of resilience and hope.',
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-03'),
      location: 'Montreal, Canada',
      submissionDeadline: new Date('2026-10-15'),
      entryFee: 20,
      currency: 'USD',
    },
  });

  // Submit creator's videos to the festival
  const submission = await prisma.festivalSubmission.create({
    data: {
      festivalId: festival1.id,
      videoId: videos[0].id,
      submitterId: creator.id,
      status: 'accepted',
      director: 'Maya Chen',
      synopsis: videoData[0].description,
      contactEmail: 'creator@filmstack.com',
      entryFeePaid: true,
    },
  });

  // Award for the accepted submission
  await prisma.award.create({
    data: {
      festivalId: festival1.id,
      submissionId: submission.id,
      awardName: 'Best Documentary Short',
      recipientName: 'Maya Chen',
      year: 2026,
    },
  });

  // Add a judge
  await prisma.judge.create({
    data: {
      festivalId: festival1.id,
      userId: null,
      email: 'judge@example.com',
      firstName: 'David',
      lastName: 'Park',
      bio: 'Film critic and festival programmer with 15 years of experience.',
      expertise: 'Documentary, Narrative Short',
    },
  });

  console.log('Seed complete!');
  console.log('');
  console.log('Demo accounts (dev seed only — change SEED_DEMO_PASSWORD before any shared environment):');
  console.log(`  Password: ${demoPassword}`);
  console.log('  Admin:     admin@filmstack.com');
  console.log('  Creator:   creator@filmstack.com');
  console.log('  Viewer:    viewer@filmstack.com');
  console.log('  Organizer: organizer@filmstack.com');
  console.log('');
  console.log('Demo tenant: indie-shorts');
  console.log('Festivals: Indie Shorts Festival 2026, Winter Shorts Showcase 2026');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
