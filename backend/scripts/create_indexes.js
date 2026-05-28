const mongoose = require('mongoose');
const Survey = require('../models/Survey');

async function run() {
  const argUri = process.argv[2];
  const uri = argUri || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/survly';
  console.log('Connecting to', uri);
  // Do not pass deprecated driver options; let Mongoose choose defaults.
  await mongoose.connect(uri);

  try {
    console.log('Creating indexes for Survey...');
    await Survey.createIndexes();
    console.log('Survey indexes created.');
  } catch (err) {
    console.error('Error creating indexes:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
