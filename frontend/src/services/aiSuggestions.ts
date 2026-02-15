// AI Suggestions Service using Groq API (separate key from chatbot)
// Get your free API key at: https://console.groq.com/keys

const GROQ_API_KEY_2 = import.meta.env.VITE_GROQ_API_KEY_2;

console.log('[Groq Suggestions] API Key configured:', !!GROQ_API_KEY_2);

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  icon: 'TrendingDown' | 'AlertCircle' | 'Sparkles' | 'CreditCard' | 'PieChart' | 'Clock';
  color: string;
  category: string;
}

export interface UserFinancialData {
  subscriptions?: Array<{
    name: string;
    amount: number;
    frequency: string;
    category: string;
    status: string;
  }>;
  budget?: {
    monthlyIncome: number;
    allocations: Array<{ category: string; percentage: number; amount: number }>;
  };
  recentReceipts?: Array<{
    storeName: string;
    totalAmount: number;
    date: string;
    category: string;
  }>;
  bills?: Array<{
    name: string;
    amount: number;
    dueDate: string;
    status: string;
    category: string;
  }>;
}

const buildPrompt = (userData: UserFinancialData): string => {
  const parts: string[] = [];

  if (userData.subscriptions && userData.subscriptions.length > 0) {
    const activeSubscriptions = userData.subscriptions.filter(s => s.status === 'active');
    const totalMonthly = activeSubscriptions
      .filter(s => s.frequency === 'Monthly')
      .reduce((sum, s) => sum + s.amount, 0);
    parts.push(`Subscriptions: ${activeSubscriptions.length} active, ₹${totalMonthly}/month total`);
    parts.push(`Details: ${activeSubscriptions.map(s => `${s.name} (₹${s.amount}/${s.frequency})`).join(', ')}`);
  }

  if (userData.budget) {
    parts.push(`Monthly Income: ₹${userData.budget.monthlyIncome}`);
    parts.push(`Budget Allocations: ${userData.budget.allocations.map(a => `${a.category}: ${a.percentage}%`).join(', ')}`);
  }

  if (userData.recentReceipts && userData.recentReceipts.length > 0) {
    const totalSpent = userData.recentReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const categories = [...new Set(userData.recentReceipts.map(r => r.category))];
    parts.push(`Recent spending: ₹${totalSpent} across ${userData.recentReceipts.length} receipts`);
    parts.push(`Spending categories: ${categories.join(', ')}`);
  }

  if (userData.bills && userData.bills.length > 0) {
    const pendingBills = userData.bills.filter(b => b.status === 'pending' || b.status === 'upcoming');
    const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);
    parts.push(`Pending bills: ${pendingBills.length} bills totaling ₹${totalPending}`);
  }

  return `You are a financial advisor AI. Based on the following user financial data, generate exactly between 4 to 10 personalized financial suggestions.

User Financial Data:
${parts.length > 0 ? parts.join('\n') : 'No financial data available - provide general financial tips.'}

Generate suggestions in the following JSON format (array of objects):
[
  {
    "title": "Short actionable title (3-6 words)",
    "description": "Detailed explanation of the suggestion (1-2 sentences)",
    "impact": "High Impact" or "Medium Impact" or "Low Impact",
    "icon": one of ["TrendingDown", "AlertCircle", "Sparkles", "CreditCard", "PieChart", "Clock"],
    "color": hex color code matching the suggestion type (#10B981 for savings, #F59E0B for warnings, #3B82F6 for info, #8B5CF6 for tips, #EF4444 for urgent)
  }
]

Guidelines:
- Generate 4 to 10 suggestions based on available data
- Use "High Impact" for suggestions that could save significant money
- Use "Medium Impact" for good practices
- Use "Low Impact" for minor optimizations
- Each suggestion should be specific and actionable
- Use Indian Rupees (₹) format for amounts
- Focus on: cost cutting, subscription optimization, budget adherence, bill payment reminders, spending patterns
- Return ONLY the JSON array, no other text`;
};

export const generateAISuggestions = async (userData: UserFinancialData): Promise<AISuggestion[]> => {
  if (!GROQ_API_KEY_2) {
    console.warn('[Groq Suggestions] API key not configured, returning default suggestions');
    return getDefaultSuggestions();
  }

  try {
    const prompt = buildPrompt(userData);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY_2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);
      return getDefaultSuggestions();
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to parse suggestions JSON');
      return getDefaultSuggestions();
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    
    // Add unique IDs and validate
    return suggestions.map((s: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      title: s.title || 'Financial Tip',
      description: s.description || 'Consider reviewing your finances.',
      impact: s.impact || 'Medium Impact',
      icon: s.icon || 'Sparkles',
      color: s.color || '#3B82F6',
      category: 'ai-generated',
    })).slice(0, 10); // Ensure max 10 suggestions

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return getDefaultSuggestions();
  }
};

const getDefaultSuggestions = (): AISuggestion[] => [
  {
    id: 'default-1',
    title: 'Track Your Daily Expenses',
    description: 'Upload more receipts to get personalized insights. Consistent tracking helps identify spending patterns and saving opportunities.',
    impact: 'High Impact',
    icon: 'TrendingDown',
    color: '#10B981',
    category: 'tracking',
  },
  {
    id: 'default-2',
    title: 'Set Monthly Budgets',
    description: 'Create category-wise budgets to control spending. Studies show budgeting can reduce unnecessary expenses by up to 20%.',
    impact: 'High Impact',
    icon: 'PieChart',
    color: '#3B82F6',
    category: 'budgeting',
  },
  {
    id: 'default-3',
    title: 'Review Subscriptions',
    description: 'Check your subscription calendar for services you no longer use. Canceling unused subscriptions can save thousands annually.',
    impact: 'Medium Impact',
    icon: 'AlertCircle',
    color: '#F59E0B',
    category: 'subscriptions',
  },
  {
    id: 'default-4',
    title: 'Pay Bills On Time',
    description: 'Set up bill reminders to avoid late fees. Timely payments also help maintain a good credit score.',
    impact: 'Medium Impact',
    icon: 'Clock',
    color: '#8B5CF6',
    category: 'bills',
  },
];

export const isGroqConfigured = (): boolean => {
  return !!GROQ_API_KEY_2;
};
