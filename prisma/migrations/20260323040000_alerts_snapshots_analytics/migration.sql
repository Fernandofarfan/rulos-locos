CREATE TYPE "AlertKind" AS ENUM ('PRICE', 'RULO');

ALTER TABLE "Alert"
    ADD COLUMN "kind" "AlertKind" NOT NULL DEFAULT 'PRICE',
    ADD COLUMN "routeId" TEXT,
    ADD COLUMN "capital" DECIMAL(20,8),
    ADD COLUMN "lastTriggeredAt" TIMESTAMP(3);

CREATE TABLE "RuloSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT NOT NULL,
    "grossPct" DOUBLE PRECISION NOT NULL,
    "netPct" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "RuloSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RuloSnapshot_routeId_timestamp_key" ON "RuloSnapshot"("routeId", "timestamp");
CREATE INDEX "RuloSnapshot_routeId_timestamp_idx" ON "RuloSnapshot"("routeId", "timestamp");

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "props" JSONB,
    "sessionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
