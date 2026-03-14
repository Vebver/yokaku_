const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding admin user...');

    // Check if admin exists
    const admin = await User.findByEmail('admin@yokaku.com');
    if (admin) {
      console.log('Admin already exists');
      return;
    }

    // Create admin
    const password = 'admin123';
    const hashed = await bcrypt.hash(password, 12);
    
    await User.pool.execute(
      `INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, 'admin', NOW())`,
      [ 'admin@yokaku.com', hashed ]
    );

    console.log(`✅ Admin seeded: admin@yokaku.com / admin123`);
    console.log('Restart backend server to test login');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seed();

