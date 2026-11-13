import { Prisma } from '@prisma/client';
import { toPlain } from '../src/utils/serialize';

test('converts nested decimals and date-only fields', () => {
    expect(toPlain({ nested: [{ amount: new Prisma.Decimal('12.345'), date: new Date('2026-01-02T00:00:00Z') }] }))
        .toEqual({ nested: [{ amount: 12.345, date: '2026-01-02' }] });
});
