const SUCCESS_MESSAGES: Record<string, (count?: string | null) => string> = {
  instagram_connected: (count) =>
    `${count || 'Instagram'} account${count === '1' ? '' : 's'} connected to this workspace.`,
  facebook_connected: (count) =>
    `${count || 'Facebook'} Page${count === '1' ? '' : 's'} connected to this workspace.`,
  youtube_connected: (count) =>
    `${count || 'YouTube'} channel${count === '1' ? '' : 's'} connected to this workspace.`,
  twitter_connected: () => 'X account connected to this workspace.',
  linkedin_connected: () => 'LinkedIn account connected to this workspace.',
  tiktok_connected: () => 'TikTok account connected to this workspace.',
};

export function formatOAuthSuccessMessage(code: string, count?: string | null) {
  return SUCCESS_MESSAGES[code]?.(count) || code;
}

export function formatOAuthErrorMessage(message: string) {
  if (!message) {
    return 'Connection failed. Please try again from the selected workspace.';
  }

  if (
    message.includes('No Facebook pages found') ||
    message.includes('No Instagram business accounts found') ||
    message.includes('Instagram business accounts must be linked')
  ) {
    return message;
  }

  return message.startsWith('Meta connection failed:')
    ? message
    : `Meta connection failed: ${message}`;
}
