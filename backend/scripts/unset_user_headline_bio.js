const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const uri = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_URL;

  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    const result = await User.updateMany({}, { $unset: { headline: '', bio: '' } });
    console.log('Matched:', result.matchedCount ?? result.n, 'Modified:', result.modifiedCount ?? result.nModified);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
