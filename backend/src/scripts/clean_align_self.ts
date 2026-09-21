import { db, sql } from '../shared/db';
import { capturePages } from '../shared/schema';
import { eq } from 'drizzle-orm';

function cleanAlignSelf(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanAlignSelf);
  }
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'alignSelf') {
        continue; // Strip alignSelf completely
      }
      if (typeof value === 'string' && /^\d+auto$/.test(value)) {
        cleaned[key] = 'auto'; // Replace corrupted 0auto strings with auto
      } else {
        cleaned[key] = cleanAlignSelf(value);
      }
    }
    return cleaned;
  }
  return obj;
}

async function run() {
  console.log('🔄 Cleaning alignSelf from all capture_pages in database...');
  const pages = await db.select().from(capturePages);
  console.log(`Found ${pages.length} capture pages.`);

  await sql`
    UPDATE capture_pages
    SET draft_data = (
      regexp_replace(
        regexp_replace(
          regexp_replace(
            draft_data::text,
            '"alignSelf"\\s*:\\s*"[^"]*"\\s*,?',
            '',
            'g'
          ),
          '"flexBasis"\\s*:\\s*"0px"',
          '"flexBasis": "auto"',
          'g'
        ),
        '"\\d+auto"',
        '"auto"',
        'g'
      )
    )::jsonb;
  `;
  console.log('✅ Executed raw SQL regex cleanup on draft_data column (alignSelf & 0px flexBasis).');

  console.log('🎉 Database cleanup complete!');
  await sql.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error cleaning database:', err);
  process.exit(1);
});
