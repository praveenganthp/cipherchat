import { PrismaClient, Role, ConversationType, DisappearingMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  generateIdentityKeyPair,
  generatePreKeyPair,
  signPreKey,
} from "../packages/crypto/src/keys.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CipherChat development database...");

  // Clean existing seed data
  await prisma.messageView.deleteMany({});
  await prisma.encryptedAttachment.deleteMany({});
  await prisma.encryptedMessage.deleteMany({});
  await prisma.conversationInvitation.deleteMany({});
  await prisma.conversationMember.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash("Password123!@#", 10);

  // 1. Create Alice
  const aliceIdentity = await generateIdentityKeyPair();
  const alicePreKey = await generatePreKeyPair();
  const alicePreKeySig = await signPreKey(
    aliceIdentity.keyPair.privateKey,
    alicePreKey.serialized.publicKey
  );

  const alice = await prisma.user.create({
    data: {
      email: "alice@cipherchat.internal",
      username: "alice",
      displayName: "Alice Vance",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      bio: "Security Researcher & Cryptography Enthusiast",
      devices: {
        create: {
          deviceName: "Alice MacBook Pro",
          deviceType: "DESKTOP",
          identityPublicKey: aliceIdentity.serialized.publicKey,
          signedPreKey: alicePreKey.serialized.publicKey,
          preKeySignature: alicePreKeySig,
        },
      },
    },
    include: { devices: true },
  });

  // 2. Create Bob
  const bobIdentity = await generateIdentityKeyPair();
  const bobPreKey = await generatePreKeyPair();
  const bobPreKeySig = await signPreKey(
    bobIdentity.keyPair.privateKey,
    bobPreKey.serialized.publicKey
  );

  const bob = await prisma.user.create({
    data: {
      email: "bob@cipherchat.internal",
      username: "bob",
      displayName: "Bob Stone",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      bio: "Systems Architect & Distributed Systems Engineer",
      devices: {
        create: {
          deviceName: "Bob Linux ThinkPad",
          deviceType: "DESKTOP",
          identityPublicKey: bobIdentity.serialized.publicKey,
          signedPreKey: bobPreKey.serialized.publicKey,
          preKeySignature: bobPreKeySig,
        },
      },
    },
    include: { devices: true },
  });

  // 3. Create Direct Conversation between Alice and Bob
  const dm = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      createdById: alice.id,
      disappearingMode: DisappearingMode.OFF,
      members: {
        create: [
          { userId: alice.id, role: Role.MEMBER },
          { userId: bob.id, role: Role.MEMBER },
        ],
      },
    },
  });

  // 4. Create Private Group Room: "Cipher Security Working Group"
  const group = await prisma.conversation.create({
    data: {
      type: ConversationType.GROUP,
      title: "Cipher Security Working Group",
      description: "Private discussions on zero-knowledge encryption protocols and key rotation",
      avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
      createdById: alice.id,
      disappearingMode: DisappearingMode.TIMER,
      disappearingTtlSeconds: 86400, // 24 hours
      defaultViewLimit: 0,
      members: {
        create: [
          { userId: alice.id, role: Role.OWNER },
          { userId: bob.id, role: Role.ADMIN },
        ],
      },
      invitations: {
        create: {
          tokenHash: "invite-demo-token-12345",
          createdById: alice.id,
          maxUses: 10,
          usedCount: 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    },
  });

  console.log(`✅ Seeded users: Alice (${alice.username}) and Bob (${bob.username})`);
  console.log(`✅ Seeded direct conversation: ${dm.id}`);
  console.log(`✅ Seeded group room: ${group.title} (${group.id})`);
  console.log("🚀 Default password for test users: Password123!@#");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
