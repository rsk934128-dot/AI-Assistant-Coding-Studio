// Utility functions for sharing content across various social media and messaging platforms

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

export const getAppShareUrl = (sessionId?: string): string => {
  if (typeof window === 'undefined') return '';
  try {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('session', sessionId);
    } else {
      url.searchParams.delete('session');
    }
    return url.toString();
  } catch {
    return window.location.href;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

export const shareToPlatform = (
  platform: 
    | 'whatsapp'
    | 'facebook'
    | 'messenger'
    | 'twitter'
    | 'linkedin'
    | 'telegram'
    | 'reddit'
    | 'email',
  options: ShareOptions
) => {
  const url = options.url || getAppShareUrl();
  const title = options.title || 'AI Assistant & Coding Studio';
  const text = options.text || `AI Assistant & Coding Studio — বাংলা ও ইংরেজি স্মার্ট এআই অ্যাসিস্ট্যান্ট (কোডিং, লেখালেখি ও ক্লাউড সিঙ্ক)।`;

  let shareUrl = '';

  switch (platform) {
    case 'whatsapp':
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n🔗 অ্যাপ লিংক:\n' + url)}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
      break;
    case 'messenger':
      shareUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(url)}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=AIAssistant,CodingStudio,BengaliAI`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      break;
    case 'telegram':
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      break;
    case 'reddit':
      shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title + ' - ' + text)}`;
      break;
    case 'email':
      shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\nঅ্যাপটি ব্যবহার করতে নিচের লিংকে ক্লিক করুন:\n' + url)}`;
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=620,height=560');
  }
};

export const triggerNativeShare = async (options: ShareOptions): Promise<boolean> => {
  const url = options.url || getAppShareUrl();
  const title = options.title || 'AI Assistant & Coding Studio';
  const text = options.text || `${title} - বাংলা ও ইংরেজি ফুল-স্ট্যাক এআই সহকারী`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (err) {
      // Sharing was cancelled or failed
      return false;
    }
  }
  return false;
};
