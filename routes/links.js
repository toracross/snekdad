// routes/links.js
import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = express.Router();

// List of links you want to show
const customLinks = [
  "https://www.furaffinity.net/user/lunathal",
  "https://bsky.app/profile/snek.dad",
  "https://x.com/lunathal",
];

// Fallback overrides for sites that block scraping or have bad OG data
const overrides = {
  "https://x.com/lunathal": {
    title: "Twitter",
    image: "https://pbs.twimg.com/profile_banners/171233398/1711756556/1500x500" 
  },
  "https://www.furaffinity.net/user/lunathal": {
    title: "FurAffinity",
    image: "https://i.imgur.com/UQ6Lfi4.jpeg"
  }
};

async function getMetadata(url) {
  // Check if an override exists first
  if (overrides[url]) {
    return { url, ...overrides[url] };
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    // Some sites may return non-200 codes (like 403) but still send HTML
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      url;

    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // If no image found, check overrides again
    if (!ogImage && overrides[url]?.image) {
      return { url, title: ogTitle, image: overrides[url].image };
    }

    return { url, title: ogTitle, image: ogImage };
  } catch (err) {
    console.error(`Error fetching metadata for ${url}:`, err.message);
    // Fallback: use override if exists, else no image
    return overrides[url]
      ? { url, ...overrides[url] }
      : { url, title: url, image: '' };
  }
}

router.get('/links', async (req, res) => {
  const previews = await Promise.all(customLinks.map(getMetadata));
  res.json(previews);
});

export default router;
