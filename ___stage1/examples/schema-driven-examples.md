# Schema-Driven Branch Generation Examples

## The Schema-Driven Approach

Instead of hardcoding domain patterns, we use **LLM intelligence guided by JSON schemas** to generate infinite contextual possibilities.

## Core Schema Structure

```json
{
  "domain_analysis": {
    "domain_type": "LLM identifies the domain",
    "domain_characteristics": ["How this domain works"],
    "learning_patterns": ["How experts learn in this domain"],
    "success_indicators": ["How progress is measured"]
  },
  "intent_analysis": {
    "primary_intent": "Why they want this goal",
    "motivational_drivers": ["What drives them"],
    "success_criteria": ["How they'll know they succeeded"],
    "time_sensitivity": "urgent|moderate|patient"
  },
  "strategic_branches": [
    {
      "name": "Context-specific phase name",
      "description": "What this accomplishes",
      "priority": 1,
      "key_activities": ["Main activities"],
      "learning_focus": "How to approach this phase",
      "success_indicators": ["How to know it's complete"],
      "prerequisites": ["What comes before"]
    }
  ],
  "progression_rationale": "Why this order makes sense"
}
```

---

## Example 1: "Learn to cook Italian cuisine"

### LLM Response:
```json
{
  "domain_analysis": {
    "domain_type": "Culinary Arts - Italian Cuisine",
    "domain_characteristics": [
      "Ingredient-focused with emphasis on quality and seasonality",
      "Technique-driven with traditional methods passed down generations",
      "Regional variations with distinct local specialties",
      "Emphasis on simplicity and letting ingredients shine"
    ],
    "learning_patterns": [
      "Start with understanding authentic ingredients and their sources",
      "Learn fundamental techniques through repetitive practice",
      "Master classic recipes before attempting variations",
      "Develop palate through tasting and comparison",
      "Immerse in cultural context and regional traditions"
    ],
    "success_indicators": [
      "Ability to identify and source quality Italian ingredients",
      "Mastery of fundamental techniques like pasta making",
      "Creating dishes that capture authentic Italian flavors",
      "Understanding regional differences and specialties"
    ]
  },
  "intent_analysis": {
    "primary_intent": "Culinary passion and cultural appreciation",
    "motivational_drivers": [
      "Love for Italian culture and food",
      "Desire to create authentic experiences at home",
      "Interest in traditional cooking methods",
      "Social enjoyment of sharing Italian meals"
    ],
    "success_criteria": [
      "Cooking confidently for family and friends",
      "Creating restaurant-quality Italian dishes at home",
      "Understanding the story behind each dish",
      "Building a repertoire of signature Italian recipes"
    ],
    "time_sensitivity": "patient"
  },
  "strategic_branches": [
    {
      "name": "Italian Ingredient Mastery",
      "description": "Understand and source authentic Italian ingredients that form the foundation of great Italian cooking",
      "priority": 1,
      "key_activities": [
        "Learn about essential Italian pantry ingredients",
        "Find reliable sources for authentic ingredients",
        "Understand seasonality and regional specialties",
        "Practice identifying quality indicators"
      ],
      "learning_focus": "exploration and discovery",
      "success_indicators": [
        "Can identify and source 20+ essential Italian ingredients",
        "Understands the difference between authentic and substitute ingredients",
        "Knows seasonal availability of key ingredients"
      ],
      "prerequisites": []
    },
    {
      "name": "Fundamental Italian Techniques",
      "description": "Master the core techniques that are essential to authentic Italian cooking",
      "priority": 2,
      "key_activities": [
        "Learn pasta making from scratch",
        "Master risotto techniques",
        "Practice sauce foundations (tomato, cream, oil-based)",
        "Develop knife skills for Italian preparations"
      ],
      "learning_focus": "hands-on practice and repetition",
      "success_indicators": [
        "Can make fresh pasta consistently",
        "Masters perfect risotto texture and timing",
        "Creates smooth, well-balanced sauces",
        "Efficient prep work with proper knife techniques"
      ],
      "prerequisites": ["Italian Ingredient Mastery"]
    },
    {
      "name": "Regional Italian Specialties",
      "description": "Explore the diverse regional cuisines of Italy and master signature dishes from different areas",
      "priority": 3,
      "key_activities": [
        "Study and cook Northern Italian specialties",
        "Master Southern Italian classics",
        "Learn coastal and island specialties",
        "Understand wine pairing principles"
      ],
      "learning_focus": "cultural immersion and specialization",
      "success_indicators": [
        "Can prepare signature dishes from 5+ Italian regions",
        "Understands regional ingredient preferences",
        "Pairs appropriate wines with Italian dishes"
      ],
      "prerequisites": ["Fundamental Italian Techniques"]
    },
    {
      "name": "Creative Italian Expression",
      "description": "Develop your own Italian cooking style while respecting traditional principles",
      "priority": 4,
      "key_activities": [
        "Experiment with seasonal variations of classic dishes",
        "Create fusion dishes that honor Italian principles",
        "Develop signature recipes and techniques",
        "Host Italian dinner parties and gather feedback"
      ],
      "learning_focus": "creative application and refinement",
      "success_indicators": [
        "Creates original dishes that feel authentically Italian",
        "Adapts recipes based on ingredient availability",
        "Receives positive feedback from Italian food enthusiasts"
      ],
      "prerequisites": ["Regional Italian Specialties"]
    },
    {
      "name": "Italian Culinary Mastery",
      "description": "Achieve expert-level Italian cooking skills and share knowledge with others",
      "priority": 5,
      "key_activities": [
        "Mentor others in Italian cooking techniques",
        "Create comprehensive recipe collections",
        "Organize Italian cooking experiences and events",
        "Continuously refine and perfect signature dishes"
      ],
      "learning_focus": "mastery and teaching",
      "success_indicators": [
        "Others seek your advice on Italian cooking",
        "Consistently produces restaurant-quality results",
        "Successfully teaches Italian cooking to others"
      ],
      "prerequisites": ["Creative Italian Expression"]
    }
  ],
  "progression_rationale": "This progression follows how Italian chefs actually learn - starting with understanding ingredients (the foundation of Italian cooking), mastering fundamental techniques, exploring regional diversity, developing personal style, and finally achieving mastery. Each phase builds naturally on the previous, reflecting the ingredient-focused, technique-driven nature of Italian cuisine."
}
```

---

## Example 2: "Launch a SaaS business"

### LLM Response:
```json
{
  "domain_analysis": {
    "domain_type": "Technology Entrepreneurship - SaaS",
    "domain_characteristics": [
      "Market validation is critical before building",
      "Product-market fit determines success",
      "Recurring revenue model requires customer retention focus",
      "Scalability and unit economics are fundamental",
      "Competition is intense and fast-moving"
    ],
    "learning_patterns": [
      "Start with problem identification and market research",
      "Validate demand before significant investment",
      "Build MVP to test core assumptions",
      "Iterate based on user feedback and data",
      "Scale only after proving product-market fit"
    ],
    "success_indicators": [
      "Clear evidence of market demand",
      "Growing customer base with low churn",
      "Positive unit economics and scalable business model",
      "Product-market fit demonstrated through metrics"
    ]
  },
  "intent_analysis": {
    "primary_intent": "Entrepreneurial venture and financial independence",
    "motivational_drivers": [
      "Desire to solve a real problem",
      "Financial independence and wealth building",
      "Freedom and autonomy of entrepreneurship",
      "Impact and innovation in chosen market"
    ],
    "success_criteria": [
      "Profitable SaaS business with recurring revenue",
      "Clear path to scalability and growth",
      "Market recognition and customer satisfaction",
      "Financial goals met or exceeded"
    ],
    "time_sensitivity": "moderate"
  },
  "strategic_branches": [
    {
      "name": "Problem Discovery & Market Validation",
      "description": "Identify a real market problem and validate demand before building anything",
      "priority": 1,
      "key_activities": [
        "Conduct customer interviews and market research",
        "Identify underserved market segments",
        "Validate problem significance and willingness to pay",
        "Analyze competitive landscape and positioning"
      ],
      "learning_focus": "market research and validation",
      "success_indicators": [
        "Clear problem statement with quantified market size",
        "Evidence of customer willingness to pay",
        "Competitive differentiation strategy",
        "Target customer persona well-defined"
      ],
      "prerequisites": []
    },
    {
      "name": "MVP Development & Testing",
      "description": "Build and test a minimum viable product to validate core assumptions",
      "priority": 2,
      "key_activities": [
        "Design core feature set based on problem validation",
        "Build MVP with essential functionality only",
        "Implement basic analytics and feedback collection",
        "Launch beta testing with early customers"
      ],
      "learning_focus": "rapid prototyping and testing",
      "success_indicators": [
        "Functional MVP that solves the core problem",
        "Early customer engagement and feedback",
        "Key metrics being tracked and improving",
        "Product-market fit signals emerging"
      ],
      "prerequisites": ["Problem Discovery & Market Validation"]
    },
    {
      "name": "Customer Acquisition & Retention",
      "description": "Develop sustainable systems for acquiring and retaining customers",
      "priority": 3,
      "key_activities": [
        "Implement customer acquisition channels",
        "Optimize onboarding and user experience",
        "Develop customer success and support systems",
        "Build feedback loops for continuous improvement"
      ],
      "learning_focus": "growth and customer success",
      "success_indicators": [
        "Consistent customer acquisition at reasonable cost",
        "Low churn rate and high customer satisfaction",
        "Positive unit economics and LTV:CAC ratio",
        "Repeat usage and engagement patterns"
      ],
      "prerequisites": ["MVP Development & Testing"]
    },
    {
      "name": "Business Model Optimization",
      "description": "Refine pricing, operations, and business model for profitability and scale",
      "priority": 4,
      "key_activities": [
        "Optimize pricing strategy and packaging",
        "Streamline operations and reduce costs",
        "Implement automation and scalable processes",
        "Develop strategic partnerships and integrations"
      ],
      "learning_focus": "optimization and efficiency",
      "success_indicators": [
        "Profitable operations with positive cash flow",
        "Scalable systems that can handle growth",
        "Optimized pricing that maximizes revenue",
        "Strategic partnerships driving value"
      ],
      "prerequisites": ["Customer Acquisition & Retention"]
    },
    {
      "name": "Scale & Market Leadership",
      "description": "Scale the business and establish market leadership position",
      "priority": 5,
      "key_activities": [
        "Secure funding for accelerated growth",
        "Expand team and organizational capabilities",
        "Enter new market segments or geographies",
        "Build market-leading product features"
      ],
      "learning_focus": "strategic growth and leadership",
      "success_indicators": [
        "Significant market share and recognition",
        "Strong financial performance and growth",
        "Industry thought leadership and influence",
        "Clear path to exit or long-term value creation"
      ],
      "prerequisites": ["Business Model Optimization"]
    }
  ],
  "progression_rationale": "This progression follows the proven lean startup methodology - validate the problem first, build an MVP to test solutions, focus on customer acquisition and retention, optimize the business model for profitability, then scale for market leadership. Each phase reduces risk and builds evidence for the next phase, which is critical in the high-failure-rate world of SaaS startups."
}
```

---

## Example 3: "Train for a marathon"

### LLM Response:
```json
{
  "domain_analysis": {
    "domain_type": "Endurance Athletics - Distance Running",
    "domain_characteristics": [
      "Progressive overload principle drives adaptation",
      "Consistency is more important than intensity",
      "Recovery and injury prevention are critical",
      "Mental preparation is as important as physical",
      "Nutrition and hydration directly impact performance"
    ],
    "learning_patterns": [
      "Build aerobic base through consistent easy running",
      "Gradually increase weekly mileage following 10% rule",
      "Incorporate speed work and tempo runs progressively",
      "Practice race-day nutrition and pacing strategies",
      "Develop mental resilience through long run progression"
    ],
    "success_indicators": [
      "Consistent weekly mileage without injury",
      "Improved aerobic capacity and running efficiency",
      "Successful completion of practice long runs",
      "Confidence in race-day execution plan"
    ]
  },
  "intent_analysis": {
    "primary_intent": "Personal challenge and lifestyle transformation",
    "motivational_drivers": [
      "Personal achievement and goal completion",
      "Health and fitness improvement",
      "Mental resilience and discipline building",
      "Community connection through running"
    ],
    "success_criteria": [
      "Complete marathon distance without walking",
      "Finish within personal time goal",
      "Maintain health and avoid injury throughout training",
      "Develop long-term running lifestyle"
    ],
    "time_sensitivity": "moderate"
  },
  "strategic_branches": [
    {
      "name": "Running Foundation & Habit Formation",
      "description": "Establish consistent running routine and build aerobic base safely",
      "priority": 1,
      "key_activities": [
        "Establish 3-4 weekly running schedule",
        "Build to 30+ miles per week gradually",
        "Focus on easy conversational pace running",
        "Develop pre/post-run routines and recovery habits"
      ],
      "learning_focus": "habit formation and base building",
      "success_indicators": [
        "Running 4-5 times per week consistently",
        "Comfortable running 60+ minutes continuously",
        "No significant injuries or excessive fatigue",
        "Running feels natural and enjoyable"
      ],
      "prerequisites": []
    },
    {
      "name": "Strength & Injury Prevention",
      "description": "Build physical resilience and prevent common running injuries",
      "priority": 2,
      "key_activities": [
        "Implement strength training 2-3 times per week",
        "Practice dynamic warm-ups and proper cool-downs",
        "Learn and practice running form improvements",
        "Develop body awareness for early injury detection"
      ],
      "learning_focus": "injury prevention and biomechanics",
      "success_indicators": [
        "Regular strength training routine established",
        "Improved running form and efficiency",
        "No recurring aches or pain patterns",
        "Strong core and glute activation during running"
      ],
      "prerequisites": ["Running Foundation & Habit Formation"]
    },
    {
      "name": "Speed & Endurance Development",
      "description": "Develop racing speed and marathon-specific endurance through structured training",
      "priority": 3,
      "key_activities": [
        "Incorporate weekly tempo runs and interval training",
        "Build long runs up to 18-20 mile distances",
        "Practice marathon goal pace in training",
        "Participate in tune-up races (5K, 10K, half marathon)"
      ],
      "learning_focus": "structured training and performance development",
      "success_indicators": [
        "Comfortable running at marathon goal pace",
        "Successful completion of 18+ mile long runs",
        "Improved times in shorter distance races",
        "Confident pacing and effort management"
      ],
      "prerequisites": ["Strength & Injury Prevention"]
    },
    {
      "name": "Race Strategy & Mental Preparation",
      "description": "Develop comprehensive race-day strategy and mental toughness",
      "priority": 4,
      "key_activities": [
        "Practice nutrition and hydration strategies",
        "Develop race-day logistics and contingency plans",
        "Build mental resilience through challenging long runs",
        "Visualize race scenarios and develop coping strategies"
      ],
      "learning_focus": "strategic planning and mental preparation",
      "success_indicators": [
        "Tested and proven nutrition strategy",
        "Detailed race-day plan with multiple scenarios",
        "Mental tools for dealing with race challenges",
        "Confidence in ability to execute race plan"
      ],
      "prerequisites": ["Speed & Endurance Development"]
    },
    {
      "name": "Marathon Execution & Beyond",
      "description": "Execute marathon race plan and transition to long-term running lifestyle",
      "priority": 5,
      "key_activities": [
        "Execute marathon race with confidence and strategy",
        "Recover properly with structured post-race plan",
        "Reflect on experience and set future running goals",
        "Maintain running fitness and explore new challenges"
      ],
      "learning_focus": "execution and lifestyle integration",
      "success_indicators": [
        "Successful marathon completion within goal time",
        "Healthy recovery without major issues",
        "Continued motivation for running activities",
        "Clear vision for future running goals"
      ],
      "prerequisites": ["Race Strategy & Mental Preparation"]
    }
  ],
  "progression_rationale": "This progression follows proven marathon training principles - build aerobic base first, add strength work for injury prevention, develop speed and marathon-specific endurance, prepare mentally and strategically for race day, then execute and transition to lifelong running. Each phase builds essential elements while respecting the body's adaptation timeline."
}
```

---

## Key Advantages of Schema-Driven Approach

### ✅ **Infinite Contextual Possibilities**
- LLM can generate branches for ANY goal type
- No hardcoded domain limitations
- Natural language understanding of context and intent

### ✅ **Structured Intelligence**
- Schema ensures consistent, usable output format
- Validates that all necessary information is provided
- Maintains compatibility with existing HTA system

### ✅ **Domain Expert Knowledge**
- LLM draws from vast knowledge of how experts approach different domains
- Understands cultural and contextual nuances
- Adapts to intent (career vs. passion vs. problem-solving)

### ✅ **Truly Domain-Agnostic**
- No hardcoded patterns or assumptions
- Can handle completely novel goal types
- Maintains flexibility while providing structure

### ✅ **Graceful Fallback**
- Simple complexity-based branching when LLM fails
- Multiple validation layers ensure robustness
- Always generates usable output

The schema-driven approach gives you the best of both worlds: **infinite LLM creativity guided by structured schemas** that ensure consistent, actionable output for your HTA system!

