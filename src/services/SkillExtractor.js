const natural = require('natural');
const compromise = require('compromise');
const logger = require('../utils/logger');

class SkillExtractor {
  constructor() {
    // Comprehensive skills database organized by categories
    this.skillsDatabase = {
      // Programming Languages
      programming: [
        'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
        'kotlin', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash', 'powershell', 'typescript',
        'dart', 'elixir', 'haskell', 'clojure', 'f#', 'objective-c', 'assembly', 'cobol', 'fortran'
      ],
      
      // Web Technologies
      web: [
        'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'react', 'angular', 'vue',
        'svelte', 'jquery', 'node.js', 'express', 'next.js', 'nuxt.js', 'gatsby', 'webpack',
        'vite', 'parcel', 'babel', 'eslint', 'prettier', 'jest', 'cypress', 'selenium'
      ],
      
      // Backend & Frameworks
      backend: [
        'django', 'flask', 'fastapi', 'spring', 'spring boot', 'laravel', 'symfony', 'rails',
        'asp.net', 'express.js', 'koa', 'nestjs', 'gin', 'echo', 'fiber', 'actix', 'rocket'
      ],
      
      // Databases
      databases: [
        'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
        'sqlite', 'oracle', 'sql server', 'mariadb', 'couchdb', 'neo4j', 'influxdb', 'clickhouse'
      ],
      
      // Cloud & DevOps
      cloud: [
        'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'terraform',
        'ansible', 'puppet', 'chef', 'vagrant', 'helm', 'istio', 'prometheus', 'grafana',
        'elk stack', 'datadog', 'new relic', 'splunk', 'nagios', 'zabbix'
      ],
      
      // Data Science & AI
      datascience: [
        'machine learning', 'deep learning', 'artificial intelligence', 'data analysis',
        'data science', 'pandas', 'numpy', 'scipy', 'scikit-learn', 'tensorflow', 'pytorch',
        'keras', 'opencv', 'nltk', 'spacy', 'matplotlib', 'seaborn', 'plotly', 'tableau',
        'power bi', 'jupyter', 'apache spark', 'hadoop', 'kafka', 'airflow'
      ],
      
      // Mobile Development
      mobile: [
        'ios development', 'android development', 'react native', 'flutter', 'xamarin',
        'ionic', 'cordova', 'phonegap', 'swift', 'objective-c', 'kotlin', 'java android'
      ],
      
      // Design & UX
      design: [
        'ui design', 'ux design', 'user experience', 'user interface', 'figma', 'sketch',
        'adobe xd', 'photoshop', 'illustrator', 'indesign', 'after effects', 'premiere pro',
        'blender', '3d modeling', 'animation', 'prototyping', 'wireframing', 'user research'
      ],
      
      // Project Management & Business
      management: [
        'project management', 'agile', 'scrum', 'kanban', 'lean', 'six sigma', 'pmp',
        'product management', 'business analysis', 'requirements gathering', 'stakeholder management',
        'risk management', 'change management', 'team leadership', 'strategic planning'
      ],
      
      // Soft Skills
      soft: [
        'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
        'creativity', 'adaptability', 'time management', 'conflict resolution', 'negotiation',
        'presentation skills', 'public speaking', 'emotional intelligence', 'mentoring',
        'coaching', 'decision making', 'analytical thinking', 'attention to detail'
      ],
      
      // Security
      security: [
        'cybersecurity', 'information security', 'network security', 'application security',
        'penetration testing', 'ethical hacking', 'vulnerability assessment', 'incident response',
        'forensics', 'compliance', 'risk assessment', 'security architecture', 'cryptography'
      ],
      
      // Networking
      networking: [
        'networking', 'tcp/ip', 'dns', 'dhcp', 'vpn', 'firewall', 'load balancing',
        'routing', 'switching', 'wireless', 'network troubleshooting', 'network design',
        'network monitoring', 'network automation', 'sdn', 'network virtualization'
      ]
    };
    
    // Flatten skills database for quick lookup
    this.allSkills = Object.values(this.skillsDatabase).flat();
    
    // Skill level indicators
    this.levelIndicators = {
      expert: {
        keywords: ['expert', 'senior', 'lead', 'architect', 'principal', 'staff', 'distinguished', 'fellow'],
        years: ['8+', '9+', '10+', '5+ years', '6+ years', '7+ years', '8+ years', '9+ years', '10+ years'],
        weight: 1.0
      },
      advanced: {
        keywords: ['advanced', 'proficient', 'experienced', 'skilled', 'strong', 'solid', 'extensive'],
        years: ['4+', '5+', '3+ years', '4+ years', '5+ years'],
        weight: 0.8
      },
      intermediate: {
        keywords: ['intermediate', 'familiar', 'working knowledge', 'competent', 'moderate', 'some experience'],
        years: ['2+', '3+', '1+ years', '2+ years', '3+ years'],
        weight: 0.6
      },
      beginner: {
        keywords: ['beginner', 'basic', 'learning', 'novice', 'entry', 'junior', 'trainee', 'intern'],
        years: ['<1', '0-1', '6 months', '1 year'],
        weight: 0.3
      }
    };
    
    // Skill extraction patterns
    this.skillPatterns = [
      // Experience patterns
      /(?:experience|experienced|worked)\s+(?:with|in|on|using)\s+([^,.;]+)/gi,
      /(?:proficient|skilled|expert)\s+(?:in|with|at)\s+([^,.;]+)/gi,
      /(?:knowledge|understanding)\s+(?:of|in|with)\s+([^,.;]+)/gi,
      /(?:familiar|comfortable)\s+(?:with|using)\s+([^,.;]+)/gi,
      
      // Technology patterns
      /(?:using|utilized|implemented|developed)\s+([^,.;]+)/gi,
      /(?:technologies|tools|frameworks|languages):\s*([^.;]+)/gi,
      /(?:stack|tech stack):\s*([^.;]+)/gi,
      
      // Project patterns
      /(?:built|created|developed|designed)\s+(?:using|with)\s+([^,.;]+)/gi,
      /(?:worked on|contributed to)\s+([^,.;]+)\s+(?:projects|applications)/gi,
      
      // Certification patterns
      /(?:certified|certification)\s+(?:in|for)\s+([^,.;]+)/gi,
      /(?:trained|training)\s+(?:in|on)\s+([^,.;]+)/gi
    ];
    
    // Initialize NLP tools
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    
    // Precompute skill variations
    this.skillVariations = this.buildSkillVariations();
  }

  /**
   * Main method to extract skills from text
   */
  extractSkills(text, options = {}) {
    try {
      const {
        includeConfidence = true,
        includeContext = false,
        minConfidence = 0.3,
        maxSkills = 50
      } = options;

      logger.info('Starting skill extraction from text');

      // Clean and preprocess text
      const cleanedText = this.preprocessText(text);
      
      // Extract skills using multiple methods
      const extractedSkills = [];
      
      // Method 1: Direct database matching
      const directMatches = this.extractDirectMatches(cleanedText);
      extractedSkills.push(...directMatches);
      
      // Method 2: Pattern-based extraction
      const patternMatches = this.extractWithPatterns(cleanedText);
      extractedSkills.push(...patternMatches);
      
      // Method 3: NLP-based extraction
      const nlpMatches = this.extractWithNLP(cleanedText);
      extractedSkills.push(...nlpMatches);
      
      // Method 4: Context-based extraction
      const contextMatches = this.extractWithContext(cleanedText);
      extractedSkills.push(...contextMatches);
      
      // Combine and deduplicate skills
      const combinedSkills = this.combineAndDeduplicateSkills(extractedSkills);
      
      // Analyze skill levels if requested
      let finalSkills = combinedSkills;
      if (includeConfidence) {
        finalSkills = finalSkills.map(skill => ({
          ...skill,
          level: this.analyzeSkillLevel(cleanedText, skill.name),
          context: includeContext ? this.extractSkillContext(cleanedText, skill.name) : undefined
        }));
      }
      
      // Filter by confidence and limit results
      finalSkills = finalSkills
        .filter(skill => skill.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxSkills);
      
      logger.info(`Extracted ${finalSkills.length} skills from text`);
      return finalSkills;

    } catch (error) {
      logger.error('Error in skill extraction:', error);
      return [];
    }
  }

  /**
   * Extract skills by direct matching with database
   */
  extractDirectMatches(text) {
    const skills = [];
    const textLower = text.toLowerCase();
    
    this.allSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      // Check for exact matches
      if (textLower.includes(skillLower)) {
        const regex = new RegExp(`\\b${this.escapeRegex(skillLower)}\\b`, 'gi');
        const matches = textLower.match(regex);
        
        if (matches) {
          skills.push({
            name: skill,
            confidence: 0.9,
            method: 'direct_match',
            occurrences: matches.length
          });
        }
      }
      
      // Check for partial matches (for compound skills)
      if (skill.includes(' ')) {
        const skillWords = skill.split(' ');
        const matchedWords = skillWords.filter(word => 
          textLower.includes(word.toLowerCase())
        );
        
        if (matchedWords.length >= skillWords.length * 0.7) {
          skills.push({
            name: skill,
            confidence: 0.7 * (matchedWords.length / skillWords.length),
            method: 'partial_match',
            matchedWords
          });
        }
      }
    });
    
    return skills;
  }

  /**
   * Extract skills using regex patterns
   */
  extractWithPatterns(text) {
    const skills = [];
    
    this.skillPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const extractedText = match[1].trim();
        
        // Clean and split the extracted text
        const potentialSkills = this.cleanExtractedText(extractedText);
        
        potentialSkills.forEach(skill => {
          if (this.isValidSkill(skill)) {
            skills.push({
              name: skill,
              confidence: 0.7,
              method: 'pattern_match',
              pattern: pattern.source
            });
          }
        });
      }
    });
    
    return skills;
  }

  /**
   * Extract skills using NLP techniques
   */
  extractWithNLP(text) {
    const skills = [];
    
    try {
      // Use compromise.js for NLP analysis
      const doc = compromise(text);
      
      // Extract nouns that might be skills
      const nouns = doc.nouns().out('array');
      const adjectives = doc.adjectives().out('array');
      const organizations = doc.organizations().out('array');
      
      // Combine potential skill terms
      const potentialSkills = [...nouns, ...adjectives, ...organizations];
      
      potentialSkills.forEach(term => {
        const cleanTerm = term.toLowerCase().trim();
        
        // Check if it matches known skills
        const matchingSkill = this.findBestSkillMatch(cleanTerm);
        if (matchingSkill) {
          skills.push({
            name: matchingSkill.skill,
            confidence: matchingSkill.similarity * 0.6,
            method: 'nlp_match',
            originalTerm: term
          });
        }
      });
      
    } catch (error) {
      logger.error('NLP extraction error:', error);
    }
    
    return skills;
  }

  /**
   * Extract skills based on context analysis
   */
  extractWithContext(text) {
    const skills = [];
    
    // Look for skill-related sections
    const sections = this.identifySkillSections(text);
    
    sections.forEach(section => {
      const sectionSkills = this.extractFromSection(section);
      skills.push(...sectionSkills);
    });
    
    return skills;
  }

  /**
   * Analyze skill proficiency level from context
   */
  analyzeSkillLevel(text, skillName) {
    const context = this.extractSkillContext(text, skillName);
    const contextLower = context.toLowerCase();
    
    const levelScores = {};
    
    // Calculate scores for each level
    Object.entries(this.levelIndicators).forEach(([level, indicators]) => {
      let score = 0;
      
      // Check keywords
      indicators.keywords.forEach(keyword => {
        if (contextLower.includes(keyword)) {
          score += indicators.weight;
        }
      });
      
      // Check years of experience
      indicators.years.forEach(yearPattern => {
        if (contextLower.includes(yearPattern)) {
          score += indicators.weight * 0.8;
        }
      });
      
      // Check for numeric patterns (e.g., "5 years of Python")
      const yearRegex = /(\d+)\s*(?:years?|yrs?)\s*(?:of|with|in|using)?\s*(?:experience\s*(?:with|in)?\s*)?/gi;
      let yearMatch;
      while ((yearMatch = yearRegex.exec(contextLower)) !== null) {
        const years = parseInt(yearMatch[1]);
        if (years >= 5 && level === 'expert') score += 0.8;
        else if (years >= 3 && level === 'advanced') score += 0.8;
        else if (years >= 1 && level === 'intermediate') score += 0.8;
        else if (years < 1 && level === 'beginner') score += 0.8;
      }
      
      levelScores[level] = score;
    });
    
    // Return level with highest score, default to intermediate
    const bestLevel = Object.entries(levelScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return bestLevel && bestLevel[1] > 0 ? bestLevel[0] : 'intermediate';
  }

  /**
   * Extract context around a skill mention
   */
  extractSkillContext(text, skillName) {
    const skillRegex = new RegExp(`\\b${this.escapeRegex(skillName)}\\b`, 'gi');
    const matches = [];
    let match;
    
    while ((match = skillRegex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + skillName.length + 100);
      matches.push(text.substring(start, end));
    }
    
    return matches.join(' ... ');
  }

  /**
   * Suggest skill improvements based on market trends and user profile
   */
  suggestSkillImprovements(userSkills, marketTrends = [], careerGoals = []) {
    const suggestions = [];
    const currentSkillNames = userSkills.map(skill => skill.name.toLowerCase());
    
    // Analyze market trends
    marketTrends.forEach(trend => {
      const trendSkill = trend.skill.toLowerCase();
      
      if (!currentSkillNames.some(skill => skill.includes(trendSkill))) {
        suggestions.push({
          skill: trend.skill,
          reason: `High market demand with ${trend.growthRate}% growth`,
          priority: this.calculatePriority(trend),
          category: this.getSkillCategory(trend.skill),
          learningPath: this.generateLearningPath(trend.skill, userSkills)
        });
      }
    });
    
    // Analyze career goals
    careerGoals.forEach(goal => {
      const requiredSkills = goal.requiredSkills || [];
      
      requiredSkills.forEach(requiredSkill => {
        const hasSkill = currentSkillNames.some(skill =>
          skill.includes(requiredSkill.toLowerCase()) ||
          requiredSkill.toLowerCase().includes(skill)
        );
        
        if (!hasSkill) {
          suggestions.push({
            skill: requiredSkill,
            reason: `Required for career goal: ${goal.title}`,
            priority: 'high',
            category: this.getSkillCategory(requiredSkill),
            deadline: goal.targetDate
          });
        }
      });
    });
    
    // Find complementary skills
    const complementarySkills = this.findComplementarySkills(userSkills);
    suggestions.push(...complementarySkills);
    
    return suggestions
      .sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
      .slice(0, 20);
  }

  // Helper methods

  preprocessText(text) {
    return text
      .replace(/[^\w\s.,;:()\-+#]/g, ' ') // Remove special characters except common ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  combineAndDeduplicateSkills(skillArrays) {
    const skillMap = new Map();
    
    skillArrays.forEach(skills => {
      skills.forEach(skill => {
        const key = skill.name.toLowerCase();
        
        if (skillMap.has(key)) {
          const existing = skillMap.get(key);
          // Combine confidence scores
          existing.confidence = Math.max(existing.confidence, skill.confidence);
          existing.methods = [...(existing.methods || [existing.method]), skill.method];
        } else {
          skillMap.set(key, { ...skill, methods: [skill.method] });
        }
      });
    });
    
    return Array.from(skillMap.values());
  }

  cleanExtractedText(text) {
    return text
      .split(/[,;]/) // Split by common separators
      .map(item => item.trim())
      .filter(item => item.length > 1 && item.length < 50)
      .map(item => item.replace(/^(and|or|the|a|an)\s+/i, '')) // Remove common prefixes
      .filter(item => item.length > 1);
  }

  isValidSkill(skill) {
    const skillLower = skill.toLowerCase();
    
    // Check if it's in our database
    if (this.allSkills.some(s => s.toLowerCase() === skillLower)) {
      return true;
    }
    
    // Check if it's a reasonable skill name
    if (skill.length < 2 || skill.length > 50) return false;
    if (/^\d+$/.test(skill)) return false; // Pure numbers
    if (/^[^a-zA-Z]*$/.test(skill)) return false; // No letters
    
    // Check against common non-skill words
    const nonSkillWords = [
      'experience', 'knowledge', 'skills', 'ability', 'years', 'months',
      'project', 'work', 'team', 'company', 'role', 'position', 'job'
    ];
    
    return !nonSkillWords.includes(skillLower);
  }

  findBestSkillMatch(term) {
    let bestMatch = null;
    let bestSimilarity = 0;
    
    this.allSkills.forEach(skill => {
      const similarity = this.calculateStringSimilarity(term, skill.toLowerCase());
      
      if (similarity > bestSimilarity && similarity > 0.7) {
        bestMatch = { skill, similarity };
        bestSimilarity = similarity;
      }
    });
    
    return bestMatch;
  }

  calculateStringSimilarity(str1, str2) {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  identifySkillSections(text) {
    const sections = [];
    
    // Common skill section headers
    const sectionHeaders = [
      /(?:technical\s+)?skills?:?\s*/gi,
      /technologies?:?\s*/gi,
      /programming\s+languages?:?\s*/gi,
      /tools?\s+(?:and\s+)?technologies?:?\s*/gi,
      /expertise:?\s*/gi,
      /competencies:?\s*/gi,
      /proficiencies:?\s*/gi
    ];
    
    sectionHeaders.forEach(headerRegex => {
      let match;
      while ((match = headerRegex.exec(text)) !== null) {
        const start = match.index + match[0].length;
        const end = this.findSectionEnd(text, start);
        
        if (end > start) {
          sections.push({
            type: 'skills',
            content: text.substring(start, end),
            confidence: 0.8
          });
        }
      }
    });
    
    return sections;
  }

  findSectionEnd(text, start) {
    // Look for next section header or end of text
    const nextSectionRegex = /\n\s*[A-Z][^:\n]*:|\n\s*\n/g;
    nextSectionRegex.lastIndex = start;
    
    const match = nextSectionRegex.exec(text);
    return match ? match.index : Math.min(start + 500, text.length);
  }

  extractFromSection(section) {
    const skills = [];
    const content = section.content;
    
    // Split by common separators
    const items = content.split(/[,;•\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 1);
    
    items.forEach(item => {
      const cleanItem = item.replace(/^[-•]\s*/, '').trim();
      
      if (this.isValidSkill(cleanItem)) {
        const matchingSkill = this.findBestSkillMatch(cleanItem.toLowerCase());
        
        if (matchingSkill) {
          skills.push({
            name: matchingSkill.skill,
            confidence: section.confidence * matchingSkill.similarity,
            method: 'section_extraction'
          });
        }
      }
    });
    
    return skills;
  }

  buildSkillVariations() {
    const variations = new Map();
    
    this.allSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      variations.set(skillLower, skill);
      
      // Add common variations
      if (skill.includes('.')) {
        variations.set(skill.replace(/\./g, ''), skill);
      }
      
      if (skill.includes('-')) {
        variations.set(skill.replace(/-/g, ' '), skill);
        variations.set(skill.replace(/-/g, ''), skill);
      }
      
      if (skill.includes(' ')) {
        variations.set(skill.replace(/\s+/g, ''), skill);
      }
    });
    
    return variations;
  }

  getSkillCategory(skillName) {
    const skillLower = skillName.toLowerCase();
    
    for (const [category, skills] of Object.entries(this.skillsDatabase)) {
      if (skills.some(skill => skill.toLowerCase() === skillLower)) {
        return category;
      }
    }
    
    return 'other';
  }

  calculatePriority(trend) {
    if (trend.growthRate > 40) return 'critical';
    if (trend.growthRate > 25) return 'high';
    if (trend.growthRate > 15) return 'medium';
    return 'low';
  }

  priorityWeight(priority) {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 1;
  }

  findComplementarySkills(userSkills) {
    const suggestions = [];
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    
    // Define skill relationships
    const skillRelationships = {
      'javascript': ['react', 'node.js', 'typescript', 'vue', 'angular'],
      'python': ['django', 'flask', 'pandas', 'numpy', 'machine learning'],
      'react': ['redux', 'next.js', 'typescript', 'jest', 'webpack'],
      'aws': ['docker', 'kubernetes', 'terraform', 'jenkins'],
      'machine learning': ['python', 'tensorflow', 'pytorch', 'pandas', 'numpy']
    };
    
    userSkillNames.forEach(userSkill => {
      const related = skillRelationships[userSkill];
      if (related) {
        related.forEach(relatedSkill => {
          if (!userSkillNames.includes(relatedSkill.toLowerCase())) {
            suggestions.push({
              skill: relatedSkill,
              reason: `Complements your ${userSkill} skills`,
              priority: 'medium',
              category: this.getSkillCategory(relatedSkill)
            });
          }
        });
      }
    });
    
    return suggestions;
  }

  generateLearningPath(skill, userSkills) {
    // This would generate a suggested learning path for the skill
    // Based on user's current skills and the target skill
    return {
      prerequisites: [],
      estimatedTime: '2-3 months',
      difficulty: 'intermediate'
    };
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = new SkillExtractor();