const natural = require('natural');
const { Matrix } = require('ml-matrix');
const User = require('../models/User');
const Course = require('../models/Course');
const logger = require('../utils/logger');
const CacheManager = require('./CacheManager');

class RecommendationEngine {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.userItemMatrix = null;
    this.itemFeatureMatrix = null;
    this.skillSimilarityMatrix = null;
    
    // Algorithm weights for hybrid approach
    this.weights = {
      collaborative: 0.35,
      contentBased: 0.35,
      marketDriven: 0.20,
      behavioral: 0.10
    };
    
    // Performance thresholds
    this.minSimilarityThreshold = 0.1;
    this.maxRecommendations = 50;
    
    this.initializeEngine();
  }

  async initializeEngine() {
    try {
      logger.info('Initializing Recommendation Engine...');
      await this.buildUserItemMatrix();
      await this.buildSkillSimilarityMatrix();
      logger.info('Recommendation Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Recommendation Engine:', error);
    }
  }

  /**
   * Main method to generate hybrid recommendations
   */
  async generateRecommendations(userId, options = {}) {
    try {
      const {
        limit = 10,
        includeExplanations = true,
        filterCompleted = true,
        diversityFactor = 0.3
      } = options;

      // Check cache first
      const cacheKey = `recommendations:${userId}:${JSON.stringify(options)}`;
      const cachedRecs = await CacheManager.get(cacheKey);
      if (cachedRecs) {
        logger.info(`Returning cached recommendations for user ${userId}`);
        return cachedRecs;
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`Generating recommendations for user ${userId}`);

      // Get recommendations from different algorithms
      const [
        collaborativeRecs,
        contentRecs,
        marketRecs,
        behavioralRecs
      ] = await Promise.all([
        this.collaborativeFiltering(userId),
        this.contentBasedFiltering(user),
        this.marketDrivenRecommendations(user),
        this.behavioralRecommendations(user)
      ]);

      // Combine recommendations using weighted scoring
      const combinedRecs = this.combineRecommendations([
        { recs: collaborativeRecs, weight: this.weights.collaborative, type: 'collaborative' },
        { recs: contentRecs, weight: this.weights.contentBased, type: 'content-based' },
        { recs: marketRecs, weight: this.weights.marketDriven, type: 'market-driven' },
        { recs: behavioralRecs, weight: this.weights.behavioral, type: 'behavioral' }
      ]);

      // Apply diversity and filtering
      let finalRecs = await this.applyDiversityFilter(combinedRecs, diversityFactor);
      
      if (filterCompleted) {
        finalRecs = this.filterCompletedCourses(finalRecs, user.learningHistory);
      }

      // Limit results and enrich with course data
      finalRecs = finalRecs.slice(0, limit);
      const enrichedRecs = await this.enrichRecommendations(finalRecs, includeExplanations);

      // Cache results
      await CacheManager.set(cacheKey, enrichedRecs, 1800); // 30 minutes

      logger.info(`Generated ${enrichedRecs.length} recommendations for user ${userId}`);
      return enrichedRecs;

    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Collaborative filtering using matrix factorization
   */
  async collaborativeFiltering(userId) {
    try {
      const users = await User.find({})
        .select('learningHistory')
        .lean();
      
      const courses = await Course.find({})
        .select('_id')
        .lean();

      if (users.length < 2 || courses.length < 2) {
        return [];
      }

      // Build user-item interaction matrix
      const userItemMatrix = this.buildInteractionMatrix(users, courses);
      const userIndex = users.findIndex(u => u._id.toString() === userId);
      
      if (userIndex === -1) {
        return [];
      }

      // Find similar users using cosine similarity
      const userSimilarities = this.calculateUserSimilarities(userItemMatrix, userIndex);
      
      // Generate recommendations based on similar users
      const recommendations = this.generateCollaborativeRecs(
        userItemMatrix, 
        userSimilarities, 
        userIndex, 
        courses
      );

      return recommendations;

    } catch (error) {
      logger.error('Collaborative filtering error:', error);
      return [];
    }
  }

  /**
   * Content-based filtering using TF-IDF and skill matching
   */
  async contentBasedFiltering(user) {
    try {
      const courses = await Course.find({}).lean();
      
      if (!courses.length) {
        return [];
      }

      // Create user profile vector
      const userSkills = user.profile.skills.map(s => s.name).join(' ');
      const userInterests = (user.profile.interests || []).join(' ');
      const userGoals = (user.profile.careerGoals || [])
        .map(g => g.title + ' ' + (g.requiredSkills || []).join(' '))
        .join(' ');
      
      const userProfile = `${userSkills} ${userInterests} ${userGoals}`.toLowerCase();

      // Calculate content similarities
      const similarities = courses.map(course => {
        const courseContent = `${course.title} ${course.description} ${(course.skills || []).join(' ')}`.toLowerCase();
        
        // TF-IDF similarity
        const tfidfSim = this.calculateTFIDFSimilarity(userProfile, courseContent);
        
        // Skill overlap similarity
        const skillSim = this.calculateSkillSimilarity(
          user.profile.skills.map(s => s.name),
          course.skills || []
        );
        
        // Difficulty matching
        const difficultyMatch = this.calculateDifficultyMatch(user, course);
        
        // Combined score
        const score = (tfidfSim * 0.4) + (skillSim * 0.4) + (difficultyMatch * 0.2);
        
        return {
          courseId: course._id.toString(),
          score,
          reason: `Content similarity based on skills and interests (${Math.round(score * 100)}% match)`
        };
      });

      return similarities
        .filter(sim => sim.score > this.minSimilarityThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxRecommendations);

    } catch (error) {
      logger.error('Content-based filtering error:', error);
      return [];
    }
  }

  /**
   * Market-driven recommendations based on job trends and skill demand
   */
  async marketDrivenRecommendations(user) {
    try {
      // Get market insights (this would integrate with job market APIs)
      const marketData = await this.getMarketData();
      const userSkills = user.profile.skills.map(s => s.name.toLowerCase());
      
      const recommendations = [];
      
      // Analyze trending skills
      for (const trend of marketData.trendingSkills) {
        const skillName = trend.skill.toLowerCase();
        
        // Skip if user already has this skill at advanced level
        const userSkill = user.profile.skills.find(s => 
          s.name.toLowerCase() === skillName && 
          ['advanced', 'expert'].includes(s.level)
        );
        
        if (userSkill) continue;
        
        // Find courses for this trending skill
        const courses = await Course.find({
          skills: { $regex: new RegExp(skillName, 'i') }
        }).lean();
        
        courses.forEach(course => {
          const score = this.calculateMarketScore(trend, user.profile);
          
          recommendations.push({
            courseId: course._id.toString(),
            score,
            reason: `High market demand for ${trend.skill} (${trend.growthRate}% growth, ${trend.demandLevel} demand)`
          });
        });
      }
      
      // Analyze skill gaps based on career goals
      if (user.profile.careerGoals && user.profile.careerGoals.length > 0) {
        const gapRecommendations = await this.generateSkillGapRecommendations(user);
        recommendations.push(...gapRecommendations);
      }
      
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxRecommendations);

    } catch (error) {
      logger.error('Market-driven recommendations error:', error);
      return [];
    }
  }

  /**
   * Behavioral recommendations based on user patterns
   */
  async behavioralRecommendations(user) {
    try {
      const recommendations = [];
      
      // Analyze learning patterns
      const learningHistory = user.learningHistory || [];
      
      if (learningHistory.length === 0) {
        return [];
      }
      
      // Find patterns in completed courses
      const completedCourses = learningHistory.filter(h => h.status === 'completed');
      const preferredCategories = this.analyzePreferredCategories(completedCourses);
      const preferredProviders = this.analyzePreferredProviders(completedCourses);
      const preferredDifficulty = this.analyzePreferredDifficulty(completedCourses);
      
      // Find similar courses based on patterns
      const courses = await Course.find({
        $or: [
          { category: { $in: preferredCategories } },
          { provider: { $in: preferredProviders } },
          { difficulty: preferredDifficulty }
        ]
      }).lean();
      
      courses.forEach(course => {
        let score = 0;
        let reasons = [];
        
        // Category preference
        if (preferredCategories.includes(course.category)) {
          score += 0.4;
          reasons.push(`matches your preferred category: ${course.category}`);
        }
        
        // Provider preference
        if (preferredProviders.includes(course.provider)) {
          score += 0.3;
          reasons.push(`from your preferred provider: ${course.provider}`);
        }
        
        // Difficulty preference
        if (course.difficulty === preferredDifficulty) {
          score += 0.3;
          reasons.push(`matches your preferred difficulty level`);
        }
        
        if (score > 0) {
          recommendations.push({
            courseId: course._id.toString(),
            score,
            reason: `Based on your learning patterns: ${reasons.join(', ')}`
          });
        }
      });
      
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxRecommendations);

    } catch (error) {
      logger.error('Behavioral recommendations error:', error);
      return [];
    }
  }

  /**
   * Combine recommendations from multiple algorithms
   */
  combineRecommendations(sources) {
    const combined = new Map();
    
    sources.forEach(({ recs, weight, type }) => {
      recs.forEach(rec => {
        const key = rec.courseId;
        
        if (combined.has(key)) {
          const existing = combined.get(key);
          existing.score += rec.score * weight;
          existing.sources.push({ type, score: rec.score, reason: rec.reason });
        } else {
          combined.set(key, {
            courseId: rec.courseId,
            score: rec.score * weight,
            sources: [{ type, score: rec.score, reason: rec.reason }]
          });
        }
      });
    });
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Apply diversity filter to avoid too similar recommendations
   */
  async applyDiversityFilter(recommendations, diversityFactor = 0.3) {
    if (recommendations.length <= 1) return recommendations;
    
    const courses = await Course.find({
      _id: { $in: recommendations.map(r => r.courseId) }
    }).lean();
    
    const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
    const diverseRecs = [recommendations[0]]; // Always include top recommendation
    
    for (let i = 1; i < recommendations.length; i++) {
      const candidate = recommendations[i];
      const candidateCourse = courseMap.get(candidate.courseId);
      
      if (!candidateCourse) continue;
      
      // Check diversity against already selected recommendations
      let isDiverse = true;
      
      for (const selected of diverseRecs) {
        const selectedCourse = courseMap.get(selected.courseId);
        if (!selectedCourse) continue;
        
        const similarity = this.calculateCourseSimilarity(candidateCourse, selectedCourse);
        
        if (similarity > (1 - diversityFactor)) {
          isDiverse = false;
          break;
        }
      }
      
      if (isDiverse) {
        diverseRecs.push(candidate);
      }
    }
    
    return diverseRecs;
  }

  /**
   * Filter out courses the user has already completed
   */
  filterCompletedCourses(recommendations, learningHistory) {
    const completedCourseIds = new Set(
      learningHistory
        .filter(h => h.status === 'completed')
        .map(h => h.courseId)
    );
    
    return recommendations.filter(rec => !completedCourseIds.has(rec.courseId));
  }

  /**
   * Enrich recommendations with course data and explanations
   */
  async enrichRecommendations(recommendations, includeExplanations = true) {
    const courseIds = recommendations.map(r => r.courseId);
    const courses = await Course.find({ _id: { $in: courseIds } }).lean();
    const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
    
    return recommendations.map(rec => {
      const course = courseMap.get(rec.courseId);
      
      const enriched = {
        courseId: rec.courseId,
        score: rec.score,
        course: course || null
      };
      
      if (includeExplanations && rec.sources) {
        enriched.explanation = {
          primaryReason: rec.sources[0]?.reason || 'Recommended based on your profile',
          sources: rec.sources,
          confidence: Math.min(rec.score, 1)
        };
      }
      
      return enriched;
    }).filter(rec => rec.course !== null);
  }

  // Helper methods

  buildInteractionMatrix(users, courses) {
    const matrix = [];
    
    users.forEach(user => {
      const row = new Array(courses.length).fill(0);
      
      (user.learningHistory || []).forEach(history => {
        const courseIndex = courses.findIndex(
          c => c._id.toString() === history.courseId
        );
        
        if (courseIndex !== -1) {
          // Weight by completion, rating, and time spent
          let weight = 0;
          
          if (history.status === 'completed') weight += 1.0;
          else if (history.status === 'in-progress') weight += history.progress / 100;
          
          if (history.rating) weight *= (history.rating / 5);
          if (history.timeSpent > 0) weight *= Math.min(history.timeSpent / 3600, 2); // Cap at 2x for very long sessions
          
          row[courseIndex] = Math.min(weight, 2); // Cap maximum weight
        }
      });
      
      matrix.push(row);
    });
    
    return new Matrix(matrix);
  }

  calculateUserSimilarities(matrix, userIndex) {
    const userRow = matrix.getRow(userIndex);
    const similarities = [];
    
    for (let i = 0; i < matrix.rows; i++) {
      if (i === userIndex) continue;
      
      const otherRow = matrix.getRow(i);
      const similarity = this.cosineSimilarity(userRow, otherRow);
      
      if (similarity > this.minSimilarityThreshold) {
        similarities.push({ userIndex: i, similarity });
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
  }

  generateCollaborativeRecs(matrix, similarities, userIndex, courses) {
    const userRow = matrix.getRow(userIndex);
    const recommendations = [];
    
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex++) {
      if (userRow[courseIndex] > 0) continue; // Skip courses user has already interacted with
      
      let weightedSum = 0;
      let similaritySum = 0;
      
      similarities.forEach(({ userIndex: simUserIndex, similarity }) => {
        const rating = matrix.get(simUserIndex, courseIndex);
        if (rating > 0) {
          weightedSum += similarity * rating;
          similaritySum += similarity;
        }
      });
      
      if (similaritySum > 0) {
        const predictedRating = weightedSum / similaritySum;
        
        if (predictedRating > this.minSimilarityThreshold) {
          recommendations.push({
            courseId: courses[courseIndex]._id.toString(),
            score: predictedRating,
            reason: `Users with similar interests also liked this course`
          });
        }
      }
    }
    
    return recommendations;
  }

  calculateTFIDFSimilarity(text1, text2) {
    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(text1.toLowerCase());
    const tokens2 = tokenizer.tokenize(text2.toLowerCase());
    
    if (!tokens1 || !tokens2 || tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }
    
    // Simple TF-IDF approximation using term frequency
    const allTokens = [...new Set([...tokens1, ...tokens2])];
    
    const vector1 = allTokens.map(token => tokens1.filter(t => t === token).length);
    const vector2 = allTokens.map(token => tokens2.filter(t => t === token).length);
    
    return this.cosineSimilarity(vector1, vector2);
  }

  calculateSkillSimilarity(userSkills, courseSkills) {
    if (!userSkills.length || !courseSkills.length) return 0;
    
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    const courseSkillsLower = courseSkills.map(s => s.toLowerCase());
    
    const intersection = userSkillsLower.filter(skill => 
      courseSkillsLower.some(courseSkill => 
        courseSkill.includes(skill) || skill.includes(courseSkill)
      )
    );
    
    const union = [...new Set([...userSkillsLower, ...courseSkillsLower])];
    
    return intersection.length / union.length;
  }

  calculateDifficultyMatch(user, course) {
    const userPreference = user.profile.learningPreferences?.difficulty || 'mixed';
    
    if (userPreference === 'mixed') return 0.5;
    
    const difficultyMap = {
      'beginner-friendly': ['beginner'],
      'challenging': ['advanced', 'expert']
    };
    
    const preferredLevels = difficultyMap[userPreference] || [course.difficulty];
    
    return preferredLevels.includes(course.difficulty) ? 1 : 0;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  calculateCourseSimilarity(course1, course2) {
    // Calculate similarity based on category, skills, and difficulty
    let similarity = 0;
    
    // Category similarity
    if (course1.category === course2.category) similarity += 0.4;
    
    // Skill similarity
    const skillSim = this.calculateSkillSimilarity(
      course1.skills || [],
      course2.skills || []
    );
    similarity += skillSim * 0.4;
    
    // Difficulty similarity
    if (course1.difficulty === course2.difficulty) similarity += 0.2;
    
    return similarity;
  }

  async buildUserItemMatrix() {
    // This would be called periodically to rebuild the matrix
    // Implementation depends on your specific needs
  }

  async buildSkillSimilarityMatrix() {
    // Build a matrix of skill similarities for better recommendations
    // Implementation depends on your specific needs
  }

  async getMarketData() {
    // Mock market data - in production, this would fetch from job market APIs
    return {
      trendingSkills: [
        { skill: 'artificial intelligence', growthRate: 45, demandLevel: 'high' },
        { skill: 'machine learning', growthRate: 38, demandLevel: 'high' },
        { skill: 'cloud computing', growthRate: 32, demandLevel: 'high' },
        { skill: 'data science', growthRate: 28, demandLevel: 'medium' },
        { skill: 'cybersecurity', growthRate: 25, demandLevel: 'high' }
      ]
    };
  }

  calculateMarketScore(trend, userProfile) {
    let score = 0;
    
    // Base score from market demand
    score += trend.growthRate / 100;
    
    // Bonus for high demand
    if (trend.demandLevel === 'high') score += 0.3;
    else if (trend.demandLevel === 'medium') score += 0.1;
    
    // Adjust based on user's current skills and goals
    const hasRelatedSkill = userProfile.skills?.some(skill =>
      skill.name.toLowerCase().includes(trend.skill.toLowerCase().split(' ')[0])
    );
    
    if (hasRelatedSkill) score += 0.2; // Easier to learn related skills
    
    return Math.min(score, 1);
  }

  async generateSkillGapRecommendations(user) {
    const recommendations = [];
    
    for (const goal of user.profile.careerGoals) {
      if (goal.status !== 'active') continue;
      
      const requiredSkills = goal.requiredSkills || [];
      const userSkills = user.profile.skills.map(s => s.name.toLowerCase());
      
      for (const requiredSkill of requiredSkills) {
        const hasSkill = userSkills.some(userSkill =>
          userSkill.includes(requiredSkill.toLowerCase()) ||
          requiredSkill.toLowerCase().includes(userSkill)
        );
        
        if (!hasSkill) {
          const courses = await Course.find({
            skills: { $regex: new RegExp(requiredSkill, 'i') }
          }).lean();
          
          courses.forEach(course => {
            recommendations.push({
              courseId: course._id.toString(),
              score: 0.8,
              reason: `Required for your career goal: ${goal.title}`
            });
          });
        }
      }
    }
    
    return recommendations;
  }

  analyzePreferredCategories(completedCourses) {
    const categoryCount = {};
    
    completedCourses.forEach(course => {
      if (course.category) {
        categoryCount[course.category] = (categoryCount[course.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  analyzePreferredProviders(completedCourses) {
    const providerCount = {};
    
    completedCourses.forEach(course => {
      if (course.provider) {
        providerCount[course.provider] = (providerCount[course.provider] || 0) + 1;
      }
    });
    
    return Object.entries(providerCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([provider]) => provider);
  }

  analyzePreferredDifficulty(completedCourses) {
    const difficultyCount = {};
    
    completedCourses.forEach(course => {
      if (course.difficulty) {
        difficultyCount[course.difficulty] = (difficultyCount[course.difficulty] || 0) + 1;
      }
    });
    
    const sortedDifficulties = Object.entries(difficultyCount)
      .sort(([,a], [,b]) => b - a);
    
    return sortedDifficulties.length > 0 ? sortedDifficulties[0][0] : 'intermediate';
  }
}

module.exports = new RecommendationEngine();