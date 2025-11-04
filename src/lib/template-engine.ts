/**
 * Template Engine
 * Parse and replace variables in content templates
 * Supports {{variable}} syntax
 */

export interface TemplateVariable {
  name: string;
  value: string;
  required?: boolean;
  default?: string;
  description?: string;
}

export interface ParsedTemplate {
  content: string;
  variables: string[];
  requiredVariables: string[];
}

// ═══════════════════════════════════════════════════════════════
// VARIABLE PARSING
// ═══════════════════════════════════════════════════════════════

/**
 * Extract variables from template content
 * Variables are in the format {{variable_name}}
 */
export function extractVariables(content: string): string[] {
  const variablePattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const matches = content.matchAll(variablePattern);
  const variables = Array.from(matches, (match) => match[1]);
  
  // Return unique variables
  return [...new Set(variables)];
}

/**
 * Parse template and extract metadata
 */
export function parseTemplate(content: string): ParsedTemplate {
  const variables = extractVariables(content);
  
  // Check for required variables (convention: {{variable!}})
  const requiredPattern = /\{\{([a-zA-Z0-9_]+)!\}\}/g;
  const requiredMatches = content.matchAll(requiredPattern);
  const requiredVariables = Array.from(requiredMatches, (match) => match[1]);

  return {
    content,
    variables,
    requiredVariables: [...new Set(requiredVariables)],
  };
}

// ═══════════════════════════════════════════════════════════════
// VARIABLE REPLACEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Replace variables in template with values
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;

  // Replace each variable
  Object.entries(variables).forEach(([name, value]) => {
    // Replace both {{variable}} and {{variable!}}
    const pattern = new RegExp(`\\{\\{${name}!?\\}\\}`, 'g');
    result = result.replace(pattern, value || '');
  });

  return result;
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  content: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const parsed = parseTemplate(content);
  const missing: string[] = [];

  parsed.requiredVariables.forEach((varName) => {
    if (!variables[varName] || variables[varName].trim() === '') {
      missing.push(varName);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ═══════════════════════════════════════════════════════════════
// CONDITIONAL CONTENT
// ═══════════════════════════════════════════════════════════════

/**
 * Process conditional content blocks
 * Format: {{#if variable}}content{{/if}}
 */
export function processConditionals(
  content: string,
  variables: Record<string, string | boolean>
): string {
  let result = content;

  // Process if blocks
  const ifPattern = /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  result = result.replace(ifPattern, (match, varName, blockContent) => {
    const value = variables[varName];
    // Show content if variable is truthy
    return value ? blockContent : '';
  });

  // Process unless blocks
  const unlessPattern = /\{\{#unless\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
  
  result = result.replace(unlessPattern, (match, varName, blockContent) => {
    const value = variables[varName];
    // Show content if variable is falsy
    return !value ? blockContent : '';
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE RENDERING
// ═══════════════════════════════════════════════════════════════

/**
 * Render template with variables and conditionals
 */
export function renderTemplate(
  content: string,
  variables: Record<string, string | boolean>
): { result: string; errors: string[] } {
  const errors: string[] = [];

  // Validate required variables
  const stringVars = Object.entries(variables).reduce((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value : value ? 'true' : 'false';
    return acc;
  }, {} as Record<string, string>);

  const validation = validateVariables(content, stringVars);
  if (!validation.valid) {
    validation.missing.forEach((varName) => {
      errors.push(`Required variable '${varName}' is missing`);
    });
  }

  try {
    // Process conditionals first
    let result = processConditionals(content, variables);
    
    // Then replace variables
    result = replaceVariables(result, stringVars);
    
    // Check for unreplaced variables
    const remainingVars = extractVariables(result);
    if (remainingVars.length > 0) {
      remainingVars.forEach((varName) => {
        errors.push(`Variable '${varName}' not provided`);
      });
    }

    return { result, errors };
  } catch (error) {
    errors.push(`Template rendering error: ${(error as Error).message}`);
    return { result: content, errors };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get variable suggestions based on context
 */
export function getVariableSuggestions(context: 'post' | 'campaign' | 'general'): TemplateVariable[] {
  const common: TemplateVariable[] = [
    { name: 'brand_name', value: '', description: 'Your brand name' },
    { name: 'website_url', value: '', description: 'Your website URL' },
    { name: 'current_date', value: new Date().toLocaleDateString(), description: 'Current date' },
    { name: 'current_time', value: new Date().toLocaleTimeString(), description: 'Current time' },
  ];

  const postVars: TemplateVariable[] = [
    { name: 'product_name', value: '', description: 'Product or service name' },
    { name: 'product_description', value: '', description: 'Product description' },
    { name: 'price', value: '', description: 'Product price' },
    { name: 'discount', value: '', description: 'Discount percentage' },
    { name: 'cta_text', value: 'Learn More', description: 'Call-to-action text' },
    { name: 'cta_url', value: '', description: 'Call-to-action URL' },
  ];

  const campaignVars: TemplateVariable[] = [
    { name: 'campaign_name', value: '', description: 'Campaign name' },
    { name: 'campaign_goal', value: '', description: 'Campaign goal' },
    { name: 'start_date', value: '', description: 'Campaign start date' },
    { name: 'end_date', value: '', description: 'Campaign end date' },
  ];

  switch (context) {
    case 'post':
      return [...common, ...postVars];
    case 'campaign':
      return [...common, ...campaignVars];
    default:
      return common;
  }
}

/**
 * Create a template from content by detecting patterns
 */
export function createTemplateFromContent(content: string): {
  template: string;
  suggestedVariables: string[];
} {
  // Detect potential variables (e.g., brand names, URLs, numbers)
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const pricePattern = /(\$\d+(?:\.\d{2})?)/g;
  const percentPattern = /(\d+%)/g;

  let template = content;
  const suggestedVariables: string[] = [];

  // Replace URLs
  const urls = content.match(urlPattern);
  if (urls && urls.length > 0) {
    urls.forEach((url, index) => {
      const varName = index === 0 ? 'url' : `url_${index + 1}`;
      template = template.replace(url, `{{${varName}}}`);
      suggestedVariables.push(varName);
    });
  }

  // Replace prices
  const prices = content.match(pricePattern);
  if (prices && prices.length > 0) {
    prices.forEach((price, index) => {
      const varName = index === 0 ? 'price' : `price_${index + 1}`;
      template = template.replace(price, `{{${varName}}}`);
      suggestedVariables.push(varName);
    });
  }

  return { template, suggestedVariables };
}

/**
 * Preview template with example values
 */
export function previewTemplate(content: string): string {
  const exampleValues: Record<string, string> = {
    brand_name: 'Your Brand',
    product_name: 'Example Product',
    product_description: 'An amazing product',
    price: '$99.99',
    discount: '20%',
    website_url: 'https://example.com',
    cta_text: 'Shop Now',
    cta_url: 'https://example.com/shop',
    current_date: new Date().toLocaleDateString(),
    current_time: new Date().toLocaleTimeString(),
  };

  return replaceVariables(content, exampleValues);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const TemplateEngine = {
  extractVariables,
  parseTemplate,
  replaceVariables,
  validateVariables,
  processConditionals,
  renderTemplate,
  getVariableSuggestions,
  createTemplateFromContent,
  previewTemplate,
};

export default TemplateEngine;

