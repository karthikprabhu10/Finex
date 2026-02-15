// Using Groq API - Free tier with fast inference
// Get your free API key at: https://console.groq.com/keys
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Debug: Log if API key is available (not the actual key)
console.log('[Groq] API Key configured:', !!GROQ_API_KEY);

export interface UserFinancialContext {
  userName?: string;
  userEmail?: string;
  subscriptions?: Array<{
    name: string;
    amount: number;
    frequency: string;
    category: string;
    status: string;
    nextBilling: string;
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
  totalMonthlySubscriptions?: number;
  totalPendingBills?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const buildSystemPrompt = (context: UserFinancialContext): string => {
  const contextParts: string[] = [];

  if (context.userName) {
    contextParts.push(`User's name: ${context.userName}`);
  }

  if (context.subscriptions && context.subscriptions.length > 0) {
    const activeSubscriptions = context.subscriptions.filter(s => s.status === 'active');
    const totalMonthly = activeSubscriptions
      .filter(s => s.frequency === 'Monthly')
      .reduce((sum, s) => sum + s.amount, 0);
    
    contextParts.push(`
Active Subscriptions (${activeSubscriptions.length} total, ₹${totalMonthly}/month):
${activeSubscriptions.map(s => `- ${s.name}: ₹${s.amount}/${s.frequency}, Category: ${s.category}, Next billing: ${s.nextBilling}`).join('\n')}`);
  }

  if (context.budget) {
    contextParts.push(`
Budget Information:
- Monthly Income: ₹${context.budget.monthlyIncome}
- Budget Allocations:
${context.budget.allocations.map(a => `  - ${a.category}: ${a.percentage}% (₹${a.amount})`).join('\n')}`);
  }

  if (context.bills && context.bills.length > 0) {
    const pendingBills = context.bills.filter(b => b.status === 'pending' || b.status === 'upcoming');
    contextParts.push(`
Pending Bills (${pendingBills.length} total):
${pendingBills.slice(0, 5).map(b => `- ${b.name}: ₹${b.amount}, Due: ${b.dueDate}, Category: ${b.category}`).join('\n')}`);
  }

  if (context.recentReceipts && context.recentReceipts.length > 0) {
    const totalSpent = context.recentReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
    contextParts.push(`
Recent Spending (Last ${context.recentReceipts.length} receipts, Total: ₹${totalSpent}):
${context.recentReceipts.slice(0, 5).map(r => `- ${r.storeName}: ₹${r.totalAmount} on ${r.date}, Category: ${r.category}`).join('\n')}`);
  }

  return `You are Finex AI, a helpful personal finance assistant for the Finex expense tracking application. You help users manage their finances, subscriptions, bills, and budgets.

Current User Financial Context:
${contextParts.length > 0 ? contextParts.join('\n\n') : 'No financial data available yet.'}

Guidelines:
1. Be concise and helpful with financial advice
2. Use the user's actual financial data when answering questions
3. Provide specific, actionable recommendations based on their spending patterns
4. When discussing amounts, use Indian Rupees (₹) format
5. Be encouraging but honest about financial situations
6. If asked about data you don't have, politely mention that and suggest they add that information to the app
7. Keep responses focused and under 200 words unless detailed analysis is requested
8. Use bullet points for lists and recommendations
9. Be proactive in suggesting ways to save money or optimize their finances based on their data`;
};

export const sendMessage = async (
  message: string,
  chatHistory: ChatMessage[],
  userContext: UserFinancialContext
): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your environment variables.');
  }

  try {
    const systemPrompt = buildSystemPrompt(userContext);
    
    // Build messages array for Groq API
    const messages = [
      { role: 'system', content: systemPrompt },
      // Add chat history (excluding welcome message which is the first assistant message)
      ...chatHistory.slice(1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Free, fast, and capable model
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error Response:', errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Groq API key.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error: unknown) {
    console.error('Groq API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('API key')) {
      throw new Error('Invalid Groq API key. Please check your configuration.');
    }
    if (errorMessage.includes('rate') || errorMessage.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a few seconds.');
    }
    throw new Error(errorMessage);
  }
};

export const isGeminiConfigured = (): boolean => {
  return !!GROQ_API_KEY;
};
