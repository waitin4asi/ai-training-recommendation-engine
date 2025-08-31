const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  verified: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['manual', 'extracted', 'inferred', 'verified'],
    default: 'manual'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const learningHistorySchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true
  },
  courseName: String,
  provider: String,
  category: String,
  subcategory: String,
  status: {
    type: String,
    enum: ['enrolled', 'in-progress', 'completed', 'dropped', 'paused'],
    default: 'enrolled'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  timeSpent: {
    type: Number, // minutes
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completionDate: Date,
  lastAccessDate: Date,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  
  // Detailed progress tracking
  modules: [{
    moduleId: String,
    moduleName: String,
    completed: {
      type: Boolean,
      default: false
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    score: Number,
    attempts: {
      type: Number,
      default: 0
    },
    completedAt: Date
  }],
  
  // Learning analytics
  analytics: {
    averageSessionTime: Number,
    totalSessions: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  }
}, {
  timestamps: true
});

const recommendationFeedbackSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true
  },
  recommendationId: String,
  score: Number,
  reason: String,
  recommended: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    enum: ['viewed', 'enrolled', 'ignored', 'dismissed', 'bookmarked'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1
  }
}, {
  timestamps: true
});

const careerGoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  targetDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'achieved', 'paused', 'cancelled'],
    default: 'active'
  },
  requiredSkills: [String],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  milestones: [{
    title: String,
    description: String,
    targetDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date
  }]
}, {
  timestamps: true
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Basic profile information
  profile: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    title: String,
    bio: String,
    avatar: String,
    location: {
      city: String,
      country: String,
      timezone: String
    },
    experience: {
      type: Number, // years
      min: 0,
      max: 50
    },
    currentSalary: Number,
    industry: String,
    company: String,
    
    // Skills with advanced tracking
    skills: [skillSchema],
    
    // Learning preferences
    learningPreferences: {
      pace: {
        type: String,
        enum: ['slow', 'medium', 'fast'],
        default: 'medium'
      },
      format: [{
        type: String,
        enum: ['video', 'text', 'interactive', 'audio', 'hands-on']
      }],
      sessionDuration: {
        type: Number, // minutes
        default: 60
      },
      timeAvailability: {
        weekdays: {
          type: Number, // hours per day
          default: 1
        },
        weekends: {
          type: Number, // hours per day
          default: 2
        }
      },
      difficulty: {
        type: String,
        enum: ['beginner-friendly', 'challenging', 'mixed'],
        default: 'mixed'
      },
      languages: [{
        type: String,
        default: ['english']
      }]
    },
    
    // Career goals and aspirations
    careerGoals: [careerGoalSchema],
    
    // Interests and topics
    interests: [String],
    
    // Social links
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
      twitter: String
    }
  },
  
  // Learning history and progress
  learningHistory: [learningHistorySchema],
  
  // Recommendation system data
  recommendations: [{
    courseId: String,
    score: Number,
    reason: String,
    algorithm: String, // collaborative, content-based, hybrid, market-driven
    timestamp: {
      type: Date,
      default: Date.now
    },
    viewed: {
      type: Boolean,
      default: false
    },
    viewedAt: Date
  }],
  
  // Feedback on recommendations
  recommendationFeedback: [recommendationFeedbackSchema],
  
  // Market insights and analytics
  marketInsights: {
    skillGaps: [{
      skill: String,
      currentLevel: String,
      requiredLevel: String,
      marketDemand: Number,
      salaryImpact: Number,
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      learningTimeEstimate: Number // hours
    }],
    
    careerPath: [{
      role: String,
      probability: Number,
      timeToAchieve: Number, // months
      requiredSkills: [String],
      salaryRange: {
        min: Number,
        max: Number,
        median: Number
      }
    }],
    
    trendingSkills: [{
      skill: String,
      trendScore: Number,
      growthRate: Number,
      demandLevel: String
    }],
    
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // User behavior analytics
  analytics: {
    totalLearningTime: {
      type: Number,
      default: 0
    },
    coursesCompleted: {
      type: Number,
      default: 0
    },
    averageRating: Number,
    streakDays: {
      type: Number,
      default: 0
    },
    lastActiveDate: Date,
    engagementScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    learningVelocity: Number, // courses per month
    retentionRate: Number,
    
    // Behavioral patterns
    preferredLearningTimes: [{
      dayOfWeek: Number, // 0-6
      hour: Number, // 0-23
      frequency: Number
    }],
    
    deviceUsage: {
      desktop: Number,
      mobile: Number,
      tablet: Number
    }
  },
  
  // Account settings
  settings: {
    notifications: {
      email: {
        recommendations: {
          type: Boolean,
          default: true
        },
        progress: {
          type: Boolean,
          default: true
        },
        reminders: {
          type: Boolean,
          default: true
        },
        marketing: {
          type: Boolean,
          default: false
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        reminders: {
          type: Boolean,
          default: true
        }
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'connections'],
        default: 'private'
      },
      dataSharing: {
        type: Boolean,
        default: false
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Subscription and billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    features: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.skills.name': 1 });
userSchema.index({ 'learningHistory.courseId': 1 });
userSchema.index({ 'recommendations.timestamp': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'analytics.lastActiveDate': -1 });

// Virtual for user's skill level distribution
userSchema.virtual('skillLevelDistribution').get(function() {
  const distribution = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
  this.profile.skills.forEach(skill => {
    distribution[skill.level]++;
  });
  return distribution;
});

// Virtual for learning completion rate
userSchema.virtual('completionRate').get(function() {
  const totalCourses = this.learningHistory.length;
  if (totalCourses === 0) return 0;
  
  const completedCourses = this.learningHistory.filter(
    course => course.status === 'completed'
  ).length;
  
  return (completedCourses / totalCourses) * 100;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update learning analytics
userSchema.methods.updateAnalytics = function() {
  const completedCourses = this.learningHistory.filter(
    course => course.status === 'completed'
  );
  
  this.analytics.coursesCompleted = completedCourses.length;
  this.analytics.totalLearningTime = this.learningHistory.reduce(
    (total, course) => total + (course.timeSpent || 0), 0
  );
  
  if (completedCourses.length > 0) {
    const totalRating = completedCourses.reduce(
      (sum, course) => sum + (course.rating || 0), 0
    );
    this.analytics.averageRating = totalRating / completedCourses.length;
  }
  
  // Calculate engagement score based on various factors
  const factors = {
    completionRate: this.completionRate / 100,
    recentActivity: this.analytics.lastActiveDate ? 
      Math.max(0, 1 - (Date.now() - this.analytics.lastActiveDate) / (30 * 24 * 60 * 60 * 1000)) : 0,
    feedbackProvided: this.recommendationFeedback.length / Math.max(this.recommendations.length, 1),
    streakDays: Math.min(this.analytics.streakDays / 30, 1)
  };
  
  this.analytics.engagementScore = Object.values(factors).reduce((sum, factor) => sum + factor, 0) / Object.keys(factors).length;
};

// Method to add skill
userSchema.methods.addSkill = function(skillData) {
  const existingSkillIndex = this.profile.skills.findIndex(
    skill => skill.name.toLowerCase() === skillData.name.toLowerCase()
  );
  
  if (existingSkillIndex >= 0) {
    // Update existing skill
    this.profile.skills[existingSkillIndex] = {
      ...this.profile.skills[existingSkillIndex],
      ...skillData,
      lastUpdated: new Date()
    };
  } else {
    // Add new skill
    this.profile.skills.push({
      ...skillData,
      lastUpdated: new Date()
    });
  }
};

// Method to update skill level
userSchema.methods.updateSkillLevel = function(skillName, newLevel, confidence = null) {
  const skill = this.profile.skills.find(
    s => s.name.toLowerCase() === skillName.toLowerCase()
  );
  
  if (skill) {
    skill.level = newLevel;
    if (confidence !== null) skill.confidence = confidence;
    skill.lastUpdated = new Date();
  }
};

// Static method to find users with similar skills
userSchema.statics.findSimilarUsers = function(userId, skills, limit = 10) {
  return this.find({
    _id: { $ne: userId },
    'profile.skills.name': { $in: skills }
  })
  .select('profile.skills profile.name')
  .limit(limit);
};

module.exports = mongoose.model('User', userSchema);