CREATE TABLE "SpreadPoint" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "SpreadPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpreadPoint_timestamp_key" ON "SpreadPoint"("timestamp");
CREATE INDEX "SpreadPoint_timestamp_idx" ON "SpreadPoint"("timestamp");
