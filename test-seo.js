#!/usr/bin/env node

/**
 * 🔍 SEO VERIFICATION SCRIPT for BlondePlace
 * Checks that all SEO optimizations are working correctly
 */

import fetch from 'node-fetch';

const SITE_URL = 'https://blondeplace.netlify.app';
const tests = [];

async function checkSitemap() {
  console.log('🗺️  Testing sitemap generation...');
  
  try {
    const response = await fetch(`${SITE_URL}/sitemap.xml`);
    if (response.ok) {
      const sitemap = await response.text();
      const urlCount = (sitemap.match(/<url>/g) || []).length;
      
      console.log(`✅ Sitemap found with ${urlCount} URLs`);
      
      if (urlCount > 0) {
        console.log('✅ Sitemap generation working correctly');
        tests.push({ test: 'Sitemap', status: 'PASS', details: `${urlCount} URLs` });
      } else {
        console.log('❌ Sitemap empty');
        tests.push({ test: 'Sitemap', status: 'FAIL', details: 'Empty sitemap' });
      }
    } else {
      console.log('❌ Sitemap not found');
      tests.push({ test: 'Sitemap', status: 'FAIL', details: 'HTTP ' + response.status });
    }
  } catch (error) {
    console.log('❌ Sitemap check failed:', error.message);
    tests.push({ test: 'Sitemap', status: 'ERROR', details: error.message });
  }
}

async function checkMinification() {
  console.log('⚡ Testing HTML minification...');
  
  try {
    const response = await fetch(SITE_URL);
    if (response.ok) {
      const html = await response.text();
      const originalSize = html.length;
      const hasMinification = !html.includes('\n    ') && !html.includes('<!--');
      
      console.log(`📊 HTML size: ${Math.round(originalSize/1024)}KB`);
      
      if (hasMinification) {
        console.log('✅ HTML appears minified');
        tests.push({ test: 'Minification', status: 'PASS', details: `${Math.round(originalSize/1024)}KB` });
      } else {
        console.log('❌ HTML does not appear minified');
        tests.push({ test: 'Minification', status: 'FAIL', details: 'Contains whitespace/comments' });
      }
    } else {
      console.log('❌ Could not fetch homepage');
      tests.push({ test: 'Minification', status: 'FAIL', details: 'HTTP ' + response.status });
    }
  } catch (error) {
    console.log('❌ Minification check failed:', error.message);
    tests.push({ test: 'Minification', status: 'ERROR', details: error.message });
  }
}

async function checkSEOMetaTags() {
  console.log('🎯 Testing SEO meta tags...');
  
  try {
    const response = await fetch(SITE_URL);
    if (response.ok) {
      const html = await response.text();
      
      const hasTitle = html.includes('<title>') && html.includes('BLONDE PLACE');
      const hasDescription = html.includes('name="description"');
      const hasCanonical = html.includes('rel="canonical"');
      const hasOG = html.includes('property="og:');
      const hasTwitter = html.includes('property="twitter:');
      
      const seoScore = [hasTitle, hasDescription, hasCanonical, hasOG, hasTwitter].filter(Boolean).length;
      
      if (seoScore >= 4) {
        console.log(`✅ SEO meta tags: ${seoScore}/5 present`);
        tests.push({ test: 'SEO Meta', status: 'PASS', details: `${seoScore}/5 tags` });
      } else {
        console.log(`❌ SEO meta tags: only ${seoScore}/5 present`);
        tests.push({ test: 'SEO Meta', status: 'FAIL', details: `${seoScore}/5 tags` });
      }
    }
  } catch (error) {
    console.log('❌ SEO check failed:', error.message);
    tests.push({ test: 'SEO Meta', status: 'ERROR', details: error.message });
  }
}

async function checkPerformance() {
  console.log('🚀 Testing site performance...');
  
  try {
    const start = Date.now();
    const response = await fetch(SITE_URL);
    const loadTime = Date.now() - start;
    
    if (response.ok) {
      if (loadTime < 2000) {
        console.log(`✅ Fast load time: ${loadTime}ms`);
        tests.push({ test: 'Performance', status: 'PASS', details: `${loadTime}ms` });
      } else {
        console.log(`⚠️  Slow load time: ${loadTime}ms`);
        tests.push({ test: 'Performance', status: 'WARN', details: `${loadTime}ms` });
      }
    }
  } catch (error) {
    console.log('❌ Performance check failed:', error.message);
    tests.push({ test: 'Performance', status: 'ERROR', details: error.message });
  }
}

async function runAllTests() {
  console.log('🔍 STARTING SEO VERIFICATION FOR BLONDEPLACE');
  console.log('=' .repeat(50));
  
  await checkSitemap();
  await checkMinification();
  await checkSEOMetaTags();
  await checkPerformance();
  
  console.log('\n📊 RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  
  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${test.test.padEnd(15)} ${test.status.padEnd(8)} ${test.details}`);
  });
  
  const passed = tests.filter(t => t.status === 'PASS').length;
  const total = tests.length;
  
  console.log(`\n🎯 OVERALL: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All SEO optimizations working perfectly!');
  } else {
    console.log('⚠️  Some optimizations need attention.');
  }
}

runAllTests().catch(console.error);