const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
require('dotenv').config();

const fixUserData = async () => {
  try {
    console.log('🔄 Fixing user data in existing complaints...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Find complaints with missing user data
    const complaintsToFix = await Complaint.find({
      $or: [
        { createdByUsername: { $exists: false } },
        { createdByUsername: null },
        { createdByUsername: '' },
        { createdByUsername: 'Unknown User' }
      ]
    });
    
    console.log(`Found ${complaintsToFix.length} complaints to fix`);
    
    // Update with proper fallback usernames
    for (const complaint of complaintsToFix) {
      // Try to get username from populated createdBy or use email
      let username = 'Legacy User';
      
      if (complaint.createdBy) {
        try {
          await complaint.populate('createdBy', 'username email');
          username = complaint.createdBy.username || complaint.createdBy.email || 'Legacy User';
        } catch (err) {
          console.log('Could not populate user for complaint:', complaint._id);
        }
      }
      
      await Complaint.findByIdAndUpdate(complaint._id, {
        createdByUsername: username
      });
      
      console.log(`Updated complaint ${complaint._id} with username: ${username}`);
    }
    
    console.log('✅ User data fix completed');
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error);
    process.exit(1);
  }
};

fixUserData();
