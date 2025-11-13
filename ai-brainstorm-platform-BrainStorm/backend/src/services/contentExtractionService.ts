import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { chromium, Browser, Page } from 'playwright';
import { retryWithBackoff } from '../utils/retryUtil';

/**
 * Enhanced content extraction service
 * Uses Mozilla Readability for clean HTML extraction
 * Uses Playwright for JavaScript-rendered sites
 */
export class ContentExtractionService {
  private browser: Browser | null = null;
  private browserInitPromise: Promise<Browser> | null = null;

  /**
   * Extract content from a URL with multiple strategies
   */
  async extractFromUrl(url: string): Promise<{
    content: string;
    title: string;
    excerpt: string;
    textContent: string;
    byline?: string;
    siteName?: string;
    length: number;
    screenshot?: Buffer;
    method: 'readability' | 'playwright' | 'basic';
  }> {
    console.log(`[ContentExtraction] Extracting content from: ${url}`);

    // Strategy 1: Try Readability first (fast, works for most sites)
    try {
      const result = await this.extractWithReadability(url);
      console.log(`[ContentExtraction] ✅ Readability successful (${result.length} chars)`);
      return { ...result, method: 'readability' };
    } catch (error) {
      console.log(`[ContentExtraction] Readability failed: ${error}`);
    }

    // Strategy 2: Try Playwright for JavaScript-rendered sites
    try {
      const result = await this.extractWithPlaywright(url);
      console.log(`[ContentExtraction] ✅ Playwright successful (${result.length} chars)`);
      return { ...result, method: 'playwright' };
    } catch (error) {
      console.log(`[ContentExtraction] Playwright failed: ${error}`);
    }

    // Strategy 3: Basic fetch fallback
    try {
      const result = await this.extractBasic(url);
      console.log(`[ContentExtraction] ✅ Basic extraction successful (${result.length} chars)`);
      return { ...result, method: 'basic' };
    } catch (error) {
      console.error(`[ContentExtraction] All extraction methods failed for ${url}`);
      throw new Error(`Failed to extract content from ${url}`);
    }
  }

  /**
   * Extract content using Mozilla Readability
   * Best for: Static HTML sites, articles, blog posts
   */
  private async extractWithReadability(url: string): Promise<{
    content: string;
    title: string;
    excerpt: string;
    textContent: string;
    byline?: string;
    siteName?: string;
    length: number;
  }> {
    // Fetch HTML with retry logic
    const html = await retryWithBackoff(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.text();
        } catch (error: any) {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 3000,
      }
    );

    // Parse with Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content || !article.title) {
      throw new Error('Readability could not parse the article');
    }

    // Clean up text content
    const textContent = this.cleanText(article.textContent || '');

    if (textContent.length < 100) {
      throw new Error('Insufficient content extracted');
    }

    return {
      content: article.content,
      title: article.title,
      excerpt: article.excerpt || textContent.substring(0, 300),
      textContent,
      byline: article.byline || undefined,
      siteName: article.siteName || undefined,
      length: textContent.length,
    };
  }

  /**
   * Extract content using Playwright (for JavaScript-rendered sites)
   * Best for: SPAs, React apps, dynamically loaded content
   */
  private async extractWithPlaywright(url: string): Promise<{
    content: string;
    title: string;
    excerpt: string;
    textContent: string;
    length: number;
    screenshot?: Buffer;
  }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
    });
    const page = await context.newPage();

    try {
      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for main content to load
      await page.waitForTimeout(2000);

      // Extract content
      const content = await page.evaluate(() => {
        // Remove scripts, styles, navigation, etc.
        const elements = document.querySelectorAll('script, style, nav, header, footer, aside');
        elements.forEach(el => el.remove());

        // Get main content
        const main = document.querySelector('main, article, [role="main"], .content, #content');
        return main ? main.innerHTML : document.body.innerHTML;
      });

      // Get title
      const title = await page.title();

      // Get text content
      const textContent = await page.evaluate(() => {
        const main = document.querySelector('main, article, [role="main"], .content, #content');
        return main ? main.textContent : document.body.textContent;
      });

      const cleanedText = this.cleanText(textContent || '');

      // Capture screenshot (optional, can be disabled for performance)
      let screenshot: Buffer | undefined;
      try {
        screenshot = await page.screenshot({
          fullPage: false,
          type: 'png',
        });
      } catch (error) {
        console.log('[ContentExtraction] Screenshot capture failed:', error);
      }

      await context.close();

      if (cleanedText.length < 100) {
        throw new Error('Insufficient content extracted');
      }

      return {
        content,
        title,
        excerpt: cleanedText.substring(0, 300),
        textContent: cleanedText,
        length: cleanedText.length,
        screenshot,
      };
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  /**
   * Basic extraction fallback (simple HTML parsing)
   */
  private async extractBasic(url: string): Promise<{
    content: string;
    title: string;
    excerpt: string;
    textContent: string;
    length: number;
  }> {
    const html = await retryWithBackoff(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
            },
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return await response.text();
        } catch (error: any) {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 3000,
      }
    );

    // Simple HTML text extraction
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    text = text.substring(0, 5000);

    const dom = new JSDOM(html);
    const title = dom.window.document.querySelector('title')?.textContent || 'Untitled';

    if (text.length < 100) {
      throw new Error('Insufficient content extracted');
    }

    return {
      content: html,
      title,
      excerpt: text.substring(0, 300),
      textContent: text,
      length: text.length,
    };
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Get or initialize Playwright browser
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // If browser is being initialized, wait for it
    if (this.browserInitPromise) {
      return await this.browserInitPromise;
    }

    // Initialize browser
    this.browserInitPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.browser = await this.browserInitPromise;
    this.browserInitPromise = null;

    console.log('[ContentExtraction] Playwright browser launched');
    return this.browser;
  }

  /**
   * Close browser (call on shutdown)
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[ContentExtraction] Playwright browser closed');
    }
  }

  /**
   * Extract structured data from HTML (Open Graph, JSON-LD, etc.)
   */
  async extractStructuredData(url: string): Promise<{
    openGraph?: Record<string, string>;
    jsonLd?: any[];
    metadata?: Record<string, string>;
  }> {
    try {
      const html = await fetch(url).then(r => r.text());
      const dom = new JSDOM(html, { url });
      const doc = dom.window.document;

      // Extract Open Graph tags
      const openGraph: Record<string, string> = {};
      doc.querySelectorAll('meta[property^="og:"]').forEach(tag => {
        const property = tag.getAttribute('property');
        const content = tag.getAttribute('content');
        if (property && content) {
          openGraph[property.replace('og:', '')] = content;
        }
      });

      // Extract JSON-LD
      const jsonLd: any[] = [];
      doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '');
          jsonLd.push(data);
        } catch (error) {
          // Ignore invalid JSON
        }
      });

      // Extract metadata
      const metadata: Record<string, string> = {};
      doc.querySelectorAll('meta[name]').forEach(tag => {
        const name = tag.getAttribute('name');
        const content = tag.getAttribute('content');
        if (name && content) {
          metadata[name] = content;
        }
      });

      return { openGraph, jsonLd, metadata };
    } catch (error) {
      console.error('[ContentExtraction] Failed to extract structured data:', error);
      return {};
    }
  }
}

// Singleton instance
export const contentExtractionService = new ContentExtractionService();

// Cleanup on process exit
process.on('exit', () => {
  contentExtractionService.close();
});

process.on('SIGINT', () => {
  contentExtractionService.close().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  contentExtractionService.close().then(() => process.exit(0));
});
