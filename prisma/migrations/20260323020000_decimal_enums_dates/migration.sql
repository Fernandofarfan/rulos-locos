CREATE TYPE "AlertCondition" AS ENUM ('above', 'below');
CREATE TYPE "VirtualTxType" AS ENUM ('BUY', 'SELL', 'DEPOSIT');

ALTER TABLE "Alert"
    ALTER COLUMN "threshold" TYPE DECIMAL(20,8) USING "threshold"::decimal,
    ALTER COLUMN "condition" TYPE "AlertCondition" USING lower("condition")::"AlertCondition";
ALTER TABLE "PortfolioPosition"
    ALTER COLUMN "buyPrice" TYPE DECIMAL(20,8) USING "buyPrice"::decimal,
    ALTER COLUMN "amount" TYPE DECIMAL(20,8) USING "amount"::decimal,
    ALTER COLUMN "date" TYPE DATE USING CASE WHEN "date" ~ '^\d{4}-\d{2}-\d{2}' THEN substring("date",1,10)::date ELSE "createdAt"::date END;
ALTER TABLE "VirtualBalance"
    ALTER COLUMN "amount" TYPE DECIMAL(20,8) USING "amount"::decimal;
ALTER TABLE "VirtualTransaction"
    ALTER COLUMN "amount" TYPE DECIMAL(20,8) USING "amount"::decimal,
    ALTER COLUMN "price" TYPE DECIMAL(20,8) USING "price"::decimal,
    ALTER COLUMN "totalArs" TYPE DECIMAL(20,8) USING "totalArs"::decimal,
    ALTER COLUMN "type" TYPE "VirtualTxType" USING upper("type")::"VirtualTxType";

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "Alert_userId_idx" ON "Alert"("userId");
CREATE INDEX IF NOT EXISTS "Alert_active_userId_idx" ON "Alert"("active", "userId");
CREATE INDEX IF NOT EXISTS "PortfolioPosition_userId_idx" ON "PortfolioPosition"("userId");
CREATE INDEX IF NOT EXISTS "VirtualBalance_userId_idx" ON "VirtualBalance"("userId");
CREATE INDEX IF NOT EXISTS "VirtualTransaction_userId_createdAt_idx" ON "VirtualTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ExchangeKey_userId_idx" ON "ExchangeKey"("userId");
