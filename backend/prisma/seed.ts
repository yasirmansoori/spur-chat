import { PrismaClient, Sender } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});

  // Create a default test conversation
  const testConversation = await prisma.conversation.create({
    data: {
      id: 'test-session-123',
    },
  });

  // Seed initial welcome messages
  await prisma.message.createMany({
    data: [
      {
        conversationId: testConversation.id,
        sender: Sender.AI,
        content: 'Hello! Welcome to Spur Mart. How can I help you today?',
      },
    ],
  });

  console.log(`✅ Seeding complete. Created conversation ID: ${testConversation.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
