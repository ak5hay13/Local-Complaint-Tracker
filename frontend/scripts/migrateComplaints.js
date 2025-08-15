const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
require('dotenv').config(); // Load environment variables

const migrateComplaints = async () => {
  try {
    console.log('🚀 Starting complaint migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/complaint_tracker', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find complaints that need migration
    const complaintsToMigrate = await Complaint.find({
      $or: [
        { createdByUsername: { $exists: false } },
        { createdByUsername: null },
        { createdByUsername: '' },
        { updateLog: { $exists: false } },
        { updateLog: null }
      ]
    });
    
    console.log(`📋 Found ${complaintsToMigrate.length} complaints to migrate`);
    
    if (complaintsToMigrate.length === 0) {
      console.log('✨ No complaints need migration. All good!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Update existing complaints that don't have proper user info
    const result = await Complaint.updateMany(
      { 
        $or: [
          { createdByUsername: { $exists: false } },
          { createdByUsername: null },
          { createdByUsername: '' }
        ]
      },
      { 
        $set: { 
          createdByUsername: 'Legacy User'
        }
      }
    );
    
    console.log(`📝 Updated createdByUsername for ${result.modifiedCount} complaints`);
    
    // Add empty updateLog array to complaints that don't have it
    const logResult = await Complaint.updateMany(
      {
        $or: [
          { updateLog: { $exists: false } },
          { updateLog: null }
        ]
      },
      {
        $set: {
          updateLog: []
        }
      }
    );
    
    console.log(`📋 Added updateLog array to ${logResult.modifiedCount} complaints`);
    
    // Add initial creation log entry to existing complaints
    const complaintsWithoutInitialLog = await Complaint.find({
      updateLog: { $size: 0 }
    });
    
    console.log(`🔄 Adding initial creation logs to ${complaintsWithoutInitialLog.length} complaints`);
    
    for (const complaint of complaintsWithoutInitialLog) {
      const initialLogEntry = {
        timestamp: complaint.createdAt || new Date(),
        action: 'Complaint Created',
        user: complaint.createdByUsername || 'Legacy User',
        userId: complaint.createdBy || null,
        description: 'Initial complaint creation (migrated)'
      };
      
      await Complaint.findByIdAndUpdate(
        complaint._id,
        {
          $push: {
            updateLog: initialLogEntry
          }
        }
      );
    }
    
    console.log('✅ Migration completed successfully!');
    console.log(`
📊 Migration Summary:
- Updated usernames: ${result.modifiedCount} complaints
- Added updateLog arrays: ${logResult.modifiedCount} complaints  
- Added initial creation logs: ${complaintsWithoutInitialLog.length} complaints
    `);
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    
    // Close connection in case of error
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Run the migration
migrateComplaints();
