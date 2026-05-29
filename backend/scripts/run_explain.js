const mongoose = require('mongoose');

async function run(mongoUri) {
  if (!mongoUri) {
    console.error('Usage: node run_explain.js <mongoUri>');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const coll = db.collection('surveys');

    const filter = { isPublic: true };
    const sort = { created_at: -1 };

    console.log('Running explain for: find(filter=isPublic:true).sort({created_at:-1}).limit(10)');
    const explain = await coll.find(filter).sort(sort).limit(10).explain('executionStats');

    // Print key parts of the explain
    const stats = explain.executionStats || {};
    const stage = stats.executionStages || {};

    console.log('Summary:');
    console.log('  nReturned:', stats.nReturned);
    console.log('  totalKeysExamined:', stats.totalKeysExamined);
    console.log('  totalDocsExamined:', stats.totalDocsExamined);
    console.log('  executionTimeMillis:', stats.executionTimeMillis);
    console.log('  stage:', stage.stage || 'N/A');
    if (stage.inputStage) {
      console.log('  inputStage:', stage.inputStage.stage);
    }

    // For debugging, if a COLLSCAN happened, print a warning
    function findStage(s) {
      if (!s) return null;
      if (s.stage === 'COLLSCAN' || s.stage === 'IXSCAN') return s;
      if (s.inputStage) return findStage(s.inputStage);
      if (s.executionStages) return findStage(s.executionStages);
      return null;
    }

    const important = findStage(stage);
    if (important) console.log('Important stage found:', important.stage);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error running explain:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

if (require.main === module) {
  run(process.argv[2]);
}
