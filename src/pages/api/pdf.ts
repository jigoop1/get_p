// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer-core'


const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin issue - There is a good fix but currently this works.
require('puppeteer-extra-plugin-user-data-dir')
require('puppeteer-extra-plugin-user-preferences')
require('puppeteer-extra-plugin-stealth/evasions/chrome.app')
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi')
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes')
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime')
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs') // pkg warned me this one was missing
require('puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow')
require('puppeteer-extra-plugin-stealth/evasions/media.codecs')
require('puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency')
require('puppeteer-extra-plugin-stealth/evasions/navigator.languages')
require('puppeteer-extra-plugin-stealth/evasions/navigator.permissions')
require('puppeteer-extra-plugin-stealth/evasions/navigator.plugins')
require('puppeteer-extra-plugin-stealth/evasions/navigator.vendor')
require('puppeteer-extra-plugin-stealth/evasions/navigator.webdriver')
require('puppeteer-extra-plugin-stealth/evasions/sourceurl')
require('puppeteer-extra-plugin-stealth/evasions/user-agent-override')
require('puppeteer-extra-plugin-stealth/evasions/webgl.vendor')
require('puppeteer-extra-plugin-stealth/evasions/window.outerdimensions')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// This function can run for a maximum of 30 seconds
export const config = {
  maxDuration: 30,
};


type Json = {
  message: string
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Json | Buffer>
) {
  const { searchParams } = new URL(
    req.url as string,
    `http://${req.headers.host}`
  )
  const url = searchParams.get('url')
  const selector = searchParams.get('selector') 
  if (!url) {
    return res
      .status(400)
      .json({ message: `A ?url query-parameter is required` })
  }
  if (!selector) {
    const selector = '.'
  }

  const isProd = process.env.NODE_ENV === 'production'

  // create browser based on ENV
  let browser;
  if (isProd) {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    })
  } else {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);
  
  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://flixhq.to/' });
  
  const logger: string[] = [];
  const finalResponse:{source:string} = {source:''}
  // Define our blocked extensions
  const blockedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'];

  // Use CDP session to block resources
  await page.client().send('Network.setBlockedURLs', { urls: blockedExtensions });


  try {
    const [req] = await Promise.all([
      page.goto(url, { waitUntil: 'domcontentloaded' }),
      await page.waitForSelector(`${selector}`),
      await page.click(`${selector}`)
      // await page.waitForSelector(".jw-state-playing"),
      // await page.waitTillHTMLRendered(page)
      // await page.waitForNavigation({waitUntil: 'networkidle0', })
    ]);
  } catch (error) {
    return res.status(500).end(`Server Error: ${error.message},check the params.`)
  }
  await browser.close();

  // Response headers.
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
  res.setHeader('Content-Type', 'application/json')
  // CORS
  // res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  console.log(finalResponse);

  // await page.goto(url);
  finalResponse.source = await page.toString();
  return res.status(200).send(res.json(finalResponse));
  // res.json(finalResponse);
}
