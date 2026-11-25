CREATE TYPE "ReadingSlot" AS ENUM (
    'MORNING_FASTING',
    'AFTER_BREAKFAST',
    'AFTER_LUNCH',
    'AFTER_DINNER'
);

CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GlucoseReading" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "readingDate" DATE NOT NULL,
    "slot" "ReadingSlot" NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GlucoseReading_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GlucoseReading_value_range_check" CHECK ("value" >= 40 AND "value" <= 600)
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "GlucoseReading_userId_readingDate_slot_key" ON "GlucoseReading"("userId", "readingDate", "slot");
CREATE INDEX "GlucoseReading_userId_readingDate_idx" ON "GlucoseReading"("userId", "readingDate");

ALTER TABLE "GlucoseReading"
ADD CONSTRAINT "GlucoseReading_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
